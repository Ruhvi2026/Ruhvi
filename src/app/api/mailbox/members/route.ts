import { NextRequest, NextResponse } from 'next/server';
import { queryMailflareD1 } from '@/lib/mailbox/d1-client';
import { requireAdmin } from '@/lib/auth/require-admin';
import type { RuhMailMember } from '@/types/mailbox';

export const dynamic = 'force-dynamic';

interface RawMemberRow {
  id: string;
  mailbox_id: string;
  staff_uid: string;
  role: string;
  can_send: number;
  can_delete: number;
  added_at: number;
}

// GET /api/mailbox/members?mailbox_id=xxx
export async function GET(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.ok) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: adminCheck.status }
      );
    }

    const { searchParams } = new URL(req.url);
    const mailboxId = searchParams.get('mailbox_id');

    let query = `
      SELECT id, mailbox_id, staff_uid, role, can_send, can_delete, added_at
      FROM ruhmail_members
    `;
    const params: unknown[] = [];

    if (mailboxId) {
      query += ` WHERE mailbox_id = ?`;
      params.push(mailboxId);
    }

    query += ` ORDER BY added_at DESC`;

    const rows = await queryMailflareD1<RawMemberRow>(query, params);
    const members: RuhMailMember[] = rows.map((r) => ({
      id: r.id,
      mailbox_id: r.mailbox_id,
      staff_uid: r.staff_uid,
      role: (r.role as 'owner' | 'member' | 'viewer') || 'member',
      can_send: Boolean(r.can_send),
      can_delete: Boolean(r.can_delete),
      added_at: r.added_at,
    }));

    return NextResponse.json({ success: true, members });
  } catch (error) {
    console.error('[API /api/mailbox/members] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch members', members: [] },
      { status: 500 }
    );
  }
}

// POST /api/mailbox/members (Assign staff to mailbox)
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
      mailbox_id,
      staff_uid,
      role = 'member',
      can_send = 1,
      can_delete = 0,
    } = body;

    if (!mailbox_id || !staff_uid) {
      return NextResponse.json(
        { success: false, error: 'mailbox_id and staff_uid are required' },
        { status: 400 }
      );
    }

    const id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = Math.floor(Date.now() / 1000);

    await queryMailflareD1(
      `INSERT INTO ruhmail_members (id, mailbox_id, staff_uid, role, can_send, can_delete, added_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        mailbox_id,
        staff_uid,
        role,
        can_send ? 1 : 0,
        can_delete ? 1 : 0,
        now,
      ]
    );

    return NextResponse.json({
      success: true,
      member: {
        id,
        mailbox_id,
        staff_uid,
        role,
        can_send: Boolean(can_send),
        can_delete: Boolean(can_delete),
        added_at: now,
      },
    });
  } catch (error) {
    console.error('[API /api/mailbox/members] POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add member' },
      { status: 500 }
    );
  }
}

// DELETE /api/mailbox/members?id=xxx
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
        { success: false, error: 'id parameter is required' },
        { status: 400 }
      );
    }

    await queryMailflareD1(`DELETE FROM ruhmail_members WHERE id = ?`, [id]);
    return NextResponse.json({
      success: true,
      message: 'Member access removed',
    });
  } catch (error) {
    console.error('[API /api/mailbox/members] DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete member' },
      { status: 500 }
    );
  }
}
