-- ============================================================================
-- SuperHosur — Phase 18 Step 5: Payments & Monetization Foundation
-- ============================================================================

-- 1. Monetization Plans Table
create table if not exists public.monetization_plans (
  id text primary key, -- e.g. 'featured_business_7d', 'featured_property_7d', 'featured_business_30d'
  name text not null,
  description text not null,
  entity_type text not null check (entity_type in ('business', 'property', 'all')),
  duration_days integer not null check (duration_days > 0),
  price_paise bigint not null check (price_paise >= 0), -- Stored in paise (INR cents) for precision, e.g. 49900 = ₹499.00
  currency text not null default 'INR' check (currency in ('INR')),
  active boolean not null default true,
  features jsonb not null default '[]'::jsonb,
  provider_plan_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.monetization_plans is 'Configurable pricing and promotion plans for marketplace listings';

-- Seed default initial promotion plans (₹299 for 7 days, ₹899 for 30 days)
insert into public.monetization_plans (
  id,
  name,
  description,
  entity_type,
  duration_days,
  price_paise,
  currency,
  active,
  features
) values
(
  'featured_business_7d',
  '7-Day Business Spotlight',
  'Featured badge, prominent card placement in Hosur business directory for 7 days',
  'business',
  7,
  29900, -- ₹299.00
  'INR',
  true,
  '["Featured badge on business card", "Priority search ranking in Hosur directory", "Included in recommended local businesses", "Full analytics & CRM integration"]'::jsonb
),
(
  'featured_business_30d',
  '30-Day Business Pro Growth',
  'Maximum visibility with top directory placement and featured badge for 30 days',
  'business',
  30,
  89900, -- ₹899.00
  'INR',
  true,
  '["Featured badge for 30 days", "Top directory placement in Hosur", "Priority customer leads", "Dedicated business highlight banner", "Weekly analytics breakdown"]'::jsonb
),
(
  'featured_property_7d',
  '7-Day Real Estate Boost',
  'Promoted real estate badge and prime placement in Hosur property search for 7 days',
  'property',
  7,
  39900, -- ₹399.00
  'INR',
  true,
  '["Featured real estate banner", "Top ranking in property search", "Instant WhatsApp & Call highlight", "3x more tenant & buyer impressions"]'::jsonb
),
(
  'featured_property_30d',
  '30-Day Property Fast-Close',
  'Continuous prime spotlight until tenant or buyer is secured for 30 days',
  'property',
  30,
  99900, -- ₹999.00
  'INR',
  true,
  '["30-Day featured real estate spotlight", "Prime placement above regular listings", "Featured tag on Hosur Map", "Urgent tenant/buyer notification badge"]'::jsonb
)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  price_paise = excluded.price_paise,
  duration_days = excluded.duration_days,
  active = excluded.active,
  features = excluded.features,
  updated_at = now();

-- 2. Payment Orders Table
create table if not exists public.payment_orders (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null default 'razorpay' check (provider in ('razorpay', 'offline', 'mock')),
  provider_order_id text unique,
  plan_id text not null references public.monetization_plans(id),
  amount_paise bigint not null check (amount_paise > 0),
  currency text not null default 'INR' check (currency = 'INR'),
  status text not null default 'created' check (status in ('created', 'pending', 'paid', 'failed', 'cancelled', 'expired')),
  purpose text not null default 'listing_promotion' check (purpose in ('listing_promotion', 'subscription', 'one_time')),
  entity_type text not null check (entity_type in ('business', 'property')),
  entity_id uuid not null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.payment_orders is 'Server-verified payment orders created before checkout';

-- 3. Payment Transactions Table
create table if not exists public.payment_transactions (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.payment_orders(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null default 'razorpay',
  provider_payment_id text not null unique,
  amount_paise bigint not null check (amount_paise > 0),
  currency text not null default 'INR',
  status text not null default 'captured' check (status in ('authorized', 'captured', 'failed', 'refunded')),
  method text check (method is null or method in ('card', 'netbanking', 'wallet', 'emi', 'upi', 'app', 'other')),
  provider_signature text,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.payment_transactions is 'Successful or recorded financial transactions linked to orders';

-- 4. Payment Refunds Table
create table if not exists public.payment_refunds (
  id uuid primary key default extensions.gen_random_uuid(),
  transaction_id uuid not null references public.payment_transactions(id) on delete cascade,
  provider text not null default 'razorpay',
  provider_refund_id text not null unique,
  amount_paise bigint not null check (amount_paise > 0),
  currency text not null default 'INR',
  status text not null default 'processed' check (status in ('pending', 'processed', 'failed')),
  reason text,
  created_at timestamptz not null default now(),
  processed_at timestamptz not null default now()
);

comment on table public.payment_refunds is 'Refund records linked to payment transactions';

-- 5. Webhook Events Table (with unique provider_event_id for idempotency)
create table if not exists public.payment_webhook_events (
  id uuid primary key default extensions.gen_random_uuid(),
  provider text not null default 'razorpay',
  provider_event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  processed boolean not null default false,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

comment on table public.payment_webhook_events is 'Idempotent log of raw incoming provider webhook events';

-- 6. Listing Promotions Table (Entitlements)
create table if not exists public.listing_promotions (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  entity_type text not null check (entity_type in ('business', 'property')),
  entity_id uuid not null,
  plan_id text not null references public.monetization_plans(id),
  order_id uuid not null references public.payment_orders(id),
  payment_transaction_id uuid references public.payment_transactions(id),
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status text not null default 'active' check (status in ('pending', 'active', 'expired', 'cancelled', 'refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listing_promotions_order_uniq unique (order_id)
);

comment on table public.listing_promotions is 'Active, scheduled, or expired listing promotion entitlements';

-- Indexes for performance
create index if not exists monetization_plans_active_idx on public.monetization_plans(active, entity_type);
create index if not exists payment_orders_user_created_idx on public.payment_orders(user_id, created_at desc);
create index if not exists payment_orders_provider_idx on public.payment_orders(provider_order_id);
create index if not exists payment_orders_entity_idx on public.payment_orders(entity_type, entity_id);
create index if not exists payment_transactions_user_created_idx on public.payment_transactions(user_id, created_at desc);
create index if not exists payment_transactions_order_idx on public.payment_transactions(order_id);
create index if not exists payment_transactions_provider_idx on public.payment_transactions(provider_payment_id);
create index if not exists payment_webhook_events_provider_event_idx on public.payment_webhook_events(provider_event_id);
create index if not exists listing_promotions_owner_created_idx on public.listing_promotions(owner_id, created_at desc);
create index if not exists listing_promotions_entity_active_idx on public.listing_promotions(entity_type, entity_id, status, expires_at);

-- 7. Row Level Security
alter table public.monetization_plans enable row level security;
alter table public.payment_orders enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.payment_refunds enable row level security;
alter table public.payment_webhook_events enable row level security;
alter table public.listing_promotions enable row level security;

-- Plans: Public readable (only active plans, or all if admin)
grant select on public.monetization_plans to anon, authenticated;
drop policy if exists monetization_plans_select on public.monetization_plans;
create policy monetization_plans_select on public.monetization_plans
for select to anon, authenticated
using (active = true or public.is_admin());

-- Orders: Owner can select own orders, admin can select all
grant select on public.payment_orders to authenticated;
drop policy if exists payment_orders_owner_select on public.payment_orders;
create policy payment_orders_owner_select on public.payment_orders
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

-- Transactions: Owner can select own transactions, admin can select all
grant select on public.payment_transactions to authenticated;
drop policy if exists payment_transactions_owner_select on public.payment_transactions;
create policy payment_transactions_owner_select on public.payment_transactions
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

-- Refunds: Owner can select refunds on their transactions, admin can select all
grant select on public.payment_refunds to authenticated;
drop policy if exists payment_refunds_owner_select on public.payment_refunds;
create policy payment_refunds_owner_select on public.payment_refunds
for select to authenticated
using (
  exists (
    select 1 from public.payment_transactions pt
    where pt.id = payment_refunds.transaction_id
      and (pt.user_id = auth.uid() or public.is_admin())
  )
);

-- Webhook events: Admin can select, public cannot select or insert directly
grant select on public.payment_webhook_events to authenticated;
drop policy if exists payment_webhook_events_admin_select on public.payment_webhook_events;
create policy payment_webhook_events_admin_select on public.payment_webhook_events
for select to authenticated
using (public.is_admin());

-- Promotions: Owner can select own promotions, public can select active unexpired promotions
grant select on public.listing_promotions to anon, authenticated;
drop policy if exists listing_promotions_select on public.listing_promotions;
create policy listing_promotions_select on public.listing_promotions
for select to anon, authenticated
using (
  (status = 'active' and starts_at <= now() and expires_at > now()) or
  owner_id = auth.uid() or
  public.is_admin()
);

-- 8. Server-Side RPC: Create Payment Order
-- Validates listing ownership, plan validity, and sets exact price server-side
create or replace function public.create_payment_order(
  p_entity_type text,
  p_entity_id uuid,
  p_plan_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_plan public.monetization_plans%rowtype;
  v_owner_id uuid;
  v_entity_title text;
  v_order_id uuid;
  v_provider_order_id text;
  v_rate_allowed boolean;
begin
  if v_caller_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  -- Rate limit order creations (max 10 order creation attempts per minute per user)
  v_rate_allowed := public.check_rate_limit('create_payment_order', v_caller_id::text, 10, 60);
  if not v_rate_allowed then
    raise exception 'Rate limit exceeded: Please wait before creating another order.'
      using errcode = 'P0001';
  end if;

  if p_entity_type not in ('business', 'property') then
    raise exception 'Invalid entity_type: %', p_entity_type;
  end if;

  -- Resolve plan server-side
  select * into v_plan
  from public.monetization_plans
  where id = p_plan_id and active = true;

  if v_plan.id is null then
    raise exception 'Monetization plan not found or inactive: %', p_plan_id;
  end if;

  if v_plan.entity_type <> 'all' and v_plan.entity_type <> p_entity_type then
    raise exception 'Plan is not valid for entity type: %', p_entity_type;
  end if;

  -- Validate entity ownership server-side
  if p_entity_type = 'business' then
    select owner_id, name into v_owner_id, v_entity_title
    from public.businesses
    where id = p_entity_id;
  else
    select owner_id, title into v_owner_id, v_entity_title
    from public.properties
    where id = p_entity_id;
  end if;

  if v_owner_id is null then
    raise exception 'Listing not found: %', p_entity_id;
  end if;

  if v_owner_id <> v_caller_id and not public.is_admin() then
    raise exception 'Access denied: You do not own this listing.' using errcode = '42501';
  end if;

  -- Generate server order ID and provider placeholder
  v_order_id := extensions.gen_random_uuid();
  v_provider_order_id := 'order_suh_' || replace(v_order_id::text, '-', '');

  insert into public.payment_orders (
    id,
    user_id,
    provider,
    provider_order_id,
    plan_id,
    amount_paise,
    currency,
    status,
    purpose,
    entity_type,
    entity_id,
    metadata
  ) values (
    v_order_id,
    v_caller_id,
    'razorpay',
    v_provider_order_id,
    v_plan.id,
    v_plan.price_paise,
    v_plan.currency,
    'created',
    'listing_promotion',
    p_entity_type,
    p_entity_id,
    jsonb_build_object(
      'plan_name', v_plan.name,
      'duration_days', v_plan.duration_days,
      'entity_title', v_entity_title
    )
  );

  return jsonb_build_object(
    'order_id', v_order_id,
    'provider_order_id', v_provider_order_id,
    'amount_paise', v_plan.price_paise,
    'currency', v_plan.currency,
    'plan_id', v_plan.id,
    'plan_name', v_plan.name,
    'duration_days', v_plan.duration_days,
    'entity_title', v_entity_title
  );
end;
$$;

revoke all on function public.create_payment_order(text, uuid, text) from public;
grant execute on function public.create_payment_order(text, uuid, text) to authenticated;

-- 9. Server-Side RPC: Verify Payment and Activate Promotion Entitlement
-- Validates payment order existence, ownership, idempotency, and activates promotion
create or replace function public.verify_and_activate_payment(
  p_order_id uuid,
  p_provider_payment_id text,
  p_provider_signature text,
  p_payment_method text default 'upi'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_order public.payment_orders%rowtype;
  v_plan public.monetization_plans%rowtype;
  v_existing_tx public.payment_transactions%rowtype;
  v_tx_id uuid;
  v_promo_id uuid;
  v_starts_at timestamptz := now();
  v_expires_at timestamptz;
  v_rate_allowed boolean;
begin
  if v_caller_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  -- Rate limit verification attempts
  v_rate_allowed := public.check_rate_limit('verify_payment', v_caller_id::text, 20, 60);
  if not v_rate_allowed then
    raise exception 'Rate limit exceeded for payment verification.' using errcode = 'P0001';
  end if;

  select * into v_order
  from public.payment_orders
  where id = p_order_id;

  if v_order.id is null then
    raise exception 'Payment order not found: %', p_order_id;
  end if;

  if v_order.user_id <> v_caller_id and not public.is_admin() then
    raise exception 'Access denied: You do not own this order.' using errcode = '42501';
  end if;

  if p_provider_payment_id is null or trim(p_provider_payment_id) = '' then
    raise exception 'Invalid provider payment ID.';
  end if;

  -- Signature security check: signature must be provided and non-empty
  if p_provider_signature is null or length(trim(p_provider_signature)) < 8 then
    raise exception 'Payment verification failed: Invalid provider signature.' using errcode = 'P0001';
  end if;

  -- Check if transaction was already processed (Idempotency)
  select * into v_existing_tx
  from public.payment_transactions
  where provider_payment_id = p_provider_payment_id or order_id = p_order_id;

  if v_existing_tx.id is not null then
    -- Return existing transaction details idempotently
    return jsonb_build_object(
      'success', true,
      'already_processed', true,
      'order_id', v_order.id,
      'transaction_id', v_existing_tx.id,
      'status', 'paid'
    );
  end if;

  -- Fetch plan to determine duration
  select * into v_plan
  from public.monetization_plans
  where id = v_order.plan_id;

  v_expires_at := v_starts_at + (v_plan.duration_days || ' days')::interval;

  -- Record transaction
  v_tx_id := extensions.gen_random_uuid();
  insert into public.payment_transactions (
    id,
    order_id,
    user_id,
    provider,
    provider_payment_id,
    amount_paise,
    currency,
    status,
    method,
    provider_signature,
    paid_at
  ) values (
    v_tx_id,
    v_order.id,
    v_caller_id,
    v_order.provider,
    p_provider_payment_id,
    v_order.amount_paise,
    v_order.currency,
    'captured',
    coalesce(p_payment_method, 'upi'),
    p_provider_signature,
    now()
  );

  -- Update order status
  update public.payment_orders
  set
    status = 'paid',
    updated_at = now()
  where id = v_order.id;

  -- Activate listing promotion entitlement
  v_promo_id := extensions.gen_random_uuid();
  insert into public.listing_promotions (
    id,
    owner_id,
    entity_type,
    entity_id,
    plan_id,
    order_id,
    payment_transaction_id,
    starts_at,
    expires_at,
    status
  ) values (
    v_promo_id,
    v_caller_id,
    v_order.entity_type,
    v_order.entity_id,
    v_order.plan_id,
    v_order.id,
    v_tx_id,
    v_starts_at,
    v_expires_at,
    'active'
  );

  -- Notify owner about successful activation
  insert into public.notifications (
    user_id,
    type,
    title,
    message,
    link,
    data
  ) values (
    v_caller_id,
    'system',
    'Listing Promotion Activated! 🚀',
    'Your listing spotlight plan (' || v_plan.name || ') is now active until ' || to_char(v_expires_at, 'YYYY-MM-DD') || '.',
    '/owner?tab=billing',
    jsonb_build_object(
      'order_id', v_order.id,
      'plan_id', v_plan.id,
      'entity_type', v_order.entity_type,
      'entity_id', v_order.entity_id,
      'expires_at', v_expires_at
    )
  );

  return jsonb_build_object(
    'success', true,
    'order_id', v_order.id,
    'transaction_id', v_tx_id,
    'promotion_id', v_promo_id,
    'starts_at', v_starts_at,
    'expires_at', v_expires_at,
    'status', 'active'
  );
end;
$$;

revoke all on function public.verify_and_activate_payment(uuid, text, text, text) from public;
grant execute on function public.verify_and_activate_payment(uuid, text, text, text) to authenticated;

-- 10. Server-Side RPC: Process Payment Refund (Admin or Automated Webhook)
create or replace function public.process_payment_refund(
  p_transaction_id uuid,
  p_provider_refund_id text,
  p_reason text default 'Customer requested cancellation'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_tx public.payment_transactions%rowtype;
  v_refund_id uuid;
begin
  -- Only admin can trigger manual refunds
  if not public.is_admin() then
    raise exception 'Access denied: Admin authorization required for refunds.' using errcode = '42501';
  end if;

  select * into v_tx
  from public.payment_transactions
  where id = p_transaction_id;

  if v_tx.id is null then
    raise exception 'Transaction not found: %', p_transaction_id;
  end if;

  v_refund_id := extensions.gen_random_uuid();

  insert into public.payment_refunds (
    id,
    transaction_id,
    provider,
    provider_refund_id,
    amount_paise,
    currency,
    status,
    reason,
    created_at,
    processed_at
  ) values (
    v_refund_id,
    v_tx.id,
    v_tx.provider,
    p_provider_refund_id,
    v_tx.amount_paise,
    v_tx.currency,
    'processed',
    p_reason,
    now(),
    now()
  );

  -- Update transaction status to refunded
  update public.payment_transactions
  set status = 'refunded'
  where id = v_tx.id;

  -- Revoke/Refund promotion entitlement
  update public.listing_promotions
  set
    status = 'refunded',
    updated_at = now()
  where payment_transaction_id = v_tx.id;

  -- Record in admin audit log
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
    v_caller_id,
    'payment_refunded',
    'business',
    v_tx.id,
    'Transaction ' || v_tx.provider_payment_id,
    'captured',
    'refunded',
    p_reason,
    jsonb_build_object(
      'amount_paise', v_tx.amount_paise,
      'provider_refund_id', p_provider_refund_id,
      'order_id', v_tx.order_id
    )
  );

  return jsonb_build_object(
    'success', true,
    'refund_id', v_refund_id,
    'transaction_id', v_tx.id,
    'status', 'refunded'
  );
end;
$$;

revoke all on function public.process_payment_refund(uuid, text, text) from public;
grant execute on function public.process_payment_refund(uuid, text, text) to authenticated;

-- 11. Helper function to check if an entity is actively promoted
create or replace function public.is_entity_promoted(
  p_entity_type text,
  p_entity_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.listing_promotions
    where entity_type = p_entity_type
      and entity_id = p_entity_id
      and status = 'active'
      and starts_at <= now()
      and expires_at > now()
  );
$$;

revoke all on function public.is_entity_promoted(text, uuid) from public;
grant execute on function public.is_entity_promoted(text, uuid) to anon, authenticated;
