-- WinningOS Core persisted settings (Phase 7).
--
-- Scope:
-- - owner/admin editing of workspace name + slug (live workspace.manage grant)
-- - owner/admin editing of branding: brand name, logo URL, primary color
--   (live branding.manage grant); primary color lives in theme_json
-- - server-side validation mirroring the table constraints with clear errors
-- - audit events written in the same transaction as each change
--
-- Non-goals:
-- - workspace archive/delete (workspace.delete stays unwired in v0.1)
-- - logo upload/storage (branding stores a URL; upload is plugin/storage work)
-- - multi-workspace anything

create or replace function public.core_update_workspace_settings(
  new_name text,
  new_slug text
)
returns table (
  workspace_id uuid,
  workspace_name text,
  workspace_slug text
)
language plpgsql
volatile
security definer
set search_path = extensions, auth, private, public
as $$
declare
  target_workspace_id uuid;
  old_name text;
  old_slug text;
  clean_name text := trim(coalesce(new_name, ''));
  clean_slug text := trim(coalesce(new_slug, ''));
begin
  select w.id, w.name, w.slug
  into target_workspace_id, old_name, old_slug
  from public.core_workspaces w
  where w.deleted_at is null
  order by w.created_at asc
  limit 1;

  if target_workspace_id is null then
    raise exception 'core_update_workspace_settings requires an active workspace';
  end if;

  if not private.core_current_member_has_permission(target_workspace_id, 'workspace.manage') then
    raise exception 'core_update_workspace_settings requires the workspace.manage permission';
  end if;

  if length(clean_name) = 0 then
    raise exception 'core_update_workspace_settings requires a non-empty name';
  end if;

  if length(clean_name) > 120 then
    raise exception 'core_update_workspace_settings name must be 120 characters or fewer';
  end if;

  if clean_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'core_update_workspace_settings slug must be lowercase letters, numbers, and hyphens';
  end if;

  if length(clean_slug) > 60 then
    raise exception 'core_update_workspace_settings slug must be 60 characters or fewer';
  end if;

  update public.core_workspaces
  set name = clean_name,
      slug = clean_slug,
      updated_at = now()
  where id = target_workspace_id;

  if old_name is distinct from clean_name or old_slug is distinct from clean_slug then
    perform private.core_append_audit_event(
      target_workspace_id,
      'workspace.updated',
      'workspace',
      target_workspace_id,
      jsonb_build_object(
        'old', jsonb_build_object('name', old_name, 'slug', old_slug),
        'new', jsonb_build_object('name', clean_name, 'slug', clean_slug)
      )
    );
  end if;

  return query
  select target_workspace_id, clean_name, clean_slug;
end;
$$;

revoke all on function public.core_update_workspace_settings(text, text) from public;
grant execute on function public.core_update_workspace_settings(text, text) to authenticated;

create or replace function public.core_update_brand_settings(
  new_brand_name text,
  new_logo_url text,
  new_primary_color text
)
returns table (
  workspace_id uuid,
  brand_name text,
  logo_url text,
  primary_color text
)
language plpgsql
volatile
security definer
set search_path = extensions, auth, private, public
as $$
declare
  target_workspace_id uuid;
  old_brand_name text;
  old_logo_url text;
  old_primary_color text;
  clean_brand_name text := trim(coalesce(new_brand_name, ''));
  clean_logo_url text := nullif(trim(coalesce(new_logo_url, '')), '');
  clean_primary_color text := nullif(lower(trim(coalesce(new_primary_color, ''))), '');
begin
  select w.id
  into target_workspace_id
  from public.core_workspaces w
  where w.deleted_at is null
  order by w.created_at asc
  limit 1;

  if target_workspace_id is null then
    raise exception 'core_update_brand_settings requires an active workspace';
  end if;

  if not private.core_current_member_has_permission(target_workspace_id, 'branding.manage') then
    raise exception 'core_update_brand_settings requires the branding.manage permission';
  end if;

  if length(clean_brand_name) = 0 then
    raise exception 'core_update_brand_settings requires a non-empty brand name';
  end if;

  if length(clean_brand_name) > 120 then
    raise exception 'core_update_brand_settings brand name must be 120 characters or fewer';
  end if;

  if clean_logo_url is not null and char_length(clean_logo_url) > 2048 then
    raise exception 'core_update_brand_settings logo URL must be 2048 characters or fewer';
  end if;

  if clean_logo_url is not null and clean_logo_url !~ '^https://' then
    raise exception 'core_update_brand_settings logo URL must start with https://';
  end if;

  if clean_primary_color is not null and clean_primary_color !~ '^#[0-9a-f]{6}$' then
    raise exception 'core_update_brand_settings primary color must be a #rrggbb hex value';
  end if;

  select b.brand_name, b.logo_url, b.theme_json ->> 'primary_color'
  into old_brand_name, old_logo_url, old_primary_color
  from public.core_brand_settings b
  where b.workspace_id = target_workspace_id;

  if not found then
    raise exception 'core_update_brand_settings requires the seeded branding row';
  end if;

  update public.core_brand_settings b
  set brand_name = clean_brand_name,
      logo_url = clean_logo_url,
      theme_json = case
        when clean_primary_color is null then b.theme_json - 'primary_color'
        else jsonb_set(b.theme_json, '{primary_color}', to_jsonb(clean_primary_color), true)
      end,
      updated_at = now()
  where b.workspace_id = target_workspace_id;

  if old_brand_name is distinct from clean_brand_name
    or old_logo_url is distinct from clean_logo_url
    or old_primary_color is distinct from clean_primary_color then
    perform private.core_append_audit_event(
      target_workspace_id,
      'branding.updated',
      'brand_settings',
      target_workspace_id,
      jsonb_build_object(
        'old', jsonb_build_object('brand_name', old_brand_name, 'logo_url', old_logo_url, 'primary_color', old_primary_color),
        'new', jsonb_build_object('brand_name', clean_brand_name, 'logo_url', clean_logo_url, 'primary_color', clean_primary_color)
      )
    );
  end if;

  return query
  select target_workspace_id, clean_brand_name, clean_logo_url, clean_primary_color;
end;
$$;

revoke all on function public.core_update_brand_settings(text, text, text) from public;
grant execute on function public.core_update_brand_settings(text, text, text) to authenticated;
