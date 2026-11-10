import { NextRequest, NextResponse } from 'next/server';
import { EmailOrchestrator } from '@/lib/email-orchestrator/service';
import { queryMailflareD1 } from '@/lib/mailbox/d1-client';
import type { ComposeEmailPayload } from '@/types/mailbox';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const payload: ComposeEmailPayload = await req.json();

    if (
      !payload.to?.trim() ||
      !payload.subject?.trim() ||
      !payload.body?.trim()
    ) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, body' },
        { status: 400 }
      );
    }

    const fromAddress = payload.from?.trim() || 'shreya.maity@ruhvi.in';
    const recipient = payload.to.trim();
    const formattedHtml = `
      <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b;">
        ${payload.body.replace(/\n/g, '<br/>')}
      </div>
    `;

    // 1. Dispatch via EmailOrchestrator
    const result = await EmailOrchestrator.send({
      category: 'internal_staff',
      eventKey: `mailbox_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      eventType: 'staff_mailbox_compose',
      recipientEmail: recipient,
      subject: payload.subject,
      html: formattedHtml,
      customCampaign: 'ruhchat_mailbox_client',
    });

    if (!result.success && result.error !== 'SUPPRESSED_BY_SAFE_MODE') {
      return NextResponse.json(
        { error: result.error || 'Failed to dispatch email' },
        { status: 500 }
      );
    }

    // 2. Persist in D1 outbound messages so it reflects in the Sent folder
    try {
      const msgId = `msg_out_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const nowSec = Math.floor(Date.now() / 1000);
      const snippet = payload.body.replace(/\s+/g, ' ').slice(0, 120);

      await queryMailflareD1(
        `INSERT INTO messages (id, direction, from_addr, to_addr, cc_addr, subject, snippet, text_body, html_body, created_at, read, starred, status)
         VALUES (?, 'outbound', ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 'sent');`,
        [
          msgId,
          fromAddress,
          recipient,
          payload.cc || null,
          payload.subject,
          snippet,
          payload.body,
          formattedHtml,
          nowSec,
        ]
      );
    } catch (d1Err) {
      console.warn(
        '[API /api/mailbox/send] Could not save to D1 sent box:',
        d1Err
      );
      // Non-blocking for email delivery
    }

    return NextResponse.json({
      success: true,
      deliveryId: result.deliveryId,
      provider: result.provider,
    });
  } catch (error) {
    console.error('[API /api/mailbox/send] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
