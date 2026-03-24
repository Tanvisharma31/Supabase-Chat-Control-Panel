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

  const deleteProjectMatch = value.match(/^delete project\s+([a-z0-9_]+)\s*$/i);
  if (deleteProjectMatch) {
    return {
      action: "delete_project",
      riskLevel: "high",
      parameters: { projectRef: deleteProjectMatch[1].trim() }
    };
  }

  if (value === "delete project") {
    return { action: "delete_project", riskLevel: "high", parameters: {} };
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

  const listTablesInMatch = value.match(/^list tables\s+in\s+([a-z0-9_]+)\s*$/i);
  if (listTablesInMatch) {
    return {
      action: "list_tables",
      riskLevel: "low",
      parameters: { projectRef: listTablesInMatch[1].trim() }
    };
  }

  if (value.includes("list tables") || value.includes("show tables")) {
    return { action: "list_tables", riskLevel: "low", parameters: {} };
  }

  const listBranchesInMatch = value.match(/^list branches\s+in\s+([a-z0-9_]+)\s*$/i);
  if (listBranchesInMatch) {
    return {
      action: "list_branches",
      riskLevel: "low",
      parameters: { projectRef: listBranchesInMatch[1].trim() }
    };
  }

  if (value.includes("list branches") || value.includes("show branches")) {
    return { action: "list_branches", riskLevel: "low", parameters: {} };
  }

  const createBranchMatch = value.match(/^create branch\s+([a-z0-9_\-]+)$/i);
  if (createBranchMatch) {
    return {
      action: "create_branch",
      riskLevel: "high",
      parameters: { branchName: createBranchMatch[1].trim() }
    };
  }

  const listEdgeInMatch = value.match(/^list edge functions?\s+in\s+([a-z0-9_]+)\s*$/i);
  if (listEdgeInMatch) {
    return {
      action: "list_edge_functions",
      riskLevel: "low",
      parameters: { projectRef: listEdgeInMatch[1].trim() }
    };
  }

  if (value.includes("list edge functions") || value.includes("show edge functions")) {
    return { action: "list_edge_functions", riskLevel: "low", parameters: {} };
  }

  const deployEdgeMatch = value.match(/^deploy edge function\s+([a-z0-9_\-]+)$/i);
  if (deployEdgeMatch) {
    return {
      action: "deploy_edge_function",
      riskLevel: "high",
      parameters: { functionName: deployEdgeMatch[1].trim() }
    };
  }

  if (value.includes("seed ecommerce") || value.includes("seed dummy")) {
    return {
      action: "seed_dummy_data",
      riskLevel: "high",
      parameters: { template: "ecommerce" }
    };
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
    (value.includes("delete ") && !value.startsWith("delete project")) ||
    value.includes("alter ") ||
    value.includes("drop ") ||
    (value.includes("create ") && !value.startsWith("create project") && !value.startsWith("create database") && !value.startsWith("create branch"))
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
