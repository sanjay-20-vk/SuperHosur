update auth.users
set encrypted_password = extensions.crypt('TestPassword123!', extensions.gen_salt('bf')),
    email_confirmed_at = coalesce(email_confirmed_at, now())
where id = 'de332698-ac9e-4dd4-a032-1490605bb552';
