import { NextRequest, NextResponse } from 'next/server';
import { queryMailflareD1 } from '@/lib/mailbox/d1-client';
import { requireAdmin } from '@/lib/auth/require-admin';
import type { RuhMailBookingPage } from '@/types/mailbox';

export const dynamic = 'force-dynamic';

interface RawBookingPageRow {
  id: string;
  staff_uid: string;
  slug: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  buffer_minutes: number;
  available_days: string;
  available_start: string;
  available_end: string;
  timezone: string;
  is_active: number;
  created_at: number;
}

// GET /api/mailbox/booking/pages
export async function GET() {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.ok) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: adminCheck.status }
      );
    }

    const rows = await queryMailflareD1<RawBookingPageRow>(
      `SELECT * FROM ruhmail_booking_pages WHERE is_active = 1 ORDER BY created_at DESC`
    );

    const pages: RuhMailBookingPage[] = rows.map((r) => {
      let days = ['mon', 'tue', 'wed', 'thu', 'fri'];
      try {
        if (r.available_days) days = JSON.parse(r.available_days);
      } catch {}

      return {
        id: r.id,
        staff_uid: r.staff_uid,
        slug: r.slug,
        title: r.title,
        description: r.description || undefined,
        duration_minutes: r.duration_minutes,
        buffer_minutes: r.buffer_minutes,
        available_days: days,
        available_start: r.available_start,
        available_end: r.available_end,
        timezone: r.timezone,
        is_active: Boolean(r.is_active),
        created_at: r.created_at,
      };
    });

    return NextResponse.json({ success: true, pages });
  } catch (error) {
    console.error('[API /api/mailbox/booking/pages] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch booking pages', pages: [] },
      { status: 500 }
    );
  }
}

// POST /api/mailbox/booking/pages (Create booking page)
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
      slug,
      title,
      description,
      duration_minutes = 30,
      buffer_minutes = 10,
      available_days = ['mon', 'tue', 'wed', 'thu', 'fri'],
      available_start = '10:00',
      available_end = '18:00',
      timezone = 'Asia/Kolkata',
    } = body;

    if (!slug?.trim() || !title?.trim()) {
      return NextResponse.json(
        { success: false, error: 'slug and title are required' },
        { status: 400 }
      );
    }

    const cleanSlug = slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '');
    const id = `page_${cleanSlug}_${Date.now()}`;
    const now = Math.floor(Date.now() / 1000);
    const daysStr = JSON.stringify(available_days);

    await queryMailflareD1(
      `INSERT INTO ruhmail_booking_pages 
       (id, staff_uid, slug, title, description, duration_minutes, buffer_minutes, available_days, available_start, available_end, timezone, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        id,
        adminCheck.uid,
        cleanSlug,
        title.trim(),
        description || null,
        duration_minutes,
        buffer_minutes,
        daysStr,
        available_start,
        available_end,
        timezone,
        now,
      ]
    );

    return NextResponse.json({
      success: true,
      page: {
        id,
        staff_uid: adminCheck.uid,
        slug: cleanSlug,
        title,
        description,
        duration_minutes,
        buffer_minutes,
        available_days,
        available_start,
        available_end,
        timezone,
        is_active: true,
        created_at: now,
      },
    });
  } catch (error) {
    console.error('[API /api/mailbox/booking/pages] POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create booking page' },
      { status: 500 }
    );
  }
}
