import { NextRequest, NextResponse } from 'next/server';
import { queryMailflareD1 } from '@/lib/mailbox/d1-client';
import { requireAdmin } from '@/lib/auth/require-admin';

export const dynamic = 'force-dynamic';

interface StatsResult {
  totalMailboxes: number;
  totalRules: number;
  totalSignatures: number;
  inboundMessages: number;
  outboundMessages: number;
  unreadMessages: number;
}

// GET /api/mailbox/admin/stats
export async function GET() {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.ok) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: adminCheck.status }
      );
    }

    const [mbRows, ruleRows, sigRows, inRows, outRows, unreadRows] =
      await Promise.all([
        queryMailflareD1<{ count: number }>(
          `SELECT COUNT(*) as count FROM ruhmail_mailboxes WHERE is_active = 1`
        ),
        queryMailflareD1<{ count: number }>(
          `SELECT COUNT(*) as count FROM ruhmail_routing_rules WHERE is_active = 1`
        ),
        queryMailflareD1<{ count: number }>(
          `SELECT COUNT(*) as count FROM ruhmail_signatures`
        ),
        queryMailflareD1<{ count: number }>(
          `SELECT COUNT(*) as count FROM messages WHERE direction = 'inbound'`
        ),
        queryMailflareD1<{ count: number }>(
          `SELECT COUNT(*) as count FROM messages WHERE direction = 'outbound'`
        ),
        queryMailflareD1<{ count: number }>(
          `SELECT COUNT(*) as count FROM messages WHERE direction = 'inbound' AND read = 0`
        ),
      ]);

    const stats: StatsResult = {
      totalMailboxes: Number(mbRows[0]?.count || 0),
      totalRules: Number(ruleRows[0]?.count || 0),
      totalSignatures: Number(sigRows[0]?.count || 0),
      inboundMessages: Number(inRows[0]?.count || 0),
      outboundMessages: Number(outRows[0]?.count || 0),
      unreadMessages: Number(unreadRows[0]?.count || 0),
    };

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error('[API /api/mailbox/admin/stats] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch mailbox stats' },
      { status: 500 }
    );
  }
}

// POST /api/mailbox/admin/mailboxes (Create a new mailbox)
export async function POST(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.ok) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: adminCheck.status }
      );
    }

    const body = await req.json();
    const {
      local_part,
      display_name,
      domain = 'ruhvi.in',
      mailbox_type = 'personal',
    } = body;

    if (!local_part?.trim()) {
      return NextResponse.json(
        { success: false, error: 'local_part is required' },
        { status: 400 }
      );
    }

    const cleanLocalPart = local_part
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '');
    const id = `mbx_${cleanLocalPart}_${Date.now()}`;
    const now = Math.floor(Date.now() / 1000);

    await queryMailflareD1(
      `INSERT INTO ruhmail_mailboxes (id, local_part, display_name, domain, mailbox_type, created_at, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [
        id,
        cleanLocalPart,
        display_name || cleanLocalPart,
        domain,
        mailbox_type,
        now,
      ]
    );

    return NextResponse.json({
      success: true,
      mailbox: {
        id,
        local_part: cleanLocalPart,
        display_name: display_name || cleanLocalPart,
        domain,
        mailbox_type,
        email: `${cleanLocalPart}@${domain}`,
        is_active: true,
        created_at: now,
      },
    });
  } catch (error) {
    console.error('[API /api/mailbox/admin/mailboxes] POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create mailbox' },
      { status: 500 }
    );
  }
}

// DELETE /api/mailbox/admin/mailboxes?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.ok) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: adminCheck.status }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Mailbox ID required' },
        { status: 400 }
      );
    }

    // Soft delete / deactivate
    await queryMailflareD1(
      `UPDATE ruhmail_mailboxes SET is_active = 0 WHERE id = ?`,
      [id]
    );
    return NextResponse.json({ success: true, message: 'Mailbox deactivated' });
  } catch (error) {
    console.error('[API /api/mailbox/admin/mailboxes] DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to deactivate mailbox' },
      { status: 500 }
    );
  }
}
