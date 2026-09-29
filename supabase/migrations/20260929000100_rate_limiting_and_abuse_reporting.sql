-- Phase 18 Step 1: Abuse Prevention, Rate Limiting & User Reporting
-- 1. Rate Limiting Infrastructure
-- 2. User & Public Protection for Analytics, Reviews, Quotes, Requirements, and Messages
-- 3. Abuse Reporting System with Moderation & Audit Log Integration

-- ============================================================================
-- 1. RATE LIMITING ENGINE
-- ============================================================================

create table if not exists public.rate_limit_events (
  id uuid primary key default extensions.gen_random_uuid(),
  action_key text not null,
  identifier text not null,
  created_at timestamptz not null default now()
);

comment on table public.rate_limit_events is 'Sliding-window rate limit audit entries for server-side rate checking';

create index if not exists rate_limit_lookup_idx
  on public.rate_limit_events (action_key, identifier, created_at desc);

-- RLS: Only service_role or security definer functions should touch rate_limit_events
alter table public.rate_limit_events enable row level security;

-- Atomic check-and-record function for rate limiting
create or replace function public.check_rate_limit(
  p_action_key text,
  p_identifier text,
  p_max_requests integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_cutoff timestamptz;
begin
  if p_identifier is null or trim(p_identifier) = '' then
    p_identifier := 'anonymous';
  end if;

  v_cutoff := now() - (p_window_seconds || ' seconds')::interval;

  -- Count recent requests within the sliding window
  select count(*) into v_count
  from public.rate_limit_events
  where action_key = p_action_key
    and identifier = p_identifier
    and created_at >= v_cutoff;

  if v_count >= p_max_requests then
    return false;
  end if;

  -- Record this request atomically
  insert into public.rate_limit_events (action_key, identifier, created_at)
  values (p_action_key, p_identifier, now());

  -- Probabilistic cleanup (1 in 50 requests) to prune entries older than 24 hours
  if random() < 0.02 then
    delete from public.rate_limit_events
    where created_at < now() - interval '24 hours';
  end if;

  return true;
end;
$$;

revoke all on function public.check_rate_limit(text, text, integer, integer) from public;
grant execute on function public.check_rate_limit(text, text, integer, integer) to anon, authenticated;

-- ============================================================================
-- 2. HARDEN PUBLIC & SENSITIVE OPERATIONS WITH RATE LIMITING
-- ============================================================================

-- 2.1 listing_analytics_events rate limiting
create or replace function public.record_listing_analytics_event(
  p_business_id uuid default null,
  p_property_id uuid default null,
  p_event_type text default null,
  p_session_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_is_valid boolean := false;
  v_rate_identifier text;
  v_rate_allowed boolean;
begin
  -- Identify caller by authenticated user ID or session ID / anonymous token
  if auth.uid() is not null then
    v_rate_identifier := 'user:' || auth.uid()::text;
  elsif p_session_id is not null and trim(p_session_id) <> '' then
    v_rate_identifier := 'session:' || trim(p_session_id);
  else
    v_rate_identifier := 'anon_global';
  end if;

  -- Check rate limit: 100 telemetry events per 60 seconds per user/session
  v_rate_allowed := public.check_rate_limit('analytics_event', v_rate_identifier, 100, 60);
  if not v_rate_allowed then
    raise exception 'Rate limit exceeded for analytics telemetry. Please try again shortly.'
      using errcode = 'P0001';
  end if;

  -- Target validation: exactly one target must be provided
  if (p_business_id is null and p_property_id is null) or
     (p_business_id is not null and p_property_id is not null) then
    raise exception 'Exactly one of business_id or property_id must be provided.';
  end if;

  -- Validate event type
  if p_event_type not in (
    'listing_view',
    'call_click',
    'whatsapp_click',
    'saved_listing',
    'quote_submitted',
    'quote_accepted',
    'quote_rejected',
    'quote_withdrawn'
  ) then
    raise exception 'Invalid event_type: %', p_event_type;
  end if;

  -- Verify target existence and visibility (active or belongs to caller)
  if p_business_id is not null then
    select exists (
      select 1 from public.businesses
      where id = p_business_id
        and (active = true or owner_id = auth.uid() or public.is_admin())
    ) into v_is_valid;
  elsif p_property_id is not null then
    select exists (
      select 1 from public.properties
      where id = p_property_id
        and (active = true or owner_id = auth.uid() or public.is_admin())
    ) into v_is_valid;
  end if;

  if not v_is_valid then
    raise exception 'Listing target not found or inactive.';
  end if;

  -- Insert event record
  insert into public.listing_analytics_events (
    business_id,
    property_id,
    event_type,
    user_id,
    session_id,
    metadata,
    created_at
  ) values (
    p_business_id,
    p_property_id,
    p_event_type,
    auth.uid(),
    p_session_id,
    coalesce(p_metadata, '{}'::jsonb),
    now()
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

-- 2.2 Customer Reviews rate limiting (max 10 reviews per hour per user)
create or replace function public.enforce_review_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed boolean;
begin
  -- Bypass for admins or service_role
  if auth.role() = 'service_role' or public.is_admin() then
    return new;
  end if;

  v_allowed := public.check_rate_limit('submit_review', auth.uid()::text, 10, 3600);
  if not v_allowed then
    raise exception 'Rate limit exceeded: You can submit at most 10 reviews per hour.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists business_reviews_rate_limit_trg on public.business_reviews;
create trigger business_reviews_rate_limit_trg
before insert on public.business_reviews
for each row execute function public.enforce_review_rate_limit();

-- 2.3 Requirements rate limiting (max 15 requirements per hour per user)
create or replace function public.enforce_requirement_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed boolean;
begin
  if auth.role() = 'service_role' or public.is_admin() then
    return new;
  end if;

  v_allowed := public.check_rate_limit('create_requirement', auth.uid()::text, 15, 3600);
  if not v_allowed then
    raise exception 'Rate limit exceeded: You can submit at most 15 requirements per hour.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists requirements_rate_limit_trg on public.requirements;
create trigger requirements_rate_limit_trg
before insert on public.requirements
for each row execute function public.enforce_requirement_rate_limit();

-- 2.4 Quotations rate limiting (max 30 quotations per hour per vendor)
create or replace function public.enforce_quote_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed boolean;
begin
  if auth.role() = 'service_role' or public.is_admin() then
    return new;
  end if;

  v_allowed := public.check_rate_limit('submit_quote', auth.uid()::text, 30, 3600);
  if not v_allowed then
    raise exception 'Rate limit exceeded: You can submit at most 30 quotations per hour.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists requirement_quotes_rate_limit_trg on public.requirement_quotes;
create trigger requirement_quotes_rate_limit_trg
before insert on public.requirement_quotes
for each row execute function public.enforce_quote_rate_limit();

-- 2.5 Requirement Messages rate limiting (max 60 messages per 5 minutes per user)
create or replace function public.enforce_message_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed boolean;
begin
  if auth.role() = 'service_role' or public.is_admin() then
    return new;
  end if;

  v_allowed := public.check_rate_limit('send_message', auth.uid()::text, 60, 300);
  if not v_allowed then
    raise exception 'Rate limit exceeded: Please wait a moment before sending more messages.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists requirement_messages_rate_limit_trg on public.requirement_messages;
create trigger requirement_messages_rate_limit_trg
before insert on public.requirement_messages
for each row execute function public.enforce_message_rate_limit();

-- ============================================================================
-- 3. ABUSE REPORTING SYSTEM
-- ============================================================================

-- 3.1 Reports Table
create table if not exists public.reports (
  id uuid primary key default extensions.gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  entity_type text not null check (entity_type in (
    'business',
    'property',
    'review',
    'requirement',
    'product',
    'service',
    'user',
    'message'
  )),
  entity_id uuid not null,
  reason text not null check (reason in (
    'spam',
    'inappropriate_content',
    'misleading_information',
    'harassment',
    'fraud_or_scam',
    'counterfeit_or_illegal',
    'other'
  )),
  description text check (description is null or length(description) <= 2000),
  status text not null default 'pending' check (status in ('pending', 'reviewing', 'resolved', 'dismissed')),
  resolution text check (resolution is null or length(resolution) <= 2000),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.reports is 'User and customer submitted abuse reports for content moderation';
comment on column public.reports.reporter_id is 'Profile ID of the user submitting the abuse report';
comment on column public.reports.entity_type is 'Type of entity reported (business, property, review, etc.)';
comment on column public.reports.entity_id is 'Primary key UUID of the reported record';
comment on column public.reports.reason is 'Categorized abuse reason';
comment on column public.reports.status is 'Report resolution status lifecycle';

-- 3.2 Report Duplicate Prevention & Rate Limiting
-- Prevent a user from spamming identical pending reports for the same entity
create unique index if not exists reports_unique_pending_user_entity_idx
  on public.reports (reporter_id, entity_type, entity_id)
  where status in ('pending', 'reviewing');

-- Index for admin moderation queries
create index if not exists reports_status_created_idx
  on public.reports (status, created_at desc);

create index if not exists reports_entity_created_idx
  on public.reports (entity_type, entity_id, created_at desc);

create index if not exists reports_reporter_created_idx
  on public.reports (reporter_id, created_at desc);

-- Trigger for reports updated_at
drop trigger if exists reports_set_updated_at on public.reports;
create trigger reports_set_updated_at
before update on public.reports
for each row execute function public.set_updated_at();

-- Enforce report creation rate limit (max 10 reports per hour per user)
create or replace function public.enforce_report_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed boolean;
begin
  if auth.role() = 'service_role' or public.is_admin() then
    return new;
  end if;

  v_allowed := public.check_rate_limit('submit_report', auth.uid()::text, 10, 3600);
  if not v_allowed then
    raise exception 'Rate limit exceeded: You can submit at most 10 reports per hour.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists reports_rate_limit_trg on public.reports;
create trigger reports_rate_limit_trg
before insert on public.reports
for each row execute function public.enforce_report_rate_limit();

-- 3.3 Row Level Security for reports
alter table public.reports enable row level security;

grant select, insert on public.reports to authenticated;
grant update, delete on public.reports to authenticated;

drop policy if exists reports_user_select on public.reports;
create policy reports_user_select
on public.reports for select to authenticated
using (
  reporter_id = auth.uid()
  or public.is_admin()
);

drop policy if exists reports_user_insert on public.reports;
create policy reports_user_insert
on public.reports for insert to authenticated
with check (
  reporter_id = auth.uid()
);

drop policy if exists reports_admin_update on public.reports;
create policy reports_admin_update
on public.reports for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists reports_admin_delete on public.reports;
create policy reports_admin_delete
on public.reports for delete to authenticated
using (public.is_admin());

-- ============================================================================
-- 4. UPDATE ADMIN AUDIT LOG CONSTRAINT & MODERATION RPC
-- ============================================================================

-- Expand entity_type check constraint in admin_audit_logs to include 'report'
alter table public.admin_audit_logs drop constraint if exists admin_audit_logs_entity_type_check;
alter table public.admin_audit_logs add constraint admin_audit_logs_entity_type_check
check (entity_type in ('business', 'property', 'review', 'photo', 'video', 'requirement', 'user', 'report'));

-- Admin RPC: Moderate an abuse report and record audit log
create or replace function public.admin_moderate_report(
  p_report_id uuid,
  p_status text,
  p_resolution text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_report public.reports%rowtype;
  v_old_status text;
begin
  if v_admin_id is null or not public.is_admin() then
    raise exception 'Unauthorized: Administrator privileges required.';
  end if;

  if p_status not in ('reviewing', 'resolved', 'dismissed') then
    raise exception 'Invalid report status: %', p_status;
  end if;

  select * into v_report
  from public.reports
  where id = p_report_id;

  if v_report.id is null then
    raise exception 'Report not found.';
  end if;

  v_old_status := v_report.status;

  update public.reports
  set
    status = p_status,
    resolution = coalesce(p_resolution, resolution),
    reviewed_by = v_admin_id,
    reviewed_at = now()
  where id = p_report_id;

  -- Record in admin audit log
  perform public.record_admin_audit(
    p_action_type := 'report_' || p_status,
    p_entity_type := 'report',
    p_entity_id := p_report_id,
    p_entity_name := 'Report against ' || v_report.entity_type,
    p_old_status := v_old_status,
    p_new_status := p_status,
    p_reason := p_resolution,
    p_metadata := jsonb_build_object(
      'target_entity_type', v_report.entity_type,
      'target_entity_id', v_report.entity_id,
      'report_reason', v_report.reason,
      'reporter_id', v_report.reporter_id
    )
  );

  return jsonb_build_object(
    'success', true,
    'report_id', p_report_id,
    'old_status', v_old_status,
    'new_status', p_status
  );
end;
$$;

grant execute on function public.admin_moderate_report(uuid, text, text) to authenticated;
