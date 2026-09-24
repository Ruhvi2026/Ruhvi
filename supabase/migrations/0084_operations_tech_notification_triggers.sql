-- Migration 0084: Operations & Tech Notification Triggers
-- Automates cross-department notification generation based on real-time events.

-- 1. Notify Operations on Quality Control Issues
CREATE OR REPLACE FUNCTION notify_operations_on_quality_issue()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.issue_type != 'other' OR NEW.notes IS NOT NULL THEN
    INSERT INTO public.notifications (
      target_department,
      title,
      message,
      category,
      reference_type,
      reference_id
    ) VALUES (
      'operations',
      'Quality Control Alert',
      'QC Issue detected: ' || NEW.issue_type || '. Batch/Ref: ' || COALESCE(NEW.batch_reference, 'N/A'),
      'QUALITY',
      'quality_control_log',
      NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_quality_issue_notification ON public.quality_control_logs;
CREATE TRIGGER trg_quality_issue_notification
  AFTER INSERT ON public.quality_control_logs
  FOR EACH ROW
  EXECUTE FUNCTION notify_operations_on_quality_issue();

-- 2. Notify Tech on System Failures / AI Diagnostics
CREATE OR REPLACE FUNCTION notify_tech_on_system_failure()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (
    target_department,
    title,
    message,
    category,
    reference_type,
    reference_id
  ) VALUES (
    'tech',
    'System Diagnostic Alert',
    'Error (' || NEW.error_type || ') in ' || NEW.feature || ': ' || substring(NEW.error_message from 1 for 100),
    'SYSTEM',
    'ai_failure_diagnostics',
    NEW.id::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_system_failure_notification ON public.ai_failure_diagnostics;
CREATE TRIGGER trg_system_failure_notification
  AFTER INSERT ON public.ai_failure_diagnostics
  FOR EACH ROW
  EXECUTE FUNCTION notify_tech_on_system_failure();

-- 3. Notify Operations on Logistics Issues (RTO / Delivery Failed)
CREATE OR REPLACE FUNCTION notify_operations_on_logistics_issue()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('delivery_failed', 'rto_initiated') AND (OLD.status IS NULL OR OLD.status != NEW.status) THEN
    INSERT INTO public.notifications (
      target_department,
      title,
      message,
      category,
      reference_type,
      reference_id
    ) VALUES (
      'operations',
      'Logistics Alert: ' || NEW.status,
      'Shipment ' || COALESCE(NEW.awb_number, NEW.id::text) || ' marked as ' || NEW.status,
      'LOGISTICS',
      'shipment',
      NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_logistics_issue_notification ON public.shipments;
CREATE TRIGGER trg_logistics_issue_notification
  AFTER UPDATE OF status ON public.shipments
  FOR EACH ROW
  EXECUTE FUNCTION notify_operations_on_logistics_issue();
