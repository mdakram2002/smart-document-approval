import { Router, Request, Response, NextFunction } from 'express';
import { Prisma, DocumentStatus, UserStatus } from '@prisma/client-runtime-v2';
import { authenticate } from '../middleware/auth.js';

import { prisma } from '../db.js';
import { parseCreatedDateRange } from '../utils/dateFilters.js';
const router = Router();

router.get('/summary', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, id } = req.user!;

    const { status, category, submitterId, from, to } = req.query;
    const validStatuses = Object.values(DocumentStatus) as string[];
    if (status && !validStatuses.includes(String(status))) return res.status(400).json({ error: 'Invalid status filter' });
    if (role === 'ADMIN' && submitterId !== undefined && typeof submitterId !== 'string') return res.status(400).json({ error: 'Invalid submitter filter' });
    if ((category !== undefined && typeof category !== 'string') || (submitterId !== undefined && role === 'ADMIN' && typeof submitterId !== 'string')) return res.status(400).json({ error: 'Invalid dashboard filter' });
    const dateRange = parseCreatedDateRange(from, to);
    if (!dateRange.valid) return res.status(400).json({ error: dateRange.error });
    const documentWhere: Prisma.DocumentWhereInput = {
      ...(status && { status: status as DocumentStatus }),
      ...(typeof category === 'string' && category && { category }),
      ...(role === 'ADMIN' && typeof submitterId === 'string' && submitterId && { submitterId }),
      ...(dateRange.valid && dateRange.createdAt && { createdAt: dateRange.createdAt }),
    };

    const pendingStageTasks = async (approverId?: string) => {
      const records = await prisma.approvalRecord.findMany({
        where: {
          decision: 'PENDING',
          ...(approverId && { approverId }),
          workflowInstance: { document: { is: { ...documentWhere, status: DocumentStatus.PENDING_APPROVAL } } },
        },
        select: { workflowStage: { select: { stageOrder: true } }, workflowInstance: { select: { document: { select: { currentStage: true } } } } },
      });
      return records.filter((record) => record.workflowInstance.document.currentStage === record.workflowStage.stageOrder).length;
    };

    let summary: Record<string, unknown> = {};

    if (role === 'ADMIN') {
      // Admin dashboard - organization-wide statistics
      const [
        totalDocuments,
        draftDocuments,
        pendingDocuments,
        approvedDocuments,
        rejectedDocuments,
        returnedDocuments,
        activeUsers,
        pendingApprovals,
        recentActivity,
      ] = await Promise.all([
        prisma.document.count({ where: documentWhere }),
        prisma.document.count({ where: { ...documentWhere, status: DocumentStatus.DRAFT } }),
        prisma.document.count({ where: { ...documentWhere, status: DocumentStatus.PENDING_APPROVAL } }),
        prisma.document.count({ where: { ...documentWhere, status: DocumentStatus.APPROVED } }),
        prisma.document.count({ where: { ...documentWhere, status: DocumentStatus.REJECTED } }),
        prisma.document.count({ where: { ...documentWhere, status: DocumentStatus.RETURNED_FOR_CHANGES } }),
        prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
        pendingStageTasks(),
        prisma.auditEntry.findMany({
          take: 10,
          orderBy: { timestamp: 'desc' },
          include: {
            actor: {
              select: { id: true, name: true },
            },
          },
        }),
      ]);

      summary = {
        totalDocuments,
        drafts: draftDocuments,
        pendingDocuments,
        approvedDocuments,
        rejectedDocuments,
        returnedDocuments,
        activeUsers,
        pendingApprovals,
        recentActivity,
      };
    } else if (role === 'SUBMITTER') {
      // Submitter dashboard - personal statistics
      const [
        totalDocuments,
        drafts,
        pendingApprovals,
        approvedDocuments,
        rejectedDocuments,
        returnedDocuments,
        recentDocuments,
      ] = await Promise.all([
        prisma.document.count({ where: { ...documentWhere, submitterId: id } }),
        prisma.document.count({
          where: { ...documentWhere, submitterId: id, status: DocumentStatus.DRAFT },
        }),
        prisma.document.count({
          where: { ...documentWhere, submitterId: id, status: DocumentStatus.PENDING_APPROVAL },
        }),
        prisma.document.count({
          where: { ...documentWhere, submitterId: id, status: DocumentStatus.APPROVED },
        }),
        prisma.document.count({
          where: { ...documentWhere, submitterId: id, status: DocumentStatus.REJECTED },
        }),
        prisma.document.count({
          where: { ...documentWhere, submitterId: id, status: DocumentStatus.RETURNED_FOR_CHANGES },
        }),
        prisma.document.findMany({
          where: { ...documentWhere, submitterId: id },
          take: 5,
          orderBy: { updatedAt: 'desc' },
          include: {
            attachments: true,
          },
        }),
      ]);

      summary = {
        totalDocuments,
        drafts,
        pendingApprovals,
        approvedDocuments,
        rejectedDocuments,
        returnedDocuments,
        recentDocuments,
      };
    } else if (role === 'APPROVER') {
      // Approver dashboard - task statistics
      const [
        pendingTasks,
        completedTasks,
        recentApprovals,
      ] = await Promise.all([
        pendingStageTasks(id),
        prisma.approvalRecord.count({
          where: { approverId: id, decision: { in: ['APPROVED', 'REJECTED', 'RETURNED'] }, workflowInstance: { document: { is: documentWhere } } },
        }),
        prisma.approvalRecord.findMany({
          where: { approverId: id, workflowInstance: { document: { is: documentWhere } } },
          take: 5,
          orderBy: { decisionAt: { sort: 'desc', nulls: 'last' } },
          include: {
            workflowInstance: {
              include: {
                document: {
                  include: {
                    submitter: {
                      select: { id: true, name: true },
                    },
                  },
                },
              },
            },
            workflowStage: true,
          },
        }),
      ]);

      summary = {
        pendingTasks,
        completedTasks,
        recentApprovals,
      };
    }

    res.json(summary);
  } catch (error) {
    next(error);
  }
});

export default router;
