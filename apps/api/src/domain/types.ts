export type Role = "owner" | "admin" | "operator" | "viewer";

export interface User {
  id: string;
  email: string;
  displayName: string;
}

export interface AuthSession {
  token: string;
  userId: string;
  createdAt: string;
}

export interface SupabaseIntegration {
  userId: string;
  accessToken: string;
  organizationId?: string;
  connectedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  createdBy: string;
}

export interface WorkspaceMembership {
  workspaceId: string;
  userId: string;
  role: Role;
}

export interface ConnectedSupabaseProject {
  id: string;
  workspaceId: string;
  name: string;
  projectRef: string;
  encryptedAccessToken: string;
  createdBy: string;
}

export interface Conversation {
  id: string;
  workspaceId: string;
  channel: "web" | "slack" | "discord" | "teams";
  createdBy: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  workspaceId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

export interface CommandIntent {
  action:
    | "list_projects"
    | "create_project"
    | "list_databases"
    | "create_database"
    | "grant_admin_access"
    | "list_tables"
    | "run_sql_read"
    | "run_sql_write"
    | "approve_request"
    | "reject_request"
    | "list_approvals"
    | "unknown";
  riskLevel: "low" | "medium" | "high";
  parameters: Record<string, string>;
}

export interface ApprovalRequest {
  id: string;
  workspaceId: string;
  conversationId: string;
  command: string;
  parameters: Record<string, string>;
  status: "pending" | "approved" | "rejected";
  requestedBy: string;
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface AuditEvent {
  id: string;
  workspaceId: string;
  actorId: string;
  action: string;
  outcome: "allowed" | "denied" | "pending_approval" | "executed" | "failed";
  details: Record<string, string>;
  createdAt: string;
}
