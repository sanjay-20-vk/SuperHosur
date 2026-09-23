create or replace function public.inspect_unconfirmed_users()
returns jsonb
language sql
security definer
set search_path = public, auth
as $$
  select jsonb_agg(jsonb_build_object(
    'id', id,
    'email', email,
    'email_confirmed_at', email_confirmed_at,
    'created_at', created_at
  ))
  from auth.users
  where email_confirmed_at is null;
$$;

grant execute on function public.inspect_unconfirmed_users() to anon, authenticated;
