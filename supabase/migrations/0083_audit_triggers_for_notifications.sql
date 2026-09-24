-- Migration 0083: Add audit triggers to additional tables for Admin System Notifications

-- categories
DROP TRIGGER IF EXISTS audit_categories_trigger ON public.categories;
CREATE TRIGGER audit_categories_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- collections
DROP TRIGGER IF EXISTS audit_collections_trigger ON public.collections;
CREATE TRIGGER audit_collections_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.collections
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- blog_posts
DROP TRIGGER IF EXISTS audit_blog_posts_trigger ON public.blog_posts;
CREATE TRIGGER audit_blog_posts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.blog_posts
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- coupons
DROP TRIGGER IF EXISTS audit_coupons_trigger ON public.coupons;
CREATE TRIGGER audit_coupons_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.coupons
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- api_keys
DROP TRIGGER IF EXISTS audit_api_keys_trigger ON public.api_keys;
CREATE TRIGGER audit_api_keys_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.api_keys
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- support_tickets
DROP TRIGGER IF EXISTS audit_support_tickets_trigger ON public.support_tickets;
CREATE TRIGGER audit_support_tickets_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.support_tickets
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

