export type UserRole = 'ADMIN' | 'SUBMITTER' | 'APPROVER';
export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type DocumentStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'RETURNED_FOR_CHANGES';
export type ApprovalDecision = 'PENDING' | 'APPROVED' | 'REJECTED' | 'RETURNED';
export type NotificationType = 'DOCUMENT_SUBMITTED' | 'DOCUMENT_APPROVED' | 'DOCUMENT_REJECTED' | 'DOCUMENT_RETURNED' | 'DOCUMENT_RESUBMITTED' | 'DOCUMENT_WITHDRAWN' | 'WORKFLOW_ASSIGNED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Document {
  id: string;
  title: string;
  description: string;
  category: string;
  status: DocumentStatus;
  version: number;
  submitterId: string;
  submitter: {
    id: string;
    name: string;
    email: string;
  };
  attachments: Attachment[];
  workflowInstanceId: string | null;
  workflowInstance?: WorkflowInstance;
  currentStage: number | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  finalDecisionAt: string | null;
}

export interface Attachment {
  id: string;
  documentId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  createdAt: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string | null;
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  stages: WorkflowStage[];
  _count?: {
    instances: number;
  };
}

export interface WorkflowStage {
  id: string;
  workflowDefinitionId: string;
  stageOrder: number;
  name: string;
  description: string | null;
  createdAt: string;
  approverAssignments?: { id: string; approverId: string; approver: Pick<User, 'id' | 'name' | 'email' | 'status'> }[];
}

export interface WorkflowInstance {
  id: string;
  documentId: string;
  document: Document;
  workflowDefinitionId: string;
  revisionNumber: number;
  createdAt: string;
  completedAt: string | null;
  workflowDefinition: WorkflowDefinition;
  approvalRecords: ApprovalRecord[];
}

export interface ApprovalRecord {
  id: string;
  workflowInstanceId: string;
  workflowInstance: WorkflowInstance;
  workflowStageId: string;
  workflowStage: WorkflowStage;
  approverId: string;
  approver: {
    id: string;
    name: string;
    email: string;
  };
  decision: ApprovalDecision;
  comment: string | null;
  decisionAt: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  documentId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  actorId: string;
  actor: {
    id: string;
    name: string;
    email: string;
  };
  action: string;
  entityType: string;
  entityId: string;
  previousState: string | null;
  newState: string | null;
  metadata: string | null;
  timestamp: string;
}

export interface DashboardSummary {
  totalDocuments?: number;
  pendingDocuments?: number;
  approvedDocuments?: number;
  rejectedDocuments?: number;
  returnedDocuments?: number;
  activeUsers?: number;
  pendingApprovals?: number;
  recentActivity?: AuditEntry[];
  drafts?: number;
  recentDocuments?: Document[];
  pendingTasks?: number;
  completedTasks?: number;
  recentApprovals?: ApprovalRecord[];
}
