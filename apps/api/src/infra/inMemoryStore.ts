import type {
  ApprovalRequest,
  AuthSession,
  AuditEvent,
  Conversation,
  ConnectedSupabaseProject,
  Message,
  SupabaseIntegration,
  User,
  Workspace,
  WorkspaceMembership
} from "../domain/types.js";

const users = new Map<string, User>();
const workspaces = new Map<string, Workspace>();
const memberships = new Map<string, WorkspaceMembership>();
const projects = new Map<string, ConnectedSupabaseProject>();
const conversations = new Map<string, Conversation>();
const messages = new Map<string, Message>();
const approvals = new Map<string, ApprovalRequest>();
const auditEvents = new Map<string, AuditEvent>();
const sessions = new Map<string, AuthSession>();
const integrations = new Map<string, SupabaseIntegration>();

const membershipKey = (workspaceId: string, userId: string) => `${workspaceId}:${userId}`;

export const db = {
  users,
  workspaces,
  memberships,
  projects,
  conversations,
  messages,
  approvals,
  auditEvents,
  sessions,
  integrations,
  membershipKey
};
