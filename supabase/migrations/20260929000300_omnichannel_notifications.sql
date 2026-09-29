-- ============================================================================
-- SuperHosur — Phase 18 Step 3: Omnichannel Transactional Notifications
-- Adds user notification preferences, delivery queue, channel selection,
-- and automated dispatch orchestration for Email and WhatsApp.
-- ============================================================================

-- 1. Create public.notification_preferences table
create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email_enabled boolean not null default true,
  whatsapp_enabled boolean not null default false,
  quote_notifications boolean not null default true,
  message_notifications boolean not null default true,
  requirement_notifications boolean not null default true,
  moderation_notifications boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.notification_preferences is 'Per-user channel and event notification delivery preferences';
comment on column public.notification_preferences.email_enabled is 'Master toggle for email notifications';
comment on column public.notification_preferences.whatsapp_enabled is 'Master toggle for WhatsApp notifications';

-- Automatically create default preferences on profile creation
create or replace function public.handle_new_user_notification_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_profile_created_notification_preferences on public.profiles;
create trigger on_profile_created_notification_preferences
after insert on public.profiles
for each row execute function public.handle_new_user_notification_preferences();

-- Backfill preferences for existing profiles
insert into public.notification_preferences (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

-- 2. Create public.notification_deliveries table (Delivery Queue & Audit)
create table if not exists public.notification_deliveries (
  id uuid primary key default extensions.gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  channel text not null check (channel in ('email', 'whatsapp')),
  event_type text not null,
  recipient_target text not null, -- email address or E.164 phone
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed', 'retrying', 'cancelled')),
  provider text, -- e.g., 'resend', 'whatsapp_cloud', 'stub'
  provider_message_id text,
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 3,
  next_attempt_at timestamptz not null default now(),
  sent_at timestamptz,
  last_error text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_deliveries_idempotent_uniq unique (notification_id, channel)
);

comment on table public.notification_deliveries is 'Outbound transactional notification delivery queue and status tracking';
comment on column public.notification_deliveries.recipient_target is 'Resolved destination (email or phone) for the delivery';
comment on column public.notification_deliveries.status is 'Current lifecycle state of the outbound delivery';

create index if not exists notification_deliveries_pending_idx
  on public.notification_deliveries(status, next_attempt_at)
  where status in ('pending', 'retrying');

create index if not exists notification_deliveries_user_idx
  on public.notification_deliveries(user_id, created_at desc);

create index if not exists notification_deliveries_notification_idx
  on public.notification_deliveries(notification_id);

-- 3. Row Level Security
alter table public.notification_preferences enable row level security;
alter table public.notification_deliveries enable row level security;

grant select, update on public.notification_preferences to authenticated;
grant select on public.notification_deliveries to authenticated;

-- Preferences RLS
drop policy if exists notif_pref_user_select on public.notification_preferences;
create policy notif_pref_user_select
on public.notification_preferences for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists notif_pref_user_update on public.notification_preferences;
create policy notif_pref_user_update
on public.notification_preferences for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Deliveries RLS (User can only read their own outbound delivery status, Admin can view all)
drop policy if exists notif_deliv_user_select on public.notification_deliveries;
create policy notif_deliv_user_select
on public.notification_deliveries for select to authenticated
using (user_id = auth.uid() or public.is_admin());

-- 4. Queue Ingestion Function: Evaluates user preferences and enqueues deliveries
create or replace function public.enqueue_notification_deliveries()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pref public.notification_preferences%rowtype;
  v_user_email text;
  v_user_phone text;
  v_category_enabled boolean := true;
begin
  -- Fetch user preferences (or initialize defaults if missing)
  select * into v_pref
  from public.notification_preferences
  where user_id = new.user_id;

  if v_pref.user_id is null then
    insert into public.notification_preferences (user_id)
    values (new.user_id)
    returning * into v_pref;
  end if;

  -- Determine if event category is enabled
  if new.type in ('new_quote', 'quote_accepted', 'quote_rejected', 'quote_withdrawn', 'quote_message') then
    v_category_enabled := v_pref.quote_notifications;
  elsif new.type = 'direct_message' then
    v_category_enabled := v_pref.message_notifications;
  elsif new.type in ('new_lead', 'requirement_status') then
    v_category_enabled := v_pref.requirement_notifications;
  elsif new.type = 'system' then
    v_category_enabled := v_pref.moderation_notifications;
  end if;

  if not v_category_enabled then
    return new;
  end if;

  -- Fetch user email from auth.users securely
  select email into v_user_email
  from auth.users
  where id = new.user_id;

  -- Fetch user phone from profiles table
  select phone into v_user_phone
  from public.profiles
  where id = new.user_id;

  -- 1. Enqueue Email Delivery if email_enabled and recipient email exists
  if v_pref.email_enabled and v_user_email is not null and trim(v_user_email) <> '' then
    insert into public.notification_deliveries (
      notification_id,
      user_id,
      channel,
      event_type,
      recipient_target,
      status,
      payload
    ) values (
      new.id,
      new.user_id,
      'email',
      new.type,
      trim(v_user_email),
      'pending',
      jsonb_build_object(
        'title', new.title,
        'message', new.message,
        'link', new.link,
        'data', new.data
      )
    )
    on conflict (notification_id, channel) do nothing;
  end if;

  -- 2. Enqueue WhatsApp Delivery if whatsapp_enabled and phone number exists
  if v_pref.whatsapp_enabled and v_user_phone is not null and trim(v_user_phone) <> '' then
    insert into public.notification_deliveries (
      notification_id,
      user_id,
      channel,
      event_type,
      recipient_target,
      status,
      payload
    ) values (
      new.id,
      new.user_id,
      'whatsapp',
      new.type,
      trim(v_user_phone),
      'pending',
      jsonb_build_object(
        'title', new.title,
        'message', new.message,
        'link', new.link,
        'data', new.data
      )
    )
    on conflict (notification_id, channel) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_notification_created_enqueue on public.notifications;
create trigger on_notification_created_enqueue
after insert on public.notifications
for each row execute function public.enqueue_notification_deliveries();

-- 5. Safe Delivery Processing RPC with Rate Limiting & Retry Backoff
create or replace function public.process_notification_delivery(
  p_delivery_id uuid,
  p_status text,
  p_provider text default null,
  p_provider_message_id text default null,
  p_error text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deliv public.notification_deliveries%rowtype;
  v_backoff_seconds integer;
  v_rate_allowed boolean;
begin
  if auth.role() <> 'service_role' and not public.is_admin() then
    raise exception 'Unauthorized: Service role or admin authorization required.'
      using errcode = '42501';
  end if;

  select * into v_deliv
  from public.notification_deliveries
  where id = p_delivery_id;

  if v_deliv.id is null then
    raise exception 'Delivery record not found.';
  end if;

  -- Rate limit external dispatch (max 100 per minute per user)
  v_rate_allowed := public.check_rate_limit(
    'dispatch_external_notification',
    v_deliv.user_id::text,
    100,
    60
  );

  if not v_rate_allowed then
    update public.notification_deliveries
    set
      status = 'retrying',
      next_attempt_at = now() + interval '5 minutes',
      last_error = 'Rate limit exceeded on outbound dispatch. Backed off 5 minutes.',
      updated_at = now()
    where id = p_delivery_id;

    return jsonb_build_object('success', false, 'status', 'retrying', 'rate_limited', true);
  end if;

  if p_status = 'sent' then
    update public.notification_deliveries
    set
      status = 'sent',
      provider = coalesce(p_provider, provider),
      provider_message_id = coalesce(p_provider_message_id, provider_message_id),
      attempts = attempts + 1,
      sent_at = now(),
      last_error = null,
      updated_at = now()
    where id = p_delivery_id;

    return jsonb_build_object('success', true, 'status', 'sent');

  elsif p_status in ('failed', 'retrying') then
    -- Calculate exponential backoff: attempt 1: 60s, attempt 2: 300s, attempt 3+: failed
    if v_deliv.attempts + 1 >= v_deliv.max_attempts then
      update public.notification_deliveries
      set
        status = 'failed',
        provider = coalesce(p_provider, provider),
        attempts = attempts + 1,
        last_error = coalesce(p_error, 'Delivery failed after maximum attempts.'),
        updated_at = now()
      where id = p_delivery_id;

      return jsonb_build_object('success', false, 'status', 'failed', 'max_attempts_reached', true);
    else
      v_backoff_seconds := case
        when v_deliv.attempts = 0 then 60
        when v_deliv.attempts = 1 then 300
        else 900
      end;

      update public.notification_deliveries
      set
        status = 'retrying',
        provider = coalesce(p_provider, provider),
        attempts = attempts + 1,
        next_attempt_at = now() + (v_backoff_seconds || ' seconds')::interval,
        last_error = coalesce(p_error, 'Transient delivery error; scheduled for retry.'),
        updated_at = now()
      where id = p_delivery_id;

      return jsonb_build_object('success', false, 'status', 'retrying', 'next_attempt_in_seconds', v_backoff_seconds);
    end if;
  else
    raise exception 'Invalid delivery status: %', p_status;
  end if;
end;
$$;

revoke all on function public.process_notification_delivery(uuid, text, text, text, text) from public;
grant execute on function public.process_notification_delivery(uuid, text, text, text, text) to authenticated;
grant execute on function public.process_notification_delivery(uuid, text, text, text, text) to service_role;
