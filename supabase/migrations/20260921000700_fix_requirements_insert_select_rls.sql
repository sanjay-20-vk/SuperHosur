-- Fix requirements insert and select RLS policies
-- Evaluating owns_requirement(id) during INSERT ... RETURNING evaluates a sub-select
-- against public.requirements where the new row is not yet visible in the query snapshot,
-- causing PostgreSQL to reject the RETURNING clause with:
-- "new row violates row-level security policy for table 'requirements'".
-- Defining the check directly on customer_id = auth.uid() ensures direct ownership validation.

drop policy if exists requirements_insert_own on public.requirements;
create policy requirements_insert_own
on public.requirements for insert to authenticated
with check (customer_id = auth.uid());

drop policy if exists requirements_select_own on public.requirements;
create policy requirements_select_own
on public.requirements for select to authenticated
using (customer_id = auth.uid());
