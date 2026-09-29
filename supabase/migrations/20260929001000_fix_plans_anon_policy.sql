-- Fix monetization_plans_select policy:
-- Separate anon policy (active = true only) from authenticated policy (active = true or is_admin())
drop policy if exists monetization_plans_select on public.monetization_plans;
drop policy if exists monetization_plans_anon_select on public.monetization_plans;
drop policy if exists monetization_plans_auth_select on public.monetization_plans;

create policy monetization_plans_anon_select on public.monetization_plans
for select to anon
using (active = true);

create policy monetization_plans_auth_select on public.monetization_plans
for select to authenticated
using (active = true or public.is_admin());
