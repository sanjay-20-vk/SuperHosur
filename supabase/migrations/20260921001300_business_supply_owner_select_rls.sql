-- Business Services and Products Owner Select Policies
-- Owners must be able to read and receive (via INSERT ... RETURNING) their own services and products,
-- even if their business is pending verification.

drop policy if exists business_services_owner_select on public.business_services;
create policy business_services_owner_select
on public.business_services for select to authenticated
using (public.owns_business(business_id));

drop policy if exists business_products_owner_select on public.business_products;
create policy business_products_owner_select
on public.business_products for select to authenticated
using (public.owns_business(business_id));
