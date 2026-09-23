-- Expose property owner contact via a SECURITY DEFINER function.
--
-- WHY A FUNCTION INSTEAD OF AN RLS POLICY
-- ----------------------------------------
-- RLS is row-level, not column-level.  Any policy that allows anon SELECT on
-- public.profiles would expose all columns (role, avatar_url, active, etc.) to
-- anyone who crafts a direct query, even if the application only projects
-- full_name and phone.
--
-- A SECURITY DEFINER function is the narrowest safe approach:
--   1. Only the two columns required by the property contact card are returned.
--   2. The caller supplies a property_id (not an owner_id), so the server
--      performs the join internally and never lets the caller enumerate profiles
--      by user-id.
--   3. The property must be active; inactive / unverified listings return no row.
--   4. The profiles table itself gains no new grants or RLS policies.
--
-- NOTE: profiles has no email column (email lives in auth.users, which is only
-- accessible to service_role / admins via get_admin_users()).  Only full_name
-- and phone are returned.

create or replace function public.get_property_owner_contact(target_property_id uuid)
returns table (full_name text, phone text)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.full_name,
    p.phone
  from public.properties prop
  inner join public.profiles p on p.id = prop.owner_id
  where prop.id = target_property_id
    and prop.active = true
  limit 1;
$$;

revoke all on function public.get_property_owner_contact(uuid) from public;
grant execute on function public.get_property_owner_contact(uuid) to anon, authenticated;
