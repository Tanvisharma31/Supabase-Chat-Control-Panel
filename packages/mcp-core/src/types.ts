export type RiskLevel = "low" | "medium" | "high";

export interface CommandContext {
  workspaceId: string;
  actorId: string;
  projectRef?: string;
  databaseName?: string;
  supabaseAccessToken?: string;
  supabaseOrganizationId?: string;
}

export interface CommandSpec {
  name: string;
  description: string;
  riskLevel: RiskLevel;
  requiredRole: "viewer" | "operator" | "admin" | "owner";
  requiresApproval: boolean;
}

export interface CommandRequest {
  command: string;
  context: CommandContext;
  payload: Record<string, unknown>;
}

export interface CommandResult {
  ok: boolean;
  command: string;
  riskLevel: RiskLevel;
  data?: unknown;
  error?: string;
}
