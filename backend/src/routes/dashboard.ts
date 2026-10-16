import { Router } from 'express';
import { PrismaClient, DocumentStatus, UserStatus } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const prisma = new PrismaClient();
const router = Router();

router.get('/summary', authenticate, async (req, res, next) => {
  try {
    const { role, id } = req.user!;

    let summary: any = {};

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
        prisma.document.count(),
        prisma.document.count({ where: { status: DocumentStatus.DRAFT } }),
        prisma.document.count({ where: { status: DocumentStatus.PENDING_APPROVAL } }),
        prisma.document.count({ where: { status: DocumentStatus.APPROVED } }),
        prisma.document.count({ where: { status: DocumentStatus.REJECTED } }),
        prisma.document.count({ where: { status: DocumentStatus.RETURNED_FOR_CHANGES } }),
        prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
        prisma.approvalRecord.count({ where: { decision: 'PENDING' } }),
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
        prisma.document.count({ where: { submitterId: id } }),
        prisma.document.count({
          where: { submitterId: id, status: DocumentStatus.DRAFT },
        }),
        prisma.document.count({
          where: { submitterId: id, status: DocumentStatus.PENDING_APPROVAL },
        }),
        prisma.document.count({
          where: { submitterId: id, status: DocumentStatus.APPROVED },
        }),
        prisma.document.count({
          where: { submitterId: id, status: DocumentStatus.REJECTED },
        }),
        prisma.document.count({
          where: { submitterId: id, status: DocumentStatus.RETURNED_FOR_CHANGES },
        }),
        prisma.document.findMany({
          where: { submitterId: id },
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
        prisma.approvalRecord.count({
          where: { approverId: id, decision: 'PENDING' },
        }),
        prisma.approvalRecord.count({
          where: { approverId: id, decision: { in: ['APPROVED', 'REJECTED', 'RETURNED'] } },
        }),
        prisma.approvalRecord.findMany({
          where: { approverId: id },
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
