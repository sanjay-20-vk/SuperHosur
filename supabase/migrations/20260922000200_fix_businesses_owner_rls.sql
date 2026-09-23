-- Fix businesses owner SELECT / UPDATE / DELETE RLS policies
--
-- Root cause (same pattern as 20260921001500_fix_properties_owner_select_rls.sql):
-- The original policies used public.owns_business(id), which internally runs:
--
--   SELECT EXISTS (SELECT 1 FROM public.businesses WHERE id = $1 AND owner_id = auth.uid())
--
-- During UPDATE ... RETURNING *, the RETURNING clause evaluates SELECT RLS.
-- own_business() sub-selects back into public.businesses, but at that point in the
-- transaction the updated row's snapshot visibility is implementation-defined, which
-- causes Postgres to reject the RETURNING with:
--   "new row violates row-level security policy for table 'businesses'"
-- This is surfaced by PostgREST as PGRST116 / authorization error, making the Edit
-- Business save silently fail (or show a Supabase authorization error in the form).
--
-- Fix: replace the sub-select with a direct column comparison (owner_id = auth.uid()),
-- which evaluates against the row being acted upon without any recursive table access.
-- Security is equivalent: the owner can only SELECT/UPDATE/DELETE their own rows.

drop policy if exists businesses_owner_select on public.businesses;
create policy businesses_owner_select
on public.businesses for select to authenticated
using (owner_id = auth.uid());

drop policy if exists businesses_owner_update on public.businesses;
create policy businesses_owner_update
on public.businesses for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists businesses_owner_delete on public.businesses;
create policy businesses_owner_delete
on public.businesses for delete to authenticated
using (owner_id = auth.uid());
