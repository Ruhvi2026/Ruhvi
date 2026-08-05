-- Migration to set firebase_uid for admin user
-- Ensures admin can login via Firebase UID
INSERT INTO public.users (firebase_uid, email, full_name, role, created_at, updated_at)
SELECT 'mrICS1cDsbSkV7W7JAKL4AHpgJ13', 'ruhvi.main@gmail.com', 'Admin', 'admin'::user_role, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'ruhvi.main@gmail.com');

-- Update existing admin row if present
UPDATE public.users
SET firebase_uid = 'mrICS1cDsbSkV7W7JAKL4AHpgJ13'
WHERE email = 'ruhvi.main@gmail.com' AND firebase_uid IS NULL;
