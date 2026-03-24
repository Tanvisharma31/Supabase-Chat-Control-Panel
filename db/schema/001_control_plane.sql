create table if not exists workspaces (
  id uuid primary key,
  name text not null,
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id text primary key,
  email text not null,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists workspace_memberships (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'operator', 'viewer')),
  primary key (workspace_id, user_id)
);

create table if not exists connected_supabase_projects (
  id uuid primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  project_ref text not null,
  encrypted_access_token text not null,
  created_by text not null references users(id)
);

create table if not exists connected_supabase_databases (
  id uuid primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  project_ref text not null,
  database_name text not null,
  created_by text not null references users(id),
  created_at timestamptz not null default now(),
  unique (workspace_id, project_ref, database_name)
);

create table if not exists conversations (
  id uuid primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  channel text not null check (channel in ('web', 'slack', 'discord', 'teams')),
  created_by text not null references users(id),
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key,
  conversation_id uuid not null references conversations(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists approval_requests (
  id uuid primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  command text not null,
  status text not null check (status in ('pending', 'approved', 'rejected')),
  requested_by text not null references users(id),
  requested_at timestamptz not null default now(),
  reviewed_by text references users(id),
  reviewed_at timestamptz
);

create table if not exists audit_events (
  id uuid primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  actor_id text not null references users(id),
  action text not null,
  outcome text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
