import { Router } from 'express';
import { ApprovalDecision, DocumentStatus } from '@prisma/client-runtime-v2';
import { authenticate, authorize } from '../middleware/auth.js';
import { approveSchema, approveRejectSchema, returnForChangesSchema } from '../utils/validation.js';
import { approvalActionError, resolveApprovalTransition } from '../services/workflowRules.js';

import { prisma } from '../db.js';
const router = Router();

router.get('/my-tasks', authenticate, authorize('APPROVER'), async (req, res, next) => {
  try {
    const tasks = await prisma.approvalRecord.findMany({
      where: { approverId: req.user!.id, decision: 'PENDING', workflowInstance: { document: { status: 'PENDING_APPROVAL' } } },
      include: { workflowInstance: { include: { document: { include: { submitter: { select: { id: true, name: true, email: true } }, attachments: true } }, workflowDefinition: true } }, workflowStage: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(tasks.filter((task) => task.workflowInstance.document.currentStage === task.workflowStage.stageOrder));
  } catch (error) { next(error); }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const task = await prisma.approvalRecord.findUnique({ where: { id: req.params.id as string }, include: { workflowInstance: { include: { document: true, workflowDefinition: true } }, workflowStage: true, approver: { select: { id: true, name: true, email: true } } } });
    if (!task) return res.status(404).json({ error: 'Approval record not found' });
    if (task.approverId !== req.user!.id && req.user!.role !== 'ADMIN') return res.status(403).json({ error: 'Insufficient permissions' });
    res.json(task);
  } catch (error) { next(error); }
});

async function decide(req: any, res: any, next: any, decision: ApprovalDecision, comment: string | null) {
  try {
    const id = req.params.id as string;
    const task = await prisma.approvalRecord.findUnique({
      where: { id },
      include: {
        workflowInstance: {
          include: {
            document: true,
            workflowDefinition: { include: { stages: { orderBy: { stageOrder: 'asc' } } } },
          },
        },
        workflowStage: true,
      },
    });
    if (!task) return res.status(404).json({ error: 'Approval record not found' });
    const doc = task.workflowInstance.document;
    const taskError = approvalActionError({
      actorId: req.user!.id,
      assignedApproverId: task.approverId,
      documentStatus: doc.status,
      documentWorkflowInstanceId: doc.workflowInstanceId,
      taskWorkflowInstanceId: task.workflowInstanceId,
      currentStage: doc.currentStage,
      taskStage: task.workflowStage.stageOrder,
      decision: task.decision,
    });
    if (taskError === 'FORBIDDEN') return res.status(403).json({ error: 'You are not the assigned approver' });
    if (taskError) return res.status(409).json({ error: 'This approval task is inactive or not at the current stage' });

    const result = await prisma.$transaction(async (tx) => {
      // Conditional write makes duplicate and concurrent decisions mutually exclusive.
      const changed = await tx.approvalRecord.updateMany({ where: { id, approverId: req.user!.id, decision: 'PENDING' }, data: { decision, comment, decisionAt: new Date() } });
      if (changed.count !== 1) throw new Error('Approval task was already decided');
      const now = new Date();
      const previous = { status: doc.status, currentStage: doc.currentStage };
      const outstanding = decision === ApprovalDecision.APPROVED
        ? await tx.approvalRecord.count({ where: { workflowInstanceId: task.workflowInstanceId, workflowStageId: task.workflowStageId, decision: 'PENDING' } })
        : 0;
      const transition = resolveApprovalTransition(
        decision,
        task.workflowStage.stageOrder,
        outstanding,
        task.workflowInstance.workflowDefinition.stages.map((stage) => stage.stageOrder),
      );
      const { status: nextStatus, currentStage: nextStage, completed: ended } = transition;
      const documentUpdate = await tx.document.updateMany({ where: { id: doc.id, status: DocumentStatus.PENDING_APPROVAL, workflowInstanceId: task.workflowInstanceId, currentStage: task.workflowStage.stageOrder }, data: { status: nextStatus, currentStage: nextStage, ...(ended ? { finalDecisionAt: now } : {}) } });
      if (documentUpdate.count !== 1) throw new Error('Document workflow changed concurrently');
      const updatedTask = await tx.approvalRecord.findUniqueOrThrow({ where: { id } });
      if (ended && decision !== ApprovalDecision.APPROVED) await tx.workflowInstance.update({ where: { id: task.workflowInstanceId }, data: { completedAt: now } });
      if (nextStatus === DocumentStatus.APPROVED) await tx.workflowInstance.update({ where: { id: task.workflowInstanceId }, data: { completedAt: now } });

      if (decision === ApprovalDecision.REJECTED || decision === ApprovalDecision.RETURNED) {
        const remainingTasks = await tx.approvalRecord.findMany({ where: { workflowInstanceId: task.workflowInstanceId, decision: 'PENDING' }, select: { approverId: true } });
        await tx.approvalRecord.updateMany({ where: { workflowInstanceId: task.workflowInstanceId, decision: 'PENDING' }, data: { decision: 'CANCELLED', comment: `Workflow ended: ${decision.toLowerCase()}`, decisionAt: now } });
        const recipients = [...new Set(remainingTasks.map(({ approverId }) => approverId))];
        if (recipients.length) await tx.notification.createMany({ data: recipients.map((recipientId) => ({
          recipientId, type: 'APPROVAL_CANCELLED' as const, title: 'Approval task cancelled',
          message: `${doc.title} no longer requires your approval because it was ${decision.toLowerCase()}.`, documentId: doc.id,
        })) });
      }

      const action = decision === ApprovalDecision.APPROVED ? 'DOCUMENT_APPROVED' : decision === ApprovalDecision.REJECTED ? 'DOCUMENT_REJECTED' : 'DOCUMENT_RETURNED';
      await tx.auditEntry.create({ data: { actorId: req.user!.id, action, entityType: 'Document', entityId: doc.id, previousState: JSON.stringify(previous), newState: JSON.stringify({ status: nextStatus, currentStage: nextStage }), metadata: JSON.stringify({ taskId: id, stageId: task.workflowStageId, comment }) } });

      if (decision !== ApprovalDecision.APPROVED || nextStatus === DocumentStatus.APPROVED) {
        await tx.notification.create({ data: { recipientId: doc.submitterId, type: decision === ApprovalDecision.APPROVED ? 'DOCUMENT_APPROVED' : decision === ApprovalDecision.REJECTED ? 'DOCUMENT_REJECTED' : 'DOCUMENT_RETURNED', title: decision === ApprovalDecision.APPROVED ? 'Document approved' : decision === ApprovalDecision.REJECTED ? 'Document rejected' : 'Document returned for changes', message: `${doc.title}: ${comment ?? 'all approval stages are complete'}`, documentId: doc.id } });
      } else if (nextStage !== task.workflowStage.stageOrder) {
        const nextStageInfo = task.workflowInstance.workflowDefinition.stages.find((stage) => stage.stageOrder === nextStage);
        const nextApprovers = await tx.approvalRecord.findMany({ where: { workflowInstanceId: task.workflowInstanceId, workflowStageId: nextStageInfo!.id }, select: { approverId: true } });
        await tx.notification.createMany({ data: nextApprovers.map((approver) => ({ recipientId: approver.approverId, type: 'WORKFLOW_ASSIGNED' as const, title: 'Approval stage assigned', message: `${doc.title} is ready for ${nextStageInfo!.name}`, documentId: doc.id })) });
      }
      return updatedTask;
    }, { isolationLevel: 'Serializable' });
    res.json(result);
  } catch (error) { next(error); }
}

router.post('/:id/approve', authenticate, authorize('APPROVER'), (req, res, next) => {
  try { const { comment } = approveSchema.parse(req.body ?? {}); return decide(req, res, next, ApprovalDecision.APPROVED, comment?.trim() || null); } catch (error) { next(error); }
});
router.post('/:id/reject', authenticate, authorize('APPROVER'), (req, res, next) => {
  try { const { comment } = approveRejectSchema.parse(req.body); return decide(req, res, next, ApprovalDecision.REJECTED, comment); } catch (error) { next(error); }
});
router.post('/:id/return', authenticate, authorize('APPROVER'), (req, res, next) => {
  try { const { comment } = returnForChangesSchema.parse(req.body); return decide(req, res, next, ApprovalDecision.RETURNED, comment); } catch (error) { next(error); }
});

export default router;
