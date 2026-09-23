create or replace function public.protect_business_verification()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.verified is distinct from old.verified
    and auth.role() <> 'service_role'
    and not public.is_admin() then
    new.verified = old.verified;
  end if;
  return new;
end;
$$;