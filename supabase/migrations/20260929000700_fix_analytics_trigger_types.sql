-- Correct trigger to use uuid for entity_id
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
  v_crm_source_type text;
begin
  if new.event_type not in ('call_click', 'whatsapp_click') then
    return new;
  end if;

  if new.event_type = 'call_click' then
    v_crm_source_type := 'phone_click';
    v_channel_label := 'Phone Call';
  else
    v_crm_source_type := 'whatsapp_click';
    v_channel_label := 'WhatsApp Message';
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
    v_crm_source_type,
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
