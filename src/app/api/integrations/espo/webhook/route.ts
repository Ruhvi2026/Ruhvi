import { NextResponse, NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getEspoConfig } from '@/lib/espo/config';
import { verifySignature } from '@/lib/espo/crypto';
import { espoStatusToRuhvi, espoPriorityToRuhvi } from '@/lib/espo/mapping';

/**
 * POST /api/integrations/espo/webhook
 *
 * Inbound webhook from EspoCRM. EspoCRM is configured (Admin → Webhooks, or the
 * custom PHP hook in deploy/esporcrm/) to POST Case and Note events here.
 *
 * Auth: `X-Hook-Key` header matching ESPO_WEBHOOK_SECRET, or
 *       `X-Ruhvi-Signature` HMAC-SHA256 of the raw body.
 *
 * Payloads:
 *   - Case event  → sync status / priority / assignment back to support_tickets.
 *   - Note event  → append an internal note to support_messages.
 *
 * Supabase remains the source of truth; this only applies changes the agent
 * made inside EspoCRM.
 */

async function getSupabaseAdmin(cookieStore: any) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
      'https://igrkrkxdantrolbldapj.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );
}

export async function POST(req: NextRequest) {
  const cfg = getEspoConfig();
  if (!cfg.enabled) {
    return NextResponse.json(
      { error: 'EspoCRM integration is disabled' },
      { status: 404 }
    );
  }

  const rawBody = await req.text();

  // ── Auth ────────────────────────────────────────────────────────────────
  const hookKey = req.headers.get('X-Hook-Key') || '';
  const signature = req.headers.get('X-Ruhvi-Signature') || '';

  const hookKeyOk =
    hookKey && cfg.webhookSecret && hookKey === cfg.webhookSecret;
  const hmacOk =
    signature && cfg.webhookSecret
      ? await verifySignature(rawBody, cfg.webhookSecret, signature)
      : false;

  if (!hookKeyOk && !hmacOk) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // EspoCRM sends an `entityType` for webhook events. If absent, infer from the
  // payload shape (Case has no `post`; Note has `post` + `parentType`).
  const entityType: string =
    body.entityType || body.entity_type || (body.post ? 'Note' : 'Case');

  try {
    const cookieStore = await cookies();
    const supabase = await getSupabaseAdmin(cookieStore);

    if (entityType === 'Note') {
      // Only care about notes attached to Cases.
      if (body.parentType !== 'Case' && body.parent_type !== 'Case') {
        return NextResponse.json({
          received: true,
          ignored: 'not a case note',
        });
      }
      const caseId = body.parentId || body.parent_id;
      if (!caseId) {
        return NextResponse.json({
          received: true,
          ignored: 'missing parentId',
        });
      }

      const { data: ticket, error: findErr } = await supabase
        .from('support_tickets')
        .select('id')
        .eq('espo_case_id', caseId)
        .maybeSingle();
      if (findErr || !ticket) {
        return NextResponse.json({
          received: true,
          ignored: 'no linked ticket',
        });
      }

      const post = body.post || body.message || '';
      if (!post) {
        return NextResponse.json({ received: true, ignored: 'empty post' });
      }

      // Record the note as an internal (staff-only) message.
      const { error: insertErr } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: ticket.id,
          sender_type: 'staff',
          sender_id: null,
          message: `[EspoCRM] ${body.createdByName || 'Agent'}:\n${post}`,
          visibility: 'internal',
        });

      if (insertErr) {
        console.error('EspoCRM webhook note insert error:', insertErr);
        return NextResponse.json(
          { error: 'Failed to persist note' },
          { status: 500 }
        );
      }

      return NextResponse.json({ received: true, applied: 'note' });
    }

    // ── Case event ────────────────────────────────────────────────────────
    const caseId = body.id;
    if (!caseId) {
      return NextResponse.json({ received: true, ignored: 'missing case id' });
    }

    const { data: ticket, error: findErr } = await supabase
      .from('support_tickets')
      .select(
        'id, ticket_number, status, priority, assigned_to, espo_case_id, customer_id'
      )
      .eq('espo_case_id', caseId)
      .maybeSingle();

    if (findErr || !ticket) {
      // A case may arrive before the outbound sync stored the mapping; ignore.
      return NextResponse.json({ received: true, ignored: 'no linked ticket' });
    }

    const updates: Record<string, unknown> = {};

    // Prefer the canonical Ruhvi status stored in the custom field; fall back to
    // mapping the EspoCRM display status.
    const canonicalStatus = body.ruhviStatus_c || body.ruhvi_status;
    if (canonicalStatus) {
      updates.status = canonicalStatus;
    } else if (body.status) {
      updates.status = espoStatusToRuhvi(body.status);
    }

    if (body.priority) {
      updates.priority = espoPriorityToRuhvi(body.priority);
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateErr } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', ticket.id);
      if (updateErr) {
        console.error('EspoCRM webhook ticket update error:', updateErr);
        return NextResponse.json(
          { error: 'Failed to update ticket' },
          { status: 500 }
        );
      }

      await supabase.from('support_audit_logs').insert({
        ticket_id: ticket.id,
        actor_id: null,
        actor_type: 'system',
        action: 'espo_webhook_sync',
        new_value: { ...updates, espo_case_id: caseId },
      });
    }

    return NextResponse.json({ received: true, applied: 'case' });
  } catch (err: any) {
    console.error('EspoCRM webhook error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
