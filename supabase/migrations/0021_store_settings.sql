-- Create the store_settings table
CREATE TABLE IF NOT EXISTS public.store_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    banner_enabled BOOLEAN DEFAULT true,
    banner_text TEXT DEFAULT 'Complimentary Insured Shipping on all orders above ₹5000',
    banner_color TEXT DEFAULT 'bg-gradient-to-r from-fuchsia-600 to-purple-600',
    banner_link TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read settings
CREATE POLICY "Anyone can view store settings"
    ON public.store_settings
    FOR SELECT
    USING (true);

-- Allow only admins to update settings
CREATE POLICY "Admins can update store settings"
    ON public.store_settings
    FOR UPDATE
    USING (public.is_admin_or_staff());
    
CREATE POLICY "Admins can insert store settings"
    ON public.store_settings
    FOR INSERT
    WITH CHECK (public.is_admin_or_staff());

-- Insert the default global settings row
INSERT INTO public.store_settings (id, banner_enabled, banner_text, banner_color)
VALUES ('global', true, 'Complimentary Insured Shipping on all orders above ₹5000', 'bg-gradient-to-r from-fuchsia-600 to-purple-600')
ON CONFLICT (id) DO NOTHING;
