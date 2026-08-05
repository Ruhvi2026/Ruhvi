-- 0020_admin_firebase_uid_fix.sql
-- Fix admin user's firebase_uid to match the correct UID used in authentication

UPDATE public.users
SET firebase_uid = 'mrICS1cDsbSkV7W7JAKL4AHpgJ13'
WHERE email = 'ruhvi.main@gmail.com';
