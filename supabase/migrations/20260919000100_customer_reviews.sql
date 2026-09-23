-- Customer Reviews schema, indexes, moderation protection, aggregate trigger, and RLS policies

create table if not exists public.business_reviews (
  id uuid primary key default extensions.gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  author_name text,
  rating integer not null check (rating between 1 and 5),
  comment text,
  moderation_status text not null default 'pending' check (moderation_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_reviews_business_id_idx on public.business_reviews (business_id);
create index if not exists business_reviews_user_id_idx on public.business_reviews (user_id);
create index if not exists business_reviews_status_idx on public.business_reviews (moderation_status);

drop trigger if exists business_reviews_set_updated_at on public.business_reviews;
create trigger business_reviews_set_updated_at
before update on public.business_reviews
for each row execute function public.set_updated_at();

-- Moderation protection trigger: regular users cannot self-approve reviews or reassign reviews
create or replace function public.protect_business_review_moderation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if auth.role() <> 'service_role' and not public.is_admin() then
      new.moderation_status = 'pending';
    end if;
    return new;
  end if;

  if auth.role() <> 'service_role' and not public.is_admin() then
    new.business_id = old.business_id;
    new.user_id = old.user_id;
    new.moderation_status = old.moderation_status;
  end if;

  return new;
end;
$$;

drop trigger if exists business_reviews_protect_moderation on public.business_reviews;
create trigger business_reviews_protect_moderation
before insert or update on public.business_reviews
for each row execute function public.protect_business_review_moderation();

-- Trigger function to automatically recalculate businesses.rating and businesses.review_count on approved reviews
create or replace function public.update_business_review_aggregates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_biz_id uuid;
begin
  target_biz_id := coalesce(new.business_id, old.business_id);

  update public.businesses
  set
    rating = coalesce((
      select round(avg(rating), 2)
      from public.business_reviews
      where business_id = target_biz_id
        and moderation_status = 'approved'
    ), 0),
    review_count = coalesce((
      select count(*)::integer
      from public.business_reviews
      where business_id = target_biz_id
        and moderation_status = 'approved'
    ), 0)
  where id = target_biz_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists business_reviews_update_aggregates on public.business_reviews;
create trigger business_reviews_update_aggregates
after insert or update or delete on public.business_reviews
for each row execute function public.update_business_review_aggregates();

-- Enable Row Level Security
alter table public.business_reviews enable row level security;

-- Grants
grant select on public.business_reviews to anon, authenticated;
grant insert, update, delete on public.business_reviews to authenticated;

-- Policies
drop policy if exists business_reviews_public_read on public.business_reviews;
drop policy if exists business_reviews_user_select on public.business_reviews;
drop policy if exists business_reviews_owner_select on public.business_reviews;
drop policy if exists business_reviews_insert on public.business_reviews;
drop policy if exists business_reviews_user_delete on public.business_reviews;
drop policy if exists business_reviews_admin_all on public.business_reviews;

-- 1. Public can read approved reviews
create policy business_reviews_public_read
on public.business_reviews for select to anon, authenticated
using (moderation_status = 'approved');

-- 2. Authenticated users can see their own reviews (including pending/rejected)
create policy business_reviews_user_select
on public.business_reviews for select to authenticated
using (user_id = auth.uid());

-- 3. Business owners can see reviews for their own businesses
create policy business_reviews_owner_select
on public.business_reviews for select to authenticated
using (public.owns_business(business_id));

-- 4. Authenticated users can insert reviews, but cannot review their own businesses
create policy business_reviews_insert
on public.business_reviews for insert to authenticated
with check (
  user_id = auth.uid()
  and not public.owns_business(business_id)
);

-- 5. Users can delete their own reviews or admin can delete any review
create policy business_reviews_user_delete
on public.business_reviews for delete to authenticated
using (user_id = auth.uid() or public.is_admin());

-- 6. Admins can perform all actions
create policy business_reviews_admin_all
on public.business_reviews for all to authenticated
using (public.is_admin())
with check (public.is_admin());
