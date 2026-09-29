-- Owner Analytics & Lead Telemetry Migration
-- Enables tracking of listing views, contact clicks (call & WhatsApp),
-- saves, and quotation conversions with strict RLS and owner aggregation RPCs.

-- 1. Create public.listing_analytics_events table
create table if not exists public.listing_analytics_events (
  id uuid primary key default extensions.gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  property_id uuid references public.properties(id) on delete cascade,
  event_type text not null check (event_type in (
    'listing_view',
    'call_click',
    'whatsapp_click',
    'saved_listing',
    'quote_submitted',
    'quote_accepted',
    'quote_rejected',
    'quote_withdrawn'
  )),
  user_id uuid references public.profiles(id) on delete set null,
  session_id text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  constraint listing_analytics_target_check check (
    (business_id is not null and property_id is null) or
    (business_id is null and property_id is not null)
  )
);

comment on table public.listing_analytics_events is 'Listing engagement and telemetry events (views, call/whatsapp clicks, saves, quotes)';
comment on column public.listing_analytics_events.business_id is 'Target business ID if event applies to a business';
comment on column public.listing_analytics_events.property_id is 'Target property ID if event applies to a property';
comment on column public.listing_analytics_events.event_type is 'Category of telemetry event';
comment on column public.listing_analytics_events.user_id is 'User profile ID who triggered event, or null for anonymous visits';
comment on column public.listing_analytics_events.session_id is 'Browser session identifier for deduplication';

-- 2. Indexes for efficient dashboard aggregation and time filtering
create index if not exists listing_analytics_business_created_idx
  on public.listing_analytics_events(business_id, created_at desc)
  where business_id is not null;

create index if not exists listing_analytics_property_created_idx
  on public.listing_analytics_events(property_id, created_at desc)
  where property_id is not null;

create index if not exists listing_analytics_type_created_idx
  on public.listing_analytics_events(event_type, created_at desc);

-- 3. Row Level Security
alter table public.listing_analytics_events enable row level security;

-- Grant permissions: authenticated users can SELECT if they own the business/property
grant select on public.listing_analytics_events to authenticated;

drop policy if exists listing_analytics_owner_select on public.listing_analytics_events;
create policy listing_analytics_owner_select
on public.listing_analytics_events for select to authenticated
using (
  (business_id is not null and public.owns_business(business_id))
  or
  (property_id is not null and public.owns_property(property_id))
  or
  public.is_admin()
);

-- 4. Secure Telemetry Recording RPC
-- Allows anonymous or authenticated clients to log legitimate telemetry events
-- without exposing direct table INSERT privileges or trusting arbitrary user IDs.
create or replace function public.record_listing_analytics_event(
  p_business_id uuid default null,
  p_property_id uuid default null,
  p_event_type text default 'listing_view',
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
begin
  -- Enforce target exclusivity
  if (p_business_id is null and p_property_id is null) or
     (p_business_id is not null and p_property_id is not null) then
    raise exception 'Exactly one of p_business_id or p_property_id must be provided.';
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

revoke all on function public.record_listing_analytics_event(uuid, uuid, text, text, jsonb) from public;
grant execute on function public.record_listing_analytics_event(uuid, uuid, text, text, jsonb) to anon, authenticated;

-- 5. Automated Trigger: Log saved_listing event on insert into saved_listings
create or replace function public.log_saved_listing_analytics()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.business_id is not null then
    insert into public.listing_analytics_events (
      business_id,
      event_type,
      user_id,
      metadata,
      created_at
    ) values (
      new.business_id,
      'saved_listing',
      new.user_id,
      jsonb_build_object('source', 'user_bookmark'),
      now()
    );
  elsif new.property_id is not null then
    insert into public.listing_analytics_events (
      property_id,
      event_type,
      user_id,
      metadata,
      created_at
    ) values (
      new.property_id,
      'saved_listing',
      new.user_id,
      jsonb_build_object('source', 'user_bookmark'),
      now()
    );
  end if;
  return new;
end;
$$;

drop trigger if exists saved_listings_analytics_trigger on public.saved_listings;
create trigger saved_listings_analytics_trigger
after insert on public.saved_listings
for each row execute function public.log_saved_listing_analytics();

-- 6. Automated Trigger: Log quote lifecycle events on requirement_quotes
create or replace function public.log_quote_lifecycle_analytics()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_type text;
begin
  if TG_OP = 'INSERT' then
    v_event_type := 'quote_submitted';
  elsif TG_OP = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'accepted' then
      v_event_type := 'quote_accepted';
    elsif new.status = 'rejected' then
      v_event_type := 'quote_rejected';
    elsif new.status = 'withdrawn' then
      v_event_type := 'quote_withdrawn';
    end if;
  end if;

  if v_event_type is not null and new.business_id is not null then
    insert into public.listing_analytics_events (
      business_id,
      event_type,
      user_id,
      metadata,
      created_at
    ) values (
      new.business_id,
      v_event_type,
      new.vendor_id,
      jsonb_build_object(
        'quote_id', new.id,
        'requirement_id', new.requirement_id,
        'quote_amount', new.quote_amount,
        'status', new.status
      ),
      now()
    );
  end if;

  return new;
end;
$$;

drop trigger if exists requirement_quotes_analytics_trigger on public.requirement_quotes;
create trigger requirement_quotes_analytics_trigger
after insert or update of status on public.requirement_quotes
for each row execute function public.log_quote_lifecycle_analytics();

-- 7. High-Performance Owner Analytics Aggregation RPC
create or replace function public.get_owner_analytics(
  p_days integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_admin boolean := public.is_admin();
  v_cutoff timestamptz;
  v_total_views bigint := 0;
  v_total_calls bigint := 0;
  v_total_whatsapps bigint := 0;
  v_total_saves bigint := 0;
  v_total_quotes_submitted bigint := 0;
  v_total_quotes_accepted bigint := 0;
  v_conversion_rate numeric(5, 2) := 0.00;
  v_listings jsonb := '[]'::jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required to view analytics.';
  end if;

  if p_days is not null and p_days > 0 then
    v_cutoff := now() - (p_days || ' days')::interval;
  end if;

  -- 1. Aggregate overall counts for caller's businesses and properties
  select
    count(*) filter (where e.event_type = 'listing_view'),
    count(*) filter (where e.event_type = 'call_click'),
    count(*) filter (where e.event_type = 'whatsapp_click'),
    count(*) filter (where e.event_type = 'saved_listing'),
    count(*) filter (where e.event_type = 'quote_submitted'),
    count(*) filter (where e.event_type = 'quote_accepted')
  into
    v_total_views,
    v_total_calls,
    v_total_whatsapps,
    v_total_saves,
    v_total_quotes_submitted,
    v_total_quotes_accepted
  from public.listing_analytics_events e
  where (v_cutoff is null or e.created_at >= v_cutoff)
    and (
      (e.business_id is not null and exists (
        select 1 from public.businesses b
        where b.id = e.business_id and (b.owner_id = v_user_id or v_is_admin)
      ))
      or
      (e.property_id is not null and exists (
        select 1 from public.properties p
        where p.id = e.property_id and (p.owner_id = v_user_id or v_is_admin)
      ))
    );

  if v_total_quotes_submitted > 0 then
    v_conversion_rate := round((v_total_quotes_accepted::numeric / v_total_quotes_submitted::numeric) * 100, 2);
  end if;

  -- 2. Aggregate per-business breakdown
  with biz_stats as (
    select
      b.id,
      b.name as title,
      'business' as entity_type,
      b.active,
      b.verified,
      count(e.id) filter (where e.event_type = 'listing_view') as views_count,
      count(e.id) filter (where e.event_type = 'call_click') as calls_count,
      count(e.id) filter (where e.event_type = 'whatsapp_click') as whatsapps_count,
      count(e.id) filter (where e.event_type = 'saved_listing') as saves_count,
      count(e.id) filter (where e.event_type = 'quote_submitted') as quotes_submitted_count,
      count(e.id) filter (where e.event_type = 'quote_accepted') as quotes_accepted_count
    from public.businesses b
    left join public.listing_analytics_events e
      on e.business_id = b.id
      and (v_cutoff is null or e.created_at >= v_cutoff)
    where (b.owner_id = v_user_id or v_is_admin)
    group by b.id, b.name, b.active, b.verified
  ),
  prop_stats as (
    select
      p.id,
      p.title,
      'property' as entity_type,
      p.active,
      p.verified,
      count(e.id) filter (where e.event_type = 'listing_view') as views_count,
      count(e.id) filter (where e.event_type = 'call_click') as calls_count,
      count(e.id) filter (where e.event_type = 'whatsapp_click') as whatsapps_count,
      count(e.id) filter (where e.event_type = 'saved_listing') as saves_count,
      0::bigint as quotes_submitted_count,
      0::bigint as quotes_accepted_count
    from public.properties p
    left join public.listing_analytics_events e
      on e.property_id = p.id
      and (v_cutoff is null or e.created_at >= v_cutoff)
    where (p.owner_id = v_user_id or v_is_admin)
    group by p.id, p.title, p.active, p.verified
  ),
  combined as (
    select * from biz_stats
    union all
    select * from prop_stats
    order by views_count desc, title asc
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'title', c.title,
      'entity_type', c.entity_type,
      'active', c.active,
      'verified', c.verified,
      'views', c.views_count,
      'calls', c.calls_count,
      'whatsapps', c.whatsapps_count,
      'saves', c.saves_count,
      'quotes_submitted', c.quotes_submitted_count,
      'quotes_accepted', c.quotes_accepted_count,
      'conversion_rate', case
        when c.quotes_submitted_count > 0
        then round((c.quotes_accepted_count::numeric / c.quotes_submitted_count::numeric) * 100, 1)
        else 0.0
      end
    )
  ), '[]'::jsonb)
  into v_listings
  from combined c;

  -- 3. Return summary and listing breakdown
  return jsonb_build_object(
    'period_days', p_days,
    'summary', jsonb_build_object(
      'total_views', v_total_views,
      'total_call_clicks', v_total_calls,
      'total_whatsapp_clicks', v_total_whatsapps,
      'total_saved_listings', v_total_saves,
      'total_quotes_submitted', v_total_quotes_submitted,
      'total_quotes_accepted', v_total_quotes_accepted,
      'conversion_rate', v_conversion_rate
    ),
    'listings', v_listings
  );
end;
$$;

revoke all on function public.get_owner_analytics(integer) from public;
grant execute on function public.get_owner_analytics(integer) to authenticated;
