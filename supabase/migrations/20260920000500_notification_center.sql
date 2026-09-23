-- In-App Notification Center Migration

-- 1. Create public.notifications table
create table if not exists public.notifications (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('new_quote', 'quote_accepted', 'quote_rejected', 'requirement_status', 'new_lead', 'system')),
  title text not null,
  message text not null,
  link text,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger for notifications updated_at
drop trigger if exists notifications_set_updated_at on public.notifications;
create trigger notifications_set_updated_at
before update on public.notifications
for each row execute function public.set_updated_at();

-- Indexes for optimal lookup performance
create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_user_id_is_read_idx on public.notifications(user_id, is_read);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);

-- 2. Row Level Security for notifications
alter table public.notifications enable row level security;
grant select, update, delete on public.notifications to authenticated;

drop policy if exists notifications_user_select on public.notifications;
create policy notifications_user_select
on public.notifications for select to authenticated
using (user_id = auth.uid());

drop policy if exists notifications_user_update on public.notifications;
create policy notifications_user_update
on public.notifications for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists notifications_user_delete on public.notifications;
create policy notifications_user_delete
on public.notifications for delete to authenticated
using (user_id = auth.uid());

drop policy if exists notifications_admin_all on public.notifications;
create policy notifications_admin_all
on public.notifications for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 3. Automated Trigger: Notify customer on new quotation submission
create or replace function public.notify_on_new_quote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_req_title text;
  v_biz_name text;
begin
  select customer_id, title into v_customer_id, v_req_title
  from public.requirements
  where id = new.requirement_id;

  select name into v_biz_name
  from public.businesses
  where id = new.business_id;

  if v_customer_id is not null then
    insert into public.notifications (
      user_id,
      type,
      title,
      message,
      link,
      data
    ) values (
      v_customer_id,
      'new_quote',
      'New Quotation Received',
      coalesce(v_biz_name, 'A verified business') || ' submitted a quote of ₹' || to_char(new.quote_amount, 'FM999,999,999.00') || ' for "' || coalesce(v_req_title, 'your requirement') || '".',
      '/my-requirements',
      jsonb_build_object(
        'requirement_id', new.requirement_id,
        'quote_id', new.id,
        'business_id', new.business_id,
        'quote_amount', new.quote_amount
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists requirement_quote_notify_customer on public.requirement_quotes;
create trigger requirement_quote_notify_customer
after insert on public.requirement_quotes
for each row execute function public.notify_on_new_quote();

-- 4. Automated Trigger: Notify vendor when quote is accepted or rejected
create or replace function public.notify_on_quote_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req_title text;
  v_vendor_user_id uuid;
begin
  if new.status is distinct from old.status then
    select title into v_req_title
    from public.requirements
    where id = new.requirement_id;

    select owner_id into v_vendor_user_id
    from public.businesses
    where id = new.business_id;

    if v_vendor_user_id is null then
      v_vendor_user_id := new.vendor_id;
    end if;

    if v_vendor_user_id is not null then
      if new.status = 'accepted' then
        insert into public.notifications (
          user_id,
          type,
          title,
          message,
          link,
          data
        ) values (
          v_vendor_user_id,
          'quote_accepted',
          'Quotation Accepted! 🎉',
          'Great news! Your quote of ₹' || to_char(new.quote_amount, 'FM999,999,999.00') || ' for "' || coalesce(v_req_title, 'requirement') || '" was accepted by the customer.',
          '/owner',
          jsonb_build_object(
            'requirement_id', new.requirement_id,
            'quote_id', new.id,
            'business_id', new.business_id
          )
        );
      elsif new.status = 'rejected' then
        insert into public.notifications (
          user_id,
          type,
          title,
          message,
          link,
          data
        ) values (
          v_vendor_user_id,
          'quote_rejected',
          'Quotation Update',
          'Another quotation was accepted for "' || coalesce(v_req_title, 'requirement') || '".',
          '/owner',
          jsonb_build_object(
            'requirement_id', new.requirement_id,
            'quote_id', new.id,
            'business_id', new.business_id
          )
        );
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists requirement_quote_status_notify on public.requirement_quotes;
create trigger requirement_quote_status_notify
after update on public.requirement_quotes
for each row execute function public.notify_on_quote_status();

-- 5. Automated Trigger: Notify vendor when requirement is completed or cancelled
create or replace function public.notify_on_requirement_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vendor_id uuid;
begin
  if new.status is distinct from old.status then
    if new.status = 'completed' then
      -- Find vendor with the accepted quote
      select b.owner_id into v_vendor_id
      from public.requirement_quotes q
      join public.businesses b on b.id = q.business_id
      where q.requirement_id = new.id
        and q.status = 'accepted'
      limit 1;

      if v_vendor_id is not null then
        insert into public.notifications (
          user_id,
          type,
          title,
          message,
          link,
          data
        ) values (
          v_vendor_id,
          'requirement_status',
          'Requirement Completed',
          'The customer marked "' || new.title || '" as completed. Thank you for your service!',
          '/owner',
          jsonb_build_object('requirement_id', new.id, 'status', 'completed')
        );
      end if;
    elsif new.status = 'cancelled' then
      -- Notify all vendors matched with this requirement
      for v_vendor_id in
        select distinct b.owner_id
        from public.requirement_matches rm
        join public.businesses b on b.id = rm.business_id
        where rm.requirement_id = new.id
      loop
        if v_vendor_id is not null then
          insert into public.notifications (
            user_id,
            type,
            title,
            message,
            link,
            data
          ) values (
            v_vendor_id,
            'requirement_status',
            'Requirement Cancelled',
            'Requirement "' || new.title || '" was cancelled by the customer.',
            '/owner',
            jsonb_build_object('requirement_id', new.id, 'status', 'cancelled')
          );
        end if;
      end loop;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists requirements_status_notify on public.requirements;
create trigger requirements_status_notify
after update on public.requirements
for each row execute function public.notify_on_requirement_status();

-- 6. Automated Trigger: Notify business owner when a lead matches their business
create or replace function public.notify_on_lead_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_req_title text;
  v_biz_name text;
begin
  select owner_id, name into v_owner_id, v_biz_name
  from public.businesses
  where id = new.business_id;

  select title into v_req_title
  from public.requirements
  where id = new.requirement_id;

  if v_owner_id is not null then
    insert into public.notifications (
      user_id,
      type,
      title,
      message,
      link,
      data
    ) values (
      v_owner_id,
      'new_lead',
      'New Lead Matched',
      'Requirement "' || coalesce(v_req_title, 'Customer Requirement') || '" matches your business "' || coalesce(v_biz_name, 'Business') || '". Review details and submit a quotation.',
      '/owner',
      jsonb_build_object(
        'requirement_id', new.requirement_id,
        'business_id', new.business_id,
        'match_id', new.id
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists requirement_matches_notify on public.requirement_matches;
create trigger requirement_matches_notify
after insert on public.requirement_matches
for each row execute function public.notify_on_lead_match();
