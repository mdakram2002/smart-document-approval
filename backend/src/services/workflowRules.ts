import { ApprovalDecision, DocumentStatus } from '@prisma/client-runtime-v2';

export type ApprovalTaskState = {
  actorId: string;
  assignedApproverId: string;
  documentStatus: DocumentStatus;
  documentWorkflowInstanceId: string | null;
  taskWorkflowInstanceId: string;
  currentStage: number | null;
  taskStage: number;
  decision: ApprovalDecision;
};

export function approvalActionError(state: ApprovalTaskState): 'FORBIDDEN' | 'CONFLICT' | null {
  if (state.actorId !== state.assignedApproverId) return 'FORBIDDEN';
  if (
    state.documentStatus !== DocumentStatus.PENDING_APPROVAL ||
    state.documentWorkflowInstanceId !== state.taskWorkflowInstanceId ||
    state.currentStage !== state.taskStage ||
    state.decision !== ApprovalDecision.PENDING
  ) return 'CONFLICT';
  return null;
}

export function resolveApprovalTransition(
  decision: ApprovalDecision,
  currentStage: number,
  outstandingApprovers: number,
  orderedStageNumbers: number[],
): { status: DocumentStatus; currentStage: number | null; completed: boolean } {
  if (decision === ApprovalDecision.REJECTED) {
    return { status: DocumentStatus.REJECTED, currentStage, completed: true };
  }
  if (decision === ApprovalDecision.RETURNED) {
    return { status: DocumentStatus.RETURNED_FOR_CHANGES, currentStage, completed: true };
  }
  if (outstandingApprovers > 0) {
    return { status: DocumentStatus.PENDING_APPROVAL, currentStage, completed: false };
  }
  const nextStage = orderedStageNumbers.find((stage) => stage > currentStage);
  return nextStage
    ? { status: DocumentStatus.PENDING_APPROVAL, currentStage: nextStage, completed: false }
    : { status: DocumentStatus.APPROVED, currentStage, completed: true };
}
