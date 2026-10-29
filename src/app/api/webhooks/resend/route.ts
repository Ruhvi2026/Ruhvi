import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/service';
import { SuppressionService } from '@/lib/email-orchestrator/suppression-service';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    const eventType = event.type; // e.g. 'email.delivered', 'email.bounced', 'email.complained'
    const eventData = event.data;
    const providerEventId =
      event.id ||
      `resend_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const emailId = eventData?.email_id;
    const recipientEmail = Array.isArray(eventData?.to)
      ? eventData.to[0]
      : eventData?.to;

    const supabase = await getSupabaseAdmin();

    // 1. Record Webhook Event (Idempotent)
    const { error: insertError } = await supabase
      .from('email_webhook_events')
      .insert({
        provider: 'resend',
        provider_event_id: providerEventId,
        event_type: eventType,
        recipient_email: recipientEmail,
        payload: event,
        processed: true,
        processed_at: new Date().toISOString(),
      });

    if (insertError && insertError.code === '23505') {
      // Event already recorded and processed
      return NextResponse.json({
        success: true,
        message: 'Event already processed',
      });
    }

    // 2. Map Event Type to Delivery Status
    let newStatus: string | null = null;
    if (eventType === 'email.delivered') newStatus = 'delivered';
    else if (eventType === 'email.delivery_delayed')
      newStatus = 'delivery_delayed';
    else if (eventType === 'email.bounced') newStatus = 'bounced';
    else if (eventType === 'email.complained') newStatus = 'complained';

    if (newStatus && emailId) {
      await supabase
        .from('email_deliveries')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('provider_message_id', emailId);
    }

    // 3. Global Suppression on Bounce or Complaint
    if (
      recipientEmail &&
      (eventType === 'email.bounced' || eventType === 'email.complained')
    ) {
      const reason =
        eventType === 'email.bounced' ? 'hard_bounce' : 'spam_complaint';
      await SuppressionService.addSuppression(recipientEmail, reason, 'resend');
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Resend Webhook Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
