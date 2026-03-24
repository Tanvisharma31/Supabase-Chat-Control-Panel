import { z } from "zod";
import type { CommandContext } from "./types.js";

const executeSqlInput = z.object({
  projectRef: z.string().min(1),
  sql: z.string().min(1),
  databaseName: z.string().min(1).optional()
});

export interface SupabaseMcpClient {
  listProjects(workspaceId: string, context?: CommandContext): Promise<unknown>;
  createProject(
    workspaceId: string,
    name: string,
    region?: string,
    context?: CommandContext
  ): Promise<unknown>;
  listDatabases(projectRef: string, context?: CommandContext): Promise<unknown>;
  createDatabase(projectRef: string, databaseName: string, context?: CommandContext): Promise<unknown>;
  listTables(projectRef: string, context?: CommandContext): Promise<unknown>;
  executeSql(
    projectRef: string,
    sql: string,
    databaseName?: string,
    context?: CommandContext
  ): Promise<unknown>;
  grantAdminAccess?(workspaceId: string, userId: string, context?: CommandContext): Promise<unknown>;
}

export class MockSupabaseMcpClient implements SupabaseMcpClient {
  private readonly projectsByWorkspace = new Map<
    string,
    Array<{ projectRef: string; workspaceId: string; name: string; region: string }>
  >();
  private readonly databasesByProject = new Map<string, Set<string>>();

  async listProjects(workspaceId: string): Promise<unknown> {
    return this.projectsByWorkspace.get(workspaceId) ?? [];
  }

  async createProject(workspaceId: string, name: string, region = "us-east-1"): Promise<unknown> {
    const projectRef = `proj_${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`;
    const next = { projectRef, workspaceId, name, region };
    const current = this.projectsByWorkspace.get(workspaceId) ?? [];
    current.push(next);
    this.projectsByWorkspace.set(workspaceId, current);
    this.databasesByProject.set(projectRef, new Set(["postgres"]));
    return next;
  }

  async listDatabases(projectRef: string): Promise<unknown> {
    const databases = [...(this.databasesByProject.get(projectRef) ?? new Set(["postgres"]))];
    return databases.map((name) => ({ name, projectRef }));
  }

  async createDatabase(projectRef: string, databaseName: string): Promise<unknown> {
    const normalized = databaseName.trim();
    if (!normalized) {
      throw new Error("Database name is required.");
    }

    const dbs = this.databasesByProject.get(projectRef) ?? new Set(["postgres"]);
    if (dbs.has(normalized)) {
      throw new Error(`Database ${normalized} already exists.`);
    }
    dbs.add(normalized);
    this.databasesByProject.set(projectRef, dbs);
    return { projectRef, databaseName: normalized, created: true };
  }

  async listTables(projectRef: string): Promise<unknown> {
    return [
      { name: "workspaces", projectRef },
      { name: "messages", projectRef }
    ];
  }

  async executeSql(projectRef: string, sql: string, databaseName?: string): Promise<unknown> {
    const parsed = executeSqlInput.safeParse({ projectRef, sql, databaseName });
    if (!parsed.success) {
      throw new Error("Invalid SQL request for MCP.");
    }
    return { projectRef, databaseName: databaseName ?? "postgres", sql, rows: [] };
  }
}
