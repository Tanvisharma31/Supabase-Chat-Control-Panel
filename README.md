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

## Deploying

This repo is split into a **Vite React app** (`apps/web`) and an **Express API** (`apps/api`). Vercel is ideal for the static/edge frontend; the API needs a **long‑running Node** host (Render, Railway, Fly.io, etc.) because it keeps a database file, runs MCP subprocesses, and uses `app.listen()`.

### 1. Deploy the API (first)

1. Create a **Web Service** / **Node** app pointing at this repository.
2. **Root directory**: repo root (or the path that contains `package.json` workspaces).
3. **Start command** (example): `node apps/api/dist/index.js` after build, or `npm run dev -w @apps/api` only for experiments—production should run compiled output:
   - **Build**: `npm install && npm run build -w @apps/api`
   - **Start**: `node apps/api/dist/index.js` (check `apps/api/tsconfig.json` `outDir` if different).
4. Set **environment variables** on the host: same keys as `.env.local` (`PORT` optional; set `DATABASE_URL` or rely on bundled PGlite persistence if your platform gives you a persistent disk).
5. Note the public URL, e.g. `https://task-1-api.onrender.com`.

### 2. Deploy the web app on Vercel

1. **Import** the Git repo in [Vercel](https://vercel.com).
2. **Root Directory**: `apps/web` (important so `vercel.json` is picked up).
3. Vercel will use `apps/web/vercel.json`: install and build run from the monorepo root (`cd ../.. && npm install`, etc.).
4. Under **Environment Variables**, add:
   - **`VITE_API_BASE_URL`** = your API origin only, e.g. `https://task-1-api.onrender.com` (no path, no trailing slash).
5. Deploy. The client calls the API with CORS; `cors()` is already enabled on the API.

Locally, leave `VITE_API_BASE_URL` unset so the Vite dev server keeps using `/api` → `localhost:4000`.
