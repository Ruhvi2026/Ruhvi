import { NextRequest, NextResponse } from 'next/server';
import { queryMailflareD1 } from '@/lib/mailbox/d1-client';
import type { RuhMailCalendarEvent } from '@/types/mailbox';

export const dynamic = 'force-dynamic';

function formatICSDate(timestampSec: number): string {
  const d = new Date(timestampSec * 1000);
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

// GET /api/mailbox/calendar/ics?event_id=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('event_id');

    if (!eventId) {
      return new NextResponse('Event ID is required', { status: 400 });
    }

    const rows = await queryMailflareD1<any>(
      `SELECT * FROM ruhmail_calendar_events WHERE id = ? LIMIT 1`,
      [eventId]
    );

    if (!rows || rows.length === 0) {
      return new NextResponse('Event not found', { status: 404 });
    }

    const evt = rows[0];
    const nowStamp = formatICSDate(Math.floor(Date.now() / 1000));
    const startStamp = formatICSDate(evt.start_time);
    const endStamp = formatICSDate(evt.end_time);
    const uid = evt.ics_uid || `${evt.id}@ruhvi.in`;

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Ruhvi Jewels//RuhMail Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART:${startStamp}`,
      `DTEND:${endStamp}`,
      `SUMMARY:${evt.title.replace(/\n/g, ' ')}`,
      evt.description
        ? `DESCRIPTION:${evt.description.replace(/\n/g, '\\n')}`
        : '',
      evt.location ? `LOCATION:${evt.location.replace(/\n/g, ' ')}` : '',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ]
      .filter(Boolean)
      .join('\r\n');

    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${evt.id}.ics"`,
      },
    });
  } catch (error) {
    console.error('[API /api/mailbox/calendar/ics] Error:', error);
    return new NextResponse('Internal error generating ICS', { status: 500 });
  }
}
