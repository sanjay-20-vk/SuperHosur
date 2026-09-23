create table public.businesses (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  city_id uuid not null references public.cities(id) on delete restrict,
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null,
  slug text not null,
  description text,
  phone text,
  whatsapp text,
  email text,
  address text,
  pincode text,
  latitude double precision,
  longitude double precision,
  service_radius_km numeric(8, 2),
  availability_status text not null default 'available' check (availability_status in ('available', 'busy', 'offline')),
  verified boolean not null default false,
  rating numeric(3, 2) not null default 0 check (rating between 0 and 5),
  review_count integer not null default 0 check (review_count >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city_id, slug),
  constraint businesses_name_not_blank check (length(trim(name)) > 0),
  constraint businesses_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint businesses_latitude_valid check (latitude is null or latitude between -90 and 90),
  constraint businesses_longitude_valid check (longitude is null or longitude between -180 and 180),
  constraint businesses_service_radius_valid check (service_radius_km is null or service_radius_km >= 0)
);

create or replace function public.protect_business_verification()
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

create trigger businesses_set_updated_at
before update on public.businesses
for each row execute function public.set_updated_at();

create trigger businesses_protect_verification
before update on public.businesses
for each row execute function public.protect_business_verification();

create table public.business_services (
  id uuid primary key default extensions.gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  subcategory_id uuid,
  name text not null,
  description text,
  price_from numeric(14, 2),
  price_to numeric(14, 2),
  price_unit text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (category_id, subcategory_id)
    references public.subcategories(category_id, id) on delete restrict,
  constraint business_services_name_not_blank check (length(trim(name)) > 0),
  constraint business_services_price_from_valid check (price_from is null or price_from >= 0),
  constraint business_services_price_to_valid check (price_to is null or price_to >= 0),
  constraint business_services_price_range_valid check (price_from is null or price_to is null or price_from <= price_to)
);

create trigger business_services_set_updated_at
before update on public.business_services
for each row execute function public.set_updated_at();

create table public.business_products (
  id uuid primary key default extensions.gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  subcategory_id uuid,
  name text not null,
  description text,
  price numeric(14, 2) not null check (price >= 0),
  unit text,
  availability text not null default 'available' check (availability in ('available', 'limited', 'unavailable')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (category_id, subcategory_id)
    references public.subcategories(category_id, id) on delete restrict,
  constraint business_products_name_not_blank check (length(trim(name)) > 0)
);

create trigger business_products_set_updated_at
before update on public.business_products
for each row execute function public.set_updated_at();

create table public.business_photos (
  id uuid primary key default extensions.gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_primary boolean not null default false,
  moderation_status text not null default 'pending' check (moderation_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (business_id, storage_path)
);

create unique index business_photos_one_primary
on public.business_photos (business_id)
where is_primary;

create table public.business_videos (
  id uuid primary key default extensions.gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  storage_path text not null,
  thumbnail_path text,
  duration_seconds integer check (duration_seconds is null or duration_seconds > 0),
  is_featured boolean not null default false,
  moderation_status text not null default 'pending' check (moderation_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, storage_path)
);

create unique index business_videos_one_featured
on public.business_videos (business_id)
where is_featured;

create trigger business_videos_set_updated_at
before update on public.business_videos
for each row execute function public.set_updated_at();
