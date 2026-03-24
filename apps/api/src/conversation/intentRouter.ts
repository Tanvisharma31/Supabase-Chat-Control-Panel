import type { CommandIntent } from "../domain/types.js";

const normalize = (input: string) => input.toLowerCase().trim();

export const routeIntent = (message: string): CommandIntent => {
  const value = normalize(message);

  const createProjectMatch = value.match(/^create project\s+(.+)$/i);
  if (createProjectMatch) {
    return {
      action: "create_project",
      riskLevel: "medium",
      parameters: { name: createProjectMatch[1].trim() }
    };
  }

  const createDatabaseMatch = value.match(/^create database\s+([a-z0-9_]+)\s+in\s+([a-z0-9_]+)$/i);
  if (createDatabaseMatch) {
    return {
      action: "create_database",
      riskLevel: "high",
      parameters: {
        databaseName: createDatabaseMatch[1].trim(),
        projectRef: createDatabaseMatch[2].trim()
      }
    };
  }

  const grantAdminMatch = value.match(/^grant admin(?: access)? to\s+([a-z0-9_\-@.]+)$/i);
  if (grantAdminMatch) {
    return {
      action: "grant_admin_access",
      riskLevel: "high",
      parameters: { userId: grantAdminMatch[1].trim() }
    };
  }

  if (value.includes("list projects") || value.includes("show projects")) {
    return { action: "list_projects", riskLevel: "low", parameters: {} };
  }

  if (value.includes("list databases") || value.includes("show databases")) {
    return { action: "list_databases", riskLevel: "low", parameters: {} };
  }

  if (value.includes("list tables") || value.includes("show tables")) {
    return { action: "list_tables", riskLevel: "low", parameters: {} };
  }

  if (value.includes("select ")) {
    return {
      action: "run_sql_read",
      riskLevel: "medium",
      parameters: { sql: message }
    };
  }

  if (
    value.includes("insert ") ||
    value.includes("update ") ||
    value.includes("delete ") ||
    value.includes("alter ") ||
    value.includes("drop ") ||
    value.includes("create ")
  ) {
    return {
      action: "run_sql_write",
      riskLevel: "high",
      parameters: { sql: message }
    };
  }

  const approveMatch = value.match(/^approve request\s+([a-z0-9-]+)$/i);
  if (approveMatch) {
    return {
      action: "approve_request",
      riskLevel: "medium",
      parameters: { id: approveMatch[1].trim() }
    };
  }

  const rejectMatch = value.match(/^reject request\s+([a-z0-9-]+)$/i);
  if (rejectMatch) {
    return {
      action: "reject_request",
      riskLevel: "medium",
      parameters: { id: rejectMatch[1].trim() }
    };
  }

  if (value.includes("list requests") || value.includes("list pending") || value.includes("show approvals")) {
    return { action: "list_approvals", riskLevel: "low", parameters: {} };
  }

  return { action: "unknown", riskLevel: "low", parameters: {} };
};
