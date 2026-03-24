import { Router } from "express";
import { z } from "zod";
import { withTenantAccess, type TenantRequest } from "../middleware/tenantAccess.js";
import { listAuditEvents } from "../guardrails/auditService.js";
import { reviewApprovalRequest } from "../guardrails/approvalService.js";

const approvalReviewSchema = z.object({
  decision: z.enum(["approved", "rejected"])
});

export const governanceRouter = Router({ mergeParams: true });

governanceRouter.get("/audit-events", withTenantAccess("admin"), async (request: TenantRequest, response) => {
  if (!request.workspaceId) {
    response.status(400).json({ error: "Missing workspace context." });
    return;
  }
  response.json(await listAuditEvents(request.workspaceId));
});

governanceRouter.post(
  "/approvals/:approvalId/review",
  withTenantAccess("admin"),
  async (request: TenantRequest, response) => {
    const parsed = approvalReviewSchema.safeParse(request.body);
    if (!parsed.success || !request.actor) {
      response.status(400).json({ error: "Invalid review payload." });
      return;
    }
    if (!request.workspaceId) {
      response.status(400).json({ error: "Missing workspace context." });
      return;
    }
    const approval = await reviewApprovalRequest(
      request.workspaceId,
      request.params.approvalId,
      request.actor.id,
      parsed.data.decision
    );
    if (!approval) {
      response.status(404).json({ error: "Approval request not found." });
      return;
    }
    response.json(approval);
  }
);
