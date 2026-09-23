-- Grant table modification permissions on categories and subcategories to authenticated role
-- Existing RLS policies (categories_admin_all, subcategories_admin_all) ensure only admins (public.is_admin()) can perform modifications.

grant insert, update, delete on public.categories to authenticated;
grant insert, update, delete on public.subcategories to authenticated;
