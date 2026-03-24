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
    const projectRef = String(payload.projectRef ?? context.projectRef ?? "").trim();
    const requireProjectRef = () => {
      if (!projectRef) {
        throw new Error(
          "Supabase project ref is missing. Enter it in the Project ref field in the sidebar, or include projectRef in the API request body."
        );
      }
    };

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
    if (command === "delete_project") {
      requireProjectRef();
      return this.client.deleteProject(projectRef, context);
    }
    if (command === "list_databases") {
      requireProjectRef();
      return this.client.listDatabases(projectRef, context);
    }
    if (command === "create_database") {
      requireProjectRef();
      return this.client.createDatabase(
        projectRef,
        String(payload.databaseName ?? ""),
        context
      );
    }
    if (command === "list_tables") {
      requireProjectRef();
      return this.client.listTables(projectRef, context);
    }
    if (command === "list_branches") {
      requireProjectRef();
      return this.client.listBranches(projectRef, context);
    }
    if (command === "create_branch") {
      requireProjectRef();
      return this.client.createBranch(projectRef, String(payload.branchName ?? ""), context);
    }
    if (command === "list_edge_functions") {
      requireProjectRef();
      return this.client.listEdgeFunctions(projectRef, context);
    }
    if (command === "deploy_edge_function") {
      requireProjectRef();
      return this.client.deployEdgeFunction(projectRef, String(payload.functionName ?? ""), context);
    }
    if (command === "run_sql_read" || command === "run_sql_write") {
      requireProjectRef();
      return this.client.executeSql(
        projectRef,
        String(payload.sql ?? ""),
        String(payload.databaseName ?? ""),
        context
      );
    }
    if (command === "seed_dummy_data") {
      requireProjectRef();
      const template = String(payload.template ?? "ecommerce");
      const sql = buildSeedSql(template, String(payload.databaseName ?? context.databaseName ?? "public"));
      return this.client.executeSql(projectRef, sql, String(payload.databaseName ?? ""), context);
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

const buildSeedSql = (template: string, schema: string): string => {
  const safeSchema = schema.trim() || "public";
  if (template !== "ecommerce") {
    return `select 'Unsupported template: ${template}' as message;`;
  }
  return `
create schema if not exists "${safeSchema}";
create table if not exists "${safeSchema}".products (
  id bigserial primary key,
  name text not null,
  price numeric(10,2) not null,
  created_at timestamptz not null default now()
);
create table if not exists "${safeSchema}".orders (
  id bigserial primary key,
  product_id bigint references "${safeSchema}".products(id),
  quantity int not null,
  created_at timestamptz not null default now()
);
insert into "${safeSchema}".products (name, price)
values ('Sample T-Shirt', 29.99), ('Sample Shoes', 89.00), ('Sample Bag', 49.50)
on conflict do nothing;
insert into "${safeSchema}".orders (product_id, quantity)
select id, 1 from "${safeSchema}".products limit 3;
`;
};
