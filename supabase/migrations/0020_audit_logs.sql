-- Create the audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    actor_id UUID, -- Can be null if system action
    actor_email TEXT,
    action TEXT NOT NULL, -- e.g., 'create', 'update', 'delete'
    entity_type TEXT NOT NULL, -- e.g., 'product', 'order', 'user'
    entity_id TEXT,
    changes JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow admins to read audit logs
CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs
    FOR SELECT
    USING (public.is_admin_or_staff());

-- Allow anyone (or specific roles) to insert audit logs (often handled securely via service_role, but good to have a policy if frontend inserts)
CREATE POLICY "Service role and authenticated users can insert audit logs"
    ON public.audit_logs
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Create a generic trigger function to log changes automatically
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    action_type TEXT;
    entity_id_val TEXT;
    changes_json JSONB;
BEGIN
    action_type := TG_OP;
    
    IF TG_OP = 'DELETE' THEN
        entity_id_val := OLD.id::TEXT;
        changes_json := to_jsonb(OLD);
    ELSIF TG_OP = 'UPDATE' THEN
        entity_id_val := NEW.id::TEXT;
        -- Record what changed
        changes_json := to_jsonb(NEW) - to_jsonb(OLD);
    ELSE
        entity_id_val := NEW.id::TEXT;
        changes_json := to_jsonb(NEW);
    END IF;

    -- Insert log
    INSERT INTO public.audit_logs (actor_id, actor_email, action, entity_type, entity_id, changes)
    VALUES (
        auth.uid(),
        (SELECT email FROM auth.users WHERE id = auth.uid()),
        LOWER(action_type),
        TG_TABLE_NAME,
        entity_id_val,
        changes_json
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add triggers to important tables (if they exist)
DROP TRIGGER IF EXISTS audit_orders_trigger ON public.orders;
CREATE TRIGGER audit_orders_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_products_trigger ON public.products;
CREATE TRIGGER audit_products_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_users_trigger ON public.users;
CREATE TRIGGER audit_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
