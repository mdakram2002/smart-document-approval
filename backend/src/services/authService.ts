import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { UserRole, UserStatus } from '@prisma/client-runtime-v2';
import { env } from '../utils/env.js';
import { randomUUID } from 'crypto';
import { prisma } from '../db.js';


export const register = async (email: string, password: string, name: string) => {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error('User already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { email, password: hashedPassword, name, role: UserRole.SUBMITTER, status: UserStatus.ACTIVE },
      select: { id: true, email: true, name: true, role: true, status: true },
    });
    await tx.auditEntry.create({ data: {
      actorId: created.id, action: 'USER_CREATED', entityType: 'User', entityId: created.id,
      newState: JSON.stringify({ email: created.email, name: created.name, role: created.role, status: created.status }),
    } });
    return created;
  });

  return user;
};

export const login = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw new Error('Invalid credentials');
  }

  if (user.status !== UserStatus.ACTIVE) {
    throw new Error('Account is inactive');
  }

  const accessTokenId = randomUUID();
  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as SignOptions['expiresIn'], jwtid: accessTokenId }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as SignOptions['expiresIn'] }
  );

  await prisma.auditEntry.create({ data: {
    actorId: user.id, action: 'LOGIN', entityType: 'User', entityId: user.id,
  } });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
    },
    accessToken,
    refreshToken,
  };
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};
