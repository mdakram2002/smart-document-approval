import { Router } from 'express';
import { UserStatus } from '@prisma/client-runtime-v2';
import { authenticate, authorize } from '../middleware/auth.js';
import { updateUserSchema, userStatusSchema } from '../utils/validation.js';

import { prisma } from '../db.js';
const router = Router();

router.get('/', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    
    // Users can only view their own profile or admins can view any
    if (req.user!.id !== id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const validatedData = updateUserSchema.parse(req.body);

    const user = await prisma.$transaction(async (tx) => {
      const current = await tx.user.findUnique({ where: { id } });
      if (!current) throw new Error('User not found');
      if ((validatedData.role !== undefined && validatedData.role !== 'APPROVER' || validatedData.status === 'INACTIVE') && current.role === 'APPROVER') {
        const pendingTasks = await tx.approvalRecord.count({ where: { approverId: id, decision: 'PENDING', workflowInstance: { document: { is: { status: 'PENDING_APPROVAL' } } } } });
        if (pendingTasks > 0) throw new Error('Cannot change an approver with pending workflow tasks');
      }
      if ((validatedData.role && validatedData.role !== current.role || validatedData.status === 'INACTIVE') && current.role === 'ADMIN' && current.status === 'ACTIVE') {
        const activeAdmins = await tx.user.count({ where: { role: 'ADMIN', status: 'ACTIVE' } });
        if (activeAdmins <= 1) throw new Error('Cannot remove or deactivate the last active administrator');
      }
      const updated = await tx.user.update({ where: { id }, data: validatedData, select: { id: true, email: true, name: true, role: true, status: true, createdAt: true, updatedAt: true } });
      const changedRole = validatedData.role !== undefined && validatedData.role !== current.role;
      const changedStatus = validatedData.status !== undefined && validatedData.status !== current.status;
      await tx.auditEntry.create({ data: {
        actorId: req.user!.id,
        action: changedRole ? 'USER_ROLE_CHANGED' : changedStatus && validatedData.status === 'INACTIVE' ? 'USER_DEACTIVATED' : changedStatus ? 'USER_ACTIVATED' : 'USER_UPDATED',
        entityType: 'User', entityId: id,
        previousState: JSON.stringify({ name: current.name, role: current.role, status: current.status }),
        newState: JSON.stringify({ name: updated.name, role: updated.role, status: updated.status }),
      } });
      return updated;
    }, { isolationLevel: 'Serializable' });

    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const { status } = userStatusSchema.parse(req.body);
    const user = await prisma.$transaction(async (tx) => {
      const current = await tx.user.findUnique({ where: { id } });
      if (!current) throw new Error('User not found');
      if (status === 'INACTIVE' && current.role === 'APPROVER') {
        const pendingTasks = await tx.approvalRecord.count({ where: { approverId: id, decision: 'PENDING', workflowInstance: { document: { is: { status: 'PENDING_APPROVAL' } } } } });
        if (pendingTasks > 0) throw new Error('Cannot change an approver with pending workflow tasks');
      }
      if (status === 'INACTIVE' && current.role === 'ADMIN' && current.status === 'ACTIVE' && await tx.user.count({ where: { role: 'ADMIN', status: 'ACTIVE' } }) <= 1) {
        throw new Error('Cannot remove or deactivate the last active administrator');
      }
      const updated = await tx.user.update({ where: { id }, data: { status: status as UserStatus }, select: { id: true, email: true, name: true, role: true, status: true, createdAt: true, updatedAt: true } });
      if (status !== current.status) await tx.auditEntry.create({ data: {
        actorId: req.user!.id, action: status === 'ACTIVE' ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        entityType: 'User', entityId: id, previousState: JSON.stringify({ status: current.status }), newState: JSON.stringify({ status }),
      } });
      return updated;
    }, { isolationLevel: 'Serializable' });

    res.json(user);
  } catch (error) {
    next(error);
  }
});

export default router;
