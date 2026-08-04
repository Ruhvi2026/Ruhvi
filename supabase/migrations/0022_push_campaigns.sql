-- Create push_campaigns table
CREATE TABLE IF NOT EXISTS public.push_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    target_url TEXT,
    image_url TEXT,
    audience TEXT NOT NULL DEFAULT 'All Users',
    status TEXT NOT NULL DEFAULT 'Sent',
    sent_by UUID REFERENCES auth.users(id),
    onesignal_id TEXT, -- The ID returned by OneSignal API
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.push_campaigns ENABLE ROW LEVEL SECURITY;

-- Only admins/staff can view campaigns
CREATE POLICY "Admins can view push campaigns"
    ON public.push_campaigns
    FOR SELECT
    TO authenticated
    USING (public.is_admin_or_staff());

-- Only admins/staff can insert campaigns
CREATE POLICY "Admins can insert push campaigns"
    ON public.push_campaigns
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin_or_staff());

-- Setup realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.push_campaigns;
