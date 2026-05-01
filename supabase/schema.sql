-- ============================================================
-- AutoCRM — Supabase Schema + RLS Policies
-- Safe to run multiple times (idempotent)
-- ============================================================

create extension if not exists "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- TABLES
-- ────────────────────────────────────────────────────────────
create table if not exists organizations (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  created_at timestamp with time zone default now()
);

create table if not exists users (
  id            uuid primary key references auth.users(id) on delete cascade,
  org_id        uuid not null references organizations(id) on delete cascade,
  name          text not null,
  email         text not null default '',
  role          text not null check (role in ('Admin', 'Member')) default 'Member',
  internal_rate numeric not null default 0,
  created_at    timestamp with time zone default now()
);

create table if not exists clients (
  id           uuid primary key default uuid_generate_v4(),
  org_id       uuid not null references organizations(id) on delete cascade,
  name         text not null,
  contact_info jsonb not null default '{}',
  status       text not null default 'Active',
  created_at   timestamp with time zone default now()
);

create table if not exists leads (
  id           uuid primary key default uuid_generate_v4(),
  org_id       uuid not null references organizations(id) on delete cascade,
  name         text not null,
  status       text not null check (status in ('New','Negotiating','Closed','Lost')) default 'New',
  contact_info jsonb not null default '{}',
  notes        text,
  created_at   timestamp with time zone default now()
);

create table if not exists projects (
  id           uuid primary key default uuid_generate_v4(),
  org_id       uuid not null references organizations(id) on delete cascade,
  client_id    uuid references clients(id) on delete set null,
  name         text not null,
  status       text not null default 'Active',
  pricing_type text not null check (pricing_type in ('Hourly','Fixed')),
  budget       numeric not null default 0,
  description  text,
  created_at   timestamp with time zone default now()
);

create table if not exists tasks (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references projects(id) on delete cascade,
  org_id      uuid not null references organizations(id) on delete cascade,
  assigned_to uuid references users(id) on delete set null,
  title       text not null,
  description text,
  status      text not null check (status in ('Backlog','In Progress','Review','Done')) default 'Backlog',
  due_date    date,
  created_at  timestamp with time zone default now()
);

create table if not exists time_logs (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references organizations(id) on delete cascade,
  project_id  uuid not null references projects(id) on delete cascade,
  user_id     uuid not null references users(id) on delete cascade,
  task_id     uuid references tasks(id) on delete set null,
  hours       numeric not null check (hours > 0),
  description text not null default '',
  created_at  timestamp with time zone default now()
);

create table if not exists active_timers (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null unique references users(id) on delete cascade,
  org_id      uuid not null references organizations(id) on delete cascade,
  project_id  uuid not null references projects(id) on delete cascade,
  task_id     uuid references tasks(id) on delete set null,
  start_time  timestamp with time zone not null default now()
);

create table if not exists expenses (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references organizations(id) on delete cascade,
  project_id  uuid not null references projects(id) on delete cascade,
  amount      numeric not null check (amount > 0),
  description text not null default '',
  created_at  timestamp with time zone default now()
);

-- ────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────
alter table organizations  enable row level security;
alter table users          enable row level security;
alter table clients        enable row level security;
alter table leads          enable row level security;
alter table projects       enable row level security;
alter table tasks          enable row level security;
alter table time_logs      enable row level security;
alter table active_timers  enable row level security;
alter table expenses       enable row level security;

-- Helper function
create or replace function get_my_org_id()
returns uuid language sql stable security definer as $$
  select org_id from users where id = auth.uid()
$$;

-- ── Drop all policies first (safe re-run) ────────────────────
drop policy if exists "org members can view their org"     on organizations;
drop policy if exists "anyone can create an org"           on organizations;

drop policy if exists "users can view members of their org" on users;
drop policy if exists "users can insert themselves"         on users;
drop policy if exists "admins can update users in their org" on users;

drop policy if exists "org scoped clients select"  on clients;
drop policy if exists "org scoped clients insert"  on clients;
drop policy if exists "org scoped clients update"  on clients;
drop policy if exists "org scoped clients delete"  on clients;

drop policy if exists "org scoped leads select"    on leads;
drop policy if exists "org scoped leads insert"    on leads;
drop policy if exists "org scoped leads update"    on leads;
drop policy if exists "org scoped leads delete"    on leads;

drop policy if exists "org scoped projects select" on projects;
drop policy if exists "org scoped projects insert" on projects;
drop policy if exists "org scoped projects update" on projects;
drop policy if exists "org scoped projects delete" on projects;

drop policy if exists "org scoped tasks select"    on tasks;
drop policy if exists "org scoped tasks insert"    on tasks;
drop policy if exists "org scoped tasks update"    on tasks;
drop policy if exists "org scoped tasks delete"    on tasks;

drop policy if exists "org scoped time_logs select" on time_logs;
drop policy if exists "org scoped time_logs insert" on time_logs;
drop policy if exists "org scoped time_logs delete" on time_logs;

drop policy if exists "user can view own timer"    on active_timers;
drop policy if exists "user can start timer"       on active_timers;
drop policy if exists "user can stop own timer"    on active_timers;

drop policy if exists "org scoped expenses select" on expenses;
drop policy if exists "org scoped expenses insert" on expenses;
drop policy if exists "org scoped expenses delete" on expenses;

-- ── Create policies ──────────────────────────────────────────
create policy "org members can view their org"
  on organizations for select using (id = get_my_org_id());
create policy "anyone can create an org"
  on organizations for insert with check (true);

create policy "users can view members of their org"
  on users for select using (org_id = get_my_org_id());
create policy "users can insert themselves"
  on users for insert with check (id = auth.uid());
create policy "admins can update users in their org"
  on users for update using (org_id = get_my_org_id());

create policy "org scoped clients select"  on clients for select using (org_id = get_my_org_id());
create policy "org scoped clients insert"  on clients for insert with check (org_id = get_my_org_id());
create policy "org scoped clients update"  on clients for update using (org_id = get_my_org_id());
create policy "org scoped clients delete"  on clients for delete using (org_id = get_my_org_id());

create policy "org scoped leads select"    on leads for select using (org_id = get_my_org_id());
create policy "org scoped leads insert"    on leads for insert with check (org_id = get_my_org_id());
create policy "org scoped leads update"    on leads for update using (org_id = get_my_org_id());
create policy "org scoped leads delete"    on leads for delete using (org_id = get_my_org_id());

create policy "org scoped projects select" on projects for select using (org_id = get_my_org_id());
create policy "org scoped projects insert" on projects for insert with check (org_id = get_my_org_id());
create policy "org scoped projects update" on projects for update using (org_id = get_my_org_id());
create policy "org scoped projects delete" on projects for delete using (org_id = get_my_org_id());

create policy "org scoped tasks select"    on tasks for select using (org_id = get_my_org_id());
create policy "org scoped tasks insert"    on tasks for insert with check (org_id = get_my_org_id());
create policy "org scoped tasks update"    on tasks for update using (org_id = get_my_org_id());
create policy "org scoped tasks delete"    on tasks for delete using (org_id = get_my_org_id());

create policy "org scoped time_logs select" on time_logs for select using (org_id = get_my_org_id());
create policy "org scoped time_logs insert" on time_logs for insert with check (org_id = get_my_org_id());
create policy "org scoped time_logs delete" on time_logs for delete using (org_id = get_my_org_id());

create policy "user can view own timer"
  on active_timers for select using (user_id = auth.uid());
create policy "user can start timer"
  on active_timers for insert with check (user_id = auth.uid() and org_id = get_my_org_id());
create policy "user can stop own timer"
  on active_timers for delete using (user_id = auth.uid());

create policy "org scoped expenses select" on expenses for select using (org_id = get_my_org_id());
create policy "org scoped expenses insert" on expenses for insert with check (org_id = get_my_org_id());
create policy "org scoped expenses delete" on expenses for delete using (org_id = get_my_org_id());

-- ────────────────────────────────────────────────────────────
-- GRANTS  (required when tables are created outside Supabase UI)
-- ────────────────────────────────────────────────────────────
grant usage on schema public to anon, authenticated;

grant all on organizations  to anon, authenticated;
grant all on users          to anon, authenticated;
grant all on clients        to anon, authenticated;
grant all on leads          to anon, authenticated;
grant all on projects       to anon, authenticated;
grant all on tasks          to anon, authenticated;
grant all on time_logs      to anon, authenticated;
grant all on active_timers  to anon, authenticated;
grant all on expenses       to anon, authenticated;

-- ────────────────────────────────────────────────────────────
-- REALTIME
-- ────────────────────────────────────────────────────────────
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for table active_timers, time_logs;
commit;

-- ════════════════════════════════════════════════════════════
-- MIGRATION: Feature 1 — Org Join Code
-- ════════════════════════════════════════════════════════════

alter table organizations add column if not exists join_code text unique;

update organizations
  set join_code = upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  where join_code is null;

alter table organizations
  alter column join_code set default upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));

-- ════════════════════════════════════════════════════════════
-- MIGRATION: Feature 2 — Time Log attributed_to (member array)
-- ════════════════════════════════════════════════════════════

alter table time_logs drop column if exists attribution;
alter table time_logs add column if not exists attributed_to uuid[] not null default '{}';

-- ════════════════════════════════════════════════════════════
-- Updated setup_workspace RPC (supports join_code)
-- ════════════════════════════════════════════════════════════

create or replace function setup_workspace(
  p_org_name text default null,
  p_user_name text default '',
  p_join_code text default null
)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_org organizations%rowtype;
  v_user users%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  if p_join_code is not null then
    select * into v_org from organizations where upper(join_code) = upper(p_join_code);
    if not found then raise exception 'Invalid join code'; end if;
  else
    insert into organizations (name) values (p_org_name) returning * into v_org;
  end if;

  insert into users (id, org_id, name, email, role, internal_rate)
  values (
    auth.uid(),
    v_org.id,
    p_user_name,
    coalesce((select email from auth.users where id = auth.uid()), ''),
    case when p_join_code is null then 'Admin' else 'Member' end,
    0
  )
  returning * into v_user;

  return json_build_object('organization', row_to_json(v_org), 'user', row_to_json(v_user));
end;
$$;

grant execute on function setup_workspace(text, text, text) to authenticated, anon;
notify pgrst, 'reload schema';
