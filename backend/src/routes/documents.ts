import { Router } from 'express';
import { PrismaClient, DocumentStatus } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth.js';
import { createDocumentSchema, updateDocumentSchema } from '../utils/validation.js';
import multer from 'multer';
import path from 'path';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { env } from '../utils/env.js';

const prisma = new PrismaClient();
const router = Router();

const allowedMimeTypes: Record<string, string[]> = {
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword', 'application/x-ole-storage'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.txt': ['text/plain'],
  '.png': ['image/png'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.gif': ['image/gif'],
  '.webp': ['image/webp'],
  '.bmp': ['image/bmp'],
  '.heic': ['image/heic', 'image/heif'],
  '.heif': ['image/heif', 'image/heic'],
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedMimeTypes[ext]?.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported attachment type'));
    }
  },
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, category, submitterId, from, to, page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (!Number.isInteger(pageNum) || pageNum < 1 || !Number.isInteger(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ error: 'page must be positive and limit must be between 1 and 100' });
    }

    if (req.user!.role === 'SUBMITTER') {
      where.submitterId = req.user!.id;
    } else if (req.user!.role === 'APPROVER') {
      // Approvers can see documents assigned to them
      const assignedDocuments = await prisma.approvalRecord.findMany({
        where: { approverId: req.user!.id },
        select: { workflowInstanceId: true },
      });
      const workflowInstanceIds = assignedDocuments.map((r: any) => r.workflowInstanceId);
      const instances = await prisma.workflowInstance.findMany({
        where: { id: { in: workflowInstanceIds } },
        select: { documentId: true },
      });
      where.id = { in: instances.map((i: any) => i.documentId) };
    }

    if (status) where.status = status;
    if (category) where.category = category;
    if (from || to) {
      const fromDate = from ? new Date(String(from)) : undefined;
      const toDate = to ? new Date(String(to)) : undefined;
      if ((fromDate && Number.isNaN(fromDate.getTime())) || (toDate && Number.isNaN(toDate.getTime()))) return res.status(400).json({ error: 'Invalid date filter' });
      if (fromDate && toDate && fromDate > toDate) return res.status(400).json({ error: 'from must be before to' });
      where.createdAt = { ...(fromDate && { gte: fromDate }), ...(toDate && { lte: toDate }) };
    }
    if (submitterId && req.user!.role === 'ADMIN') where.submitterId = submitterId;

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          submitter: {
            select: { id: true, name: true, email: true },
          },
          attachments: true,
          workflowInstance: {
            include: {
              workflowDefinition: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.document.count({ where }),
    ]);

    res.json({
      documents,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        submitter: {
          select: { id: true, name: true, email: true },
        },
        attachments: true,
        workflowInstance: {
          include: {
            workflowDefinition: true,
            approvalRecords: {
              include: {
                approver: {
                  select: { id: true, name: true, email: true },
                },
                workflowStage: true,
              },
              orderBy: { workflowStage: { stageOrder: 'asc' } },
            },
          },
        },
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check permissions
    if (
      req.user!.role === 'SUBMITTER' &&
      document.submitterId !== req.user!.id
    ) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    if (req.user!.role === 'APPROVER') {
      if (!document.workflowInstanceId) return res.status(403).json({ error: 'Insufficient permissions' });
      const hasAccess = await prisma.approvalRecord.findFirst({
        where: {
          workflowInstanceId: document.workflowInstanceId,
          approverId: req.user!.id,
        },
      });
      if (!hasAccess) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    }

    res.json(document);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, authorize('SUBMITTER', 'ADMIN'), async (req, res, next) => {
  try {
    const validatedData = createDocumentSchema.parse(req.body);
    const document = await prisma.$transaction(async (tx) => {
      const created = await tx.document.create({
        data: { ...validatedData, submitterId: req.user!.id, status: DocumentStatus.DRAFT },
        include: { submitter: { select: { id: true, name: true, email: true } } },
      });
      await tx.auditEntry.create({ data: {
        actorId: req.user!.id, action: 'DOCUMENT_CREATED', entityType: 'Document', entityId: created.id,
        newState: JSON.stringify({ status: DocumentStatus.DRAFT, title: created.title, category: created.category }),
      } });
      return created;
    });
    res.status(201).json(document);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const validatedData = updateDocumentSchema.parse(req.body);

    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Only draft or returned documents can be edited
    if (
      document.status !== DocumentStatus.DRAFT &&
      document.status !== DocumentStatus.RETURNED_FOR_CHANGES
    ) {
      return res.status(400).json({ error: 'Document cannot be edited in current status' });
    }

    // Only owner or admin can edit
    if (document.submitterId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const changed = await tx.document.updateMany({ where: { id, status: document.status }, data: { ...validatedData, version: { increment: 1 } } });
      if (changed.count !== 1) throw new Error('Document workflow changed concurrently');
      const result = await tx.document.findUniqueOrThrow({ where: { id }, include: { submitter: { select: { id: true, name: true, email: true } } } });
      await tx.auditEntry.create({ data: {
        actorId: req.user!.id, action: 'DOCUMENT_UPDATED', entityType: 'Document', entityId: id,
        previousState: JSON.stringify({ status: document.status, version: document.version }),
        newState: JSON.stringify({ status: result.status, version: result.version, title: result.title, category: result.category }),
      } });
      return result;
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/submit', authenticate, async (req, res, next) => {
  try {
    const id = req.params.id as string;

    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.status !== DocumentStatus.DRAFT && document.status !== DocumentStatus.RETURNED_FOR_CHANGES) {
      return res.status(400).json({ error: 'Document is not in a submittable state' });
    }

    if (document.submitterId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Create workflow instance and approval records in a transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Prefer a usable category workflow, falling back to a usable General workflow.
      // Legacy workflows without assignments are skipped so they cannot shadow a
      // newly configured workflow of the same category.
      const categories = document.category === 'General' ? ['General'] : [document.category, 'General'];
      const candidates = await tx.workflowDefinition.findMany({
        where: { category: { in: categories }, isActive: true },
        include: {
          stages: {
            orderBy: { stageOrder: 'asc' },
            include: { approverAssignments: { include: { approver: { select: { id: true, role: true, status: true } } } } },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
      const usable = candidates.filter((candidate: any) => candidate.stages.length > 0 && candidate.stages.every((stage: any) =>
        stage.approverAssignments.length > 0 && stage.approverAssignments.every((assignment: any) =>
          assignment.approver.role === 'APPROVER' && assignment.approver.status === 'ACTIVE')));
      const workflow = usable.find((candidate: any) => candidate.category === document.category)
        ?? usable.find((candidate: any) => candidate.category === 'General');
      if (!workflow) throw new Error('No active workflow with assigned active approvers is configured');

      const workflowInstance = await tx.workflowInstance.create({
        data: {
          documentId: document.id,
          workflowDefinitionId: workflow.id,
          revisionNumber: document.status === DocumentStatus.RETURNED_FOR_CHANGES
            ? ((await tx.workflowInstance.findFirst({
                where: { documentId: document.id },
                orderBy: { revisionNumber: 'desc' },
              }))?.revisionNumber || 0) + 1
            : 1,
        },
      });

      const assignments = workflow.stages.flatMap((stage: any) => stage.approverAssignments.map((assignment: any) => ({
        workflowInstanceId: workflowInstance.id,
        workflowStageId: stage.id,
        approverId: assignment.approverId,
        decision: 'PENDING' as const,
      })));
      await tx.approvalRecord.createMany({ data: assignments });

      const changed = await tx.document.updateMany({
        where: { id, status: document.status },
        data: {
          status: DocumentStatus.PENDING_APPROVAL,
          workflowInstanceId: workflowInstance.id,
          currentStage: 1,
          submittedAt: new Date(),
        },
      });
      if (changed.count !== 1) throw new Error('Document workflow changed concurrently');
      const updatedDocument = await tx.document.findUniqueOrThrow({ where: { id } });

      const firstStage = workflow.stages[0];
      await tx.notification.createMany({
        data: firstStage.approverAssignments.map((assignment: any) => ({
          recipientId: assignment.approverId,
          type: document.status === DocumentStatus.RETURNED_FOR_CHANGES ? 'DOCUMENT_RESUBMITTED' : 'DOCUMENT_SUBMITTED',
          title: document.status === DocumentStatus.RETURNED_FOR_CHANGES ? 'Document resubmitted' : 'New document for approval',
          message: `${document.title} requires your review at ${firstStage.name}`,
          documentId: document.id,
        })),
      });
      await tx.auditEntry.create({ data: {
        actorId: req.user!.id,
        action: document.status === DocumentStatus.RETURNED_FOR_CHANGES ? 'DOCUMENT_RESUBMITTED' : 'DOCUMENT_SUBMITTED',
        entityType: 'Document', entityId: document.id,
        previousState: JSON.stringify({ status: document.status }),
        newState: JSON.stringify({ status: DocumentStatus.PENDING_APPROVAL, workflowInstanceId: workflowInstance.id }),
        metadata: JSON.stringify({ revisionNumber: workflowInstance.revisionNumber }),
      } });

      return { workflowInstance, updatedDocument };
    }, { isolationLevel: 'Serializable' });

    res.json(result.updatedDocument);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/withdraw', authenticate, async (req, res, next) => {
  try {
    const id = req.params.id as string;

    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.status !== DocumentStatus.PENDING_APPROVAL) {
      return res.status(400).json({ error: 'Document cannot be withdrawn in current status' });
    }

    if (document.submitterId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (!document.workflowInstanceId) throw new Error('Document has no active workflow');
      const now = new Date();
      const changed = await tx.document.updateMany({
        where: { id, status: DocumentStatus.PENDING_APPROVAL, workflowInstanceId: document.workflowInstanceId },
        data: { status: DocumentStatus.DRAFT, currentStage: null, submittedAt: null },
      });
      if (changed.count !== 1) throw new Error('Document workflow changed concurrently');
      const pendingApprovers = await tx.approvalRecord.findMany({
        where: { workflowInstanceId: document.workflowInstanceId, decision: 'PENDING' },
        select: { approverId: true },
      });
      await tx.workflowInstance.update({ where: { id: document.workflowInstanceId }, data: { completedAt: now } });
      await tx.notification.createMany({
        data: pendingApprovers.map(({ approverId }) => ({
          recipientId: approverId, type: 'DOCUMENT_WITHDRAWN' as const,
          title: 'Document withdrawn', message: `${document.title} was withdrawn by its submitter`, documentId: id,
        })),
      });
      await tx.auditEntry.create({ data: {
        actorId: req.user!.id, action: 'DOCUMENT_WITHDRAWN', entityType: 'Document', entityId: id,
        previousState: JSON.stringify({ status: DocumentStatus.PENDING_APPROVAL }),
        newState: JSON.stringify({ status: DocumentStatus.DRAFT }),
        metadata: JSON.stringify({ workflowInstanceId: document.workflowInstanceId }),
      } });
      return tx.document.findUniqueOrThrow({ where: { id } });
    }, { isolationLevel: 'Serializable' });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/history', authenticate, async (req, res, next) => {
  try {
    const id = req.params.id as string;

    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Permission check
    if (
      req.user!.role === 'SUBMITTER' &&
      document.submitterId !== req.user!.id
    ) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    if (req.user!.role === 'APPROVER') {
      if (!document.workflowInstanceId) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      const assigned = await prisma.approvalRecord.findFirst({
        where: { workflowInstanceId: document.workflowInstanceId, approverId: req.user!.id },
      });
      if (!assigned) return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const auditEntries = await prisma.auditEntry.findMany({
      where: {
        entityType: 'Document',
        entityId: id,
      },
      include: {
        actor: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    res.json(auditEntries);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/attachments', authenticate, upload.single('file'), async (req, res, next) => {
  let storedPath: string | undefined;
  try {
    const id = req.params.id as string;

    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.submitterId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    if (document.status !== DocumentStatus.DRAFT && document.status !== DocumentStatus.RETURNED_FOR_CHANGES) {
      return res.status(400).json({ error: 'Attachments can only be added to draft or returned documents' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const extension = path.extname(req.file.originalname).toLowerCase();
    const filename = `${randomUUID()}${extension}`;
    const uploadDirectory = path.resolve(env.UPLOAD_DIR);
    storedPath = path.join(uploadDirectory, filename);
    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(storedPath, req.file.buffer, { flag: 'wx' });

    const attachment = await prisma.$transaction(async (tx) => {
      const created = await tx.attachment.create({
        data: {
          documentId: id,
          filename,
          originalName: path.basename(req.file!.originalname),
          mimeType: req.file!.mimetype,
          size: req.file!.size,
          path: storedPath!,
        },
      });

      await tx.auditEntry.create({
        data: {
          actorId: req.user!.id,
          action: 'DOCUMENT_UPDATED',
          entityType: 'Document',
          entityId: id,
          metadata: JSON.stringify({ documentId: id, filename: created.originalName, size: created.size }),
        },
      });

      return created;
    });

    res.status(201).json(attachment);
  } catch (error) {
    if (storedPath) await unlink(storedPath).catch(() => undefined);
    next(error);
  }
});

router.get('/:id/attachments/:attachmentId', authenticate, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const attachmentId = req.params.attachmentId as string;
    const attachment = await prisma.attachment.findFirst({
      where: { id: attachmentId, documentId: id },
      include: { document: true },
    });

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const user = req.user!;
    if (user.role === 'SUBMITTER' && attachment.document.submitterId !== user.id) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    if (user.role === 'APPROVER') {
      if (!attachment.document.workflowInstanceId) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      const assigned = await prisma.approvalRecord.findFirst({
        where: { workflowInstanceId: attachment.document.workflowInstanceId, approverId: user.id },
      });
      if (!assigned) return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const filePath = path.resolve(env.UPLOAD_DIR, attachment.filename);
    res.type(attachment.mimeType);
    res.sendFile(filePath, (error) => {
      if (error) next(error);
    });
  } catch (error) {
    next(error);
  }
});

export default router;
