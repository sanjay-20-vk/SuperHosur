-- Saved Listings / Favorites Migration for SuperHosur
-- Supports saving verified Businesses and Properties for authenticated users.

-- 1. Create public.saved_listings table
create table if not exists public.saved_listings (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  property_id uuid references public.properties(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint saved_listings_target_check check (
    (business_id is not null and property_id is null) or
    (business_id is null and property_id is not null)
  )
);

comment on table public.saved_listings is 'User saved listings and favorites for businesses and properties';
comment on column public.saved_listings.user_id is 'The user who saved the listing';
comment on column public.saved_listings.business_id is 'Reference to saved business listing, if applicable';
comment on column public.saved_listings.property_id is 'Reference to saved property listing, if applicable';

-- 2. Partial unique indexes to prevent duplicate saves per user
create unique index if not exists saved_listings_user_business_idx
  on public.saved_listings (user_id, business_id)
  where business_id is not null;

create unique index if not exists saved_listings_user_property_idx
  on public.saved_listings (user_id, property_id)
  where property_id is not null;

-- 3. Lookup indexes for efficient user query and cascade handling
create index if not exists saved_listings_user_id_idx
  on public.saved_listings (user_id);

create index if not exists saved_listings_business_id_idx
  on public.saved_listings (business_id)
  where business_id is not null;

create index if not exists saved_listings_property_id_idx
  on public.saved_listings (property_id)
  where property_id is not null;

create index if not exists saved_listings_created_at_idx
  on public.saved_listings (created_at desc);

-- 4. Row Level Security
alter table public.saved_listings enable row level security;

-- Grant permissions to authenticated users
grant select, insert, delete on public.saved_listings to authenticated;

-- Users can only view their own saved listings
drop policy if exists saved_listings_user_select on public.saved_listings;
create policy saved_listings_user_select
  on public.saved_listings for select to authenticated
  using (user_id = auth.uid());

-- Users can only insert saved listings under their own user_id
drop policy if exists saved_listings_user_insert on public.saved_listings;
create policy saved_listings_user_insert
  on public.saved_listings for insert to authenticated
  with check (user_id = auth.uid());

-- Users can only delete their own saved listings
drop policy if exists saved_listings_user_delete on public.saved_listings;
create policy saved_listings_user_delete
  on public.saved_listings for delete to authenticated
  using (user_id = auth.uid());

-- Admins can view and delete all saved listings for moderation
drop policy if exists saved_listings_admin_all on public.saved_listings;
create policy saved_listings_admin_all
  on public.saved_listings for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
