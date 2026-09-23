-- Owners must be able to read their own photo rows (including pending/rejected).
-- Public read remains limited to approved photos on public businesses.

create policy business_photos_owner_select
on public.business_photos for select to authenticated
using (public.owns_business(business_id));

-- Owners can upload and edit metadata, but cannot self-approve photos
-- or reassign a photo to another business/storage object.
create or replace function public.protect_business_photo_moderation()
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
    new.business_id = old.business_id;
    new.storage_path = old.storage_path;
    new.moderation_status = old.moderation_status;
  end if;

  return new;
end;
$$;

drop trigger if exists business_photos_protect_moderation on public.business_photos;

create trigger business_photos_protect_moderation
before insert or update on public.business_photos
for each row execute function public.protect_business_photo_moderation();

insert into storage.buckets (id, name, public)
values ('business-photos', 'business-photos', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists business_photos_storage_owner_select on storage.objects;
drop policy if exists business_photos_storage_public_select on storage.objects;
drop policy if exists business_photos_storage_owner_insert on storage.objects;
drop policy if exists business_photos_storage_owner_update on storage.objects;
drop policy if exists business_photos_storage_owner_delete on storage.objects;
drop policy if exists business_photos_storage_admin_all on storage.objects;

create policy business_photos_storage_owner_select
on storage.objects for select to authenticated
using (
  bucket_id = 'business-photos'
  and split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.owns_business(split_part(name, '/', 1)::uuid)
);

create policy business_photos_storage_public_select
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'business-photos'
  and exists (
    select 1
    from public.business_photos
    where storage_path = name
      and moderation_status = 'approved'
      and public.is_public_business(business_id)
  )
);

create policy business_photos_storage_owner_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'business-photos'
  and split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.owns_business(split_part(name, '/', 1)::uuid)
);

create policy business_photos_storage_owner_update
on storage.objects for update to authenticated
using (
  bucket_id = 'business-photos'
  and split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.owns_business(split_part(name, '/', 1)::uuid)
)
with check (
  bucket_id = 'business-photos'
  and split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.owns_business(split_part(name, '/', 1)::uuid)
);

create policy business_photos_storage_owner_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'business-photos'
  and split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.owns_business(split_part(name, '/', 1)::uuid)
);

create policy business_photos_storage_admin_all
on storage.objects for all to authenticated
using (bucket_id = 'business-photos' and public.is_admin())
with check (bucket_id = 'business-photos' and public.is_admin());
