import { NextResponse } from 'next/server';
import { runTaskScheduler } from '@/lib/cron/task-scheduler';
import { getAuthenticatedStaff } from '@/lib/auth/task-auth';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Check if called by authorized Vercel Cron OR authorized staff
    const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
    if (!isCron) {
      const staffUser = await getAuthenticatedStaff();
      if (!staffUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const results = await runTaskScheduler();
    return NextResponse.json({ success: true, ...results });
  } catch (err: any) {
    console.error('[task-scheduler GET] Fatal error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = await runTaskScheduler();
    return NextResponse.json({ success: true, ...results });
  } catch (err: any) {
    console.error('[task-scheduler POST] Fatal error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
