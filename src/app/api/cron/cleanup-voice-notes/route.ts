// src/app/api/cron/cleanup-voice-notes/route.ts
//
// GET /api/cron/cleanup-voice-notes  → Automated cron runner to delete voice notes older than 45 days.
//
// Security: Bearer CRON_SECRET or authenticated staff session.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth/verify-session';
import { getServiceClient } from '@/lib/supabase/service';
import { purgeExpiredVoiceNotes } from '@/lib/chat/cloudinary-audio';

async function verifyAuth(req: Request) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // Fallback to authenticated staff member
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('__session')?.value;
    const decoded = await verifySessionToken(sessionCookie);
    if (!decoded) return false;

    const supabase = getServiceClient();
    const { data: user } = await supabase
      .from('users')
      .select('id, role, account_status')
      .eq('id', decoded.sub as string)
      .maybeSingle();

    return (
      !!user && user.account_status === 'active' && user.role !== 'customer'
    );
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  try {
    const isAuthorized = await verifyAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await purgeExpiredVoiceNotes(100);

    return NextResponse.json({
      success: result.success,
      retentionDays: 45,
      checkedCount: result.checkedCount,
      purgedCount: result.purgedCount,
      errorCount: result.errorCount,
      purgedPublicIds: result.purgedPublicIds,
      errors: result.errors,
      durationMs: result.durationMs,
    });
  } catch (err: any) {
    console.error('[cron/cleanup-voice-notes] Fatal error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}
