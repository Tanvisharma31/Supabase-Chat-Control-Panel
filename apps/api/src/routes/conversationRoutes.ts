import { Router } from "express";
import { z } from "zod";
import {
  CommandRegistry,
  McpOrchestrator,
  MockSupabaseMcpClient,
  RealSupabaseMcpClient
} from "../../../../packages/mcp-core/src/index.js";
import { withTenantAccess, type TenantRequest } from "../middleware/tenantAccess.js";
import {
  appendMessage,
  createConversation,
  listConversationMessages
} from "../conversation/conversationService.js";
import { routeIntent } from "../conversation/intentRouter.js";
import { createApprovalRequest, reviewApprovalRequest } from "../guardrails/approvalService.js";
import { appendAuditEvent } from "../guardrails/auditService.js";
import { evaluatePolicy } from "../guardrails/policyEngine.js";
import { db } from "../infra/inMemoryStore.js";
import { upsertMembership } from "../auth/rbac.js";

const createConversationSchema = z.object({
  channel: z.enum(["web", "slack", "discord", "teams"]).default("web")
});

const sendMessageSchema = z.object({
  content: z.string().min(1),
  projectRef: z.string().min(1).optional(),
  databaseName: z.string().min(1).optional(),
  region: z.string().min(1).optional()
});

export const conversationRouter = Router({ mergeParams: true });
let _orchestrator: McpOrchestrator;
const getOrchestrator = () => {
  if (!_orchestrator) {
    const client = process.env.SUPABASE_MCP_COMMAND
      ? RealSupabaseMcpClient.fromEnv()
      : new MockSupabaseMcpClient();
    _orchestrator = new McpOrchestrator(new CommandRegistry(), client);
  }
  return _orchestrator;
};
const commandRegistry = new CommandRegistry();

conversationRouter.post("/", withTenantAccess("viewer"), (request: TenantRequest, response) => {
  if (!request.workspaceId || !request.actor) {
    response.status(400).json({ error: "Missing tenant context." });
    return;
  }

  const parsed = createConversationSchema.safeParse(request.body ?? {});
  if (!parsed.success) {
    response.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const conversation = createConversation(
    request.workspaceId,
    request.actor.id,
    parsed.data.channel
  );
  response.status(201).json(conversation);
});

conversationRouter.get("/", withTenantAccess("viewer"), (request: TenantRequest, response) => {
  const conversations = [...db.conversations.values()]
    .filter((conversation) => conversation.workspaceId === request.workspaceId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  response.json(conversations);
});

conversationRouter.get(
  "/:conversationId/messages",
  withTenantAccess("viewer"),
  (request: TenantRequest, response) => {
    const messages = listConversationMessages(request.params.conversationId);
    response.json(messages);
  }
);

conversationRouter.post(
  "/:conversationId/messages",
  withTenantAccess("viewer"),
  async (request: TenantRequest, response) => {
    if (!request.workspaceId) {
      response.status(400).json({ error: "Missing tenant context." });
      return;
    }
    const parsed = sendMessageSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const userMessage = appendMessage(
      request.params.conversationId,
      request.workspaceId,
      "user",
      parsed.data.content
    );
    const intent = routeIntent(parsed.data.content);
    const spec = commandRegistry.get(intent.action);
    const decision = evaluatePolicy(spec, request.membership?.role);

    if (!decision.allowed || !request.actor) {
      appendAuditEvent(
        request.workspaceId,
        request.actor?.id ?? "unknown",
        intent.action,
        "denied",
        { reason: decision.reason ?? "Policy denied." }
      );
      response.status(403).json({ error: decision.reason ?? "Command denied." });
      return;
    }

    if (decision.requiresApproval) {
      const approval = createApprovalRequest(
        request.workspaceId,
        request.params.conversationId,
        intent.action,
        intent.parameters,
        request.actor.id
      );
      appendAuditEvent(
        request.workspaceId,
        request.actor.id,
        intent.action,
        "pending_approval",
        { approvalId: approval.id }
      );
      const assistantMessage = appendMessage(
        request.params.conversationId,
        request.workspaceId,
        "assistant",
        `Approval required for ${intent.action}. Request id: ${approval.id}`
      );
      response.status(202).json({ userMessage, assistantMessage, intent, approval });
      return;
    }

    if (intent.action === "grant_admin_access") {
      const targetUserId = intent.parameters.userId;
      if (!targetUserId || !request.workspaceId) {
        response.status(400).json({ error: "Missing target user for admin grant." });
        return;
      }

      const existingUser = db.users.get(targetUserId);
      if (!existingUser) {
        db.users.set(targetUserId, {
          id: targetUserId,
          email: `${targetUserId}@local.dev`,
          displayName: `User ${targetUserId}`
        });
      }

      upsertMembership({
        workspaceId: request.workspaceId,
        userId: targetUserId,
        role: "admin"
      });

      const assistantMessage = appendMessage(
        request.params.conversationId,
        request.workspaceId,
        "assistant",
        `Granted admin access in workspace ${request.workspaceId} to ${targetUserId}.`
      );
      appendAuditEvent(
        request.workspaceId,
        request.actor.id,
        intent.action,
        "executed",
        { targetUserId }
      );
      response.status(201).json({
        userMessage,
        assistantMessage,
        intent,
        result: { ok: true, command: intent.action, riskLevel: intent.riskLevel }
      });
      return;
    }

    if (intent.action === "approve_request") {
      const approvalId = intent.parameters.id;
      const approval = db.approvals.get(approvalId);
      if (!approval || approval.workspaceId !== request.workspaceId) {
        response.status(404).json({ error: "Approval request not found." });
        return;
      }

      reviewApprovalRequest(approvalId, request.actor.id, "approved");
      
      const integration = db.integrations.get(approval.requestedBy);
      const result = await getOrchestrator().execute({
        command: approval.command,
        context: {
          workspaceId: request.workspaceId,
          actorId: approval.requestedBy,
          projectRef: String(approval.parameters.projectRef ?? ""),
          databaseName: String(approval.parameters.databaseName ?? ""),
          supabaseAccessToken: integration?.accessToken,
          supabaseOrganizationId: integration?.organizationId
        },
        payload: approval.parameters
      });

      const assistantMessage = appendMessage(
        request.params.conversationId,
        request.workspaceId,
        "assistant",
        result.ok
          ? `✅ Approved & Executed ${approval.command}: ${JSON.stringify(result.data)}`
          : `❌ Approved but failed execution: ${result.error}`
      );
      
      appendAuditEvent(request.workspaceId, request.actor.id, "approve_request", "executed", { approvalId });
      response.status(200).json({ userMessage, assistantMessage, intent, result });
      return;
    }

    if (intent.action === "reject_request") {
      const approvalId = intent.parameters.id;
      reviewApprovalRequest(approvalId, request.actor.id, "rejected");
      const assistantMessage = appendMessage(
        request.params.conversationId,
        request.workspaceId,
        "assistant",
        `Rejected management request ${approvalId}.`
      );
      appendAuditEvent(request.workspaceId, request.actor.id, "reject_request", "executed", { approvalId });
      response.status(200).json({ userMessage, assistantMessage, intent });
      return;
    }

    if (intent.action === "list_approvals") {
      const approvals = [...db.approvals.values()]
        .filter(a => a.workspaceId === request.workspaceId && a.status === "pending");
      const content = approvals.length > 0
        ? `Pending Approvals:\n${approvals.map(a => `- [${a.id.slice(0,8)}] ${a.command} by ${a.requestedBy}`).join("\n")}`
        : "No pending approvals.";
      const assistantMessage = appendMessage(
        request.params.conversationId,
        request.workspaceId,
        "assistant",
        content
      );
      response.status(200).json({ userMessage, assistantMessage, intent });
      return;
    }

    const integration = db.integrations.get(request.actor.id);
    if (
      process.env.SUPABASE_MCP_COMMAND &&
      !integration &&
      intent.action !== "unknown"
    ) {
      const assistantMessage = appendMessage(
        request.params.conversationId,
        request.workspaceId,
        "assistant",
        "Connect your Supabase access token first. Open Profile -> Access Tokens in Supabase, create a token, then use Connect Supabase in the UI."
      );
      response.status(400).json({
        userMessage,
        assistantMessage,
        intent,
        error: "Supabase integration required for this workspace action."
      });
      return;
    }

    const result = await getOrchestrator().execute({
      command: intent.action,
      context: {
        workspaceId: request.workspaceId,
        actorId: request.actor?.id ?? "unknown",
        projectRef: String(request.body?.projectRef ?? ""),
        databaseName: String(request.body?.databaseName ?? ""),
        supabaseAccessToken: integration?.accessToken,
        supabaseOrganizationId: integration?.organizationId
      },
      payload: {
        ...intent.parameters,
        projectRef: request.body?.projectRef ?? intent.parameters.projectRef,
        databaseName: request.body?.databaseName ?? intent.parameters.databaseName,
        region: request.body?.region ?? "us-east-1"
      }
    });

    const assistantMessage = appendMessage(
      request.params.conversationId,
      request.workspaceId,
      "assistant",
      result.ok
        ? `Executed ${intent.action}: ${JSON.stringify(result.data)}`
        : `Failed ${intent.action}: ${result.error}`
    );

    appendAuditEvent(
      request.workspaceId,
      request.actor.id,
      intent.action,
      result.ok ? "executed" : "failed",
      { riskLevel: intent.riskLevel }
    );

    response.status(201).json({ userMessage, assistantMessage, intent, result });
  }
);
