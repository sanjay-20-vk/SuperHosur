-- Fix properties owner select and update/delete RLS policies
-- Evaluating owns_property(id) during INSERT ... RETURNING evaluates a sub-select
-- against public.properties where the new row is not yet visible in the query snapshot,
-- causing PostgreSQL to reject the RETURNING clause with:
-- "new row violates row-level security policy for table 'properties'".
-- Defining the check directly on owner_id = auth.uid() ensures direct ownership validation.

drop policy if exists properties_owner_select on public.properties;
create policy properties_owner_select
on public.properties for select to authenticated
using (owner_id = auth.uid());

drop policy if exists properties_owner_update on public.properties;
create policy properties_owner_update
on public.properties for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists properties_owner_delete on public.properties;
create policy properties_owner_delete
on public.properties for delete to authenticated
using (owner_id = auth.uid());
