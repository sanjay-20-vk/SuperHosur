-- Enable Admin Role for the signed-in test account (Karthik Test)
-- Account: karthik.superhosur2026@gmail.com
-- User ID: b265c550-c3f8-4761-991e-52bc6c2fd63a

alter table public.profiles disable trigger profiles_protect_role;

update public.profiles
set role = 'admin',
    active = true,
    updated_at = now()
where id = 'b265c550-c3f8-4761-991e-52bc6c2fd63a';

alter table public.profiles enable trigger profiles_protect_role;
