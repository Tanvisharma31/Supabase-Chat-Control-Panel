import { PGlite } from "@electric-sql/pglite";
import path from "path";
import { fileURLToPath } from "url";
import { readFile } from "fs/promises";
import type {
  ApprovalRequest,
  AuditEvent,
  AuthSession,
  ConnectedSupabaseProject,
  Conversation,
  Message,
  Role,
  SupabaseIntegration,
  User,
  Workspace,
  WorkspaceMembership
} from "../domain/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "../../../../.control-plane-db");
const schemaPath = path.resolve(__dirname, "../../../../db/schema/001_control_plane.sql");

let clientPromise: Promise<PGlite> | undefined;

const getClient = async (): Promise<PGlite> => {
  if (!clientPromise) {
    clientPromise = (async () => {
      const client = new PGlite(dataDir);
      const schema = await readFile(schemaPath, "utf-8");
      await client.exec(schema);
      return client;
    })();
  }
  return clientPromise;
};

const one = <T>(rows: T[]): T | undefined => rows[0];

export const repository = {
  async upsertUser(user: User): Promise<User> {
    const db = await getClient();
    await db.query(
      `insert into users (id, email, display_name)
       values ($1, $2, $3)
       on conflict (id) do update
         set email = excluded.email,
             display_name = excluded.display_name`,
      [user.id, user.email, user.displayName]
    );
    return user;
  },

  async findUserById(id: string): Promise<User | undefined> {
    const db = await getClient();
    const result = await db.query<{ id: string; email: string; display_name: string }>(
      "select id, email, display_name from users where id = $1 limit 1",
      [id]
    );
    const row = one(result.rows);
    if (!row) return undefined;
    return { id: row.id, email: row.email, displayName: row.display_name };
  },

  async findUserByEmail(email: string): Promise<User | undefined> {
    const db = await getClient();
    const result = await db.query<{ id: string; email: string; display_name: string }>(
      "select id, email, display_name from users where lower(email) = lower($1) limit 1",
      [email]
    );
    const row = one(result.rows);
    if (!row) return undefined;
    return { id: row.id, email: row.email, displayName: row.display_name };
  },

  async createSession(userId: string): Promise<AuthSession> {
    const db = await getClient();
    const token = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    await db.query("insert into sessions (token, user_id, created_at) values ($1, $2, $3)", [
      token,
      userId,
      createdAt
    ]);
    return { token, userId, createdAt };
  },

  async findSession(token: string): Promise<AuthSession | undefined> {
    const db = await getClient();
    const result = await db.query<{ token: string; user_id: string; created_at: string }>(
      "select token, user_id, created_at from sessions where token = $1 limit 1",
      [token]
    );
    const row = one(result.rows);
    if (!row) return undefined;
    return { token: row.token, userId: row.user_id, createdAt: row.created_at };
  },

  async deleteSession(token: string): Promise<void> {
    const db = await getClient();
    await db.query("delete from sessions where token = $1", [token]);
  },

  async createWorkspace(name: string, createdBy: string): Promise<Workspace> {
    const db = await getClient();
    const id = crypto.randomUUID();
    await db.query("insert into workspaces (id, name, created_by) values ($1, $2, $3)", [
      id,
      name,
      createdBy
    ]);
    return { id, name, createdBy };
  },

  async getWorkspace(id: string): Promise<Workspace | undefined> {
    const db = await getClient();
    const result = await db.query<{ id: string; name: string; created_by: string }>(
      "select id, name, created_by from workspaces where id = $1 limit 1",
      [id]
    );
    const row = one(result.rows);
    if (!row) return undefined;
    return { id: row.id, name: row.name, createdBy: row.created_by };
  },

  async listWorkspacesForUser(userId: string): Promise<Workspace[]> {
    const db = await getClient();
    const result = await db.query<{ id: string; name: string; created_by: string }>(
      `select w.id, w.name, w.created_by
       from workspaces w
       join workspace_memberships wm on wm.workspace_id = w.id
       where wm.user_id = $1
       order by w.created_at desc`,
      [userId]
    );
    return result.rows.map((row) => ({ id: row.id, name: row.name, createdBy: row.created_by }));
  },

  async upsertMembership(workspaceId: string, userId: string, role: Role): Promise<WorkspaceMembership> {
    const db = await getClient();
    await db.query(
      `insert into workspace_memberships (workspace_id, user_id, role)
       values ($1, $2, $3)
       on conflict (workspace_id, user_id) do update set role = excluded.role`,
      [workspaceId, userId, role]
    );
    return { workspaceId, userId, role };
  },

  async getMembership(workspaceId: string, userId: string): Promise<WorkspaceMembership | undefined> {
    const db = await getClient();
    const result = await db.query<{ workspace_id: string; user_id: string; role: Role }>(
      `select workspace_id, user_id, role
       from workspace_memberships
       where workspace_id = $1 and user_id = $2
       limit 1`,
      [workspaceId, userId]
    );
    const row = one(result.rows);
    if (!row) return undefined;
    return { workspaceId: row.workspace_id, userId: row.user_id, role: row.role };
  },

  async createProject(input: Omit<ConnectedSupabaseProject, "id">): Promise<ConnectedSupabaseProject> {
    const db = await getClient();
    const id = crypto.randomUUID();
    await db.query(
      `insert into connected_supabase_projects
       (id, workspace_id, name, project_ref, encrypted_access_token, created_by)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        id,
        input.workspaceId,
        input.name,
        input.projectRef,
        input.encryptedAccessToken,
        input.createdBy
      ]
    );
    return { id, ...input };
  },

  async listProjects(workspaceId: string): Promise<ConnectedSupabaseProject[]> {
    const db = await getClient();
    const result = await db.query<{
      id: string;
      workspace_id: string;
      name: string;
      project_ref: string;
      encrypted_access_token: string;
      created_by: string;
    }>(
      `select id, workspace_id, name, project_ref, encrypted_access_token, created_by
       from connected_supabase_projects
       where workspace_id = $1`,
      [workspaceId]
    );
    return result.rows.map((row) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      name: row.name,
      projectRef: row.project_ref,
      encryptedAccessToken: row.encrypted_access_token,
      createdBy: row.created_by
    }));
  },

  async createConversation(
    workspaceId: string,
    userId: string,
    channel: Conversation["channel"]
  ): Promise<Conversation> {
    const db = await getClient();
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    await db.query(
      "insert into conversations (id, workspace_id, channel, created_by, created_at) values ($1, $2, $3, $4, $5)",
      [id, workspaceId, channel, userId, createdAt]
    );
    return { id, workspaceId, channel, createdBy: userId, createdAt };
  },

  async getConversation(workspaceId: string, conversationId: string): Promise<Conversation | undefined> {
    const db = await getClient();
    const result = await db.query<{
      id: string;
      workspace_id: string;
      channel: Conversation["channel"];
      created_by: string;
      created_at: string;
    }>(
      `select id, workspace_id, channel, created_by, created_at
       from conversations
       where id = $1 and workspace_id = $2
       limit 1`,
      [conversationId, workspaceId]
    );
    const row = one(result.rows);
    if (!row) return undefined;
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      channel: row.channel,
      createdBy: row.created_by,
      createdAt: row.created_at
    };
  },

  async listConversations(workspaceId: string): Promise<Conversation[]> {
    const db = await getClient();
    const result = await db.query<{
      id: string;
      workspace_id: string;
      channel: Conversation["channel"];
      created_by: string;
      created_at: string;
    }>(
      `select id, workspace_id, channel, created_by, created_at
       from conversations
       where workspace_id = $1
       order by created_at desc`,
      [workspaceId]
    );
    return result.rows.map((row) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      channel: row.channel,
      createdBy: row.created_by,
      createdAt: row.created_at
    }));
  },

  async appendMessage(
    conversationId: string,
    workspaceId: string,
    role: Message["role"],
    content: string
  ): Promise<Message> {
    const db = await getClient();
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    await db.query(
      `insert into messages (id, conversation_id, workspace_id, role, content, created_at)
       values ($1, $2, $3, $4, $5, $6)`,
      [id, conversationId, workspaceId, role, content, createdAt]
    );
    return { id, conversationId, workspaceId, role, content, createdAt };
  },

  async listConversationMessages(workspaceId: string, conversationId: string): Promise<Message[]> {
    const db = await getClient();
    const result = await db.query<{
      id: string;
      conversation_id: string;
      workspace_id: string;
      role: Message["role"];
      content: string;
      created_at: string;
    }>(
      `select id, conversation_id, workspace_id, role, content, created_at
       from messages
       where workspace_id = $1 and conversation_id = $2
       order by created_at asc`,
      [workspaceId, conversationId]
    );
    return result.rows.map((row) => ({
      id: row.id,
      conversationId: row.conversation_id,
      workspaceId: row.workspace_id,
      role: row.role,
      content: row.content,
      createdAt: row.created_at
    }));
  },

  async upsertSupabaseIntegration(integration: SupabaseIntegration): Promise<SupabaseIntegration> {
    const db = await getClient();
    await db.query(
      `insert into supabase_integrations (workspace_id, user_id, encrypted_access_token, organization_id, connected_at)
       values ($1, $2, $3, $4, $5)
       on conflict (workspace_id, user_id)
       do update set encrypted_access_token = excluded.encrypted_access_token,
                     organization_id = excluded.organization_id,
                     connected_at = excluded.connected_at`,
      [
        integration.workspaceId,
        integration.userId,
        integration.accessToken,
        integration.organizationId ?? null,
        integration.connectedAt
      ]
    );
    return integration;
  },

  async getSupabaseIntegration(
    workspaceId: string,
    userId: string
  ): Promise<SupabaseIntegration | undefined> {
    const db = await getClient();
    const result = await db.query<{
      workspace_id: string;
      user_id: string;
      encrypted_access_token: string;
      organization_id: string | null;
      connected_at: string;
    }>(
      `select workspace_id, user_id, encrypted_access_token, organization_id, connected_at
       from supabase_integrations
       where workspace_id = $1 and user_id = $2
       limit 1`,
      [workspaceId, userId]
    );
    const row = one(result.rows);
    if (!row) return undefined;
    return {
      workspaceId: row.workspace_id,
      userId: row.user_id,
      accessToken: row.encrypted_access_token,
      organizationId: row.organization_id ?? undefined,
      connectedAt: row.connected_at
    };
  },

  async getLatestSupabaseIntegrationForUser(userId: string): Promise<SupabaseIntegration | undefined> {
    const db = await getClient();
    const result = await db.query<{
      workspace_id: string;
      user_id: string;
      encrypted_access_token: string;
      organization_id: string | null;
      connected_at: string;
    }>(
      `select workspace_id, user_id, encrypted_access_token, organization_id, connected_at
       from supabase_integrations
       where user_id = $1
       order by connected_at desc
       limit 1`,
      [userId]
    );
    const row = one(result.rows);
    if (!row) return undefined;
    return {
      workspaceId: row.workspace_id,
      userId: row.user_id,
      accessToken: row.encrypted_access_token,
      organizationId: row.organization_id ?? undefined,
      connectedAt: row.connected_at
    };
  },

  async createApprovalRequest(input: Omit<ApprovalRequest, "id" | "requestedAt" | "status">): Promise<ApprovalRequest> {
    const db = await getClient();
    const id = crypto.randomUUID();
    const requestedAt = new Date().toISOString();
    await db.query(
      `insert into approval_requests
       (id, workspace_id, conversation_id, command, parameters, status, requested_by, requested_at)
       values ($1, $2, $3, $4, $5::jsonb, 'pending', $6, $7)`,
      [
        id,
        input.workspaceId,
        input.conversationId,
        input.command,
        JSON.stringify(input.parameters),
        input.requestedBy,
        requestedAt
      ]
    );
    return {
      id,
      workspaceId: input.workspaceId,
      conversationId: input.conversationId,
      command: input.command,
      parameters: input.parameters,
      status: "pending",
      requestedBy: input.requestedBy,
      requestedAt
    };
  },

  async reviewApprovalRequest(
    workspaceId: string,
    approvalId: string,
    reviewerId: string,
    decision: "approved" | "rejected"
  ): Promise<ApprovalRequest | undefined> {
    const db = await getClient();
    const existing = await this.getApproval(workspaceId, approvalId);
    if (!existing || existing.status !== "pending") {
      return existing;
    }
    const reviewedAt = new Date().toISOString();
    await db.query(
      `update approval_requests
       set status = $1, reviewed_by = $2, reviewed_at = $3
       where id = $4 and workspace_id = $5`,
      [decision, reviewerId, reviewedAt, approvalId, workspaceId]
    );
    return { ...existing, status: decision, reviewedBy: reviewerId, reviewedAt };
  },

  async getApproval(workspaceId: string, approvalId: string): Promise<ApprovalRequest | undefined> {
    const db = await getClient();
    const result = await db.query<{
      id: string;
      workspace_id: string;
      conversation_id: string;
      command: string;
      parameters: Record<string, string>;
      status: "pending" | "approved" | "rejected";
      requested_by: string;
      requested_at: string;
      reviewed_by: string | null;
      reviewed_at: string | null;
    }>(
      `select id, workspace_id, conversation_id, command, parameters, status, requested_by, requested_at, reviewed_by, reviewed_at
       from approval_requests
       where id = $1 and workspace_id = $2
       limit 1`,
      [approvalId, workspaceId]
    );
    const row = one(result.rows);
    if (!row) return undefined;
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      conversationId: row.conversation_id,
      command: row.command,
      parameters: row.parameters ?? {},
      status: row.status,
      requestedBy: row.requested_by,
      requestedAt: row.requested_at,
      reviewedBy: row.reviewed_by ?? undefined,
      reviewedAt: row.reviewed_at ?? undefined
    };
  },

  async listPendingApprovals(workspaceId: string): Promise<ApprovalRequest[]> {
    const db = await getClient();
    const result = await db.query<{
      id: string;
      workspace_id: string;
      conversation_id: string;
      command: string;
      parameters: Record<string, string>;
      status: "pending";
      requested_by: string;
      requested_at: string;
      reviewed_by: string | null;
      reviewed_at: string | null;
    }>(
      `select id, workspace_id, conversation_id, command, parameters, status, requested_by, requested_at, reviewed_by, reviewed_at
       from approval_requests
       where workspace_id = $1 and status = 'pending'
       order by requested_at asc`,
      [workspaceId]
    );
    return result.rows.map((row) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      conversationId: row.conversation_id,
      command: row.command,
      parameters: row.parameters ?? {},
      status: row.status,
      requestedBy: row.requested_by,
      requestedAt: row.requested_at,
      reviewedBy: row.reviewed_by ?? undefined,
      reviewedAt: row.reviewed_at ?? undefined
    }));
  },

  async appendAuditEvent(
    workspaceId: string,
    actorId: string,
    action: string,
    outcome: AuditEvent["outcome"],
    details: Record<string, string>
  ): Promise<AuditEvent> {
    const db = await getClient();
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    await db.query(
      `insert into audit_events (id, workspace_id, actor_id, action, outcome, details, created_at)
       values ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
      [id, workspaceId, actorId, action, outcome, JSON.stringify(details), createdAt]
    );
    return { id, workspaceId, actorId, action, outcome, details, createdAt };
  },

  async listAuditEvents(workspaceId: string): Promise<AuditEvent[]> {
    const db = await getClient();
    const result = await db.query<{
      id: string;
      workspace_id: string;
      actor_id: string;
      action: string;
      outcome: AuditEvent["outcome"];
      details: Record<string, string>;
      created_at: string;
    }>(
      `select id, workspace_id, actor_id, action, outcome, details, created_at
       from audit_events
       where workspace_id = $1
       order by created_at asc`,
      [workspaceId]
    );
    return result.rows.map((row) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      actorId: row.actor_id,
      action: row.action,
      outcome: row.outcome,
      details: row.details,
      createdAt: row.created_at
    }));
  }
};
