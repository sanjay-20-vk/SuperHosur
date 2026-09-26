-- Requirements Lifecycle Improvements, Quote Withdrawal & Notification Parity

-- 1. Update requirements status check constraint to explicitly include 'closed'
alter table public.requirements
drop constraint if exists requirements_status_check;

alter table public.requirements
add constraint requirements_status_check
check (status in ('open', 'matching', 'quoted', 'accepted', 'completed', 'closed', 'cancelled', 'expired'));

-- 2. Update notifications type check constraint to include 'quote_withdrawn'
alter table public.notifications
drop constraint if exists notifications_type_check;

alter table public.notifications
add constraint notifications_type_check
check (type in ('new_quote', 'quote_accepted', 'quote_rejected', 'quote_withdrawn', 'requirement_status', 'new_lead', 'system'));

-- 3. Update protect_requirement_status() trigger function
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

    -- Allow customer who owns the requirement to close it
    if old.status in ('open', 'matching', 'quoted') and new.status in ('closed', 'completed') and old.customer_id = auth.uid() then
      return new;
    end if;

    -- Allow customer who owns the requirement to accept an offer
    if old.status in ('open', 'matching', 'quoted') and new.status = 'accepted' and old.customer_id = auth.uid() then
      return new;
    end if;

    -- Allow customer who owns the requirement to mark it completed
    if old.status = 'accepted' and new.status in ('completed', 'closed') and old.customer_id = auth.uid() then
      return new;
    end if;

    -- Allow transition to quoted if coming from open or matching
    if old.status in ('open', 'matching') and new.status = 'quoted' then
      return new;
    end if;

    -- If none of the allowed transitions match, revert status to old status
    new.status = old.status;
  end if;

  return new;
end;
$$;

-- 4. Update requirements_update_eligible RLS policy
drop policy if exists requirements_update_eligible on public.requirements;
create policy requirements_update_eligible
on public.requirements for update to authenticated
using (
  (customer_id = auth.uid() and status in ('open', 'matching', 'quoted', 'accepted'))
  or public.is_admin()
)
with check (
  customer_id = auth.uid()
  and status in ('open', 'matching', 'quoted', 'accepted', 'completed', 'closed', 'cancelled')
);

-- 5. Trigger to prevent new quotes or reactivation on closed/cancelled requirements
create or replace function public.check_quote_submission_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req_status text;
begin
  select status into v_req_status
  from public.requirements
  where id = new.requirement_id;

  if v_req_status is null then
    raise exception 'Requirement not found.';
  end if;

  -- Block new quotes on closed or cancelled requirements
  if TG_OP = 'INSERT' then
    if v_req_status in ('closed', 'completed', 'cancelled', 'expired') then
      raise exception 'This requirement is % and is no longer accepting quotations.', v_req_status;
    end if;
  end if;

  -- Prevent reverting a withdrawn quote back to submitted or accepted by normal users
  if TG_OP = 'UPDATE' and old.status = 'withdrawn' and new.status <> 'withdrawn' and not public.is_admin() then
    raise exception 'A withdrawn quotation cannot be reactivated.';
  end if;

  -- If requirement is closed or cancelled, prevent non-admin quote updates except withdrawing
  if TG_OP = 'UPDATE' and v_req_status in ('closed', 'completed', 'cancelled', 'expired') and not public.is_admin() then
    if new.status <> 'withdrawn' and old.status <> 'withdrawn' then
      raise exception 'Cannot modify quotes on a % requirement.', v_req_status;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists requirement_quotes_lifecycle_check on public.requirement_quotes;
create trigger requirement_quotes_lifecycle_check
before insert or update on public.requirement_quotes
for each row execute function public.check_quote_submission_lifecycle();

-- 6. Trigger to notify customer when a vendor withdraws their quotation
create or replace function public.notify_on_quote_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req_title text;
  v_customer_id uuid;
  v_vendor_user_id uuid;
  v_biz_name text;
begin
  if new.status is distinct from old.status then
    select title, customer_id into v_req_title, v_customer_id
    from public.requirements
    where id = new.requirement_id;

    select owner_id, name into v_vendor_user_id, v_biz_name
    from public.businesses
    where id = new.business_id;

    if v_vendor_user_id is null then
      v_vendor_user_id := new.vendor_id;
    end if;

    -- Case 1: Quote accepted (notify vendor)
    if new.status = 'accepted' and v_vendor_user_id is not null then
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

    -- Case 2: Competing quote rejected (notify vendor)
    elsif new.status = 'rejected' and v_vendor_user_id is not null then
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

    -- Case 3: Quote withdrawn by vendor (notify requirement customer)
    elsif new.status = 'withdrawn' and v_customer_id is not null then
      insert into public.notifications (
        user_id,
        type,
        title,
        message,
        link,
        data
      ) values (
        v_customer_id,
        'quote_withdrawn',
        'Quotation Withdrawn',
        coalesce(v_biz_name, 'A vendor') || ' withdrew their quotation of ₹' || to_char(new.quote_amount, 'FM999,999,999.00') || ' for "' || coalesce(v_req_title, 'your requirement') || '".',
        '/my-requirements',
        jsonb_build_object(
          'requirement_id', new.requirement_id,
          'quote_id', new.id,
          'business_id', new.business_id,
          'quote_amount', new.quote_amount
        )
      );
    end if;
  end if;

  return new;
end;
$$;

-- 7. Update notify_on_requirement_status() to handle closed in addition to completed and cancelled
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
    if new.status in ('completed', 'closed') then
      -- Find vendor with the accepted quote if any
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
          'Requirement ' || case when new.status = 'closed' then 'Closed' else 'Completed' end,
          'The customer marked "' || new.title || '" as ' || case when new.status = 'closed' then 'closed.' else 'completed. Thank you for your service!' end,
          '/owner',
          jsonb_build_object('requirement_id', new.id, 'status', new.status)
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
