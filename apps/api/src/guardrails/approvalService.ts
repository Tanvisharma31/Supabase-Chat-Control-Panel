import type { ApprovalRequest } from "../domain/types.js";
import { repository } from "../infra/database.js";

export const createApprovalRequest = (
  workspaceId: string,
  conversationId: string,
  command: string,
  parameters: Record<string, string>,
  requestedBy: string
): Promise<ApprovalRequest> =>
  repository.createApprovalRequest({
    workspaceId,
    conversationId,
    command,
    parameters,
    requestedBy
  });

export const reviewApprovalRequest = (
  workspaceId: string,
  approvalId: string,
  reviewerId: string,
  decision: "approved" | "rejected"
): Promise<ApprovalRequest | undefined> =>
  repository.reviewApprovalRequest(workspaceId, approvalId, reviewerId, decision);
