import { NextRequest, NextResponse } from 'next/server';
import { queryMailflareD1 } from '@/lib/mailbox/d1-client';
import { EmailOrchestrator } from '@/lib/email-orchestrator/service';

export const dynamic = 'force-dynamic';

// GET /api/mailbox/booking/[slug] (Public - get page info and booked slots for a date)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date'); // YYYY-MM-DD

    const pageRows = await queryMailflareD1<any>(
      `SELECT * FROM ruhmail_booking_pages WHERE slug = ? AND is_active = 1 LIMIT 1`,
      [slug]
    );

    if (!pageRows || pageRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Booking page not found' },
        { status: 404 }
      );
    }

    const page = pageRows[0];
    let availableDays = ['mon', 'tue', 'wed', 'thu', 'fri'];
    try {
      if (page.available_days) availableDays = JSON.parse(page.available_days);
    } catch {}

    // If date provided, fetch booked slots
    let bookedSlots: Array<{ start_time: number; end_time: number }> = [];
    if (dateStr) {
      const dayStart = Math.floor(
        new Date(`${dateStr}T00:00:00`).getTime() / 1000
      );
      const dayEnd = Math.floor(
        new Date(`${dateStr}T23:59:59`).getTime() / 1000
      );

      const bookingRows = await queryMailflareD1<any>(
        `SELECT start_time, end_time FROM ruhmail_bookings 
         WHERE page_id = ? AND status = 'confirmed' AND end_time >= ? AND start_time <= ?`,
        [page.id, dayStart, dayEnd]
      );

      bookedSlots = bookingRows.map((b) => ({
        start_time: b.start_time,
        end_time: b.end_time,
      }));
    }

    return NextResponse.json({
      success: true,
      page: {
        id: page.id,
        slug: page.slug,
        title: page.title,
        description: page.description,
        duration_minutes: page.duration_minutes,
        buffer_minutes: page.buffer_minutes,
        available_days: availableDays,
        available_start: page.available_start,
        available_end: page.available_end,
        timezone: page.timezone,
      },
      bookedSlots,
    });
  } catch (error) {
    console.error('[API /api/mailbox/booking/[slug]] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/mailbox/booking/[slug] (Public - confirm a booking)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await req.json();
    const { guest_name, guest_email, start_time, end_time, notes } = body;

    if (
      !guest_name?.trim() ||
      !guest_email?.trim() ||
      !start_time ||
      !end_time
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Missing required fields: guest_name, guest_email, start_time, end_time',
        },
        { status: 400 }
      );
    }

    const pageRows = await queryMailflareD1<any>(
      `SELECT * FROM ruhmail_booking_pages WHERE slug = ? AND is_active = 1 LIMIT 1`,
      [slug]
    );

    if (!pageRows || pageRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Booking page not found' },
        { status: 404 }
      );
    }

    const page = pageRows[0];

    // Check collision
    const existing = await queryMailflareD1<any>(
      `SELECT id FROM ruhmail_bookings 
       WHERE page_id = ? AND status = 'confirmed' 
       AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?)) LIMIT 1`,
      [page.id, start_time, start_time, end_time, end_time]
    );

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { success: false, error: 'This time slot is already booked' },
        { status: 409 }
      );
    }

    const bookingId = `bkg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = Math.floor(Date.now() / 1000);

    // Save booking
    await queryMailflareD1(
      `INSERT INTO ruhmail_bookings (id, page_id, guest_name, guest_email, start_time, end_time, notes, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)`,
      [
        bookingId,
        page.id,
        guest_name.trim(),
        guest_email.trim(),
        start_time,
        end_time,
        notes || null,
        now,
      ]
    );

    // Also auto-create a calendar event in D1
    const evtId = `evt_bkg_${bookingId}`;
    await queryMailflareD1(
      `INSERT INTO ruhmail_calendar_events (id, mailbox_id, staff_uid, title, description, location, start_time, end_time, all_day, attendees, status, ics_uid, created_at)
       VALUES (?, null, ?, ?, ?, 'Online Booking', ?, ?, 0, ?, 'confirmed', ?, ?)`,
      [
        evtId,
        page.staff_uid,
        `Booking: ${guest_name} - ${page.title}`,
        notes || `Public booking confirmed via book.ruhvi.in/${slug}`,
        start_time,
        end_time,
        JSON.stringify([guest_email.trim()]),
        `${evtId}@ruhvi.in`,
        now,
      ]
    );

    // Dispatch confirmation email to guest
    try {
      const dateFormatted = new Date(start_time * 1000).toLocaleString(
        'en-IN',
        {
          timeZone: page.timezone || 'Asia/Kolkata',
          dateStyle: 'full',
          timeStyle: 'short',
        }
      );

      await EmailOrchestrator.send({
        category: 'customer_support',
        eventKey: `booking_confirm_${bookingId}`,
        eventType: 'calendar_booking_confirmation',
        recipientEmail: guest_email.trim(),
        recipientName: guest_name.trim(),
        subject: `Booking Confirmed: ${page.title} with Ruhvi Jewels`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;">
            <h2 style="color: #047857;">Your appointment is confirmed!</h2>
            <p>Dear <strong>${guest_name}</strong>,</p>
            <p>Thank you for scheduling a session with us. Here are your confirmed details:</p>
            <ul>
              <li><strong>Topic:</strong> ${page.title}</li>
              <li><strong>Time:</strong> ${dateFormatted}</li>
              <li><strong>Duration:</strong> ${page.duration_minutes} minutes</li>
              <li><strong>Location:</strong> Online Meeting / Concierge Call</li>
            </ul>
            ${notes ? `<p><em>Notes:</em> ${notes}</p>` : ''}
            <p style="margin-top: 20px; font-size: 12px; color: #64748b;">
              Need to reschedule? Please reply directly to this email or visit ruhvi.in/support.
            </p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.warn('[Booking] Confirmation email failed:', emailErr);
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: bookingId,
        page_id: page.id,
        guest_name,
        guest_email,
        start_time,
        end_time,
        status: 'confirmed',
      },
    });
  } catch (error) {
    console.error('[API /api/mailbox/booking/[slug]] POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Booking failed' },
      { status: 500 }
    );
  }
}
