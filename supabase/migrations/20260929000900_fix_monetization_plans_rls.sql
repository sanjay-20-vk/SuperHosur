-- Grant select to anon explicitly and fix is_admin check when auth.uid() is null
grant select on public.monetization_plans to anon, authenticated;

drop policy if exists monetization_plans_select on public.monetization_plans;
create policy monetization_plans_select on public.monetization_plans
for select to anon, authenticated
using (
  active = true
  or (auth.uid() is not null and public.is_admin())
);
