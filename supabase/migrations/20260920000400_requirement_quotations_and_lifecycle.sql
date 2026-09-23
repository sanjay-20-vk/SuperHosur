-- Requirement Quotations & Lifecycle Completion Migration

-- 1. Add subcategory_id to requirements table
alter table public.requirements
add column if not exists subcategory_id uuid references public.subcategories(id) on delete set null;

create index if not exists requirements_subcategory_id_idx
on public.requirements (subcategory_id);

-- 2. Create requirement_quotes table
create table if not exists public.requirement_quotes (
  id uuid primary key default extensions.gen_random_uuid(),
  requirement_id uuid not null references public.requirements(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  vendor_id uuid not null references public.profiles(id) on delete cascade,
  quote_amount numeric(14, 2) not null check (quote_amount > 0),
  estimated_duration text,
  valid_until date,
  notes text,
  status text not null default 'submitted' check (status in ('submitted', 'accepted', 'rejected', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requirement_id, business_id)
);

-- Trigger for requirement_quotes updated_at
drop trigger if exists requirement_quotes_set_updated_at on public.requirement_quotes;
create trigger requirement_quotes_set_updated_at
before update on public.requirement_quotes
for each row execute function public.set_updated_at();

-- Indexes for performance
create index if not exists requirement_quotes_requirement_id_idx on public.requirement_quotes(requirement_id);
create index if not exists requirement_quotes_business_id_idx on public.requirement_quotes(business_id);
create index if not exists requirement_quotes_status_idx on public.requirement_quotes(status);

-- 3. Row Level Security for requirement_quotes
alter table public.requirement_quotes enable row level security;
grant select, insert, update on public.requirement_quotes to authenticated;

drop policy if exists requirement_quotes_vendor_all on public.requirement_quotes;
create policy requirement_quotes_vendor_all
on public.requirement_quotes for all to authenticated
using (public.owns_business(business_id))
with check (public.owns_business(business_id));

drop policy if exists requirement_quotes_customer_read on public.requirement_quotes;
create policy requirement_quotes_customer_read
on public.requirement_quotes for select to authenticated
using (public.owns_requirement(requirement_id));

drop policy if exists requirement_quotes_admin_all on public.requirement_quotes;
create policy requirement_quotes_admin_all
on public.requirement_quotes for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 4. Trigger to transition requirement status to 'quoted' when quote is inserted
create or replace function public.on_quote_submitted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.requirements
  set status = 'quoted'
  where id = new.requirement_id
    and status in ('open', 'matching');
  return new;
end;
$$;

drop trigger if exists requirement_quote_submitted_trigger on public.requirement_quotes;
create trigger requirement_quote_submitted_trigger
after insert on public.requirement_quotes
for each row execute function public.on_quote_submitted();

-- 5. Update protect_requirement_status() trigger
create or replace function public.protect_requirement_status()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.status is distinct from old.status and auth.role() <> 'service_role' and not public.is_admin() then
    -- Allow customer who owns the requirement to cancel it
    if old.status in ('open', 'matching', 'quoted') and new.status = 'cancelled' and old.customer_id = auth.uid() then
      return new;
    end if;
    -- Allow customer who owns the requirement to accept an offer
    if old.status in ('open', 'matching', 'quoted') and new.status = 'accepted' and old.customer_id = auth.uid() then
      return new;
    end if;
    -- Allow customer who owns the requirement to mark it completed
    if old.status = 'accepted' and new.status = 'completed' and old.customer_id = auth.uid() then
      return new;
    end if;
    -- Allow transition to quoted if coming from open or matching
    if old.status in ('open', 'matching') and new.status = 'quoted' then
      return new;
    end if;
    new.status = old.status;
  end if;
  return new;
end;
$$;

-- 6. Update requirements_update_eligible RLS policy
drop policy if exists requirements_update_eligible on public.requirements;
create policy requirements_update_eligible
on public.requirements for update to authenticated
using (
  (public.owns_requirement(id) and status in ('open', 'matching', 'quoted', 'accepted'))
  or public.is_admin()
)
with check (
  customer_id = auth.uid()
  and status in ('open', 'matching', 'quoted', 'accepted', 'completed', 'cancelled')
);

-- 7. Atomic quote acceptance RPC function
create or replace function public.accept_requirement_quote(
  target_requirement_id uuid,
  target_quote_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_business_id uuid;
begin
  select customer_id into v_customer_id
  from public.requirements
  where id = target_requirement_id;

  if v_customer_id is null then
    raise exception 'Requirement not found.';
  end if;

  if v_customer_id <> auth.uid() and not public.is_admin() then
    raise exception 'Access denied: Only the requirement customer can accept quotes.';
  end if;

  select business_id into v_business_id
  from public.requirement_quotes
  where id = target_quote_id
    and requirement_id = target_requirement_id;

  if v_business_id is null then
    raise exception 'Quote not found for this requirement.';
  end if;

  -- 1. Mark chosen quote as accepted
  update public.requirement_quotes
  set status = 'accepted'
  where id = target_quote_id;

  -- 2. Mark competing quotes as rejected
  update public.requirement_quotes
  set status = 'rejected'
  where requirement_id = target_requirement_id
    and id <> target_quote_id
    and status = 'submitted';

  -- 3. Update requirement status to accepted
  update public.requirements
  set status = 'accepted'
  where id = target_requirement_id;

  -- 4. Mark matched vendor lead as accepted
  update public.requirement_matches
  set status = 'accepted'
  where requirement_id = target_requirement_id
    and business_id = v_business_id;
end;
$$;

revoke all on function public.accept_requirement_quote(uuid, uuid) from public;
grant execute on function public.accept_requirement_quote(uuid, uuid) to authenticated;

-- 8. Enhance auto_match_requirement() to prioritize subcategory supply
create or replace function public.auto_match_requirement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('open', 'matching') and new.category_id is not null then
    -- Subcategory-level supply matching (priority score 0.98)
    if new.subcategory_id is not null then
      insert into public.requirement_matches (
        requirement_id,
        business_id,
        match_score,
        match_reason,
        status
      )
      select distinct
        new.id,
        b.id,
        0.98,
        jsonb_build_object(
          'type', 'subcategory_supply_match',
          'subcategory_matched', true,
          'category_matched', true,
          'city_matched', true
        ),
        'pending'
      from public.businesses b
      where b.active = true
        and b.verified = true
        and b.city_id = new.city_id
        and b.category_id = new.category_id
        and (
          exists (
            select 1 from public.business_services bs
            where bs.business_id = b.id and bs.subcategory_id = new.subcategory_id and bs.active = true
          )
          or exists (
            select 1 from public.business_products bp
            where bp.business_id = b.id and bp.subcategory_id = new.subcategory_id and bp.active = true
          )
        )
      on conflict (requirement_id, business_id) do nothing;
    end if;

    -- General category matching (score 0.90)
    insert into public.requirement_matches (
      requirement_id,
      business_id,
      match_score,
      match_reason,
      status
    )
    select
      new.id,
      b.id,
      0.90,
      jsonb_build_object(
        'type', 'category_city_match',
        'category_matched', true,
        'city_matched', true
      ),
      'pending'
    from public.businesses b
    where b.active = true
      and b.verified = true
      and b.city_id = new.city_id
      and b.category_id = new.category_id
    on conflict (requirement_id, business_id) do nothing;
  end if;
  return new;
end;
$$;
