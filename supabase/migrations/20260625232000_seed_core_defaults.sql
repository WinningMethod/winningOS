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
  updated_at = now();

insert into public.core_roles (id, workspace_id, key, name, description, is_system)
values
  (
    '00000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000001',
    'owner',
    'Owner',
    'Full Core administration for the single WinningOS workspace.',
    true
  ),
  (
    '00000000-0000-4000-8000-000000000102',
    '00000000-0000-4000-8000-000000000001',
    'admin',
    'Admin',
    'Can manage workspace settings, members, branding, and most Core operations.',
    true
  ),
  (
    '00000000-0000-4000-8000-000000000103',
    '00000000-0000-4000-8000-000000000001',
    'member',
    'Member',
    'Can view core workspace information and participate in the workspace.',
    true
  ),
  (
    '00000000-0000-4000-8000-000000000104',
    '00000000-0000-4000-8000-000000000001',
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
  '00000000-0000-4000-8000-000000000001',
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
  logo_url = excluded.logo_url,
  theme_json = excluded.theme_json,
  updated_at = now();
