create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer' check (role in ('customer', 'vendor', 'admin')),
  full_name text,
  phone text,
  avatar_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.role is distinct from old.role and auth.role() <> 'service_role' then
    new.role = old.role;
  end if;
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger profiles_protect_role
before update on public.profiles
for each row execute function public.protect_profile_role();

create table public.cities (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  slug text not null unique,
  state text not null,
  country text not null default 'India',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cities_name_not_blank check (length(trim(name)) > 0),
  constraint cities_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create trigger cities_set_updated_at
before update on public.cities
for each row execute function public.set_updated_at();

create table public.categories (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_name_not_blank check (length(trim(name)) > 0),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create table public.subcategories (
  id uuid primary key default extensions.gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null,
  slug text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, slug),
  unique (category_id, id),
  constraint subcategories_name_not_blank check (length(trim(name)) > 0),
  constraint subcategories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create trigger subcategories_set_updated_at
before update on public.subcategories
for each row execute function public.set_updated_at();

insert into public.cities (name, slug, state, country)
values ('Hosur', 'hosur', 'Tamil Nadu', 'India')
on conflict (slug) do nothing;

insert into public.categories (name, slug)
values
  ('Property', 'property'),
  ('Services', 'services'),
  ('Products', 'products'),
  ('Professionals', 'professionals'),
  ('Local Businesses', 'local-businesses'),
  ('Industry', 'industry'),
  ('Suppliers', 'suppliers'),
  ('Logistics', 'logistics'),
  ('Equipment', 'equipment'),
  ('Workforce', 'workforce')
on conflict (slug) do nothing;
