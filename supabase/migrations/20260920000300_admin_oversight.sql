-- Admin Oversight of Requirements & Users Migration

-- 1. Allow admins to moderate requirement statuses
create or replace function public.protect_requirement_status()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.status is distinct from old.status and auth.role() <> 'service_role' and not public.is_admin() then
    if old.status in ('open', 'matching') and new.status = 'cancelled' then
      return new;
    end if;
    new.status = old.status;
  end if;
  return new;
end;
$$;

-- 2. Allow admins to manage user roles
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.role is distinct from old.role and auth.role() <> 'service_role' and not public.is_admin() then
    new.role = old.role;
  end if;
  return new;
end;
$$;

-- 3. Provide a secure RPC function for admins to view user accounts with authentication email
create or replace function public.get_admin_users()
returns table (
  id uuid,
  email text,
  role text,
  full_name text,
  phone text,
  avatar_url text,
  active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Access denied: administrator privileges required.';
  end if;

  return query
  select
    p.id,
    u.email::text,
    p.role,
    p.full_name,
    p.phone,
    p.avatar_url,
    p.active,
    p.created_at,
    p.updated_at
  from public.profiles p
  left join auth.users u on u.id = p.id
  order by p.created_at desc;
end;
$$;

revoke all on function public.get_admin_users() from public;
grant execute on function public.get_admin_users() to authenticated;
