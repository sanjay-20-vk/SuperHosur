-- In-App Quote Discussion & Clarification Thread Migration
-- Enables secure, real-time communication between requirement owners and quoting vendors.

-- 1. Ensure composite unique constraint on requirement_quotes (id, requirement_id)
-- so foreign keys can guarantee messages only bind to valid requirement+quote pairings.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'requirement_quotes_id_requirement_id_key'
  ) then
    alter table public.requirement_quotes
    add constraint requirement_quotes_id_requirement_id_key unique (id, requirement_id);
  end if;
end;
$$;

-- 2. Update notifications type constraint to include 'quote_message'
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
check (type in ('new_quote', 'quote_accepted', 'quote_rejected', 'quote_withdrawn', 'requirement_status', 'new_lead', 'system', 'quote_message'));

-- 3. Create public.requirement_messages table
create table if not exists public.requirement_messages (
  id uuid primary key default extensions.gen_random_uuid(),
  requirement_id uuid not null references public.requirements(id) on delete cascade,
  quote_id uuid not null,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  message_text text not null check (char_length(trim(message_text)) > 0 and char_length(message_text) <= 2000),
  created_at timestamptz not null default now(),
  constraint fk_requirement_messages_quote_req foreign key (quote_id, requirement_id)
    references public.requirement_quotes(id, requirement_id) on delete cascade
);

comment on table public.requirement_messages is 'Clarification and discussion messages between buyer and quoting vendor';
comment on column public.requirement_messages.requirement_id is 'The parent requirement ID';
comment on column public.requirement_messages.quote_id is 'The associated quotation ID';
comment on column public.requirement_messages.sender_id is 'The user profile ID who authored the message';
comment on column public.requirement_messages.message_text is 'Message body (up to 2000 characters)';

-- 4. Create indexes for efficient retrieval and ordering
create index if not exists requirement_messages_requirement_id_idx
  on public.requirement_messages(requirement_id);

create index if not exists requirement_messages_quote_id_idx
  on public.requirement_messages(quote_id);

create index if not exists requirement_messages_created_at_idx
  on public.requirement_messages(created_at asc);

create index if not exists requirement_messages_quote_created_idx
  on public.requirement_messages(quote_id, created_at asc);

-- 5. Helper Functions for Security & Permissions

-- Helper to check if the current user is a valid participant (buyer, vendor, or admin)
create or replace function public.is_quote_participant(target_requirement_id uuid, target_quote_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.requirement_quotes q
    join public.requirements r on r.id = q.requirement_id
    where q.id = target_quote_id
      and q.requirement_id = target_requirement_id
      and (
        r.customer_id = auth.uid()
        or q.vendor_id = auth.uid()
        or public.owns_business(q.business_id)
        or public.is_admin()
      )
  );
$$;

-- Helper to verify if the thread is currently accepting messages
-- Quotes in 'submitted' or 'accepted' state are active for discussion.
-- Withdrawn or rejected quotes, or closed/completed/cancelled/expired requirements, are read-only.
create or replace function public.can_send_requirement_message(target_requirement_id uuid, target_quote_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.requirement_quotes q
    join public.requirements r on r.id = q.requirement_id
    where q.id = target_quote_id
      and q.requirement_id = target_requirement_id
      and q.status in ('submitted', 'accepted')
      and r.status not in ('closed', 'completed', 'cancelled', 'expired')
  );
$$;

revoke all on function public.is_quote_participant(uuid, uuid) from public;
grant execute on function public.is_quote_participant(uuid, uuid) to authenticated;

revoke all on function public.can_send_requirement_message(uuid, uuid) from public;
grant execute on function public.can_send_requirement_message(uuid, uuid) to authenticated;

-- 6. Row Level Security
alter table public.requirement_messages enable row level security;

-- Grant select, insert to authenticated users (no update/delete permissions granted to preserve audit trail)
grant select, insert on public.requirement_messages to authenticated;

drop policy if exists requirement_messages_participant_select on public.requirement_messages;
create policy requirement_messages_participant_select
on public.requirement_messages for select to authenticated
using (
  public.is_quote_participant(requirement_id, quote_id)
);

drop policy if exists requirement_messages_participant_insert on public.requirement_messages;
create policy requirement_messages_participant_insert
on public.requirement_messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and public.is_quote_participant(requirement_id, quote_id)
  and public.can_send_requirement_message(requirement_id, quote_id)
);

-- 7. Trigger: Notify other participant when a message is sent
create or replace function public.notify_on_requirement_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_req_title text;
  v_vendor_id uuid;
  v_biz_name text;
  v_recipient_id uuid;
  v_notif_title text;
  v_notif_link text;
  v_preview text;
begin
  -- Fetch requirement customer and title
  select customer_id, title into v_customer_id, v_req_title
  from public.requirements
  where id = new.requirement_id;

  -- Fetch quote vendor and business name
  select q.vendor_id, b.name
  into v_vendor_id, v_biz_name
  from public.requirement_quotes q
  left join public.businesses b on b.id = q.business_id
  where q.id = new.quote_id;

  -- Format message preview
  v_preview := left(new.message_text, 80);
  if length(new.message_text) > 80 then
    v_preview := v_preview || '…';
  end if;

  -- Route notification to the other party
  if new.sender_id = v_customer_id then
    v_recipient_id := v_vendor_id;
    v_notif_title := 'New message from Customer';
    v_notif_link := '/owner/dashboard?tab=leads';
  else
    v_recipient_id := v_customer_id;
    v_notif_title := 'New message from ' || coalesce(v_biz_name, 'Vendor');
    v_notif_link := '/my-requirements';
  end if;

  -- Insert notification for the recipient (never the sender)
  if v_recipient_id is not null and v_recipient_id <> new.sender_id then
    insert into public.notifications (
      user_id,
      type,
      title,
      message,
      link,
      data
    ) values (
      v_recipient_id,
      'quote_message',
      v_notif_title,
      'Regarding "' || coalesce(v_req_title, 'Requirement') || '": "' || v_preview || '"',
      v_notif_link,
      jsonb_build_object(
        'requirement_id', new.requirement_id,
        'quote_id', new.quote_id,
        'message_id', new.id,
        'sender_id', new.sender_id
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists requirement_message_notify_trigger on public.requirement_messages;
create trigger requirement_message_notify_trigger
after insert on public.requirement_messages
for each row execute function public.notify_on_requirement_message();

-- 8. Add requirement_messages to Supabase Realtime publication
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'requirement_messages'
  ) then
    alter publication supabase_realtime add table public.requirement_messages;
  end if;
end;
$$;
