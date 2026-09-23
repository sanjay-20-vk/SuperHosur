-- Owners must be able to read their own video rows (including pending/rejected).
-- Public read remains limited to approved videos on public businesses.

create policy business_videos_owner_select
on public.business_videos for select to authenticated
using (public.owns_business(business_id));

-- Owners can upload and edit metadata, but cannot self-approve videos
-- or reassign a video to another business/storage object.
create or replace function public.protect_business_video_moderation()
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

drop trigger if exists business_videos_protect_moderation on public.business_videos;

create trigger business_videos_protect_moderation
before insert or update on public.business_videos
for each row execute function public.protect_business_video_moderation();

insert into storage.buckets (id, name, public)
values ('business-videos', 'business-videos', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists business_videos_storage_owner_select on storage.objects;
drop policy if exists business_videos_storage_public_select on storage.objects;
drop policy if exists business_videos_storage_owner_insert on storage.objects;
drop policy if exists business_videos_storage_owner_update on storage.objects;
drop policy if exists business_videos_storage_owner_delete on storage.objects;
drop policy if exists business_videos_storage_admin_all on storage.objects;

create policy business_videos_storage_owner_select
on storage.objects for select to authenticated
using (
  bucket_id = 'business-videos'
  and split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.owns_business(split_part(name, '/', 1)::uuid)
);

create policy business_videos_storage_public_select
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'business-videos'
  and exists (
    select 1
    from public.business_videos
    where storage_path = name
      and moderation_status = 'approved'
      and public.is_public_business(business_id)
  )
);

create policy business_videos_storage_owner_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'business-videos'
  and split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.owns_business(split_part(name, '/', 1)::uuid)
);

create policy business_videos_storage_owner_update
on storage.objects for update to authenticated
using (
  bucket_id = 'business-videos'
  and split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.owns_business(split_part(name, '/', 1)::uuid)
)
with check (
  bucket_id = 'business-videos'
  and split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.owns_business(split_part(name, '/', 1)::uuid)
);

create policy business_videos_storage_owner_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'business-videos'
  and split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.owns_business(split_part(name, '/', 1)::uuid)
);

create policy business_videos_storage_admin_all
on storage.objects for all to authenticated
using (bucket_id = 'business-videos' and public.is_admin())
with check (bucket_id = 'business-videos' and public.is_admin());
