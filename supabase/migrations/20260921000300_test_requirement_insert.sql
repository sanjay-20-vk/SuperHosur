create or replace function public.inspect_user_email(p_id uuid)
returns text
language sql
security definer
set search_path = public, auth
as $$
  select email::text from auth.users where id = p_id;
$$;

grant execute on function public.inspect_user_email(uuid) to anon, authenticated;
