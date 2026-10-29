import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/service';
import { SuppressionService } from '@/lib/email-orchestrator/suppression-service';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Mailjet can deliver a single event object or an array of events
    const events: any[] = Array.isArray(body) ? body : [body];
    const supabase = await getSupabaseAdmin();

    for (const event of events) {
      const eventType = event.event; // 'sent', 'open', 'click', 'bounce', 'spam', 'blocked', 'unsub'
      const customId = event.CustomID; // Delivery UUID
      const messageId = event.MessageID ? String(event.MessageID) : null;
      const recipientEmail = event.email;
      const providerEventId = `${event.MessageID || 'mj'}_${eventType}_${event.time || Date.now()}`;

      // 1. Record in Webhook Events table (Idempotent)
      const { error: insertError } = await supabase
        .from('email_webhook_events')
        .insert({
          provider: 'mailjet',
          provider_event_id: providerEventId,
          event_type: eventType,
          delivery_id:
            customId && /^[0-9a-fA-F-]{36}$/.test(customId) ? customId : null,
          custom_id: customId,
          recipient_email: recipientEmail,
          payload: event,
          processed: true,
          processed_at: new Date().toISOString(),
        });

      if (insertError && insertError.code === '23505') {
        continue;
      }

      // 2. Map Event Type to Delivery Status
      let newStatus: string | null = null;
      if (eventType === 'sent') newStatus = 'accepted';
      else if (eventType === 'delivered') newStatus = 'delivered';
      else if (eventType === 'bounce') newStatus = 'bounced';
      else if (eventType === 'spam') newStatus = 'complained';
      else if (eventType === 'blocked') newStatus = 'failed';

      if (newStatus) {
        if (customId && /^[0-9a-fA-F-]{36}$/.test(customId)) {
          await supabase
            .from('email_deliveries')
            .update({
              status: newStatus,
              updated_at: new Date().toISOString(),
            })
            .eq('id', customId);
        } else if (messageId) {
          await supabase
            .from('email_deliveries')
            .update({
              status: newStatus,
              updated_at: new Date().toISOString(),
            })
            .eq('provider_message_id', messageId);
        }
      }

      // 3. Global Suppression on Bounce, Spam or Unsubscribe
      if (recipientEmail) {
        if (eventType === 'bounce') {
          await SuppressionService.addSuppression(
            recipientEmail,
            'hard_bounce',
            'mailjet'
          );
        } else if (eventType === 'spam') {
          await SuppressionService.addSuppression(
            recipientEmail,
            'spam_complaint',
            'mailjet'
          );
        } else if (eventType === 'unsub') {
          await SuppressionService.addSuppression(
            recipientEmail,
            'unsubscribe',
            'mailjet'
          );
        }
      }
    }

    return NextResponse.json({ success: true, processedCount: events.length });
  } catch (err: any) {
    console.error('[Mailjet Webhook Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
