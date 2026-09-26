-- Phase 16 Step 2: Property Rejection Feedback & Moderation Parity

-- 1. Add rejection_reason text column to public.properties
alter table public.properties
  add column if not exists rejection_reason text;

comment on column public.properties.rejection_reason is 'Detailed feedback from an administrator explaining why the property listing was rejected.';

-- 2. Trigger function to create owner notifications on property moderation status transitions
create or replace function public.notify_on_property_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link text;
begin
  -- Notifications are only sent to registered owners
  if new.owner_id is null then
    return new;
  end if;

  -- CASE 1: Property Approval
  -- Transition from not verified (pending or previously rejected) to verified & active
  if new.verified = true and new.active = true and old.verified = false then
    v_link := '/properties/' || new.id::text;
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
      'Property Listing Approved 🎉',
      'Great news! Your property listing "' || coalesce(new.title, 'listing') || '" has been approved and is now live on SuperHosur.',
      v_link,
      jsonb_build_object(
        'property_id', new.id,
        'property_title', new.title,
        'action', 'approved'
      )
    );

  -- CASE 2: Property Re-publish
  -- Transition from unpublished (verified=true, active=false) back to active
  elsif new.verified = true and new.active = true and old.verified = true and old.active = false then
    v_link := '/properties/' || new.id::text;
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
      'Property Listing Re-published',
      'Your property listing "' || coalesce(new.title, 'listing') || '" has been re-published and is now visible to buyers and tenants on SuperHosur.',
      v_link,
      jsonb_build_object(
        'property_id', new.id,
        'property_title', new.title,
        'action', 'republished'
      )
    );

  -- CASE 3: Property Rejection
  -- Property is not verified, has a non-empty rejection reason, and either the rejection reason changed or it was revoked from verified
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
      'Action Required: Property Listing Rejected',
      'Your property listing "' || coalesce(new.title, 'listing') || '" was not approved. Reason: ' || trim(new.rejection_reason) || '. Please update your details and resubmit.',
      '/owner/dashboard?tab=properties',
      jsonb_build_object(
        'property_id', new.id,
        'property_title', new.title,
        'action', 'rejected',
        'rejection_reason', trim(new.rejection_reason)
      )
    );
  end if;

  return new;
end;
$$;

-- 3. Trigger on public.properties
drop trigger if exists properties_moderation_notify on public.properties;
create trigger properties_moderation_notify
after update on public.properties
for each row execute function public.notify_on_property_moderation();
