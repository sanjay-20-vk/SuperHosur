update auth.users
set encrypted_password = extensions.crypt('TestPassword123!', extensions.gen_salt('bf')),
    email_confirmed_at = coalesce(email_confirmed_at, now())
where id = 'b265c550-c3f8-4761-991e-52bc6c2fd63a';
