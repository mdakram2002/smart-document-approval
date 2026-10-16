-- Persist the approvers selected for each workflow stage. Existing workflows
-- must be configured by an administrator before they can accept submissions.
CREATE TABLE "WorkflowStageApprover" (
    "id" TEXT NOT NULL,
    "workflowStageId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkflowStageApprover_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkflowStageApprover_workflowStageId_approverId_key"
    ON "WorkflowStageApprover"("workflowStageId", "approverId");
CREATE INDEX "WorkflowStageApprover_approverId_idx"
    ON "WorkflowStageApprover"("approverId");

ALTER TABLE "WorkflowStageApprover"
    ADD CONSTRAINT "WorkflowStageApprover_workflowStageId_fkey"
    FOREIGN KEY ("workflowStageId") REFERENCES "WorkflowStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkflowStageApprover"
    ADD CONSTRAINT "WorkflowStageApprover_approverId_fkey"
    FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Permit several assigned approvers to make independent decisions at the same stage.
DROP INDEX IF EXISTS "ApprovalRecord_workflowInstanceId_workflowStageId_key";
CREATE UNIQUE INDEX "ApprovalRecord_workflowInstanceId_workflowStageId_approverId_key"
    ON "ApprovalRecord"("workflowInstanceId", "workflowStageId", "approverId");
