import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { SupabaseMcpClient } from "./supabaseMcpClient.js";
import type { CommandContext } from "./types.js";

export interface RealSupabaseMcpConfig {
  serverCommand: string;
  serverArgs: string[];
  serverEnv?: Record<string, string>;
  defaultOrganizationId?: string;
  defaultRegion?: string;
}

const splitCommand = (value: string): { command: string; args: string[] } => {
  const chunks = value.trim().split(/\s+/);
  if (!chunks.length) {
    throw new Error("SUPABASE_MCP_COMMAND is required for real MCP integration.");
  }
  return { command: chunks[0], args: chunks.slice(1) };
};

const readConfigFromEnv = (): RealSupabaseMcpConfig => {
  const raw = process.env.SUPABASE_MCP_COMMAND ?? "";
  const { command, args } = splitCommand(raw);
  const normalizedRegion = process.env.SUPABASE_PROJECT_REGION?.trim() || "us-east-1";
  return {
    serverCommand: command,
    serverArgs: args,
    serverEnv: process.env as Record<string, string>,
    defaultOrganizationId: process.env.SUPABASE_ORGANIZATION_ID,
    defaultRegion: normalizedRegion
  };
};

const mapWorkspaceToProjectName = (workspaceId: string): string =>
  `workspace_${workspaceId.replaceAll("-", "").slice(0, 12)}`;

const mapSqlToMigrationName = (sql: string): string => {
  const firstWord = sql.trim().split(/\s+/)[0]?.toLowerCase() ?? "migration";
  return `${firstWord}_${Date.now()}`;
};

export class RealSupabaseMcpClient implements SupabaseMcpClient {
  private readonly clients = new Map<string, Promise<Client>>();

  constructor(private readonly config: RealSupabaseMcpConfig) {}

  static fromEnv(): RealSupabaseMcpClient {
    return new RealSupabaseMcpClient(readConfigFromEnv());
  }

  private getClientKey(context?: CommandContext): string {
    const token = context?.supabaseAccessToken ?? this.config.serverEnv?.SUPABASE_ACCESS_TOKEN ?? "default";
    const org = context?.supabaseOrganizationId ?? this.config.defaultOrganizationId ?? "default";
    const workspace = context?.workspaceId ?? "global";
    return `${workspace}:${token}:${org}`;
  }

  private async getClient(context?: CommandContext): Promise<Client> {
    const key = this.getClientKey(context);
    if (!this.clients.has(key)) {
      this.clients.set(key, this.connect(context));
    }
    return this.clients.get(key)!;
  }

  private async connect(context?: CommandContext): Promise<Client> {
    const client = new Client(
      {
        name: "supabase-chat-control-plane",
        version: "0.1.0"
      },
      {
        capabilities: {}
      }
    );
    const mergedEnv: Record<string, string> = {
      ...(this.config.serverEnv ?? {})
    };
    if (context?.supabaseAccessToken) {
      mergedEnv.SUPABASE_ACCESS_TOKEN = context.supabaseAccessToken;
    }
    if (context?.supabaseOrganizationId) {
      mergedEnv.SUPABASE_ORGANIZATION_ID = context.supabaseOrganizationId;
    }
    const transport = new StdioClientTransport({
      command: this.config.serverCommand,
      args: this.config.serverArgs,
      env: mergedEnv
    });
    await client.connect(transport);
    return client;
  }

  private async callTool(
    name: string,
    args: Record<string, unknown>,
    context?: CommandContext
  ): Promise<unknown> {
    const client = await this.getClient(context);
    const result = await client.callTool({ name, arguments: args });
    return result;
  }

  async listProjects(_workspaceId: string, context?: CommandContext): Promise<unknown> {
    return this.callTool("list_projects", {}, context);
  }

  async createProject(
    workspaceId: string,
    name: string,
    region?: string,
    context?: CommandContext
  ): Promise<unknown> {
    const organizationId = context?.supabaseOrganizationId ?? this.config.defaultOrganizationId;
    if (!organizationId) {
      throw new Error("SUPABASE_ORGANIZATION_ID is required to create projects.");
    }

    return this.callTool("create_project", {
      name: name || mapWorkspaceToProjectName(workspaceId),
      region: region ?? this.config.defaultRegion ?? "us-east-1",
      organization_id: organizationId
    }, context);
  }

  async deleteProject(projectRef: string, context?: CommandContext): Promise<unknown> {
    return this.callTool("delete_project", { project_id: projectRef }, context);
  }

  async listDatabases(projectRef: string, context?: CommandContext): Promise<unknown> {
    // Supabase projects expose a single Postgres database. We model "databases"
    // as logical schemas so tenant data can be segmented per workspace/customer.
    const tables = (await this.callTool("list_tables", {
      project_id: projectRef,
      schemas: ["public"],
      verbose: false
    }, context)) as { structuredContent?: { schemas?: Array<{ name?: string }> } };

    const schemaNames =
      tables.structuredContent?.schemas?.map((schema) => schema.name).filter(Boolean) ?? ["public"];
    return schemaNames.map((name) => ({ name, projectRef }));
  }

  async createDatabase(
    projectRef: string,
    databaseName: string,
    context?: CommandContext
  ): Promise<unknown> {
    const schema = databaseName.trim();
    if (!schema) {
      throw new Error("databaseName is required.");
    }
    return this.callTool("apply_migration", {
      project_id: projectRef,
      name: `create_schema_${schema}_${Date.now()}`,
      query: `create schema if not exists "${schema}";`
    }, context);
  }

  async listTables(projectRef: string, context?: CommandContext): Promise<unknown> {
    return this.callTool("list_tables", {
      project_id: projectRef,
      schemas: ["public"],
      verbose: true
    }, context);
  }

  async listBranches(projectRef: string, context?: CommandContext): Promise<unknown> {
    return this.callTool("list_branches", { project_id: projectRef }, context);
  }

  async createBranch(
    projectRef: string,
    branchName: string,
    context?: CommandContext
  ): Promise<unknown> {
    return this.callTool("create_branch", { project_id: projectRef, name: branchName }, context);
  }

  async listEdgeFunctions(projectRef: string, context?: CommandContext): Promise<unknown> {
    return this.callTool("list_edge_functions", { project_id: projectRef }, context);
  }

  async deployEdgeFunction(
    projectRef: string,
    functionName: string,
    context?: CommandContext
  ): Promise<unknown> {
    const source = `import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async () =>
  new Response(JSON.stringify({ ok: true, function: "${functionName}" }), {
    headers: { "Content-Type": "application/json" }
  })
);`;
    return this.callTool(
      "deploy_edge_function",
      {
        project_id: projectRef,
        name: functionName,
        verify_jwt: true,
        files: [{ name: "index.ts", content: source }]
      },
      context
    );
  }

  async executeSql(
    projectRef: string,
    sql: string,
    _databaseName?: string,
    context?: CommandContext
  ): Promise<unknown> {
    const normalized = sql.trim().toLowerCase();
    if (
      normalized.startsWith("create ") ||
      normalized.startsWith("alter ") ||
      normalized.startsWith("drop ")
    ) {
      return this.callTool("apply_migration", {
        project_id: projectRef,
        name: mapSqlToMigrationName(sql),
        query: sql
      }, context);
    }
    return this.callTool("execute_sql", {
      project_id: projectRef,
      query: sql
    }, context);
  }
}

