create or replace function public.inspect_test_users()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_agg(jsonb_build_object(
    'id', p.id,
    'role', p.role,
    'full_name', p.full_name
  ))
  from public.profiles p;
$$;

grant execute on function public.inspect_test_users() to anon, authenticated;
