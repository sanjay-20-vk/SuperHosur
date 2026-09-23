-- Vendor Leads and Requirement Matching Migration

-- 1. Helper function to check if the current user owns a business matched with the requirement
create or replace function public.is_matched_vendor(target_requirement_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.requirement_matches rm
    join public.businesses b on b.id = rm.business_id
    where rm.requirement_id = target_requirement_id
      and b.owner_id = auth.uid()
  );
$$;

revoke all on function public.is_matched_vendor(uuid) from public;
grant execute on function public.is_matched_vendor(uuid) to authenticated;

-- 2. Allow matched vendors to read the requirement they were matched with
drop policy if exists requirements_vendor_read on public.requirements;
create policy requirements_vendor_read
on public.requirements for select to authenticated
using (public.is_matched_vendor(id));

-- 3. Grant UPDATE permissions and create policy on requirement_matches for vendors
grant update on public.requirement_matches to authenticated;

drop policy if exists requirement_matches_vendor_update on public.requirement_matches;
create policy requirement_matches_vendor_update
on public.requirement_matches for update to authenticated
using (public.owns_business(business_id))
with check (public.owns_business(business_id));

-- 4. Allow matched vendors to read the customer profile (name, phone) for matched requirements
create or replace function public.is_vendor_matched_customer(customer_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.requirements r
    join public.requirement_matches rm on rm.requirement_id = r.id
    join public.businesses b on b.id = rm.business_id
    where r.customer_id = customer_profile_id
      and b.owner_id = auth.uid()
  );
$$;

revoke all on function public.is_vendor_matched_customer(uuid) from public;
grant execute on function public.is_vendor_matched_customer(uuid) to authenticated;

drop policy if exists profiles_matched_vendor_read on public.profiles;
create policy profiles_matched_vendor_read
on public.profiles for select to authenticated
using (public.is_vendor_matched_customer(id));

-- 5. Automated requirement matching trigger function
create or replace function public.auto_match_requirement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('open', 'matching') and new.category_id is not null then
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
      0.95,
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

drop trigger if exists requirements_auto_match_trigger on public.requirements;
create trigger requirements_auto_match_trigger
after insert on public.requirements
for each row execute function public.auto_match_requirement();
