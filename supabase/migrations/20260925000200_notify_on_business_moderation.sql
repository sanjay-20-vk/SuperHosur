-- Phase 15 Step 5: Owner notifications for business approval, republishing, and rejection

-- 1. Ensure authenticated users (and specifically admins under notifications_admin_all policy) have INSERT privilege on notifications
grant insert on public.notifications to authenticated;

-- 2. Trigger function to create owner notifications on business moderation status transitions
create or replace function public.notify_on_business_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link text;
  v_slug text;
begin
  -- Notifications are only sent to registered owners
  if new.owner_id is null then
    return new;
  end if;

  v_slug := coalesce(new.slug, new.id::text);

  -- CASE 1: Business Approval
  -- Transition from not verified (pending or previously rejected) to verified & active
  if new.verified = true and new.active = true and old.verified = false then
    v_link := '/businesses/' || v_slug;
    insert into public.notifications (
      user_id,
      type,
      title,
      message,
      link,
      data
    ) values (
      new.owner_id,
      'system',
      'Business Listing Approved 🎉',
      'Great news! Your business "' || coalesce(new.name, 'listing') || '" has been approved and is now live on SuperHosur.',
      v_link,
      jsonb_build_object(
        'business_id', new.id,
        'business_name', new.name,
        'business_slug', new.slug,
        'action', 'approved'
      )
    );

  -- CASE 2: Business Re-publish
  -- Transition from unpublished (verified=true, active=false) back to active
  elsif new.verified = true and new.active = true and old.verified = true and old.active = false then
    v_link := '/businesses/' || v_slug;
    insert into public.notifications (
      user_id,
      type,
      title,
      message,
      link,
      data
    ) values (
      new.owner_id,
      'system',
      'Business Listing Re-published',
      'Your business "' || coalesce(new.name, 'listing') || '" has been re-published and is now visible to customers on SuperHosur.',
      v_link,
      jsonb_build_object(
        'business_id', new.id,
        'business_name', new.name,
        'business_slug', new.slug,
        'action', 'republished'
      )
    );

  -- CASE 3: Business Rejection
  -- Business is not verified, has a non-empty rejection reason, and either the rejection reason changed or it was revoked from verified
  elsif new.verified = false
    and new.rejection_reason is not null
    and trim(new.rejection_reason) <> ''
    and (old.rejection_reason is distinct from new.rejection_reason or old.verified = true)
  then
    insert into public.notifications (
      user_id,
      type,
      title,
      message,
      link,
      data
    ) values (
      new.owner_id,
      'system',
      'Action Required: Business Listing Rejected',
      'Your business "' || coalesce(new.name, 'listing') || '" was not approved. Reason: ' || trim(new.rejection_reason) || '. Please update your details and resubmit.',
      '/owner/dashboard',
      jsonb_build_object(
        'business_id', new.id,
        'business_name', new.name,
        'business_slug', new.slug,
        'action', 'rejected',
        'rejection_reason', trim(new.rejection_reason)
      )
    );
  end if;

  return new;
end;
$$;

-- 3. Trigger on public.businesses
drop trigger if exists businesses_moderation_notify on public.businesses;
create trigger businesses_moderation_notify
after update on public.businesses
for each row execute function public.notify_on_business_moderation();
