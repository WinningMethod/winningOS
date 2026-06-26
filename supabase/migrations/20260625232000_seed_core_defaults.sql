-- WinningOS Core default seed data.
--
-- This creates the single default workspace, four system roles, and the
-- workspace branding row. It intentionally does not create an owner
-- profile/membership because Supabase Auth users are deployment-specific.
-- Owner bootstrap belongs in the next auth/profile slice.

insert into public.core_workspaces (id, name, slug)
values (
  '00000000-0000-4000-8000-000000000001',
  'WinningOS Workspace',
  'winningos'
)
on conflict (slug) do update
set
  name = excluded.name,
  deleted_at = null,
  updated_at = now();

do $$
begin
  if not exists (select 1 from public.core_workspaces where slug = 'winningos') then
    raise exception 'default workspace seed failed: missing winningos workspace';
  end if;
end $$;

insert into public.core_roles (id, workspace_id, key, name, description, is_system)
values
  (
    '00000000-0000-4000-8000-000000000101',
    (select id from public.core_workspaces where slug = 'winningos'),
    'owner',
    'Owner',
    'Full Core administration for the single WinningOS workspace.',
    true
  ),
  (
    '00000000-0000-4000-8000-000000000102',
    (select id from public.core_workspaces where slug = 'winningos'),
    'admin',
    'Admin',
    'Can manage workspace settings, members, branding, and most Core operations.',
    true
  ),
  (
    '00000000-0000-4000-8000-000000000103',
    (select id from public.core_workspaces where slug = 'winningos'),
    'member',
    'Member',
    'Can view core workspace information and participate in the workspace.',
    true
  ),
  (
    '00000000-0000-4000-8000-000000000104',
    (select id from public.core_workspaces where slug = 'winningos'),
    'viewer',
    'Viewer',
    'Read-only Core workspace access.',
    true
  )
on conflict (workspace_id, key) where workspace_id is not null do update
set
  name = excluded.name,
  description = excluded.description,
  is_system = excluded.is_system,
  updated_at = now();

insert into public.core_brand_settings (
  id,
  workspace_id,
  brand_name,
  logo_url,
  theme_json
)
values (
  '00000000-0000-4000-8000-000000000201',
  (select id from public.core_workspaces where slug = 'winningos'),
  'WinningOS',
  null,
  jsonb_build_object(
    'mode', 'dark',
    'accent', 'sky',
    'radius', 'medium'
  )
)
on conflict (workspace_id) do update
set
  brand_name = excluded.brand_name,
  logo_url = coalesce(public.core_brand_settings.logo_url, excluded.logo_url),
  theme_json = excluded.theme_json,
  updated_at = now();
