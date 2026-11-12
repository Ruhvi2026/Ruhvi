import { NextResponse } from 'next/server';
import { queryMailflareD1 } from '@/lib/mailbox/d1-client';
import { requireAdmin } from '@/lib/auth/require-admin';

export const dynamic = 'force-dynamic';

interface RawMailbox {
  id: string;
  local_part: string;
  display_name: string | null;
  domain: string;
  mailbox_type: string;
  created_at: number;
  is_active: number;
}

export async function GET() {
  try {
    const adminCheck = await requireAdmin();
    const isStaff = adminCheck.ok;
    const staffUid = adminCheck.uid;

    // If staff user authenticated, query mailboxes they have explicit permission to OR shared mailboxes
    let sql = `
      SELECT id, local_part, display_name, domain, mailbox_type, created_at, is_active
      FROM ruhmail_mailboxes
      WHERE is_active = 1
    `;
    const params: unknown[] = [];

    if (
      isStaff &&
      adminCheck.role !== 'super_admin' &&
      adminCheck.role !== 'admin'
    ) {
      sql += ` AND (
        mailbox_type = 'shared'
        OR id IN (SELECT mailbox_id FROM ruhmail_members WHERE staff_uid = ?)
      )`;
      params.push(staffUid);
    }

    sql += ` ORDER BY created_at ASC`;

    const rows = await queryMailflareD1<RawMailbox>(sql, params);

    const mailboxes = rows.map((row) => ({
      id: row.id,
      local_part: row.local_part,
      display_name: row.display_name || row.local_part,
      domain: row.domain || 'ruhvi.in',
      mailbox_type: row.mailbox_type || 'personal',
      email: `${row.local_part}@${row.domain || 'ruhvi.in'}`,
      is_active: row.is_active === 1,
      created_at: row.created_at,
    }));

    return NextResponse.json({ success: true, mailboxes });
  } catch (error) {
    console.error('[API /api/mailbox/accounts] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch mailboxes', mailboxes: [] },
      { status: 500 }
    );
  }
}
