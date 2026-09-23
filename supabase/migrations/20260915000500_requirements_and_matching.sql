create table public.requirements (
  id uuid primary key default extensions.gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete restrict,
  city_id uuid not null references public.cities(id) on delete restrict,
  category_id uuid references public.categories(id) on delete restrict,
  title text not null,
  description text,
  quantity numeric(14, 3) check (quantity is null or quantity > 0),
  budget_min numeric(14, 2) check (budget_min is null or budget_min >= 0),
  budget_max numeric(14, 2) check (budget_max is null or budget_max >= 0),
  required_date date,
  duration text,
  address text,
  latitude double precision,
  longitude double precision,
  ai_extracted_data jsonb not null default '{}'::jsonb check (jsonb_typeof(ai_extracted_data) = 'object'),
  status text not null default 'open' check (status in ('open', 'matching', 'quoted', 'accepted', 'completed', 'cancelled', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint requirements_title_not_blank check (length(trim(title)) > 0),
  constraint requirements_budget_range_valid check (budget_min is null or budget_max is null or budget_min <= budget_max),
  constraint requirements_latitude_valid check (latitude is null or latitude between -90 and 90),
  constraint requirements_longitude_valid check (longitude is null or longitude between -180 and 180)
);

create or replace function public.protect_requirement_status()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.status is distinct from old.status and auth.role() <> 'service_role' then
    if old.status in ('open', 'matching') and new.status = 'cancelled' then
      return new;
    end if;
    new.status = old.status;
  end if;
  return new;
end;
$$;

create trigger requirements_set_updated_at
before update on public.requirements
for each row execute function public.set_updated_at();

create trigger requirements_protect_status
before update on public.requirements
for each row execute function public.protect_requirement_status();

create table public.requirement_matches (
  id uuid primary key default extensions.gen_random_uuid(),
  requirement_id uuid not null references public.requirements(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete restrict,
  match_score numeric(5, 4) not null check (match_score between 0 and 1),
  match_reason jsonb not null default '{}'::jsonb check (jsonb_typeof(match_reason) = 'object'),
  notification_sent boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'notified', 'viewed', 'dismissed', 'accepted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requirement_id, business_id)
);

create trigger requirement_matches_set_updated_at
before update on public.requirement_matches
for each row execute function public.set_updated_at();
