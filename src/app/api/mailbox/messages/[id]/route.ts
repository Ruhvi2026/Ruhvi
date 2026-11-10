import { NextRequest, NextResponse } from 'next/server';
import { queryMailflareD1 } from '@/lib/mailbox/d1-client';
import { mapD1MessageToEmailMessage } from '@/lib/mailbox/formatters';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      );
    }

    const rows = await queryMailflareD1(
      `SELECT * FROM messages WHERE id = ? LIMIT 1;`,
      [id]
    );

    if (!rows.length) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const message = mapD1MessageToEmailMessage(rows[0]);
    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error('[API /api/mailbox/messages/[id]] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const updates: string[] = [];
    const queryParams: unknown[] = [];

    if (typeof body.read === 'boolean') {
      updates.push(`read = ?`);
      queryParams.push(body.read ? 1 : 0);
    }

    if (typeof body.starred === 'boolean') {
      updates.push(`starred = ?`);
      queryParams.push(body.starred ? 1 : 0);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No valid update fields provided' },
        { status: 400 }
      );
    }

    queryParams.push(id);
    await queryMailflareD1(
      `UPDATE messages SET ${updates.join(', ')} WHERE id = ?;`,
      queryParams
    );

    return NextResponse.json({ success: true, id, ...body });
  } catch (error) {
    console.error('[API /api/mailbox/messages/[id]] PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update message' },
      { status: 500 }
    );
  }
}
