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
import { upsertMembership } from "../auth/rbac.js";
import { repository } from "../infra/database.js";

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

const supabaseApi = async (accessToken: string, endpoint: string): Promise<Response> =>
  fetch(`https://api.supabase.com/v1${endpoint}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    }
  });

const parseConnectSupabaseCommand = (
  rawMessage: string
): { matched: boolean; accessToken?: string; organizationId?: string } => {
  const match = rawMessage.trim().match(
    /^connect\s+supabase(?:\s+(sbp_[a-z0-9]+))?(?:\s+([a-z0-9_]+))?$/i
  );
  if (!match) {
    return { matched: false };
  }
  return {
    matched: true,
    accessToken: match[1]?.trim(),
    organizationId: match[2]?.trim()
  };
};

conversationRouter.post("/", withTenantAccess("viewer"), async (request: TenantRequest, response) => {
  if (!request.workspaceId || !request.actor) {
    response.status(400).json({ error: "Missing tenant context." });
    return;
  }

  const parsed = createConversationSchema.safeParse(request.body ?? {});
  if (!parsed.success) {
    response.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const conversation = await createConversation(
    request.workspaceId,
    request.actor.id,
    parsed.data.channel
  );
  response.status(201).json(conversation);
});

conversationRouter.get("/", withTenantAccess("viewer"), async (request: TenantRequest, response) => {
  const conversations = await repository.listConversations(String(request.workspaceId));
  response.json(conversations);
});

conversationRouter.get(
  "/:conversationId/messages",
  withTenantAccess("viewer"),
  async (request: TenantRequest, response) => {
    const workspaceId = String(request.workspaceId);
    const conversation = await repository.getConversation(workspaceId, request.params.conversationId);
    if (!conversation) {
      response.status(404).json({ error: "Conversation not found." });
      return;
    }
    const messages = await listConversationMessages(workspaceId, request.params.conversationId);
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

    const conversation = await repository.getConversation(
      request.workspaceId,
      request.params.conversationId
    );
    if (!conversation) {
      response.status(404).json({ error: "Conversation not found." });
      return;
    }

    const userMessage = await appendMessage(
      request.params.conversationId,
      request.workspaceId,
      "user",
      parsed.data.content
    );
    const connectCommand = parseConnectSupabaseCommand(parsed.data.content);
    if (connectCommand.matched) {
      if (!request.actor) {
        response.status(401).json({ error: "Unauthorized" });
        return;
      }
      const envToken = process.env.SUPABASE_ACCESS_TOKEN?.trim();
      const envOrgId = process.env.SUPABASE_ORGANIZATION_ID?.trim();
      const accessToken = connectCommand.accessToken ?? envToken;
      const organizationHint = connectCommand.organizationId ?? envOrgId;

      if (!accessToken) {
        const assistantMessage = await appendMessage(
          request.params.conversationId,
          request.workspaceId,
          "assistant",
          "Supabase token missing. Use `connect supabase sbp_xxx [org_id]` in chat, or set SUPABASE_ACCESS_TOKEN in server env."
        );
        response.status(400).json({
          userMessage,
          assistantMessage,
          error: "Supabase access token required."
        });
        return;
      }

      const orgResponse = await supabaseApi(accessToken, "/organizations");
      if (!orgResponse.ok) {
        const details = await orgResponse.text();
        const assistantMessage = await appendMessage(
          request.params.conversationId,
          request.workspaceId,
          "assistant",
          "Failed to connect Supabase from chat. Verify token/org and try again."
        );
        response.status(400).json({
          userMessage,
          assistantMessage,
          error: "Failed to validate Supabase access token.",
          details
        });
        return;
      }

      const organizations = (await orgResponse.json()) as Array<{ id: string; name: string }>;
      const resolvedOrgId = organizationHint ?? organizations[0]?.id;
      if (!resolvedOrgId) {
        const assistantMessage = await appendMessage(
          request.params.conversationId,
          request.workspaceId,
          "assistant",
          "No Supabase organization found for this token."
        );
        response.status(400).json({
          userMessage,
          assistantMessage,
          error: "No organization found for this access token."
        });
        return;
      }

      await repository.upsertSupabaseIntegration({
        workspaceId: request.workspaceId,
        userId: request.actor.id,
        accessToken,
        organizationId: resolvedOrgId,
        connectedAt: new Date().toISOString()
      });

      const assistantMessage = await appendMessage(
        request.params.conversationId,
        request.workspaceId,
        "assistant",
        `Supabase connected from chat. Organization: ${resolvedOrgId}.`
      );
      response.status(200).json({
        userMessage,
        assistantMessage,
        intent: { action: "connect_supabase", riskLevel: "low", parameters: {} },
        result: { ok: true, organizationId: resolvedOrgId }
      });
      return;
    }

    const intent = routeIntent(parsed.data.content);
    const spec = commandRegistry.get(intent.action);
    const decision = evaluatePolicy(spec, request.membership?.role);

    if (!decision.allowed || !request.actor) {
      await appendAuditEvent(
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
      const approvalParameters: Record<string, string> = {
        ...intent.parameters,
        projectRef: parsed.data.projectRef ?? intent.parameters.projectRef ?? "",
        databaseName: parsed.data.databaseName ?? intent.parameters.databaseName ?? "",
        region: parsed.data.region ?? intent.parameters.region ?? "us-east-1"
      };
      const approval = await createApprovalRequest(
        request.workspaceId,
        request.params.conversationId,
        intent.action,
        approvalParameters,
        request.actor.id
      );
      await appendAuditEvent(
        request.workspaceId,
        request.actor.id,
        intent.action,
        "pending_approval",
        { approvalId: approval.id }
      );
      const assistantMessage = await appendMessage(
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

      const existingUser = await repository.findUserById(targetUserId);
      if (!existingUser) {
        await repository.upsertUser({
          id: targetUserId,
          email: `${targetUserId}@local.dev`,
          displayName: `User ${targetUserId}`
        });
      }

      await upsertMembership({
        workspaceId: request.workspaceId,
        userId: targetUserId,
        role: "admin"
      });

      const assistantMessage = await appendMessage(
        request.params.conversationId,
        request.workspaceId,
        "assistant",
        `Granted admin access in workspace ${request.workspaceId} to ${targetUserId}.`
      );
      await appendAuditEvent(
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
      const approval = approvalId
        ? await repository.getApproval(request.workspaceId, approvalId)
        : undefined;
      if (!approval) {
        response.status(404).json({ error: "Approval request not found." });
        return;
      }

      await reviewApprovalRequest(request.workspaceId, approvalId, request.actor.id, "approved");
      
      const integration = await repository.getSupabaseIntegration(
        request.workspaceId,
        approval.requestedBy
      );
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

      const assistantMessage = await appendMessage(
        request.params.conversationId,
        request.workspaceId,
        "assistant",
        result.ok
          ? `✅ Approved & Executed ${approval.command}: ${JSON.stringify(result.data)}`
          : `❌ Approved but failed execution: ${result.error}`
      );
      
      await appendAuditEvent(request.workspaceId, request.actor.id, "approve_request", "executed", { approvalId });
      response.status(200).json({ userMessage, assistantMessage, intent, result });
      return;
    }

    if (intent.action === "reject_request") {
      const approvalId = intent.parameters.id;
      if (!approvalId) {
        response.status(400).json({ error: "approval id is required." });
        return;
      }
      const reviewed = await reviewApprovalRequest(
        request.workspaceId,
        approvalId,
        request.actor.id,
        "rejected"
      );
      if (!reviewed) {
        response.status(404).json({ error: "Approval request not found." });
        return;
      }
      const assistantMessage = await appendMessage(
        request.params.conversationId,
        request.workspaceId,
        "assistant",
        `Rejected management request ${approvalId}.`
      );
      await appendAuditEvent(request.workspaceId, request.actor.id, "reject_request", "executed", { approvalId });
      response.status(200).json({ userMessage, assistantMessage, intent });
      return;
    }

    if (intent.action === "list_approvals") {
      const approvals = await repository.listPendingApprovals(request.workspaceId);
      const content = approvals.length > 0
        ? `Pending Approvals:\n${approvals.map(a => `- [${a.id.slice(0,8)}] ${a.command} by ${a.requestedBy}`).join("\n")}`
        : "No pending approvals.";
      const assistantMessage = await appendMessage(
        request.params.conversationId,
        request.workspaceId,
        "assistant",
        content
      );
      response.status(200).json({ userMessage, assistantMessage, intent });
      return;
    }

    const integration = await repository.getSupabaseIntegration(request.workspaceId, request.actor.id);
    if (
      process.env.SUPABASE_MCP_COMMAND &&
      !integration &&
      intent.action !== "unknown"
    ) {
      const assistantMessage = await appendMessage(
        request.params.conversationId,
        request.workspaceId,
        "assistant",
        "Connect Supabase from chat first. Run `connect supabase` (uses server env) or `connect supabase sbp_xxx [org_id]`."
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

    const assistantMessage = await appendMessage(
      request.params.conversationId,
      request.workspaceId,
      "assistant",
      result.ok
        ? `Executed ${intent.action}: ${JSON.stringify(result.data)}`
        : `Failed ${intent.action}: ${result.error}`
    );

    await appendAuditEvent(
      request.workspaceId,
      request.actor.id,
      intent.action,
      result.ok ? "executed" : "failed",
      { riskLevel: intent.riskLevel }
    );

    response.status(201).json({ userMessage, assistantMessage, intent, result });
  }
);
