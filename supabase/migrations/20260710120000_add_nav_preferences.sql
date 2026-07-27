-- WinningOS Core per-user navigation preferences.
--
-- Scope:
-- - one preferences row per (workspace, profile) storing the member's personal
--   sidebar layout as JSON: custom groups, parent items with dropdown children,
--   and a hidden list rendered as the collapsed bottom section
-- - reads through RLS (each member sees only their own row)
-- - writes through core_save_nav_preferences (upsert own row; null resets to
--   the default layout by deleting the row)
--
-- Non-goals:
-- - workspace-wide default layouts pushed by admins
-- - audit events (the layout is personal presentation state, not shared
--   workspace configuration)
-- - validating nav keys against the plugin registry (the registry is
--   build-time app code; unknown keys are ignored at render and keep their
--   placement so a temporarily uninstalled plugin comes back where it was)

create table if not exists public.core_nav_preferences (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.core_workspaces(id) on delete cascade,
  profile_id uuid not null references public.core_profiles(id) on delete cascade,
  layout_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint core_nav_preferences_workspace_profile_key unique (workspace_id, profile_id),
  constraint core_nav_preferences_layout_is_object check (jsonb_typeof(layout_json) = 'object')
);

create index if not exists core_nav_preferences_profile_id_idx
  on public.core_nav_preferences (profile_id);

create or replace trigger core_nav_preferences_touch_updated_at
before update on public.core_nav_preferences
for each row execute function public.core_touch_updated_at();

alter table public.core_nav_preferences enable row level security;

-- Members read only their own layout. private.core_current_profile_id() holds
-- an authenticated execute grant (20260704210000) so it is safe to reference
-- from a policy evaluated as the querying user.
drop policy if exists "Users can read their own nav preferences" on public.core_nav_preferences;

create policy "Users can read their own nav preferences"
  on public.core_nav_preferences
  for select
  to authenticated
  using (profile_id = private.core_current_profile_id());

-- No insert/update/delete policies: writes go through the definer RPC below so
-- validation and workspace scoping cannot be bypassed.

create or replace function public.core_save_nav_preferences(
  new_layout jsonb
)
returns void
language plpgsql
volatile
security definer
set search_path = extensions, auth, private, public
as $$
declare
  target_workspace_id uuid;
  current_profile_id uuid;
begin
  select w.id
  into target_workspace_id
  from public.core_workspaces w
  where w.deleted_at is null
  order by w.created_at asc
  limit 1;

  if target_workspace_id is null then
    raise exception 'core_save_nav_preferences requires an active workspace';
  end if;

  current_profile_id := private.core_current_profile_id();

  if current_profile_id is null then
    raise exception 'core_save_nav_preferences requires an authenticated profile';
  end if;

  if not private.core_is_active_member(target_workspace_id) then
    raise exception 'core_save_nav_preferences requires an active workspace membership';
  end if;

  -- Null resets the member to the default layout.
  if new_layout is null then
    delete from public.core_nav_preferences
    where workspace_id = target_workspace_id
      and profile_id = current_profile_id;
    return;
  end if;

  if jsonb_typeof(new_layout) <> 'object' then
    raise exception 'core_save_nav_preferences layout must be a JSON object';
  end if;

  if pg_column_size(new_layout) > 32768 then
    raise exception 'core_save_nav_preferences layout must be 32KB or smaller';
  end if;

  insert into public.core_nav_preferences (workspace_id, profile_id, layout_json)
  values (target_workspace_id, current_profile_id, new_layout)
  on conflict (workspace_id, profile_id)
  do update set layout_json = excluded.layout_json;
end;
$$;

revoke all on function public.core_save_nav_preferences(jsonb) from public;
grant execute on function public.core_save_nav_preferences(jsonb) to authenticated;
