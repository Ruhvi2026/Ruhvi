import { NextRequest, NextResponse } from 'next/server';
import { queryMailflareD1 } from '@/lib/mailbox/d1-client';
import { requireAdmin } from '@/lib/auth/require-admin';
import type { RuhMailCalendarEvent } from '@/types/mailbox';

export const dynamic = 'force-dynamic';

interface RawEventRow {
  id: string;
  mailbox_id: string | null;
  staff_uid: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: number;
  end_time: number;
  all_day: number;
  attendees: string | null;
  status: string;
  ics_uid: string | null;
  created_at: number;
}

// GET /api/mailbox/calendar/events
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
    const start = searchParams.get('start'); // unix timestamp min
    const end = searchParams.get('end'); // unix timestamp max

    let query = `
      SELECT id, mailbox_id, staff_uid, title, description, location,
             start_time, end_time, all_day, attendees, status, ics_uid, created_at
      FROM ruhmail_calendar_events
      WHERE status != 'cancelled'
    `;
    const params: unknown[] = [];

    if (mailboxId) {
      query += ` AND mailbox_id = ?`;
      params.push(mailboxId);
    }

    if (start) {
      query += ` AND end_time >= ?`;
      params.push(parseInt(start, 10));
    }

    if (end) {
      query += ` AND start_time <= ?`;
      params.push(parseInt(end, 10));
    }

    query += ` ORDER BY start_time ASC`;

    const rows = await queryMailflareD1<RawEventRow>(query, params);
    const events: RuhMailCalendarEvent[] = rows.map((r) => {
      let parsedAttendees: string[] = [];
      try {
        if (r.attendees) parsedAttendees = JSON.parse(r.attendees);
      } catch {
        parsedAttendees = r.attendees ? [r.attendees] : [];
      }

      return {
        id: r.id,
        mailbox_id: r.mailbox_id || undefined,
        staff_uid: r.staff_uid,
        title: r.title,
        description: r.description || undefined,
        location: r.location || undefined,
        start_time: r.start_time,
        end_time: r.end_time,
        all_day: Boolean(r.all_day),
        attendees: parsedAttendees,
        status: (r.status as any) || 'confirmed',
        ics_uid: r.ics_uid || undefined,
        created_at: r.created_at,
      };
    });

    return NextResponse.json({ success: true, events });
  } catch (error) {
    console.error('[API /api/mailbox/calendar/events] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch events', events: [] },
      { status: 500 }
    );
  }
}

// POST /api/mailbox/calendar/events
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
      title,
      description,
      location,
      start_time,
      end_time,
      all_day = false,
      attendees = [],
      mailbox_id,
    } = body;

    if (!title || !start_time || !end_time) {
      return NextResponse.json(
        {
          success: false,
          error: 'title, start_time, and end_time are required',
        },
        { status: 400 }
      );
    }

    const id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const icsUid = `${id}@ruhvi.in`;
    const now = Math.floor(Date.now() / 1000);
    const attendeesStr = JSON.stringify(attendees);

    await queryMailflareD1(
      `INSERT INTO ruhmail_calendar_events 
       (id, mailbox_id, staff_uid, title, description, location, start_time, end_time, all_day, attendees, status, ics_uid, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)`,
      [
        id,
        mailbox_id || null,
        adminCheck.uid,
        title,
        description || null,
        location || null,
        start_time,
        end_time,
        all_day ? 1 : 0,
        attendeesStr,
        icsUid,
        now,
      ]
    );

    return NextResponse.json({
      success: true,
      event: {
        id,
        mailbox_id,
        staff_uid: adminCheck.uid,
        title,
        description,
        location,
        start_time,
        end_time,
        all_day: Boolean(all_day),
        attendees,
        status: 'confirmed',
        ics_uid: icsUid,
        created_at: now,
      },
    });
  } catch (error) {
    console.error('[API /api/mailbox/calendar/events] POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create calendar event' },
      { status: 500 }
    );
  }
}

// DELETE /api/mailbox/calendar/events?id=xxx
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
        { success: false, error: 'Event id is required' },
        { status: 400 }
      );
    }

    await queryMailflareD1(
      `UPDATE ruhmail_calendar_events SET status = 'cancelled' WHERE id = ?`,
      [id]
    );
    return NextResponse.json({ success: true, message: 'Event cancelled' });
  } catch (error) {
    console.error('[API /api/mailbox/calendar/events] DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel event' },
      { status: 500 }
    );
  }
}
