import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', error);

  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  if (error.name === 'MulterError') {
    const status = (error as Error & { code?: string }).code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ error: error.message });
  }

  if (error.message === 'Unsupported attachment type') {
    return res.status(400).json({ error: error.message });
  }

  if (error.message === 'Invalid credentials') {
    return res.status(401).json({ error: error.message });
  }

  if (error.message === 'Account is inactive') {
    return res.status(403).json({ error: error.message });
  }

  if (error.message === 'User already exists') {
    return res.status(409).json({ error: error.message });
  }

  if (error.message === 'No active approvers are available') {
    return res.status(400).json({ error: error.message });
  }

  if (error.message === 'Approval task was already decided' || error.message === 'Document workflow changed concurrently') {
    return res.status(409).json({ error: error.message });
  }
  if (error.message === 'Workflow stage has no configured approvers') {
    return res.status(400).json({ error: error.message });
  }
  if (error.message === 'No active workflow with assigned active approvers is configured') {
    return res.status(400).json({ error: error.message });
  }
  if (error.message === 'Every assigned user must be an active approver') {
    return res.status(400).json({ error: error.message });
  }
  if (error.message === 'Cannot remove or deactivate the last active administrator') {
    return res.status(409).json({ error: error.message });
  }
  if (error.message === 'Cannot change an approver with pending workflow tasks') {
    return res.status(409).json({ error: error.message });
  }
  if (error.message === 'A workflow used by documents is immutable. Create a new workflow configuration for future submissions.') {
    return res.status(409).json({ error: error.message });
  }
  if (error.message === 'User not found') {
    return res.status(404).json({ error: error.message });
  }

  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (error.name === 'PrismaClientKnownRequestError') {
    // @ts-ignore
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Resource already exists' });
    }
    // @ts-ignore
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Resource not found' });
    }
    // @ts-ignore
    if (error.code === 'P2034') {
      return res.status(409).json({ error: 'Concurrent workflow update; reload and retry' });
    }
  }

  res.status(500).json({ error: 'Internal server error' });
};
