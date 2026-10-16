import test from 'node:test';
import assert from 'node:assert/strict';
import { registerSchema, createWorkflowSchema, approveRejectSchema, returnForChangesSchema } from '../src/utils/validation.js';
import { ApprovalDecision, DocumentStatus } from '@prisma/client-runtime-v2';
import { approvalActionError, resolveApprovalTransition } from '../src/services/workflowRules.js';

test('public registration accepts valid profile data and strips any requested role', () => {
  const input = registerSchema.parse({ email: 'person@example.com', password: 'long-password', name: 'Person', role: 'ADMIN' });
  assert.equal('role' in input, false);
});

test('workflow configuration requires an assigned approver at every stage', () => {
  const result = createWorkflowSchema.safeParse({ name: 'Review', category: 'General', stages: [{ name: 'Manager', approverIds: [] }] });
  assert.equal(result.success, false);
});

test('reject and return decisions require a nonempty reason', () => {
  assert.equal(approveRejectSchema.safeParse({ comment: '' }).success, false);
  assert.equal(returnForChangesSchema.safeParse({ comment: 'Please add the missing details' }).success, true);
});

test('only the assigned approver can act on an active current-stage task', () => {
  const active = {
    actorId: 'approver-1', assignedApproverId: 'approver-1',
    documentStatus: DocumentStatus.PENDING_APPROVAL,
    documentWorkflowInstanceId: 'run-1', taskWorkflowInstanceId: 'run-1',
    currentStage: 1, taskStage: 1, decision: ApprovalDecision.PENDING,
  };
  assert.equal(approvalActionError(active), null);
  assert.equal(approvalActionError({ ...active, actorId: 'other-user' }), 'FORBIDDEN');
  assert.equal(approvalActionError({ ...active, taskStage: 2 }), 'CONFLICT');
  assert.equal(approvalActionError({ ...active, decision: ApprovalDecision.APPROVED }), 'CONFLICT');
});

test('approval waits for all approvers at a stage, then advances one stage at a time', () => {
  assert.deepEqual(resolveApprovalTransition(ApprovalDecision.APPROVED, 1, 1, [1, 2]), {
    status: DocumentStatus.PENDING_APPROVAL, currentStage: 1, completed: false,
  });
  assert.deepEqual(resolveApprovalTransition(ApprovalDecision.APPROVED, 1, 0, [1, 2]), {
    status: DocumentStatus.PENDING_APPROVAL, currentStage: 2, completed: false,
  });
  assert.deepEqual(resolveApprovalTransition(ApprovalDecision.APPROVED, 2, 0, [1, 2]), {
    status: DocumentStatus.APPROVED, currentStage: 2, completed: true,
  });
});

test('rejection and return terminate the current workflow revision', () => {
  assert.equal(resolveApprovalTransition(ApprovalDecision.REJECTED, 1, 0, [1, 2]).status, DocumentStatus.REJECTED);
  assert.equal(resolveApprovalTransition(ApprovalDecision.RETURNED, 1, 0, [1, 2]).status, DocumentStatus.RETURNED_FOR_CHANGES);
});
