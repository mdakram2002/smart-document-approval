import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { AuditAction } from '@prisma/client-runtime-v2';

import { prisma } from '../db.js';
const router = Router();

router.get('/', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { action, entityType, actorId, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    if (!Number.isInteger(pageNum) || pageNum < 1 || !Number.isInteger(limitNum) || limitNum < 1 || limitNum > 100) return res.status(400).json({ error: 'page must be positive and limit must be between 1 and 100' });
    if (action && (typeof action !== 'string' || !Object.values(AuditAction).includes(action as AuditAction))) return res.status(400).json({ error: 'Invalid audit action filter' });
    if (entityType && typeof entityType !== 'string' || actorId && typeof actorId !== 'string') return res.status(400).json({ error: 'Invalid audit filter' });

    const where: any = {};
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (actorId) where.actorId = actorId;

    const [auditEntries, total] = await Promise.all([
      prisma.auditEntry.findMany({
        where,
        include: {
          actor: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.auditEntry.count({ where }),
    ]);

    res.json({
      auditEntries,
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

export default router;
