import { db } from "../infra/inMemoryStore.js";
import type { ApprovalRequest } from "../domain/types.js";

export const createApprovalRequest = (
  workspaceId: string,
  conversationId: string,
  command: string,
  parameters: Record<string, string>,
  requestedBy: string
): ApprovalRequest => {
  const approval: ApprovalRequest = {
    id: crypto.randomUUID(),
    workspaceId,
    conversationId,
    command,
    parameters,
    status: "pending",
    requestedBy,
    requestedAt: new Date().toISOString()
  };
  db.approvals.set(approval.id, approval);
  return approval;
};

export const reviewApprovalRequest = (
  approvalId: string,
  reviewerId: string,
  decision: "approved" | "rejected"
): ApprovalRequest | undefined => {
  const current = db.approvals.get(approvalId);
  if (!current || current.status !== "pending") {
    return current;
  }
  const updated: ApprovalRequest = {
    ...current,
    status: decision,
    reviewedBy: reviewerId,
    reviewedAt: new Date().toISOString()
  };
  db.approvals.set(approvalId, updated);
  return updated;
};
