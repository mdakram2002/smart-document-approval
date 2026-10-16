import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

import { prisma } from '../db.js';
const router = Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { unreadOnly = 'false' } = req.query;
    const unreadOnlyBool = unreadOnly === 'true';

    const notifications = await prisma.notification.findMany({
      where: {
        recipientId: req.user!.id,
        ...(unreadOnlyBool && { isRead: false }),
      },
      orderBy: { createdAt: 'desc' },
    });

    const unreadCount = await prisma.notification.count({
      where: {
        recipientId: req.user!.id,
        isRead: false,
      },
    });

    res.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/read', authenticate, async (req, res, next) => {
  try {
    const id = req.params.id as string;

    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.recipientId !== req.user!.id) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.post('/read-all', authenticate, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: {
        recipientId: req.user!.id,
        isRead: false,
      },
      data: { isRead: true },
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
});

export default router;
