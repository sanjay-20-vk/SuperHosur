-- Phase 17 Step 5: Admin Audit Log & Bulk Moderation
-- Enables immutable audit logging for administrative actions and safe bulk moderation for businesses and properties.

-- ============================================================================
-- 1. ADMIN AUDIT LOGS TABLE
-- ============================================================================

create table if not exists public.admin_audit_logs (
  id uuid primary key default extensions.gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete restrict,
  action_type text not null,
  entity_type text not null check (entity_type in ('business', 'property', 'review', 'photo', 'video', 'requirement', 'user')),
  entity_id uuid not null,
  entity_name text,
  old_status text,
  new_status text,
  reason text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

comment on table public.admin_audit_logs is 'Immutable audit log of all administrative and moderation actions';
comment on column public.admin_audit_logs.admin_id is 'Authenticated administrator who executed the action';
comment on column public.admin_audit_logs.action_type is 'Category of action taken (e.g. business_approved, bulk_business_rejected, photo_approved)';
comment on column public.admin_audit_logs.entity_type is 'Target entity type';
comment on column public.admin_audit_logs.entity_id is 'Target entity primary key identifier';
comment on column public.admin_audit_logs.entity_name is 'Cached display name or title of the target entity';
comment on column public.admin_audit_logs.old_status is 'Status before the moderation action';
comment on column public.admin_audit_logs.new_status is 'Status after the moderation action';
comment on column public.admin_audit_logs.reason is 'Reason provided by administrator (required for rejections)';

-- ============================================================================
-- 2. INDEXES
-- ============================================================================

create index if not exists admin_audit_logs_created_at_idx
  on public.admin_audit_logs (created_at desc);

create index if not exists admin_audit_logs_admin_created_idx
  on public.admin_audit_logs (admin_id, created_at desc);

create index if not exists admin_audit_logs_entity_created_idx
  on public.admin_audit_logs (entity_type, entity_id, created_at desc);

create index if not exists admin_audit_logs_action_created_idx
  on public.admin_audit_logs (action_type, created_at desc);

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================

alter table public.admin_audit_logs enable row level security;

-- Only authenticated users can SELECT if they are verified active admins
grant select on public.admin_audit_logs to authenticated;

drop policy if exists admin_audit_logs_admin_select on public.admin_audit_logs;
create policy admin_audit_logs_admin_select
on public.admin_audit_logs for select to authenticated
using (public.is_admin());

-- NO insert, update, or delete policies for application users.
-- Audit logs are strictly immutable and can only be written by security definer functions/triggers.

-- ============================================================================
-- 4. TRUSTED AUDIT LOGGING HELPER FUNCTION
-- ============================================================================

create or replace function public.record_admin_audit(
  p_action_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_entity_name text default null,
  p_old_status text default null,
  p_new_status text default null,
  p_reason text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_log_id uuid;
begin
  if v_admin_id is null or not public.is_admin() then
    raise exception 'Unauthorized: Only administrators can create audit records.';
  end if;

  insert into public.admin_audit_logs (
    admin_id,
    action_type,
    entity_type,
    entity_id,
    entity_name,
    old_status,
    new_status,
    reason,
    metadata
  ) values (
    v_admin_id,
    p_action_type,
    p_entity_type,
    p_entity_id,
    p_entity_name,
    p_old_status,
    p_new_status,
    p_reason,
    coalesce(p_metadata, '{}'::jsonb)
  ) returning id into v_log_id;

  return v_log_id;
end;
$$;

grant execute on function public.record_admin_audit to authenticated;

-- ============================================================================
-- 5. AUTOMATED MODERATION AUDIT TRIGGERS FOR BUSINESSES
-- ============================================================================

create or replace function public.log_business_moderation_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_action text;
  v_old_status text;
  v_new_status text;
  v_is_bulk boolean;
begin
  -- Only log if the change was made by an authenticated admin
  if v_admin_id is null or not public.is_admin() then
    return new;
  end if;

  -- Determine if this is part of a bulk operation
  v_is_bulk := (coalesce(current_setting('app.audit_source', true), '') = 'bulk_moderation');

  -- Old status label
  if old.active and old.verified then
    v_old_status := 'public';
  elsif not old.verified and old.rejection_reason is not null then
    v_old_status := 'rejected';
  elsif old.active and not old.verified then
    v_old_status := 'pending';
  else
    v_old_status := 'unpublished';
  end if;

  -- New status label
  if new.active and new.verified then
    v_new_status := 'public';
  elsif not new.verified and new.rejection_reason is not null then
    v_new_status := 'rejected';
  elsif new.active and not new.verified then
    v_new_status := 'pending';
  else
    v_new_status := 'unpublished';
  end if;

  -- If status hasn't changed and rejection_reason hasn't changed, no moderation action occurred
  if v_old_status = v_new_status and coalesce(old.rejection_reason, '') = coalesce(new.rejection_reason, '') then
    return new;
  end if;

  -- Determine action
  if new.verified = true and new.active = true and old.verified = false then
    v_action := case when v_is_bulk then 'bulk_business_approved' else 'business_approved' end;
  elsif new.verified = false and new.rejection_reason is not null then
    v_action := case when v_is_bulk then 'bulk_business_rejected' else 'business_rejected' end;
  elsif old.active = true and new.active = false and new.verified = true then
    v_action := case when v_is_bulk then 'bulk_business_suspended' else 'business_suspended' end;
  elsif old.active = false and new.active = true and new.verified = true then
    v_action := case when v_is_bulk then 'bulk_business_restored' else 'business_restored' end;
  else
    v_action := 'business_moderation_updated';
  end if;

  insert into public.admin_audit_logs (
    admin_id,
    action_type,
    entity_type,
    entity_id,
    entity_name,
    old_status,
    new_status,
    reason,
    metadata
  ) values (
    v_admin_id,
    v_action,
    'business',
    new.id,
    new.name,
    v_old_status,
    v_new_status,
    new.rejection_reason,
    jsonb_build_object('is_bulk', v_is_bulk)
  );

  return new;
end;
$$;

drop trigger if exists businesses_audit_trigger on public.businesses;
create trigger businesses_audit_trigger
after update of active, verified, rejection_reason on public.businesses
for each row execute function public.log_business_moderation_audit();

-- ============================================================================
-- 6. AUTOMATED MODERATION AUDIT TRIGGERS FOR PROPERTIES
-- ============================================================================

create or replace function public.log_property_moderation_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_action text;
  v_old_status text;
  v_new_status text;
  v_is_bulk boolean;
begin
  -- Only log if the change was made by an authenticated admin
  if v_admin_id is null or not public.is_admin() then
    return new;
  end if;

  -- Determine if this is part of a bulk operation
  v_is_bulk := (coalesce(current_setting('app.audit_source', true), '') = 'bulk_moderation');

  -- Old status label
  if old.active and old.verified then
    v_old_status := 'public';
  elsif not old.verified and old.rejection_reason is not null then
    v_old_status := 'rejected';
  elsif old.active and not old.verified then
    v_old_status := 'pending';
  else
    v_old_status := 'unpublished';
  end if;

  -- New status label
  if new.active and new.verified then
    v_new_status := 'public';
  elsif not new.verified and new.rejection_reason is not null then
    v_new_status := 'rejected';
  elsif new.active and not new.verified then
    v_new_status := 'pending';
  else
    v_new_status := 'unpublished';
  end if;

  -- If status hasn't changed and rejection_reason hasn't changed, no moderation action occurred
  if v_old_status = v_new_status and coalesce(old.rejection_reason, '') = coalesce(new.rejection_reason, '') then
    return new;
  end if;

  -- Determine action
  if new.verified = true and new.active = true and old.verified = false then
    v_action := case when v_is_bulk then 'bulk_property_approved' else 'property_approved' end;
  elsif new.verified = false and new.rejection_reason is not null then
    v_action := case when v_is_bulk then 'bulk_property_rejected' else 'property_rejected' end;
  elsif old.active = true and new.active = false and new.verified = true then
    v_action := case when v_is_bulk then 'bulk_property_suspended' else 'property_suspended' end;
  elsif old.active = false and new.active = true and new.verified = true then
    v_action := case when v_is_bulk then 'bulk_property_restored' else 'property_restored' end;
  else
    v_action := 'property_moderation_updated';
  end if;

  insert into public.admin_audit_logs (
    admin_id,
    action_type,
    entity_type,
    entity_id,
    entity_name,
    old_status,
    new_status,
    reason,
    metadata
  ) values (
    v_admin_id,
    v_action,
    'property',
    new.id,
    new.title,
    v_old_status,
    v_new_status,
    new.rejection_reason,
    jsonb_build_object('is_bulk', v_is_bulk)
  );

  return new;
end;
$$;

drop trigger if exists properties_audit_trigger on public.properties;
create trigger properties_audit_trigger
after update of active, verified, rejection_reason on public.properties
for each row execute function public.log_property_moderation_audit();

-- ============================================================================
-- 7. SECURE BULK MODERATION RPC FOR BUSINESSES
-- ============================================================================

create or replace function public.admin_bulk_moderate_businesses(
  p_business_ids uuid[],
  p_action text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_id uuid;
  v_biz record;
  v_total integer := 0;
  v_succeeded integer := 0;
  v_failed integer := 0;
  v_results jsonb := '[]'::jsonb;
  v_item_result jsonb;
  v_trimmed_reason text;
begin
  if v_admin_id is null or not public.is_admin() then
    raise exception 'Unauthorized: Only administrators can perform bulk moderation.';
  end if;

  if p_business_ids is null or cardinality(p_business_ids) = 0 then
    raise exception 'No business IDs provided.';
  end if;

  if p_action not in ('approve', 'reject', 'suspend', 'restore') then
    raise exception 'Invalid moderation action: %', p_action;
  end if;

  if p_action = 'reject' then
    v_trimmed_reason := trim(coalesce(p_reason, ''));
    if length(v_trimmed_reason) < 5 then
      raise exception 'A valid rejection reason (minimum 5 characters) is required for bulk rejection.';
    end if;
  end if;

  -- Set session flag so trigger knows this is a bulk operation
  perform set_config('app.audit_source', 'bulk_moderation', true);

  v_total := cardinality(p_business_ids);

  foreach v_id in array p_business_ids loop
    select id, name, active, verified, rejection_reason
    into v_biz
    from public.businesses
    where id = v_id;

    if not found then
      v_failed := v_failed + 1;
      v_item_result := jsonb_build_object(
        'id', v_id,
        'title', 'Unknown Listing',
        'success', false,
        'error', 'Business listing not found'
      );
      v_results := v_results || jsonb_build_array(v_item_result);
      continue;
    end if;

    if p_action = 'approve' then
      if v_biz.active = true and v_biz.verified = true then
        v_failed := v_failed + 1;
        v_item_result := jsonb_build_object(
          'id', v_id,
          'title', v_biz.name,
          'success', false,
          'error', 'Listing is already public and approved'
        );
        v_results := v_results || jsonb_build_array(v_item_result);
        continue;
      end if;

      update public.businesses
      set active = true, verified = true, rejection_reason = null
      where id = v_id;

      v_succeeded := v_succeeded + 1;
      v_item_result := jsonb_build_object(
        'id', v_id,
        'title', v_biz.name,
        'success', true,
        'action', 'approved'
      );
      v_results := v_results || jsonb_build_array(v_item_result);

    elsif p_action = 'reject' then
      update public.businesses
      set active = false, verified = false, rejection_reason = v_trimmed_reason
      where id = v_id;

      v_succeeded := v_succeeded + 1;
      v_item_result := jsonb_build_object(
        'id', v_id,
        'title', v_biz.name,
        'success', true,
        'action', 'rejected'
      );
      v_results := v_results || jsonb_build_array(v_item_result);

    elsif p_action = 'suspend' then
      if not (v_biz.active = true and v_biz.verified = true) then
        v_failed := v_failed + 1;
        v_item_result := jsonb_build_object(
          'id', v_id,
          'title', v_biz.name,
          'success', false,
          'error', 'Only active public listings can be suspended'
        );
        v_results := v_results || jsonb_build_array(v_item_result);
        continue;
      end if;

      update public.businesses
      set active = false, verified = true, rejection_reason = null
      where id = v_id;

      v_succeeded := v_succeeded + 1;
      v_item_result := jsonb_build_object(
        'id', v_id,
        'title', v_biz.name,
        'success', true,
        'action', 'suspended'
      );
      v_results := v_results || jsonb_build_array(v_item_result);

    elsif p_action = 'restore' then
      if not (v_biz.active = false and v_biz.verified = true) then
        v_failed := v_failed + 1;
        v_item_result := jsonb_build_object(
          'id', v_id,
          'title', v_biz.name,
          'success', false,
          'error', 'Only suspended/unpublished listings can be restored'
        );
        v_results := v_results || jsonb_build_array(v_item_result);
        continue;
      end if;

      update public.businesses
      set active = true, verified = true, rejection_reason = null
      where id = v_id;

      v_succeeded := v_succeeded + 1;
      v_item_result := jsonb_build_object(
        'id', v_id,
        'title', v_biz.name,
        'success', true,
        'action', 'restored'
      );
      v_results := v_results || jsonb_build_array(v_item_result);
    end if;

  end loop;

  return jsonb_build_object(
    'total_selected', v_total,
    'succeeded_count', v_succeeded,
    'failed_count', v_failed,
    'results', v_results
  );
end;
$$;

grant execute on function public.admin_bulk_moderate_businesses to authenticated;

-- ============================================================================
-- 8. SECURE BULK MODERATION RPC FOR PROPERTIES
-- ============================================================================

create or replace function public.admin_bulk_moderate_properties(
  p_property_ids uuid[],
  p_action text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_id uuid;
  v_prop record;
  v_total integer := 0;
  v_succeeded integer := 0;
  v_failed integer := 0;
  v_results jsonb := '[]'::jsonb;
  v_item_result jsonb;
  v_trimmed_reason text;
begin
  if v_admin_id is null or not public.is_admin() then
    raise exception 'Unauthorized: Only administrators can perform bulk moderation.';
  end if;

  if p_property_ids is null or cardinality(p_property_ids) = 0 then
    raise exception 'No property IDs provided.';
  end if;

  if p_action not in ('approve', 'reject', 'suspend', 'restore') then
    raise exception 'Invalid moderation action: %', p_action;
  end if;

  if p_action = 'reject' then
    v_trimmed_reason := trim(coalesce(p_reason, ''));
    if length(v_trimmed_reason) < 5 then
      raise exception 'A valid rejection reason (minimum 5 characters) is required for bulk rejection.';
    end if;
  end if;

  -- Set session flag so trigger knows this is a bulk operation
  perform set_config('app.audit_source', 'bulk_moderation', true);

  v_total := cardinality(p_property_ids);

  foreach v_id in array p_property_ids loop
    select id, title, active, verified, rejection_reason
    into v_prop
    from public.properties
    where id = v_id;

    if not found then
      v_failed := v_failed + 1;
      v_item_result := jsonb_build_object(
        'id', v_id,
        'title', 'Unknown Property',
        'success', false,
        'error', 'Property listing not found'
      );
      v_results := v_results || jsonb_build_array(v_item_result);
      continue;
    end if;

    if p_action = 'approve' then
      if v_prop.active = true and v_prop.verified = true then
        v_failed := v_failed + 1;
        v_item_result := jsonb_build_object(
          'id', v_id,
          'title', v_prop.title,
          'success', false,
          'error', 'Property is already public and approved'
        );
        v_results := v_results || jsonb_build_array(v_item_result);
        continue;
      end if;

      update public.properties
      set active = true, verified = true, rejection_reason = null
      where id = v_id;

      v_succeeded := v_succeeded + 1;
      v_item_result := jsonb_build_object(
        'id', v_id,
        'title', v_prop.title,
        'success', true,
        'action', 'approved'
      );
      v_results := v_results || jsonb_build_array(v_item_result);

    elsif p_action = 'reject' then
      update public.properties
      set active = false, verified = false, rejection_reason = v_trimmed_reason
      where id = v_id;

      v_succeeded := v_succeeded + 1;
      v_item_result := jsonb_build_object(
        'id', v_id,
        'title', v_prop.title,
        'success', true,
        'action', 'rejected'
      );
      v_results := v_results || jsonb_build_array(v_item_result);

    elsif p_action = 'suspend' then
      if not (v_prop.active = true and v_prop.verified = true) then
        v_failed := v_failed + 1;
        v_item_result := jsonb_build_object(
          'id', v_id,
          'title', v_prop.title,
          'success', false,
          'error', 'Only active public properties can be suspended'
        );
        v_results := v_results || jsonb_build_array(v_item_result);
        continue;
      end if;

      update public.properties
      set active = false, verified = true, rejection_reason = null
      where id = v_id;

      v_succeeded := v_succeeded + 1;
      v_item_result := jsonb_build_object(
        'id', v_id,
        'title', v_prop.title,
        'success', true,
        'action', 'suspended'
      );
      v_results := v_results || jsonb_build_array(v_item_result);

    elsif p_action = 'restore' then
      if not (v_prop.active = false and v_prop.verified = true) then
        v_failed := v_failed + 1;
        v_item_result := jsonb_build_object(
          'id', v_id,
          'title', v_prop.title,
          'success', false,
          'error', 'Only suspended/unpublished properties can be restored'
        );
        v_results := v_results || jsonb_build_array(v_item_result);
        continue;
      end if;

      update public.properties
      set active = true, verified = true, rejection_reason = null
      where id = v_id;

      v_succeeded := v_succeeded + 1;
      v_item_result := jsonb_build_object(
        'id', v_id,
        'title', v_prop.title,
        'success', true,
        'action', 'restored'
      );
      v_results := v_results || jsonb_build_array(v_item_result);
    end if;

  end loop;

  return jsonb_build_object(
    'total_selected', v_total,
    'succeeded_count', v_succeeded,
    'failed_count', v_failed,
    'results', v_results
  );
end;
$$;

grant execute on function public.admin_bulk_moderate_properties to authenticated;
