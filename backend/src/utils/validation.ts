import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const createDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required').max(2000),
  category: z.string().min(1, 'Category is required'),
});

export const updateDocumentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(2000).optional(),
  category: z.string().min(1).optional(),
});

const workflowStageSchema = z.object({
  name: z.string().min(1, 'Stage name is required'),
  description: z.string().max(500).optional(),
  approverIds: z.array(z.string().uuid()).min(1, 'Assign at least one approver to every stage'),
});

export const createWorkflowSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(500).optional(),
  category: z.string().min(1, 'Category is required'),
  stages: z.array(workflowStageSchema).min(1, 'At least one stage is required'),
}).strict();

export const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  category: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  stages: z.array(workflowStageSchema).min(1, 'At least one stage is required').optional(),
}).strict();

export const approvalDecisionSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'RETURNED']),
  comment: z.string().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  role: z.enum(['ADMIN', 'SUBMITTER', 'APPROVER']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const approveRejectSchema = z.object({
  comment: z.string().min(1, 'Comment is required for rejection'),
});

export const returnForChangesSchema = z.object({
  comment: z.string().min(1, 'Comment is required to return for changes'),
});
