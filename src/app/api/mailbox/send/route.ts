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

    const fromAddress = payload.from?.trim() || 'support@ruhvi.in';
    const fromName =
      payload.fromName?.trim() || fromAddress.split('@')[0] || 'Ruhvi Team';
    const recipient = payload.to.trim();

    // Staff audit identity
    const sentBy = payload.sentBy || {};
    const actorStaffName =
      sentBy.staffName || sentBy.staffEmail || 'Unknown Staff';
    const actorStaffEmail = sentBy.staffEmail || 'unknown@ruhvi.in';
    const actorStaffUid = sentBy.staffUid || null;

    const formattedHtml = `
      <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b;">
        ${payload.body.replace(/\n/g, '<br/>')}
      </div>
    `;

    // Audit and origin headers
    const auditHeaders: Record<string, string> = {
      'X-Ruhvi-Sent-By': `${actorStaffName} <${actorStaffEmail}>${actorStaffUid ? ` (uid: ${actorStaffUid})` : ''}`,
      'X-Ruhvi-Mailbox': fromAddress,
    };

    // 1. Dispatch via EmailOrchestrator with full CC, BCC, Attachments and Audit headers
    const result = await EmailOrchestrator.send({
      category: 'internal_staff',
      eventKey: `mailbox_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      eventType: 'staff_mailbox_compose',
      recipientEmail: recipient,
      senderEmail: fromAddress,
      senderName: fromName,
      cc: payload.cc,
      bcc: payload.bcc,
      attachments: payload.attachments?.map((a) => ({
        filename: a.filename,
        content: a.base64,
        contentType: a.contentType,
        size: a.size,
      })),
      headers: auditHeaders,
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

    // 2. Resolve target mailbox ID in D1
    let mailboxId: string | null = null;
    try {
      const localPart = fromAddress.split('@')[0];
      const mbxRows = await queryMailflareD1<{ id: string }>(
        `SELECT id FROM mailboxes WHERE local_part = ? LIMIT 1;`,
        [localPart]
      );
      mailboxId = mbxRows[0]?.id || null;
    } catch (e) {
      console.warn('[API /api/mailbox/send] Mailbox lookup warning:', e);
    }

    // 3. Persist in D1 outbound messages so it reflects in the Sent folder
    const msgId = `msg_out_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const nowSec = Math.floor(Date.now() / 1000);
    const snippet = payload.body.replace(/\s+/g, ' ').slice(0, 120);
    const auditMetaJson = JSON.stringify({
      sentBy: {
        staffUid: actorStaffUid,
        staffName: actorStaffName,
        staffEmail: actorStaffEmail,
      },
      attachmentCount: payload.attachments?.length || 0,
      attachments: payload.attachments?.map((a) => ({
        filename: a.filename,
        size: a.size,
      })),
    });

    try {
      await queryMailflareD1(
        `INSERT INTO messages (
          id, user_id, mailbox_id, direction, from_addr, to_addr, cc_addr, bcc_addr,
          subject, snippet, text_body, html_body, references_header, created_at, read, starred, status
        ) VALUES (?, ?, ?, 'outbound', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 'sent');`,
        [
          msgId,
          actorStaffUid,
          mailboxId,
          fromName ? `"${fromName}" <${fromAddress}>` : fromAddress,
          recipient,
          payload.cc || null,
          payload.bcc || null,
          payload.subject,
          snippet,
          payload.body,
          formattedHtml,
          auditMetaJson,
          nowSec,
        ]
      );

      // Persist attachment records if any
      if (payload.attachments && payload.attachments.length > 0) {
        for (const att of payload.attachments) {
          const attId = `att_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
          await queryMailflareD1(
            `INSERT INTO message_attachments (
              id, message_id, filename, content_type, size, disposition, r2_key, created_at
            ) VALUES (?, ?, ?, ?, ?, 'attachment', 'sent_inline', ?);`,
            [
              attId,
              msgId,
              att.filename,
              att.contentType || 'application/octet-stream',
              att.size || 0,
              nowSec,
            ]
          );
        }
      }

      // Record audit log for staff multi-person shared inbox traceability
      const auditLogId = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const fullAuditMetadata = JSON.stringify({
        actorName: actorStaffName,
        actorEmail: actorStaffEmail,
        actorUid: actorStaffUid,
        from: fromAddress,
        fromName,
        to: recipient,
        cc: payload.cc || null,
        bcc: payload.bcc || null,
        subject: payload.subject,
        attachmentCount: payload.attachments?.length || 0,
        attachments: payload.attachments?.map((a) => ({
          filename: a.filename,
          size: a.size,
          contentType: a.contentType,
        })),
        provider: result.provider,
        deliveryId: result.deliveryId,
      });

      await queryMailflareD1(
        `INSERT INTO audit_logs (id, actor_user_id, mailbox_id, message_id, action, metadata, created_at)
         VALUES (?, ?, ?, ?, 'email_sent', ?, ?);`,
        [auditLogId, actorStaffUid, mailboxId, msgId, fullAuditMetadata, nowSec]
      );
    } catch (d1Err) {
      console.warn(
        '[API /api/mailbox/send] Could not save to D1 sent/audit logs:',
        d1Err
      );
    }

    return NextResponse.json({
      success: true,
      deliveryId: result.deliveryId,
      provider: result.provider,
      messageId: msgId,
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
