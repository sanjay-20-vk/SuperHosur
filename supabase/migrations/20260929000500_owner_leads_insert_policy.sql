-- Fix insert policy for owner_leads to allow owners to create manual leads or test leads
grant insert, delete on public.owner_leads to authenticated;

drop policy if exists owner_leads_owner_insert on public.owner_leads;
create policy owner_leads_owner_insert
on public.owner_leads for insert to authenticated
with check (
  owner_id = auth.uid()
);

drop policy if exists owner_leads_owner_delete on public.owner_leads;
create policy owner_leads_owner_delete
on public.owner_leads for delete to authenticated
using (
  owner_id = auth.uid() or public.is_admin()
);
