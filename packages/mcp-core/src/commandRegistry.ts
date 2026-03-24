import type { CommandSpec } from "./types.js";

const specs: Record<string, CommandSpec> = {
  list_projects: {
    name: "list_projects",
    description: "List Supabase projects in workspace context.",
    riskLevel: "low",
    requiredRole: "viewer",
    requiresApproval: false
  },
  list_tables: {
    name: "list_tables",
    description: "List database tables for a Supabase project.",
    riskLevel: "low",
    requiredRole: "viewer",
    requiresApproval: false
  },
  list_databases: {
    name: "list_databases",
    description: "List logical databases for a project connection.",
    riskLevel: "low",
    requiredRole: "viewer",
    requiresApproval: false
  },
  create_project: {
    name: "create_project",
    description: "Create a new managed project connection.",
    riskLevel: "medium",
    requiredRole: "admin",
    requiresApproval: false
  },
  create_database: {
    name: "create_database",
    description: "Create a logical tenant database in a project.",
    riskLevel: "high",
    requiredRole: "admin",
    requiresApproval: true
  },
  grant_admin_access: {
    name: "grant_admin_access",
    description: "Grant a workspace member admin access.",
    riskLevel: "high",
    requiredRole: "owner",
    requiresApproval: true
  },
  run_sql_read: {
    name: "run_sql_read",
    description: "Run read-only SQL query.",
    riskLevel: "medium",
    requiredRole: "operator",
    requiresApproval: false
  },
  run_sql_write: {
    name: "run_sql_write",
    description: "Run write or DDL SQL query.",
    riskLevel: "high",
    requiredRole: "admin",
    requiresApproval: true
  },
  approve_request: {
    name: "approve_request",
    description: "Approve a pending management request.",
    riskLevel: "medium",
    requiredRole: "admin",
    requiresApproval: false
  },
  reject_request: {
    name: "reject_request",
    description: "Reject a pending management request.",
    riskLevel: "medium",
    requiredRole: "admin",
    requiresApproval: false
  },
  list_approvals: {
    name: "list_approvals",
    description: "List all pending approval requests.",
    riskLevel: "low",
    requiredRole: "viewer",
    requiresApproval: false
  }
};

export class CommandRegistry {
  get(command: string): CommandSpec | undefined {
    return specs[command];
  }

  list(): CommandSpec[] {
    return Object.values(specs);
  }
}
