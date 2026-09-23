create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and active
  );
$$;

create or replace function public.owns_business(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.businesses
    where id = target_business_id
      and owner_id = auth.uid()
  );
$$;

create or replace function public.owns_property(target_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.properties
    where id = target_property_id
      and owner_id = auth.uid()
  );
$$;

create or replace function public.owns_requirement(target_requirement_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.requirements
    where id = target_requirement_id
      and customer_id = auth.uid()
  );
$$;

create or replace function public.is_public_business(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.businesses
    where id = target_business_id
      and active
      and verified
  );
$$;

create or replace function public.is_public_property(target_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.properties
    where id = target_property_id
      and active
      and verified
  );
$$;

create or replace function public.is_requirement_customer(target_requirement_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.requirements
    where id = target_requirement_id
      and customer_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.owns_business(uuid) from public;
revoke all on function public.owns_property(uuid) from public;
revoke all on function public.owns_requirement(uuid) from public;
revoke all on function public.is_requirement_customer(uuid) from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.owns_business(uuid) to authenticated;
grant execute on function public.owns_property(uuid) to authenticated;
grant execute on function public.owns_requirement(uuid) to authenticated;
grant execute on function public.is_requirement_customer(uuid) to authenticated;
grant execute on function public.is_public_business(uuid) to anon, authenticated;
grant execute on function public.is_public_property(uuid) to anon, authenticated;

create index profiles_role_idx on public.profiles (role);
create index profiles_phone_idx on public.profiles (phone) where phone is not null;
create index cities_active_idx on public.cities (active);
create index categories_active_idx on public.categories (active);
create index subcategories_category_id_idx on public.subcategories (category_id);

create index businesses_owner_id_idx on public.businesses (owner_id);
create index businesses_city_id_idx on public.businesses (city_id);
create index businesses_category_id_idx on public.businesses (category_id);
create index businesses_active_idx on public.businesses (active);
create index businesses_verified_idx on public.businesses (verified);
create index businesses_availability_status_idx on public.businesses (availability_status);
create index businesses_location_idx on public.businesses (latitude, longitude)
where latitude is not null and longitude is not null;

create index business_services_business_id_idx on public.business_services (business_id);
create index business_services_category_id_idx on public.business_services (category_id);
create index business_products_business_id_idx on public.business_products (business_id);
create index business_products_category_id_idx on public.business_products (category_id);
create index business_photos_business_id_idx on public.business_photos (business_id);
create index business_videos_business_id_idx on public.business_videos (business_id);

create index properties_owner_id_idx on public.properties (owner_id);
create index properties_city_id_idx on public.properties (city_id);
create index properties_active_idx on public.properties (active);
create index properties_listing_type_idx on public.properties (listing_type);
create index properties_property_type_idx on public.properties (property_type);
create index properties_location_idx on public.properties (latitude, longitude)
where latitude is not null and longitude is not null;
create index property_photos_property_id_idx on public.property_photos (property_id);

create index requirements_customer_id_idx on public.requirements (customer_id);
create index requirements_city_id_idx on public.requirements (city_id);
create index requirements_category_id_idx on public.requirements (category_id);
create index requirements_status_idx on public.requirements (status);
create index requirement_matches_requirement_id_idx on public.requirement_matches (requirement_id);
create index requirement_matches_business_id_idx on public.requirement_matches (business_id);
create index requirement_matches_status_idx on public.requirement_matches (status);

alter table public.profiles enable row level security;
alter table public.cities enable row level security;
alter table public.categories enable row level security;
alter table public.subcategories enable row level security;
alter table public.businesses enable row level security;
alter table public.business_services enable row level security;
alter table public.business_products enable row level security;
alter table public.business_photos enable row level security;
alter table public.business_videos enable row level security;
alter table public.properties enable row level security;
alter table public.property_photos enable row level security;
alter table public.requirements enable row level security;
alter table public.requirement_matches enable row level security;

grant select on public.cities, public.categories, public.subcategories to anon, authenticated;
grant select on public.businesses, public.business_services, public.business_products,
  public.business_photos, public.business_videos, public.properties, public.property_photos
  to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.businesses, public.business_services,
  public.business_products, public.business_photos, public.business_videos,
  public.properties, public.property_photos to authenticated;
grant select, insert, update on public.requirements to authenticated;
grant select on public.requirement_matches to authenticated;

create policy profiles_select_own
on public.profiles for select to authenticated
using (id = auth.uid());

create policy profiles_insert_own_customer
on public.profiles for insert to authenticated
with check (id = auth.uid() and role = 'customer');

create policy profiles_update_own
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy profiles_admin_all
on public.profiles for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy cities_public_read
on public.cities for select to anon, authenticated
using (active);

create policy cities_admin_all
on public.cities for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy categories_public_read
on public.categories for select to anon, authenticated
using (active);

create policy categories_admin_all
on public.categories for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy subcategories_public_read
on public.subcategories for select to anon, authenticated
using (active);

create policy subcategories_admin_all
on public.subcategories for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy businesses_public_read
on public.businesses for select to anon, authenticated
using (active and verified);

create policy businesses_owner_select
on public.businesses for select to authenticated
using (public.owns_business(id));

create policy businesses_owner_insert
on public.businesses for insert to authenticated
with check (owner_id = auth.uid());

create policy businesses_owner_update
on public.businesses for update to authenticated
using (public.owns_business(id))
with check (owner_id = auth.uid());

create policy businesses_owner_delete
on public.businesses for delete to authenticated
using (public.owns_business(id));

create policy businesses_admin_all
on public.businesses for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy business_services_public_read
on public.business_services for select to anon, authenticated
using (public.is_public_business(business_id));

create policy business_services_owner_insert
on public.business_services for insert to authenticated
with check (public.owns_business(business_id));

create policy business_services_owner_update
on public.business_services for update to authenticated
using (public.owns_business(business_id))
with check (public.owns_business(business_id));

create policy business_services_owner_delete
on public.business_services for delete to authenticated
using (public.owns_business(business_id));

create policy business_services_admin_all
on public.business_services for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy business_products_public_read
on public.business_products for select to anon, authenticated
using (public.is_public_business(business_id));

create policy business_products_owner_insert
on public.business_products for insert to authenticated
with check (public.owns_business(business_id));

create policy business_products_owner_update
on public.business_products for update to authenticated
using (public.owns_business(business_id))
with check (public.owns_business(business_id));

create policy business_products_owner_delete
on public.business_products for delete to authenticated
using (public.owns_business(business_id));

create policy business_products_admin_all
on public.business_products for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy business_photos_public_read
on public.business_photos for select to anon, authenticated
using (moderation_status = 'approved' and public.is_public_business(business_id));

create policy business_photos_owner_insert
on public.business_photos for insert to authenticated
with check (public.owns_business(business_id));

create policy business_photos_owner_update
on public.business_photos for update to authenticated
using (public.owns_business(business_id))
with check (public.owns_business(business_id));

create policy business_photos_owner_delete
on public.business_photos for delete to authenticated
using (public.owns_business(business_id));

create policy business_photos_admin_all
on public.business_photos for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy business_videos_public_read
on public.business_videos for select to anon, authenticated
using (moderation_status = 'approved' and public.is_public_business(business_id));

create policy business_videos_owner_insert
on public.business_videos for insert to authenticated
with check (public.owns_business(business_id));

create policy business_videos_owner_update
on public.business_videos for update to authenticated
using (public.owns_business(business_id))
with check (public.owns_business(business_id));

create policy business_videos_owner_delete
on public.business_videos for delete to authenticated
using (public.owns_business(business_id));

create policy business_videos_admin_all
on public.business_videos for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy properties_public_read
on public.properties for select to anon, authenticated
using (active and verified);

create policy properties_owner_select
on public.properties for select to authenticated
using (public.owns_property(id));

create policy properties_owner_insert
on public.properties for insert to authenticated
with check (owner_id = auth.uid());

create policy properties_owner_update
on public.properties for update to authenticated
using (public.owns_property(id))
with check (owner_id = auth.uid());

create policy properties_owner_delete
on public.properties for delete to authenticated
using (public.owns_property(id));

create policy properties_admin_all
on public.properties for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy property_photos_public_read
on public.property_photos for select to anon, authenticated
using (moderation_status = 'approved' and public.is_public_property(property_id));

create policy property_photos_owner_insert
on public.property_photos for insert to authenticated
with check (public.owns_property(property_id));

create policy property_photos_owner_update
on public.property_photos for update to authenticated
using (public.owns_property(property_id))
with check (public.owns_property(property_id));

create policy property_photos_owner_delete
on public.property_photos for delete to authenticated
using (public.owns_property(property_id));

create policy property_photos_admin_all
on public.property_photos for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy requirements_select_own
on public.requirements for select to authenticated
using (public.owns_requirement(id));

create policy requirements_insert_own
on public.requirements for insert to authenticated
with check (customer_id = auth.uid());

create policy requirements_update_eligible
on public.requirements for update to authenticated
using (public.owns_requirement(id) and status in ('open', 'matching'))
with check (customer_id = auth.uid() and status in ('open', 'matching', 'cancelled'));

create policy requirements_admin_all
on public.requirements for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy requirement_matches_customer_read
on public.requirement_matches for select to authenticated
using (public.is_requirement_customer(requirement_id));

create policy requirement_matches_vendor_read
on public.requirement_matches for select to authenticated
using (public.owns_business(business_id));

create policy requirement_matches_admin_all
on public.requirement_matches for all to authenticated
using (public.is_admin())
with check (public.is_admin());
