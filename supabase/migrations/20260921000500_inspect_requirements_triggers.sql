create or replace function public.inspect_requirements_triggers()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_agg(jsonb_build_object(
    'trigger_name', trigger_name,
    'event_manipulation', event_manipulation,
    'action_timing', action_timing,
    'action_statement', action_statement
  ))
  from information_schema.triggers
  where event_object_table = 'requirements';
$$;

grant execute on function public.inspect_requirements_triggers() to anon, authenticated;
