import { NextRequest, NextResponse } from 'next/server';
import { queryMailflareD1 } from '@/lib/mailbox/d1-client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mailboxId = searchParams.get('mailbox_id') || '';
    const staffUid = searchParams.get('staff_uid') || '';

    const rows = await queryMailflareD1(
      `SELECT * FROM ruhmail_signatures WHERE mailbox_id = ? OR staff_uid = ?`,
      [mailboxId, staffUid]
    );

    return NextResponse.json({ success: true, signatures: rows });
  } catch (error) {
    console.error('[API /api/mailbox/signatures] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch signatures', signatures: [] },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      mailbox_id,
      staff_uid,
      name,
      html,
      is_default = false,
    } = body as {
      mailbox_id?: string;
      staff_uid?: string;
      name: string;
      html: string;
      is_default?: boolean;
    };

    if (!name || !html) {
      return NextResponse.json(
        { success: false, error: 'name and html are required' },
        { status: 400 }
      );
    }

    const id = `sig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // If setting as default, clear other defaults first
    if (is_default) {
      if (mailbox_id) {
        await queryMailflareD1(
          `UPDATE ruhmail_signatures SET is_default = 0 WHERE mailbox_id = ?`,
          [mailbox_id]
        );
      } else if (staff_uid) {
        await queryMailflareD1(
          `UPDATE ruhmail_signatures SET is_default = 0 WHERE staff_uid = ?`,
          [staff_uid]
        );
      }
    }

    await queryMailflareD1(
      `INSERT INTO ruhmail_signatures (id, mailbox_id, staff_uid, name, html, is_default)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        mailbox_id || null,
        staff_uid || null,
        name,
        html,
        is_default ? 1 : 0,
      ]
    );

    const signature = {
      id,
      mailbox_id: mailbox_id || null,
      staff_uid: staff_uid || null,
      name,
      html,
      is_default: Boolean(is_default),
    };

    return NextResponse.json({ success: true, signature });
  } catch (error) {
    console.error('[API /api/mailbox/signatures] POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create signature' },
      { status: 500 }
    );
  }
}
