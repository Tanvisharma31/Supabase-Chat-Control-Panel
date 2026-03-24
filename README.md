# Supabase Chat Control Plane

Chat-first multi-tenant control plane for Supabase. Users log in, connect their own Supabase access token, and then manage projects/databases/admin workflows through conversation.

## What is included

- Login + logout flow with user sessions.
- Bring-your-own Supabase access token onboarding.
- Multi-tenant workspace model from day one.
- Chat command toolbox split by `Projects`, `Databases`, and `Governance`.
- Conversation history (switch between previous chats per workspace).
- Role-based approvals for sensitive actions.

## Quick start

1. Install dependencies:
   - `npm install`
2. Configure `.env.local`:
   ```env
   SUPABASE_MCP_COMMAND="npx tsx d:/MCP/task-1/packages/mcp-core/src/customMcpServer.ts"
   SUPABASE_PROJECT_REGION="us-east-1"
   ```
3. Run app:
   - `npm run dev`
4. Open:
   - [http://localhost:5173](http://localhost:5173)
5. Login from UI.
6. Connect Supabase from **SUPABASE LINK** panel:
   - Go to Supabase Dashboard -> Profile -> Access Tokens
   - Generate token and paste in app
   - Optional: provide organization id, otherwise first org is auto-picked

## Core commands

- `list projects`
- `create project billing-api`
- `list databases`
- `create database tenant_a in proj_xxx`
- `list tables`
- `grant admin to user_id`
- `list requests`
- `approve request <id>`
- `reject request <id>`

## Multi-tenant architecture notes

- Each user owns a session and optional Supabase integration.
- Workspace membership controls access (`owner`, `admin`, `operator`, `viewer`).
- Command execution uses the requesting user’s connected Supabase token.
- MCP integration is extensible via `SupabaseMcpClient` and `McpOrchestrator`.
