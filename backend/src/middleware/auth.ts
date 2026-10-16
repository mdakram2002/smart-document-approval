import { Request, Response, NextFunction } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { env } from '../utils/env.js';

const prisma = new PrismaClient();

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  let decoded: JwtPayload;
  try {
    const payload = jwt.verify(authHeader.substring(7), env.JWT_ACCESS_SECRET);
    if (typeof payload === 'string' || typeof payload.id !== 'string') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    decoded = payload;
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    // Read current role and status so an old token cannot retain revoked access.
    const user = await prisma.user.findUnique({
      where: { id: decoded.id as string },
      select: { id: true, email: true, name: true, role: true, status: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    return next();
  };
};
