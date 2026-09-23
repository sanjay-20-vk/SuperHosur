create or replace function public.inspect_all_businesses()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_agg(jsonb_build_object(
    'id', b.id,
    'owner_id', b.owner_id,
    'category_id', b.category_id,
    'name', b.name,
    'slug', b.slug,
    'active', b.active,
    'verified', b.verified
  ))
  from public.businesses b;
$$;

grant execute on function public.inspect_all_businesses() to anon, authenticated;
