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
  // Try JSON, fallback to text
  try {
    return await res.json();
  } catch {
    return await res.text();
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
      // Using pg/query endpoint requires the DB password in standard setups or a direct connection, 
      // but since Management API supports direct SQL execution:
      const payload = { query: `CREATE SCHEMA IF NOT EXISTS "${databaseName}";` };
      const data = await fetchSupabase(`/projects/${projectRef}/database/query`, {
        method: "POST",
        body: JSON.stringify(payload)
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
