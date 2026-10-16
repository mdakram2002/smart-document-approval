import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth.js';
import { createWorkflowSchema, updateWorkflowSchema } from '../utils/validation.js';

const prisma = new PrismaClient();
const router = Router();

router.get('/', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const workflows = await prisma.workflowDefinition.findMany({
      include: {
        stages: {
          orderBy: { stageOrder: 'asc' },
          include: {
            approverAssignments: { include: { approver: { select: { id: true, name: true, email: true, status: true } } } },
            approvalRecords: {
              include: {
                approver: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
        },
        _count: {
          select: { instances: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(workflows);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const validatedData = createWorkflowSchema.parse(req.body);

    const workflow = await prisma.$transaction(async (tx) => {
      const approverIds = [...new Set(validatedData.stages.flatMap((stage) => stage.approverIds))];
      const approvers = await tx.user.findMany({ where: { id: { in: approverIds }, role: 'APPROVER', status: 'ACTIVE' }, select: { id: true } });
      if (approvers.length !== approverIds.length) throw new Error('Every assigned user must be an active approver');
      const created = await tx.workflowDefinition.create({
        data: {
          name: validatedData.name,
          description: validatedData.description,
          category: validatedData.category,
          stages: {
            create: validatedData.stages.map((stage, index) => ({
              stageOrder: index + 1,
              name: stage.name,
              description: stage.description,
              approverAssignments: {
                create: stage.approverIds.map((approverId) => ({ approverId })),
              },
            })),
          },
        },
        include: {
          stages: {
            orderBy: { stageOrder: 'asc' },
            include: { approverAssignments: { include: { approver: { select: { id: true, name: true, email: true } } } } },
          },
        },
      });
      await tx.auditEntry.create({ data: {
        actorId: req.user!.id,
        action: 'WORKFLOW_CREATED',
        entityType: 'WorkflowDefinition',
        entityId: created.id,
        newState: JSON.stringify({ name: created.name, category: created.category, isActive: created.isActive }),
        metadata: JSON.stringify({ stages: created.stages.map((stage) => ({ name: stage.name, approverIds: stage.approverAssignments.map((assignment) => assignment.approverId) })) }),
      } });
      return created;
    }, { isolationLevel: 'Serializable' });

    res.status(201).json(workflow);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const workflow = await prisma.workflowDefinition.findUnique({
      where: { id },
      include: {
        stages: {
          orderBy: { stageOrder: 'asc' },
          include: { approverAssignments: { include: { approver: { select: { id: true, name: true, email: true, status: true } } } } },
        },
        instances: {
          include: {
            document: {
              select: { id: true, title: true, status: true },
            },
          },
        },
      },
    });

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json(workflow);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const validatedData = updateWorkflowSchema.parse(req.body);
    const current = await prisma.workflowDefinition.findUnique({ where: { id }, include: { _count: { select: { instances: true } } } });
    if (!current) return res.status(404).json({ error: 'Workflow not found' });
    if (validatedData.stages && current._count.instances > 0) {
      return res.status(409).json({ error: 'A workflow used by documents is immutable. Create a new workflow configuration for future submissions.' });
    }
    const { stages, ...workflowFields } = validatedData;
    const workflow = await prisma.$transaction(async (tx) => {
      if (stages) {
        const approverIds = [...new Set(stages.flatMap((stage) => stage.approverIds))];
        const approvers = await tx.user.findMany({ where: { id: { in: approverIds }, role: 'APPROVER', status: 'ACTIVE' }, select: { id: true } });
        if (approvers.length !== approverIds.length) throw new Error('Every assigned user must be an active approver');
      }
      const updated = await tx.workflowDefinition.update({
      where: { id },
      data: {
        ...workflowFields,
        ...(stages && { stages: {
          deleteMany: {},
          create: stages.map((stage, index) => ({
            stageOrder: index + 1,
            name: stage.name,
            description: stage.description,
            approverAssignments: { create: stage.approverIds.map((approverId) => ({ approverId })) },
          })),
        } }),
      },
      include: {
        stages: {
          orderBy: { stageOrder: 'asc' },
          include: {
            approverAssignments: {
              include: { approver: { select: { id: true, name: true, email: true, status: true } } },
            },
          },
        },
      },
      });
      await tx.auditEntry.create({ data: {
        actorId: req.user!.id,
        action: 'WORKFLOW_UPDATED',
        entityType: 'WorkflowDefinition',
        entityId: id,
        metadata: JSON.stringify({ updatedFields: Object.keys(validatedData), stageCount: stages?.length }),
      } });
      return updated;
    }, { isolationLevel: 'Serializable' });

    res.json(workflow);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/activate', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const workflow = await prisma.workflowDefinition.findUnique({ where: { id }, include: { stages: { include: { approverAssignments: { include: { approver: { select: { role: true, status: true } } } } } } } });
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
    if (!workflow.stages.length || workflow.stages.some((stage) => !stage.approverAssignments.length || stage.approverAssignments.some((assignment) => assignment.approver.role !== 'APPROVER' || assignment.approver.status !== 'ACTIVE'))) {
      return res.status(400).json({ error: 'Assign at least one active approver to every stage before activating this workflow' });
    }
    const activated = await prisma.$transaction(async (tx) => {
      const updated = await tx.workflowDefinition.update({ where: { id }, data: { isActive: true } });
      await tx.auditEntry.create({ data: {
        actorId: req.user!.id, action: 'WORKFLOW_ACTIVATED', entityType: 'WorkflowDefinition', entityId: id,
        previousState: JSON.stringify({ isActive: workflow.isActive }), newState: JSON.stringify({ isActive: true }),
      } });
      return updated;
    });
    res.json(activated);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/deactivate', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const current = await prisma.workflowDefinition.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ error: 'Workflow not found' });
    const workflow = await prisma.$transaction(async (tx) => {
      const updated = await tx.workflowDefinition.update({ where: { id }, data: { isActive: false } });
      await tx.auditEntry.create({ data: {
        actorId: req.user!.id, action: 'WORKFLOW_DEACTIVATED', entityType: 'WorkflowDefinition', entityId: id,
        previousState: JSON.stringify({ isActive: current.isActive }), newState: JSON.stringify({ isActive: false }),
      } });
      return updated;
    });
    res.json(workflow);
  } catch (error) {
    next(error);
  }
});

export default router;
