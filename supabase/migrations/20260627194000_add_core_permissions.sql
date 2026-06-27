-- WinningOS Core permission catalog tables.
--
-- Scope:
-- - explicit, "boring" permission definitions grouped by namespace
-- - a role -> permission grant map for the four system roles
-- - read-only exposure to active members (reference data)
--
-- These tables persist the canonical permission model documented in
-- DATA_MODEL.md. They mirror core/permissions/catalog.ts, which is the source of
-- truth the application uses for gating today; scripts/validate-permissions.mjs
-- asserts the two stay in lockstep. Server-side enforcement will move onto these
-- tables in a later slice; for now the existing role-keyed RPC checks remain the
-- security boundary and nothing writes to these tables outside this seed.
--
-- Non-goals:
-- - custom (non-system) roles or per-workspace permission overrides
-- - runtime permission editing UI
-- - plugin-defined permissions

create table if not exists public.core_permissions (
  id uuid primary key default extensions.gen_random_uuid(),
  key text not null,
  name text not null,
  description text,
  namespace text not null,
  created_at timestamptz not null default now(),
  constraint core_permissions_key_unique unique (key),
  constraint core_permissions_key_format check (key ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'),
  constraint core_permissions_namespace_format check (namespace ~ '^[a-z][a-z0-9_]*$'),
  -- namespace must be the bare prefix of key (no drift between the two).
  constraint core_permissions_namespace_matches_key check (key like namespace || '.%'),
  constraint core_permissions_name_not_blank check (length(trim(name)) > 0)
);

create table if not exists public.core_role_permissions (
  role_key text not null,
  permission_key text not null references public.core_permissions(key) on delete cascade,
  created_at timestamptz not null default now(),
  constraint core_role_permissions_pkey primary key (role_key, permission_key),
  constraint core_role_permissions_role_key_check check (role_key in ('owner', 'admin', 'member', 'viewer'))
);

create index if not exists core_role_permissions_permission_key_idx
  on public.core_role_permissions (permission_key);

-- Seed the permission catalog. Keep in lockstep with core/permissions/catalog.ts.
insert into public.core_permissions (key, name, description, namespace)
values
  ('workspace.view', 'View workspace', 'See the active workspace and its high-level metadata.', 'workspace'),
  ('workspace.manage', 'Manage workspace', 'Edit workspace name, slug, and configuration metadata.', 'workspace'),
  ('workspace.delete', 'Delete workspace', 'Archive or delete the workspace.', 'workspace'),
  ('members.view', 'View members', 'See the workspace member and pending-access list.', 'members'),
  ('members.invite', 'Invite members', 'Send invitations and add members to the workspace.', 'members'),
  ('members.disable', 'Disable members', 'Disable an active member''s access without removing them.', 'members'),
  ('members.remove', 'Remove members', 'Revoke invites and remove non-owner memberships.', 'members'),
  ('roles.view', 'View roles', 'See workspace roles and their permission grants.', 'roles'),
  ('roles.assign', 'Assign roles', 'Change the role assigned to a non-owner member.', 'roles'),
  ('roles.manage', 'Manage roles', 'Create or edit custom roles and permission bundles.', 'roles'),
  ('branding.view', 'View branding', 'See workspace branding tokens and identity.', 'branding'),
  ('branding.manage', 'Manage branding', 'Edit workspace branding tokens and identity.', 'branding'),
  ('settings.view', 'View settings', 'Open the workspace settings area.', 'settings'),
  ('settings.manage', 'Manage settings', 'Change workspace settings and security options.', 'settings'),
  ('plugins.view', 'View plugins', 'See installed and available Core plugins.', 'plugins'),
  ('plugins.manage', 'Manage plugins', 'Install and configure Core plugins (future).', 'plugins')
on conflict (key) do update
set
  name = excluded.name,
  description = excluded.description,
  namespace = excluded.namespace;

-- Seed the role -> permission grants. Each row below lists a permission and the
-- system roles that hold it; unnest expands them into (role_key, permission_key).
insert into public.core_role_permissions (role_key, permission_key)
select expanded.role_key, grant_row.permission_key
from (values
  ('workspace.view', array['owner', 'admin', 'member', 'viewer']),
  ('workspace.manage', array['owner', 'admin']),
  ('workspace.delete', array['owner']),
  ('members.view', array['owner', 'admin', 'member']),
  ('members.invite', array['owner']),
  ('members.disable', array['owner', 'admin']),
  ('members.remove', array['owner']),
  ('roles.view', array['owner', 'admin', 'member']),
  ('roles.assign', array['owner', 'admin']),
  ('roles.manage', array['owner']),
  ('branding.view', array['owner', 'admin', 'member', 'viewer']),
  ('branding.manage', array['owner', 'admin']),
  ('settings.view', array['owner', 'admin', 'member']),
  ('settings.manage', array['owner', 'admin']),
  ('plugins.view', array['owner', 'admin', 'member']),
  ('plugins.manage', array['owner', 'admin'])
) as grant_row(permission_key, roles)
cross join lateral unnest(grant_row.roles) as expanded(role_key)
on conflict (role_key, permission_key) do nothing;

-- Remove any grant rows that are no longer part of the seeded catalog so the map
-- never drifts above the source of truth on re-run.
delete from public.core_role_permissions rp
where not exists (
  select 1
  from (values
    ('workspace.view', array['owner', 'admin', 'member', 'viewer']),
    ('workspace.manage', array['owner', 'admin']),
    ('workspace.delete', array['owner']),
    ('members.view', array['owner', 'admin', 'member']),
    ('members.invite', array['owner']),
    ('members.disable', array['owner', 'admin']),
    ('members.remove', array['owner']),
    ('roles.view', array['owner', 'admin', 'member']),
    ('roles.assign', array['owner', 'admin']),
    ('roles.manage', array['owner']),
    ('branding.view', array['owner', 'admin', 'member', 'viewer']),
    ('branding.manage', array['owner', 'admin']),
    ('settings.view', array['owner', 'admin', 'member']),
    ('settings.manage', array['owner', 'admin']),
    ('plugins.view', array['owner', 'admin', 'member']),
    ('plugins.manage', array['owner', 'admin'])
  ) as grant_row(permission_key, roles)
  cross join lateral unnest(grant_row.roles) as expanded(role_key)
  where expanded.role_key = rp.role_key
    and grant_row.permission_key = rp.permission_key
);

alter table public.core_permissions enable row level security;
alter table public.core_role_permissions enable row level security;

drop policy if exists "Active members can read permissions" on public.core_permissions;

create policy "Active members can read permissions"
  on public.core_permissions
  for select
  to authenticated
  using (private.core_is_active_member_of_any_workspace());

drop policy if exists "Active members can read role permissions" on public.core_role_permissions;

create policy "Active members can read role permissions"
  on public.core_role_permissions
  for select
  to authenticated
  using (private.core_is_active_member_of_any_workspace());
