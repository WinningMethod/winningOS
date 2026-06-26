-- WinningOS Core initial schema.
--
-- Scope:
-- - single-workspace Core foundation
-- - profiles connected to Supabase Auth users
-- - workspace memberships and seeded system roles
-- - one branding row per workspace
-- - RLS read boundaries for active members
--
-- Non-goals:
-- - plugin tables
-- - agent/chat/provider tables
-- - permissions database tables
-- - real owner bootstrap for a specific auth user

create schema if not exists extensions;
create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.core_profiles (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint core_profiles_user_id_key unique (user_id),
  constraint core_profiles_display_name_length check (
    display_name is null or char_length(display_name) <= 120
  ),
  constraint core_profiles_avatar_url_length check (
    avatar_url is null or char_length(avatar_url) <= 2048
  )
);

create table if not exists public.core_workspaces (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  slug text not null,
  created_by_profile_id uuid references public.core_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint core_workspaces_slug_key unique (slug),
  constraint core_workspaces_name_not_blank check (length(trim(name)) > 0),
  constraint core_workspaces_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create index if not exists core_workspaces_created_by_profile_id_idx
  on public.core_workspaces (created_by_profile_id)
  where created_by_profile_id is not null;

create unique index if not exists core_workspaces_single_active_workspace
  on public.core_workspaces ((true))
  where deleted_at is null;

create table if not exists public.core_roles (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid references public.core_workspaces(id) on delete cascade,
  key text not null,
  name text not null,
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint core_roles_key_format check (key ~ '^[a-z][a-z0-9_]*$'),
  constraint core_roles_name_not_blank check (length(trim(name)) > 0)
);

create unique index if not exists core_roles_global_key_unique
  on public.core_roles (key)
  where workspace_id is null;

create unique index if not exists core_roles_workspace_key_unique
  on public.core_roles (workspace_id, key)
  where workspace_id is not null;

create table if not exists public.core_memberships (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.core_workspaces(id) on delete cascade,
  profile_id uuid not null references public.core_profiles(id) on delete cascade,
  role_id uuid not null references public.core_roles(id) on delete restrict,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint core_memberships_workspace_profile_key unique (workspace_id, profile_id),
  constraint core_memberships_status_check check (status in ('active', 'invited', 'disabled', 'removed'))
);

create index if not exists core_memberships_profile_id_idx
  on public.core_memberships (profile_id);

create index if not exists core_memberships_workspace_status_idx
  on public.core_memberships (workspace_id, status);

create index if not exists core_memberships_role_id_idx
  on public.core_memberships (role_id);

create table if not exists public.core_brand_settings (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.core_workspaces(id) on delete cascade,
  brand_name text not null,
  logo_url text,
  theme_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint core_brand_settings_workspace_id_key unique (workspace_id),
  constraint core_brand_settings_brand_name_not_blank check (length(trim(brand_name)) > 0),
  constraint core_brand_settings_logo_url_length check (
    logo_url is null or char_length(logo_url) <= 2048
  ),
  constraint core_brand_settings_theme_is_object check (jsonb_typeof(theme_json) = 'object')
);

create or replace function public.core_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.core_touch_updated_at() from public;

create or replace trigger core_profiles_touch_updated_at
before update on public.core_profiles
for each row execute function public.core_touch_updated_at();

create or replace trigger core_workspaces_touch_updated_at
before update on public.core_workspaces
for each row execute function public.core_touch_updated_at();

create or replace trigger core_roles_touch_updated_at
before update on public.core_roles
for each row execute function public.core_touch_updated_at();

create or replace trigger core_memberships_touch_updated_at
before update on public.core_memberships
for each row execute function public.core_touch_updated_at();

create or replace trigger core_brand_settings_touch_updated_at
before update on public.core_brand_settings
for each row execute function public.core_touch_updated_at();

create or replace function private.core_current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = auth, public
as $$
  select id
  from public.core_profiles
  where user_id = auth.uid()
  limit 1
$$;

create or replace function private.core_is_active_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = auth, public
as $$
  select exists (
    select 1
    from public.core_memberships m
    join public.core_profiles p on p.id = m.profile_id
    join public.core_workspaces w on w.id = m.workspace_id
    where p.user_id = auth.uid()
      and m.workspace_id = target_workspace_id
      and m.status = 'active'
      and w.deleted_at is null
  )
$$;

create or replace function private.core_is_active_member_of_any_workspace()
returns boolean
language sql
stable
security definer
set search_path = auth, public
as $$
  select exists (
    select 1
    from public.core_memberships m
    join public.core_profiles p on p.id = m.profile_id
    join public.core_workspaces w on w.id = m.workspace_id
    where p.user_id = auth.uid()
      and m.status = 'active'
      and w.deleted_at is null
  )
$$;

create or replace function private.core_profiles_share_active_workspace(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = auth, public
as $$
  select exists (
    select 1
    from public.core_memberships viewer_membership
    join public.core_profiles viewer_profile
      on viewer_profile.id = viewer_membership.profile_id
    join public.core_memberships target_membership
      on target_membership.workspace_id = viewer_membership.workspace_id
    join public.core_workspaces shared_workspace
      on shared_workspace.id = viewer_membership.workspace_id
    where viewer_profile.user_id = auth.uid()
      and viewer_membership.status = 'active'
      and target_membership.status = 'active'
      and target_membership.profile_id = target_profile_id
      and shared_workspace.deleted_at is null
  )
$$;


revoke execute on function private.core_current_profile_id() from public;
revoke execute on function private.core_is_active_member(uuid) from public;
revoke execute on function private.core_is_active_member_of_any_workspace() from public;
revoke execute on function private.core_profiles_share_active_workspace(uuid) from public;


alter table public.core_profiles enable row level security;
alter table public.core_workspaces enable row level security;
alter table public.core_roles enable row level security;
alter table public.core_memberships enable row level security;
alter table public.core_brand_settings enable row level security;

drop policy if exists "Users can read their own profile" on public.core_profiles;

create policy "Users can read their own profile"
  on public.core_profiles
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Members can read profiles in their active workspace" on public.core_profiles;

create policy "Members can read profiles in their active workspace"
  on public.core_profiles
  for select
  to authenticated
  using (private.core_profiles_share_active_workspace(id));

drop policy if exists "Users can create their own profile" on public.core_profiles;

create policy "Users can create their own profile"
  on public.core_profiles
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update their own profile" on public.core_profiles;

create policy "Users can update their own profile"
  on public.core_profiles
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Active members can read their workspace" on public.core_workspaces;

create policy "Active members can read their workspace"
  on public.core_workspaces
  for select
  to authenticated
  using (private.core_is_active_member(id));

drop policy if exists "Active members can read workspace roles" on public.core_roles;

create policy "Active members can read workspace roles"
  on public.core_roles
  for select
  to authenticated
  using (
    (
      workspace_id is null
      and private.core_is_active_member_of_any_workspace()
    )
    or (
      workspace_id is not null
      and private.core_is_active_member(workspace_id)
    )
  );

drop policy if exists "Active members can read workspace memberships" on public.core_memberships;

create policy "Active members can read workspace memberships"
  on public.core_memberships
  for select
  to authenticated
  using (
    private.core_is_active_member(workspace_id)
    and status = 'active'
  );

drop policy if exists "Active members can read workspace branding" on public.core_brand_settings;

create policy "Active members can read workspace branding"
  on public.core_brand_settings
  for select
  to authenticated
  using (private.core_is_active_member(workspace_id));
