-- Add fields to track birthdays and anniversaries
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS anniversary_date DATE;

-- Add timestamps to prevent duplicate automated emails for cron jobs
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_cart_reminder_sent TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_winback_sent TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_birthday_sent TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_anniversary_sent TIMESTAMP WITH TIME ZONE;
