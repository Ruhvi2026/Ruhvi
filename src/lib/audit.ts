import { createClient } from '@/lib/supabase/server';

export interface AuditEventParams {
  actorId?: string;
  actorEmail?: string;
  portal?:
    'admin' | 'operations' | 'orders' | 'support' | 'marketing' | 'storefront';
  action: string;
  entityType: string;
  entityId?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Universal Server-Side Audit Logger
 * Writes high-integrity immutable security and operational audit records.
 */
export async function logAuditEvent(params: AuditEventParams) {
  const {
    actorId,
    actorEmail,
    portal = 'admin',
    action,
    entityType,
    entityId,
    changes,
    ipAddress,
    userAgent,
  } = params;

  console.log(
    `[AUDIT] [${portal.toUpperCase()}] ${action} on ${entityType}${entityId ? ` (${entityId})` : ''} by ${actorEmail || actorId || 'System'}`
  );

  try {
    const supabase = await createClient();

    // Attempt insertion into audit_logs table
    await supabase.from('audit_logs').insert({
      actor_id: actorId || null,
      actor_email: actorEmail || null,
      action: action.toLowerCase(),
      entity_type: entityType.toLowerCase(),
      entity_id: entityId || null,
      changes: {
        ...changes,
        portal,
        userAgent: userAgent || null,
      },
      ip_address: ipAddress || null,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    // Non-blocking catch to ensure operational continuity
    console.error('Audit logging failed silently:', err);
  }
}
