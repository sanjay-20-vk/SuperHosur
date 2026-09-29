-- ============================================================================
-- SuperHosur — Phase 18 Step 4: Owner CRM & Unified Lead Inbox
-- Provides a centralized lead aggregation and CRM management system
-- for Business and Property Owners.
-- ============================================================================

-- 1. Create public.owner_leads table
create table if not exists public.owner_leads (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  entity_type text not null check (entity_type in ('business', 'property')),
  entity_id uuid not null,
  source_type text not null check (source_type in (
    'direct_message',
    'quote',
    'phone_click',
    'whatsapp_click',
    'requirement_match'
  )),
  source_id text, -- ID of the conversation, quote, requirement, or analytics event
  contact_user_id uuid references public.profiles(id) on delete set null,
  contact_name_snapshot text,
  contact_phone_snapshot text,
  contact_email_snapshot text,
  title text not null,
  description text,
  status text not null default 'new' check (status in (
    'new',
    'contacted',
    'qualified',
    'follow_up',
    'converted',
    'closed',
    'lost'
  )),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  notes text check (notes is null or length(notes) <= 4000),
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  converted_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Idempotency: one CRM lead record per (owner_id, entity_type, entity_id, source_type, source_id)
  constraint owner_leads_source_uniq unique (owner_id, entity_type, entity_id, source_type, source_id)
);

comment on table public.owner_leads is 'Unified CRM leads for business and property owners across all platform touchpoints';
comment on column public.owner_leads.owner_id is 'Profile ID of the listing owner who owns this CRM lead';
comment on column public.owner_leads.source_type is 'Touchpoint from which the lead originated';
comment on column public.owner_leads.status is 'Current CRM sales/conversion lifecycle status';
comment on column public.owner_leads.priority is 'Urgency prioritization assigned by owner';

-- Performance Indexes
create index if not exists owner_leads_owner_created_idx
  on public.owner_leads(owner_id, created_at desc);

create index if not exists owner_leads_owner_status_idx
  on public.owner_leads(owner_id, status);

create index if not exists owner_leads_owner_followup_idx
  on public.owner_leads(owner_id, next_follow_up_at)
  where next_follow_up_at is not null;

create index if not exists owner_leads_owner_source_idx
  on public.owner_leads(owner_id, source_type);

create index if not exists owner_leads_entity_idx
  on public.owner_leads(entity_type, entity_id);

-- 2. Row Level Security for owner_leads
alter table public.owner_leads enable row level security;

grant select, update on public.owner_leads to authenticated;

drop policy if exists owner_leads_owner_select on public.owner_leads;
create policy owner_leads_owner_select
on public.owner_leads for select to authenticated
using (
  owner_id = auth.uid() or public.is_admin()
);

drop policy if exists owner_leads_owner_update on public.owner_leads;
create policy owner_leads_owner_update
on public.owner_leads for update to authenticated
using (
  owner_id = auth.uid()
)
with check (
  owner_id = auth.uid()
);

-- 3. Automatic Trigger: Create or update CRM lead from Direct In-App Conversations
create or replace function public.sync_lead_from_direct_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer public.profiles%rowtype;
  v_customer_email text;
  v_entity_title text;
begin
  -- Fetch customer profile
  select * into v_customer
  from public.profiles
  where id = new.customer_id;

  select email into v_customer_email
  from auth.users
  where id = new.customer_id;

  -- Fetch listing title
  if new.entity_type = 'business' then
    select name into v_entity_title
    from public.businesses
    where id = new.entity_id;
  elsif new.entity_type = 'property' then
    select title into v_entity_title
    from public.properties
    where id = new.entity_id;
  end if;

  insert into public.owner_leads (
    owner_id,
    entity_type,
    entity_id,
    source_type,
    source_id,
    contact_user_id,
    contact_name_snapshot,
    contact_phone_snapshot,
    contact_email_snapshot,
    title,
    description,
    status,
    priority,
    last_contacted_at,
    created_at,
    updated_at
  ) values (
    new.owner_id,
    new.entity_type,
    new.entity_id,
    'direct_message',
    new.id::text,
    new.customer_id,
    v_customer.full_name,
    v_customer.phone,
    v_customer_email,
    'Chat inquiry from ' || coalesce(v_customer.full_name, 'Customer'),
    'Direct messaging inquiry on ' || coalesce(v_entity_title, 'Listing'),
    'new',
    'medium',
    new.last_message_at,
    new.created_at,
    new.updated_at
  )
  on conflict (owner_id, entity_type, entity_id, source_type, source_id)
  do update set
    last_contacted_at = excluded.last_contacted_at,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists sync_lead_on_direct_conversation on public.direct_conversations;
create trigger sync_lead_on_direct_conversation
after insert or update on public.direct_conversations
for each row execute function public.sync_lead_from_direct_conversation();

-- 4. Automatic Trigger: Create CRM lead on Requirement Matches
create or replace function public.sync_lead_from_requirement_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_req public.requirements%rowtype;
  v_customer public.profiles%rowtype;
  v_customer_email text;
begin
  -- Resolve business owner
  select owner_id into v_owner_id
  from public.businesses
  where id = new.business_id;

  if v_owner_id is null then
    return new;
  end if;

  -- Resolve requirement
  select * into v_req
  from public.requirements
  where id = new.requirement_id;

  -- Resolve customer profile
  select * into v_customer
  from public.profiles
  where id = v_req.customer_id;

  select email into v_customer_email
  from auth.users
  where id = v_req.customer_id;

  insert into public.owner_leads (
    owner_id,
    entity_type,
    entity_id,
    source_type,
    source_id,
    contact_user_id,
    contact_name_snapshot,
    contact_phone_snapshot,
    contact_email_snapshot,
    title,
    description,
    status,
    priority,
    created_at,
    updated_at
  ) values (
    v_owner_id,
    'business',
    new.business_id,
    'requirement_match',
    new.id::text,
    v_req.customer_id,
    v_customer.full_name,
    v_customer.phone,
    v_customer_email,
    'Matched Requirement: ' || coalesce(v_req.title, 'RFQ Opportunity'),
    coalesce(v_req.description, 'Matched local customer requirement in Hosur'),
    'new',
    'medium',
    new.created_at,
    new.created_at
  )
  on conflict (owner_id, entity_type, entity_id, source_type, source_id)
  do nothing;

  return new;
end;
$$;

drop trigger if exists sync_lead_on_requirement_match on public.requirement_matches;
create trigger sync_lead_on_requirement_match
after insert on public.requirement_matches
for each row execute function public.sync_lead_from_requirement_match();

-- 5. Automatic Trigger: Sync CRM lead on Quote Status Transition
create or replace function public.sync_lead_from_quote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_req public.requirements%rowtype;
  v_customer public.profiles%rowtype;
  v_customer_email text;
  v_status text;
begin
  select owner_id into v_owner_id
  from public.businesses
  where id = new.business_id;

  if v_owner_id is null then
    return new;
  end if;

  select * into v_req
  from public.requirements
  where id = new.requirement_id;

  select * into v_customer
  from public.profiles
  where id = v_req.customer_id;

  select email into v_customer_email
  from auth.users
  where id = v_req.customer_id;

  -- Map quote status to CRM status
  v_status := case
    when new.status = 'accepted' then 'converted'
    when new.status = 'rejected' then 'lost'
    when new.status = 'withdrawn' then 'closed'
    else 'contacted'
  end;

  insert into public.owner_leads (
    owner_id,
    entity_type,
    entity_id,
    source_type,
    source_id,
    contact_user_id,
    contact_name_snapshot,
    contact_phone_snapshot,
    contact_email_snapshot,
    title,
    description,
    status,
    priority,
    converted_at,
    closed_at,
    created_at,
    updated_at
  ) values (
    v_owner_id,
    'business',
    new.business_id,
    'quote',
    new.id::text,
    v_req.customer_id,
    v_customer.full_name,
    v_customer.phone,
    v_customer_email,
    'Quote on: ' || coalesce(v_req.title, 'Requirement'),
    'Submitted quotation of ₹' || new.quote_amount::text,
    v_status,
    case when new.status = 'accepted' then 'high' else 'medium' end,
    case when new.status = 'accepted' then now() else null end,
    case when new.status in ('rejected', 'withdrawn') then now() else null end,
    new.created_at,
    new.updated_at
  )
  on conflict (owner_id, entity_type, entity_id, source_type, source_id)
  do update set
    status = v_status,
    converted_at = case when new.status = 'accepted' then now() else public.owner_leads.converted_at end,
    closed_at = case when new.status in ('rejected', 'withdrawn') then now() else public.owner_leads.closed_at end,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists sync_lead_on_quote on public.requirement_quotes;
create trigger sync_lead_on_quote
after insert or update on public.requirement_quotes
for each row execute function public.sync_lead_from_quote();

-- 6. Trigger: Convert contact clicks (Phone & WhatsApp) to CRM leads
create or replace function public.sync_lead_from_analytics_click()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_entity_type text;
  v_entity_id uuid;
  v_entity_title text;
  v_caller public.profiles%rowtype;
  v_caller_email text;
  v_channel_label text;
begin
  if new.event_type not in ('call_click', 'whatsapp_click') then
    return new;
  end if;

  if new.business_id is not null then
    v_entity_type := 'business';
    v_entity_id := new.business_id;
    select owner_id, name into v_owner_id, v_entity_title
    from public.businesses
    where id = new.business_id;
  elsif new.property_id is not null then
    v_entity_type := 'property';
    v_entity_id := new.property_id;
    select owner_id, title into v_owner_id, v_entity_title
    from public.properties
    where id = new.property_id;
  end if;

  if v_owner_id is null or v_owner_id = new.user_id then
    return new;
  end if;

  if new.user_id is not null then
    select * into v_caller from public.profiles where id = new.user_id;
    select email into v_caller_email from auth.users where id = new.user_id;
  end if;

  v_channel_label := case when new.event_type = 'call_click' then 'Phone Call' else 'WhatsApp Message' end;

  insert into public.owner_leads (
    owner_id,
    entity_type,
    entity_id,
    source_type,
    source_id,
    contact_user_id,
    contact_name_snapshot,
    contact_phone_snapshot,
    contact_email_snapshot,
    title,
    description,
    status,
    priority,
    last_contacted_at,
    created_at,
    updated_at
  ) values (
    v_owner_id,
    v_entity_type,
    v_entity_id,
    new.event_type,
    new.id::text,
    new.user_id,
    v_caller.full_name,
    v_caller.phone,
    v_caller_email,
    v_channel_label || ' on ' || coalesce(v_entity_title, 'Listing'),
    'Visitor clicked to connect via ' || v_channel_label,
    'new',
    'medium',
    new.created_at,
    new.created_at,
    new.created_at
  )
  on conflict (owner_id, entity_type, entity_id, source_type, source_id)
  do nothing;

  return new;
end;
$$;

drop trigger if exists sync_lead_on_analytics_click on public.listing_analytics_events;
create trigger sync_lead_on_analytics_click
after insert on public.listing_analytics_events
for each row execute function public.sync_lead_from_analytics_click();

-- 7. Owner CRM Update RPC with Rate Limiting
create or replace function public.update_owner_lead(
  p_lead_id uuid,
  p_status text default null,
  p_priority text default null,
  p_notes text default null,
  p_next_follow_up_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_lead public.owner_leads%rowtype;
  v_rate_allowed boolean;
begin
  if v_caller_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select * into v_lead
  from public.owner_leads
  where id = p_lead_id and owner_id = v_caller_id;

  if v_lead.id is null then
    raise exception 'Lead not found or access denied.' using errcode = '42501';
  end if;

  -- Rate limit CRM updates (max 100 updates per minute)
  v_rate_allowed := public.check_rate_limit('update_owner_lead', v_caller_id::text, 100, 60);
  if not v_rate_allowed then
    raise exception 'Rate limit exceeded: Please wait a moment before updating again.'
      using errcode = 'P0001';
  end if;

  if p_status is not null and p_status not in ('new', 'contacted', 'qualified', 'follow_up', 'converted', 'closed', 'lost') then
    raise exception 'Invalid status: %', p_status;
  end if;

  if p_priority is not null and p_priority not in ('low', 'medium', 'high') then
    raise exception 'Invalid priority: %', p_priority;
  end if;

  update public.owner_leads
  set
    status = coalesce(p_status, status),
    priority = coalesce(p_priority, priority),
    notes = coalesce(p_notes, notes),
    next_follow_up_at = p_next_follow_up_at,
    converted_at = case when p_status = 'converted' and converted_at is null then now() else converted_at end,
    closed_at = case when p_status in ('closed', 'lost') and closed_at is null then now() else closed_at end,
    updated_at = now()
  where id = p_lead_id;

  return jsonb_build_object('success', true, 'lead_id', p_lead_id);
end;
$$;

revoke all on function public.update_owner_lead(uuid, text, text, text, timestamptz) from public;
grant execute on function public.update_owner_lead(uuid, text, text, text, timestamptz) to authenticated;

-- Backfill existing leads from current direct_conversations
insert into public.owner_leads (
  owner_id,
  entity_type,
  entity_id,
  source_type,
  source_id,
  contact_user_id,
  contact_name_snapshot,
  contact_phone_snapshot,
  title,
  description,
  status,
  priority,
  last_contacted_at,
  created_at,
  updated_at
)
select
  dc.owner_id,
  dc.entity_type,
  dc.entity_id,
  'direct_message',
  dc.id::text,
  dc.customer_id,
  p.full_name,
  p.phone,
  'Inquiry from ' || coalesce(p.full_name, 'Customer'),
  'Direct messaging inquiry on ' || dc.entity_type,
  'new',
  'medium',
  dc.last_message_at,
  dc.created_at,
  dc.updated_at
from public.direct_conversations dc
left join public.profiles p on p.id = dc.customer_id
on conflict (owner_id, entity_type, entity_id, source_type, source_id) do nothing;
