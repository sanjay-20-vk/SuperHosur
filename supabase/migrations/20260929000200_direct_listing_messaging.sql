-- ============================================================================
-- SuperHosur — Phase 18 Step 2: Direct In-App Customer ↔ Listing Messaging
-- Enables direct communication for Business and Property listings without
-- requiring a formal requirement or quotation.
-- ============================================================================

-- 1. Update public.notifications type constraint to include 'direct_message'
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
check (type in (
  'new_quote',
  'quote_accepted',
  'quote_rejected',
  'quote_withdrawn',
  'requirement_status',
  'new_lead',
  'system',
  'quote_message',
  'direct_message'
));

-- 2. Create public.direct_conversations table
create table if not exists public.direct_conversations (
  id uuid primary key default extensions.gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  entity_type text not null check (entity_type in ('business', 'property')),
  entity_id uuid not null,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_direct_conv_distinct_parties check (customer_id <> owner_id)
);

comment on table public.direct_conversations is 'Direct conversation channels between customers and business/property owners';
comment on column public.direct_conversations.customer_id is 'Profile ID of the customer initiating or participating in the conversation';
comment on column public.direct_conversations.owner_id is 'Profile ID of the listing owner';
comment on column public.direct_conversations.entity_type is 'The type of listing (business or property)';
comment on column public.direct_conversations.entity_id is 'The ID of the business or property';
comment on column public.direct_conversations.last_message_at is 'Timestamp of the most recent message in the thread';

-- Enforce strictly unique conversation per customer + owner + entity_type + entity_id
create unique index if not exists direct_conversations_unique_channel_idx
  on public.direct_conversations(customer_id, owner_id, entity_type, entity_id);

-- Indexes for performance queries
create index if not exists direct_conversations_customer_idx
  on public.direct_conversations(customer_id, last_message_at desc);

create index if not exists direct_conversations_owner_idx
  on public.direct_conversations(owner_id, last_message_at desc);

create index if not exists direct_conversations_entity_idx
  on public.direct_conversations(entity_type, entity_id);

-- 3. Create public.direct_messages table
create table if not exists public.direct_messages (
  id uuid primary key default extensions.gen_random_uuid(),
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  message_text text not null check (char_length(trim(message_text)) > 0 and char_length(message_text) <= 2000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.direct_messages is 'Direct chat messages within a direct_conversation';
comment on column public.direct_messages.conversation_id is 'Parent conversation channel ID';
comment on column public.direct_messages.sender_id is 'Author of the message';
comment on column public.direct_messages.message_text is 'Content of the message (up to 2000 characters)';
comment on column public.direct_messages.read_at is 'Timestamp when recipient viewed/read the message';

create index if not exists direct_messages_conv_created_idx
  on public.direct_messages(conversation_id, created_at asc);

create index if not exists direct_messages_sender_idx
  on public.direct_messages(sender_id, created_at desc);

create index if not exists direct_messages_unread_idx
  on public.direct_messages(conversation_id, read_at)
  where read_at is null;

-- 4. Secure Helper Functions
-- Verify if a user is a participant of a direct conversation
create or replace function public.is_direct_conversation_participant(p_conv_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.direct_conversations
    where id = p_conv_id
      and (customer_id = auth.uid() or owner_id = auth.uid())
  );
$$;

revoke all on function public.is_direct_conversation_participant(uuid) from public;
grant execute on function public.is_direct_conversation_participant(uuid) to authenticated;

-- Helper to verify owner resolution from database
create or replace function public.resolve_listing_owner(p_entity_type text, p_entity_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
begin
  if p_entity_type = 'business' then
    select owner_id into v_owner_id
    from public.businesses
    where id = p_entity_id;
  elsif p_entity_type = 'property' then
    select owner_id into v_owner_id
    from public.properties
    where id = p_entity_id;
  end if;
  return v_owner_id;
end;
$$;

revoke all on function public.resolve_listing_owner(text, uuid) from public;
grant execute on function public.resolve_listing_owner(text, uuid) to authenticated;

-- 5. RPC to safely get or create a direct conversation
create or replace function public.get_or_create_direct_conversation(
  p_entity_type text,
  p_entity_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_owner_id uuid;
  v_conv_id uuid;
  v_rate_allowed boolean;
begin
  if v_caller_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_entity_type not in ('business', 'property') then
    raise exception 'Invalid entity type: %', p_entity_type;
  end if;

  -- Resolve actual listing owner
  v_owner_id := public.resolve_listing_owner(p_entity_type, p_entity_id);
  if v_owner_id is null then
    raise exception 'Listing not found or owner unknown.';
  end if;

  if v_owner_id = v_caller_id then
    raise exception 'You cannot message your own listing.';
  end if;

  -- Check rate limit on creating conversations (max 20 per hour)
  v_rate_allowed := public.check_rate_limit('create_direct_conversation', v_caller_id::text, 20, 3600);
  if not v_rate_allowed then
    raise exception 'Rate limit exceeded: You have created too many conversations recently. Please wait.'
      using errcode = 'P0001';
  end if;

  -- Attempt to select existing conversation
  select id into v_conv_id
  from public.direct_conversations
  where customer_id = v_caller_id
    and owner_id = v_owner_id
    and entity_type = p_entity_type
    and entity_id = p_entity_id;

  if v_conv_id is null then
    insert into public.direct_conversations (
      customer_id,
      owner_id,
      entity_type,
      entity_id,
      last_message_at
    ) values (
      v_caller_id,
      v_owner_id,
      p_entity_type,
      p_entity_id,
      now()
    )
    on conflict (customer_id, owner_id, entity_type, entity_id)
    do update set updated_at = now()
    returning id into v_conv_id;
  end if;

  return jsonb_build_object(
    'conversation_id', v_conv_id,
    'customer_id', v_caller_id,
    'owner_id', v_owner_id,
    'entity_type', p_entity_type,
    'entity_id', p_entity_id
  );
end;
$$;

revoke all on function public.get_or_create_direct_conversation(text, uuid) from public;
grant execute on function public.get_or_create_direct_conversation(text, uuid) to authenticated;

-- 6. RPC to send direct message safely with rate limiting and recipient resolution
create or replace function public.send_direct_message(
  p_conversation_id uuid,
  p_message_text text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_id uuid := auth.uid();
  v_conv public.direct_conversations%rowtype;
  v_clean_text text;
  v_message_id uuid;
  v_rate_allowed boolean;
begin
  if v_sender_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  v_clean_text := trim(p_message_text);
  if char_length(v_clean_text) = 0 then
    raise exception 'Message text cannot be empty.';
  end if;

  if char_length(v_clean_text) > 2000 then
    raise exception 'Message text cannot exceed 2000 characters.';
  end if;

  -- Validate participant
  select * into v_conv
  from public.direct_conversations
  where id = p_conversation_id
    and (customer_id = v_sender_id or owner_id = v_sender_id);

  if v_conv.id is null then
    raise exception 'Conversation not found or access denied.' using errcode = '42501';
  end if;

  -- Rate limit message sending (max 60 messages per minute)
  v_rate_allowed := public.check_rate_limit('send_direct_message', v_sender_id::text, 60, 60);
  if not v_rate_allowed then
    raise exception 'Rate limit exceeded: You are sending messages too quickly. Please wait a moment.'
      using errcode = 'P0001';
  end if;

  -- Insert message
  insert into public.direct_messages (
    conversation_id,
    sender_id,
    message_text,
    created_at
  ) values (
    p_conversation_id,
    v_sender_id,
    v_clean_text,
    now()
  )
  returning id into v_message_id;

  -- Update conversation last_message_at
  update public.direct_conversations
  set
    last_message_at = now(),
    updated_at = now()
  where id = p_conversation_id;

  return jsonb_build_object(
    'message_id', v_message_id,
    'conversation_id', p_conversation_id,
    'sender_id', v_sender_id,
    'created_at', now()
  );
end;
$$;

revoke all on function public.send_direct_message(uuid, text) from public;
grant execute on function public.send_direct_message(uuid, text) to authenticated;

-- 7. RPC to mark messages as read
create or replace function public.mark_direct_messages_read(
  p_conversation_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_rows integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if not public.is_direct_conversation_participant(p_conversation_id) then
    raise exception 'Access denied.' using errcode = '42501';
  end if;

  update public.direct_messages
  set read_at = now()
  where conversation_id = p_conversation_id
    and sender_id <> v_user_id
    and read_at is null;

  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

revoke all on function public.mark_direct_messages_read(uuid) from public;
grant execute on function public.mark_direct_messages_read(uuid) to authenticated;

-- 8. Row Level Security Policies
alter table public.direct_conversations enable row level security;
alter table public.direct_messages enable row level security;

grant select on public.direct_conversations to authenticated;
grant select on public.direct_messages to authenticated;

drop policy if exists direct_conversations_participant_select on public.direct_conversations;
create policy direct_conversations_participant_select
on public.direct_conversations for select to authenticated
using (
  customer_id = auth.uid() or owner_id = auth.uid()
);

drop policy if exists direct_messages_participant_select on public.direct_messages;
create policy direct_messages_participant_select
on public.direct_messages for select to authenticated
using (
  public.is_direct_conversation_participant(conversation_id)
);

-- Note: Mutations to conversations & messages are channeled through the security definer RPCs
-- (get_or_create_direct_conversation, send_direct_message, mark_direct_messages_read)
-- which strictly validate auth.uid(), owner resolution, and rate limits.
-- We also allow direct insert on direct_messages if the client uses insert query directly:
drop policy if exists direct_messages_participant_insert on public.direct_messages;
create policy direct_messages_participant_insert
on public.direct_messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and public.is_direct_conversation_participant(conversation_id)
);

-- 9. Automated Trigger: Notify recipient on new direct message
create or replace function public.notify_on_direct_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv public.direct_conversations%rowtype;
  v_recipient_id uuid;
  v_sender_name text;
  v_entity_title text;
  v_preview text;
begin
  select * into v_conv
  from public.direct_conversations
  where id = new.conversation_id;

  if v_conv.id is null then
    return new;
  end if;

  -- Determine recipient
  if new.sender_id = v_conv.customer_id then
    v_recipient_id := v_conv.owner_id;
  else
    v_recipient_id := v_conv.customer_id;
  end if;

  if v_recipient_id is null or v_recipient_id = new.sender_id then
    return new;
  end if;

  -- Fetch sender name
  select coalesce(nullif(trim(full_name), ''), 'Someone') into v_sender_name
  from public.profiles
  where id = new.sender_id;

  -- Fetch listing title
  if v_conv.entity_type = 'business' then
    select name into v_entity_title from public.businesses where id = v_conv.entity_id;
  elsif v_conv.entity_type = 'property' then
    select title into v_entity_title from public.properties where id = v_conv.entity_id;
  end if;

  v_preview := left(new.message_text, 70);
  if length(new.message_text) > 70 then
    v_preview := v_preview || '…';
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    message,
    link,
    data
  ) values (
    v_recipient_id,
    'direct_message',
    'New message from ' || coalesce(v_sender_name, 'a user'),
    'Regarding "' || coalesce(v_entity_title, 'Listing') || '": "' || v_preview || '"',
    '/messages?conversation=' || new.conversation_id::text,
    jsonb_build_object(
      'conversation_id', new.conversation_id,
      'message_id', new.id,
      'sender_id', new.sender_id,
      'entity_type', v_conv.entity_type,
      'entity_id', v_conv.entity_id
    )
  );

  return new;
end;
$$;

drop trigger if exists direct_message_notify_trigger on public.direct_messages;
create trigger direct_message_notify_trigger
after insert on public.direct_messages
for each row execute function public.notify_on_direct_message();

-- 10. Realtime publication integration
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'direct_messages'
  ) then
    alter publication supabase_realtime add table public.direct_messages;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'direct_conversations'
  ) then
    alter publication supabase_realtime add table public.direct_conversations;
  end if;
end;
$$;
