import { CommandRegistry } from "./commandRegistry.js";
import type { CommandRequest, CommandResult } from "./types.js";
import type { SupabaseMcpClient } from "./supabaseMcpClient.js";

export class McpOrchestrator {
  constructor(
    private readonly registry: CommandRegistry,
    private readonly client: SupabaseMcpClient
  ) {}

  async execute(request: CommandRequest): Promise<CommandResult> {
    const spec = this.registry.get(request.command);
    if (!spec) {
      return {
        ok: false,
        command: request.command,
        riskLevel: "low",
        error: "Unknown command."
      };
    }

    try {
      const data = await this.dispatch(
        request.command,
        request.payload,
        request.context.workspaceId,
        request.context
      );
      return {
        ok: true,
        command: request.command,
        riskLevel: spec.riskLevel,
        data
      };
    } catch (error) {
      return {
        ok: false,
        command: request.command,
        riskLevel: spec.riskLevel,
        error: (error as Error).message
      };
    }
  }

  private async dispatch(
    command: string,
    payload: Record<string, unknown>,
    workspaceId: string,
    context: CommandRequest["context"]
  ): Promise<unknown> {
    if (command === "list_projects") {
      return this.client.listProjects(workspaceId, context);
    }
    if (command === "create_project") {
      return this.client.createProject(
        workspaceId,
        String(payload.name ?? ""),
        String(payload.region ?? "us-east-1"),
        context
      );
    }
    if (command === "list_databases") {
      return this.client.listDatabases(String(payload.projectRef ?? ""), context);
    }
    if (command === "create_database") {
      return this.client.createDatabase(
        String(payload.projectRef ?? ""),
        String(payload.databaseName ?? ""),
        context
      );
    }
    if (command === "list_tables") {
      return this.client.listTables(String(payload.projectRef ?? ""), context);
    }
    if (command === "run_sql_read" || command === "run_sql_write") {
      return this.client.executeSql(
        String(payload.projectRef ?? ""),
        String(payload.sql ?? ""),
        String(payload.databaseName ?? ""),
        context
      );
    }
    if (command === "grant_admin_access") {
      if (this.client.grantAdminAccess) {
        return this.client.grantAdminAccess(workspaceId, String(payload.userId ?? ""), context);
      }
      return { workspaceId, userId: payload.userId, granted: true };
    }
    throw new Error("Unhandled command: " + command);
  }
}
