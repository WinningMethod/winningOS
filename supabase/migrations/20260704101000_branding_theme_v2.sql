-- Issue #50: branding v2.
--
-- Scope:
-- - primary, secondary, and tertiary brand colors (stored in
--   core_brand_settings.theme_json as primary_color / secondary_color /
--   tertiary_color) so the app shell and future plugins can inherit them
-- - a public storage bucket for uploaded brand assets (logos); uploads go
--   through the server-side branding action with the service role, so no
--   client write policies are added to storage.objects
--
-- The old three-parameter core_update_brand_settings(text, text, text) is
-- replaced by a five-parameter version. The old signature is dropped so
-- PostgREST RPC resolution stays unambiguous.

drop function if exists public.core_update_brand_settings(text, text, text);

create or replace function public.core_update_brand_settings(
  new_brand_name text,
  new_logo_url text,
  new_primary_color text,
  new_secondary_color text,
  new_tertiary_color text
)
returns table (
  workspace_id uuid,
  brand_name text,
  logo_url text,
  primary_color text,
  secondary_color text,
  tertiary_color text
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
  old_secondary_color text;
  old_tertiary_color text;
  clean_brand_name text := trim(coalesce(new_brand_name, ''));
  clean_logo_url text := nullif(trim(coalesce(new_logo_url, '')), '');
  clean_primary_color text := nullif(lower(trim(coalesce(new_primary_color, ''))), '');
  clean_secondary_color text := nullif(lower(trim(coalesce(new_secondary_color, ''))), '');
  clean_tertiary_color text := nullif(lower(trim(coalesce(new_tertiary_color, ''))), '');
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

  if clean_secondary_color is not null and clean_secondary_color !~ '^#[0-9a-f]{6}$' then
    raise exception 'core_update_brand_settings secondary color must be a #rrggbb hex value';
  end if;

  if clean_tertiary_color is not null and clean_tertiary_color !~ '^#[0-9a-f]{6}$' then
    raise exception 'core_update_brand_settings tertiary color must be a #rrggbb hex value';
  end if;

  select b.brand_name, b.logo_url,
    b.theme_json ->> 'primary_color',
    b.theme_json ->> 'secondary_color',
    b.theme_json ->> 'tertiary_color'
  into old_brand_name, old_logo_url, old_primary_color, old_secondary_color, old_tertiary_color
  from public.core_brand_settings b
  where b.workspace_id = target_workspace_id;

  if not found then
    raise exception 'core_update_brand_settings requires the seeded branding row';
  end if;

  update public.core_brand_settings b
  set brand_name = clean_brand_name,
      logo_url = clean_logo_url,
      theme_json = (
        (b.theme_json - 'primary_color' - 'secondary_color' - 'tertiary_color')
        || case when clean_primary_color is null then '{}'::jsonb
             else jsonb_build_object('primary_color', clean_primary_color) end
        || case when clean_secondary_color is null then '{}'::jsonb
             else jsonb_build_object('secondary_color', clean_secondary_color) end
        || case when clean_tertiary_color is null then '{}'::jsonb
             else jsonb_build_object('tertiary_color', clean_tertiary_color) end
      ),
      updated_at = now()
  where b.workspace_id = target_workspace_id;

  if old_brand_name is distinct from clean_brand_name
    or old_logo_url is distinct from clean_logo_url
    or old_primary_color is distinct from clean_primary_color
    or old_secondary_color is distinct from clean_secondary_color
    or old_tertiary_color is distinct from clean_tertiary_color then
    perform private.core_append_audit_event(
      target_workspace_id,
      'branding.updated',
      'brand_settings',
      target_workspace_id,
      jsonb_build_object(
        'old', jsonb_build_object(
          'brand_name', old_brand_name,
          'logo_url', old_logo_url,
          'primary_color', old_primary_color,
          'secondary_color', old_secondary_color,
          'tertiary_color', old_tertiary_color
        ),
        'new', jsonb_build_object(
          'brand_name', clean_brand_name,
          'logo_url', clean_logo_url,
          'primary_color', clean_primary_color,
          'secondary_color', clean_secondary_color,
          'tertiary_color', clean_tertiary_color
        )
      )
    );
  end if;

  return query
  select target_workspace_id, clean_brand_name, clean_logo_url,
    clean_primary_color, clean_secondary_color, clean_tertiary_color;
end;
$$;

revoke all on function public.core_update_brand_settings(text, text, text, text, text) from public;
grant execute on function public.core_update_brand_settings(text, text, text, text, text) to authenticated;

-- Public bucket for brand assets (logos). Reads are public (the logo renders
-- on unauthenticated surfaces like sign-in emails and the entry page); writes
-- happen only through the server-side branding action with the service role,
-- so no storage.objects policies are granted to authenticated or anon.
insert into storage.buckets (id, name, public)
values ('core-brand', 'core-brand', true)
on conflict (id) do nothing;
