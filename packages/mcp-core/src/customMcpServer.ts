import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "supabase-management-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// We need SUPABASE_ACCESS_TOKEN
const requireProjectId = (value: unknown, paramName = "project_id"): string => {
  const ref = String(value ?? "").trim();
  if (!ref) {
    throw new Error(
      `${paramName} is required and cannot be empty. Use the Supabase project reference (dashboard: Project Settings → General, or the subdomain before .supabase.co).`
    );
  }
  return ref;
};

const fetchSupabase = async (path: string, options: RequestInit = {}) => {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error("Missing SUPABASE_ACCESS_TOKEN env variable.");
  
  const res = await fetch(`https://api.supabase.com/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Supabase API Error ${res.status}: ${err}`);
  }
  const raw = await res.text().catch(() => "");
  if (!raw.trim()) {
    return { ok: true };
  }
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_projects",
        description: "List all Supabase projects in the organization.",
        inputSchema: { type: "object", properties: {} }
      },
      {
        name: "create_project",
        description: "Create a new Supabase project in the organization.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string" },
            organization_id: { type: "string" },
            region: { type: "string", default: "us-east-1" },
            db_pass: { type: "string" }
          },
          required: ["name", "organization_id"]
        }
      },
      {
        name: "delete_project",
        description: "Permanently delete a Supabase project (irreversible).",
        inputSchema: {
          type: "object",
          properties: { project_id: { type: "string" } },
          required: ["project_id"]
        }
      },
      {
        name: "create_database",
        description: "Create a logical schema / database.",
        inputSchema: {
          type: "object",
          properties: {
            projectRef: { type: "string" },
            databaseName: { type: "string" }
          },
          required: ["projectRef", "databaseName"]
        }
      },
      {
        name: "list_tables",
        description: "List tables in a project schema.",
        inputSchema: {
          type: "object",
          properties: {
            project_id: { type: "string" },
            schemas: { type: "array", items: { type: "string" } }
          },
          required: ["project_id"]
        }
      },
      {
        name: "execute_sql",
        description: "Execute SQL query in project database.",
        inputSchema: {
          type: "object",
          properties: {
            project_id: { type: "string" },
            query: { type: "string" }
          },
          required: ["project_id", "query"]
        }
      },
      {
        name: "apply_migration",
        description: "Apply DDL migration query in project.",
        inputSchema: {
          type: "object",
          properties: {
            project_id: { type: "string" },
            name: { type: "string" },
            query: { type: "string" }
          },
          required: ["project_id", "name", "query"]
        }
      },
      {
        name: "list_branches",
        description: "List branches for a project.",
        inputSchema: {
          type: "object",
          properties: { project_id: { type: "string" } },
          required: ["project_id"]
        }
      },
      {
        name: "create_branch",
        description: "Create project branch.",
        inputSchema: {
          type: "object",
          properties: {
            project_id: { type: "string" },
            name: { type: "string" }
          },
          required: ["project_id", "name"]
        }
      },
      {
        name: "list_edge_functions",
        description: "List edge functions for project.",
        inputSchema: {
          type: "object",
          properties: { project_id: { type: "string" } },
          required: ["project_id"]
        }
      },
      {
        name: "deploy_edge_function",
        description: "Deploy edge function for project.",
        inputSchema: {
          type: "object",
          properties: {
            project_id: { type: "string" },
            name: { type: "string" }
          },
          required: ["project_id", "name"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    if (name === "list_projects") {
      const data = await fetchSupabase("/projects");
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }
    
    if (name === "delete_project") {
      const { project_id } = args as any;
      const ref = requireProjectId(project_id);
      const data = await fetchSupabase(`/projects/${ref}`, { method: "DELETE" });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ deleted: true, project_id: ref, ...(typeof data === "object" && data !== null ? data : {}) })
          }
        ]
      };
    }

    if (name === "create_project") {
      const { name: projName, organization_id, region, db_pass } = args as any;
      const pass = db_pass || "SecurePassword.123!!";
      
      const payload = {
        name: projName,
        organization_id,
        region: region || "us-east-1",
        db_pass: pass,
        plan: "free"
      };
      const data = await fetchSupabase("/projects", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }
    
    if (name === "create_database") {
      const { projectRef, databaseName } = args as any;
      requireProjectId(projectRef, "projectRef");
      // Using pg/query endpoint requires the DB password in standard setups or a direct connection, 
      // but since Management API supports direct SQL execution:
      const payload = { query: `CREATE SCHEMA IF NOT EXISTS "${databaseName}";` };
      const data = await fetchSupabase(`/projects/${projectRef}/database/query`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }

    if (name === "list_tables") {
      const { project_id, schemas } = args as any;
      requireProjectId(project_id);
      const schema = Array.isArray(schemas) && schemas[0] ? schemas[0] : "public";
      const data = await fetchSupabase(`/projects/${project_id}/database/query`, {
        method: "POST",
        body: JSON.stringify({
          query: `select table_name as name from information_schema.tables where table_schema='${schema}' order by table_name;`
        })
      });
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }

    if (name === "execute_sql") {
      const { project_id, query } = args as any;
      requireProjectId(project_id);
      const data = await fetchSupabase(`/projects/${project_id}/database/query`, {
        method: "POST",
        body: JSON.stringify({ query })
      });
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }

    if (name === "apply_migration") {
      const { project_id, query, name: migrationName } = args as any;
      requireProjectId(project_id);
      const data = await fetchSupabase(`/projects/${project_id}/database/query`, {
        method: "POST",
        body: JSON.stringify({ query, name: migrationName })
      });
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }

    if (name === "list_branches") {
      const { project_id } = args as any;
      requireProjectId(project_id);
      const data = await fetchSupabase(`/projects/${project_id}/branches`);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }

    if (name === "create_branch") {
      const { project_id, name: branchName } = args as any;
      requireProjectId(project_id);
      const data = await fetchSupabase(`/projects/${project_id}/branches`, {
        method: "POST",
        body: JSON.stringify({ name: branchName })
      });
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }

    if (name === "list_edge_functions") {
      const { project_id } = args as any;
      const ref = requireProjectId(project_id);
      const data = await fetchSupabase(`/projects/${ref}/functions`);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }

    if (name === "deploy_edge_function") {
      const { project_id, name: functionName } = args as any;
      const ref = requireProjectId(project_id);
      const data = await fetchSupabase(`/projects/${ref}/functions`, {
        method: "POST",
        body: JSON.stringify({ name: functionName })
      });
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }
    
    throw new Error(`Unknown tool: ${name}`);
  } catch (error: any) {
    return {
      isError: true,
      content: [{ type: "text", text: error.message }]
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Custom Supabase MCP Server running via stdio");
}

main().catch((err) => {
  console.error("MCP Server Error:", err);
  process.exit(1);
});
