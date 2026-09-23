create table public.properties (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  city_id uuid not null references public.cities(id) on delete restrict,
  title text not null,
  property_type text not null check (property_type in ('apartment', 'house', 'villa', 'plot', 'commercial', 'office', 'shop', 'warehouse', 'land', 'other')),
  listing_type text not null check (listing_type in ('sale', 'rent', 'lease')),
  bedrooms integer check (bedrooms is null or bedrooms >= 0),
  bathrooms numeric(4, 1) check (bathrooms is null or bathrooms >= 0),
  area_sqft numeric(12, 2) check (area_sqft is null or area_sqft > 0),
  price numeric(14, 2) check (price is null or price >= 0),
  rent numeric(14, 2) check (rent is null or rent >= 0),
  deposit numeric(14, 2) check (deposit is null or deposit >= 0),
  description text,
  address text,
  latitude double precision,
  longitude double precision,
  verified boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint properties_title_not_blank check (length(trim(title)) > 0),
  constraint properties_latitude_valid check (latitude is null or latitude between -90 and 90),
  constraint properties_longitude_valid check (longitude is null or longitude between -180 and 180)
);

create or replace function public.protect_property_verification()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.verified is distinct from old.verified and auth.role() <> 'service_role' then
    new.verified = old.verified;
  end if;
  return new;
end;
$$;

create trigger properties_set_updated_at
before update on public.properties
for each row execute function public.set_updated_at();

create trigger properties_protect_verification
before update on public.properties
for each row execute function public.protect_property_verification();

create table public.property_photos (
  id uuid primary key default extensions.gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_primary boolean not null default false,
  moderation_status text not null default 'pending' check (moderation_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (property_id, storage_path)
);

create unique index property_photos_one_primary
on public.property_photos (property_id)
where is_primary;
