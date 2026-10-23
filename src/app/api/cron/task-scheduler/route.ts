import { NextResponse } from 'next/server';
import { runTaskScheduler } from '@/lib/cron/task-scheduler';
import { getAuthenticatedStaff } from '@/lib/auth/task-auth';
import { runProactiveCronScan } from '@/lib/ai/co-founder/proactive';

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

    // Run both staff recurring task scheduler and AI Co-Founder proactive scanner concurrently
    const [taskRes, proactiveRes] = await Promise.allSettled([
      runTaskScheduler(),
      runProactiveCronScan(),
    ]);

    const taskData: any =
      taskRes.status === 'fulfilled'
        ? taskRes.value
        : { error: taskRes.reason?.message || 'Task scheduler error' };

    const proactiveData: any =
      proactiveRes.status === 'fulfilled'
        ? proactiveRes.value
        : { error: proactiveRes.reason?.message || 'Proactive scan error' };

    return NextResponse.json({
      success: true,
      // Retain flat backward-compatibility for task-scheduler.mjs
      tasksGenerated: taskData.tasksGenerated ?? 0,
      remindersSent: taskData.remindersSent ?? 0,
      errors: taskData.errors ?? (taskData.error ? [taskData.error] : []),
      // Detailed sub-objects
      taskScheduler: taskData,
      proactiveScan: proactiveData,
    });
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
