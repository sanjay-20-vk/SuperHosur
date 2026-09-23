-- Allow admins to update verified status on public.properties
create or replace function public.protect_property_verification()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.verified is distinct from old.verified
    and auth.role() <> 'service_role'
    and not public.is_admin() then
    new.verified = old.verified;
  end if;
  return new;
end;
$$;

-- Allow property owners to read their own property photo records (including pending/rejected)
drop policy if exists property_photos_owner_select on public.property_photos;
create policy property_photos_owner_select
on public.property_photos for select to authenticated
using (public.owns_property(property_id));

-- Owners can upload and edit metadata, but cannot self-approve photos
-- or reassign a photo to another property/storage object.
create or replace function public.protect_property_photo_moderation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if auth.role() <> 'service_role' and not public.is_admin() then
      new.moderation_status = 'pending';
    end if;
    return new;
  end if;

  if auth.role() <> 'service_role' and not public.is_admin() then
    new.property_id = old.property_id;
    new.storage_path = old.storage_path;
    new.moderation_status = old.moderation_status;
  end if;

  return new;
end;
$$;

drop trigger if exists property_photos_protect_moderation on public.property_photos;

create trigger property_photos_protect_moderation
before insert or update on public.property_photos
for each row execute function public.protect_property_photo_moderation();

-- Provision property-photos bucket
insert into storage.buckets (id, name, public)
values ('property-photos', 'property-photos', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists property_photos_storage_owner_select on storage.objects;
drop policy if exists property_photos_storage_public_select on storage.objects;
drop policy if exists property_photos_storage_owner_insert on storage.objects;
drop policy if exists property_photos_storage_owner_update on storage.objects;
drop policy if exists property_photos_storage_owner_delete on storage.objects;
drop policy if exists property_photos_storage_admin_all on storage.objects;

create policy property_photos_storage_owner_select
on storage.objects for select to authenticated
using (
  bucket_id = 'property-photos'
  and split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.owns_property(split_part(name, '/', 1)::uuid)
);

create policy property_photos_storage_public_select
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'property-photos'
  and exists (
    select 1
    from public.property_photos
    where storage_path = name
      and moderation_status = 'approved'
      and public.is_public_property(property_id)
  )
);

create policy property_photos_storage_owner_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'property-photos'
  and split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.owns_property(split_part(name, '/', 1)::uuid)
);

create policy property_photos_storage_owner_update
on storage.objects for update to authenticated
using (
  bucket_id = 'property-photos'
  and split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.owns_property(split_part(name, '/', 1)::uuid)
)
with check (
  bucket_id = 'property-photos'
  and split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.owns_property(split_part(name, '/', 1)::uuid)
);

create policy property_photos_storage_owner_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'property-photos'
  and split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.owns_property(split_part(name, '/', 1)::uuid)
);

create policy property_photos_storage_admin_all
on storage.objects for all to authenticated
using (bucket_id = 'property-photos' and public.is_admin())
with check (bucket_id = 'property-photos' and public.is_admin());
