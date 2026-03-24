# Supabase Chat Control Plane

Chat-first multi-tenant control plane for Supabase. Users log in, connect their own Supabase access token, and then manage projects/databases/admin workflows through conversation.

## What is included

- Login + logout flow with user sessions.
- Bring-your-own Supabase access token onboarding (`GET /auth/me?workspaceId=<uuid>` reflects the active workspace connection).
- Multi-tenant workspace model from day one.
- Chat command toolbox split by `Projects`, `Databases`, and `Governance`.
- Conversation history (switch between previous chats per workspace).
- Role-based approvals for sensitive actions.
- Persistent SQL-backed control-plane storage (users, workspaces, sessions, chat history, approvals, audits).

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
6. Connect Supabase directly from chat:
   - `connect supabase` (uses server env token/org)
   - or `connect supabase sbp_xxx`
   - or `connect supabase sbp_xxx org_id`
   - Optional UI panel is still available as fallback
   - Note: connection is workspace-scoped (active workspace must be selected)

## Core commands

- `list projects`
- `create project billing-api`
- `list databases`
- `create database tenant_a in proj_xxx`
- `list tables`
- `seed ecommerce`
- `list branches`
- `create branch staging`
- `list edge functions`
- `deploy edge function hello-world`
- `grant admin to user_id`
- `list requests`
- `approve request <id>`
- `reject request <id>`

## Multi-tenant architecture notes

- Each user owns a session and optional Supabase integration.
- Supabase integrations are stored per `(workspace_id, user_id)` for strict tenant isolation.
- Workspace membership controls access (`owner`, `admin`, `operator`, `viewer`).
- Command execution uses the requesting user’s connected Supabase token.
- MCP integration is extensible via `SupabaseMcpClient` and `McpOrchestrator`.

## Persistence model

- Control-plane state is persisted in embedded Postgres (`.control-plane-db`) through `@electric-sql/pglite`.
- Base schema lives in `db/schema/001_control_plane.sql`.
- Runtime initializes schema automatically on API boot.
