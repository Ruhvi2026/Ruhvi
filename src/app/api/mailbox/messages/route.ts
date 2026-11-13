import { NextRequest, NextResponse } from 'next/server';
import { queryMailflareD1 } from '@/lib/mailbox/d1-client';
import { mapD1MessageToEmailMessage } from '@/lib/mailbox/formatters';
import type { MailboxFolder } from '@/types/mailbox';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const folder = (searchParams.get('folder') || 'inbox') as MailboxFolder;
    const mailbox = searchParams.get('mailbox') || 'shreya.maity';
    const search = searchParams.get('search')?.trim() || '';
    const limit = Math.min(
      Math.max(parseInt(searchParams.get('limit') || '30', 10), 1),
      100
    );

    // Build SQL query based on folder
    const conditions: string[] = [];
    const params: unknown[] = [];

    // Optional mailbox filter if mailbox ID or local_part is provided
    if (mailbox && mailbox !== 'all') {
      // Find mailbox id if local part is provided
      conditions.push(
        `(mailbox_id IN (SELECT id FROM mailboxes WHERE local_part = ?) OR to_addr LIKE ? OR from_addr LIKE ?)`
      );
      params.push(mailbox, `%${mailbox}%`, `%${mailbox}%`);
    }

    if (folder === 'sent') {
      conditions.push(`direction = 'outbound'`);
    } else if (folder === 'starred') {
      conditions.push(`starred = 1`);
    } else if (folder === 'drafts') {
      conditions.push(`status = 'draft'`);
    } else if (folder === 'all') {
      // No direction filter — show all messages across all inboxes
    } else {
      // Inbox (default)
      conditions.push(`direction = 'inbound'`);
    }

    if (search) {
      conditions.push(`(subject LIKE ? OR snippet LIKE ? OR from_addr LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT id, mailbox_id, direction, from_addr, to_addr, cc_addr, bcc_addr,
             subject, snippet, created_at, read, starred, status, thread_id, references_header
      FROM messages
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ?;
    `;
    params.push(limit);

    const rows = await queryMailflareD1(query, params);
    const messages = rows.map(mapD1MessageToEmailMessage);

    // Get unread count for inbox
    let unreadCount = 0;
    try {
      const countConditions = [`direction = 'inbound'`, `read = 0`];
      const countParams: unknown[] = [];
      if (mailbox && mailbox !== 'all') {
        countConditions.push(
          `(mailbox_id IN (SELECT id FROM mailboxes WHERE local_part = ?) OR to_addr LIKE ? OR from_addr LIKE ?)`
        );
        countParams.push(mailbox, `%${mailbox}%`, `%${mailbox}%`);
      }
      const countRows = await queryMailflareD1<{ count: number }>(
        `SELECT COUNT(*) as count FROM messages WHERE ${countConditions.join(' AND ')};`,
        countParams
      );
      unreadCount = Number(countRows[0]?.count || 0);
    } catch {
      unreadCount = messages.filter(
        (m) => !m.read && m.direction === 'inbound'
      ).length;
    }

    return NextResponse.json({
      success: true,
      folder,
      messages,
      unreadCount,
    });
  } catch (error) {
    console.error('[API /api/mailbox/messages] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch messages',
        messages: [],
        unreadCount: 0,
      },
      { status: 500 }
    );
  }
}
