-- Ruhvi Admin Account Creation SQL Script
-- Target Email: ruhvi.main@gmail.com
-- Target Role: admin

DO $$
DECLARE
  target_user_id uuid := gen_random_uuid();
  target_email text := 'ruhvi.main@gmail.com';
  target_name text := 'Admin';
BEGIN
  -- 1. Check if user already exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = target_email) THEN
    -- Create user in auth.users table
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud
    ) VALUES (
      target_user_id,
      '00000000-0000-0000-0000-000000000000',
      target_email,
      crypt('S23081996s@', gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      jsonb_build_object('full_name', target_name),
      now(),
      now(),
      'authenticated',
      'authenticated'
    );
  ELSE
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;
  END IF;

  -- 2. Insert or update public.users record with role = 'admin'
  INSERT INTO public.users (id, full_name, email, role, created_at, updated_at)
  VALUES (target_user_id, target_name, target_email, 'admin'::user_role, now(), now())
  ON CONFLICT (id) DO UPDATE
  SET role = 'admin'::user_role, full_name = target_name;

  RAISE NOTICE 'Admin account for % (ID: %) successfully configured!', target_email, target_user_id;
END $$;
