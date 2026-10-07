import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/service';
import { scanProactiveSignals } from '@/lib/ai/co-founder/proactive';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Background Cron Job: AI Co-Founder Proactive Intelligence Engine
 *
 * Scans real business telemetry, detects anomalies, evaluates safety thresholds,
 * deduplicates signals, and dispatches in-app notifications for administrative review.
 */
export async function runProactiveCronScan() {
  const startTime = Date.now();

  // 1. Execute proactive scan
  const scanResult = await scanProactiveSignals();

  // 2. Dispatch high-severity signals to admin notifications table
  const supabase = getServiceClient();
  const highPrioritySignals = scanResult.activeSignals.filter(
    (s) => s.severity === 'critical' || s.severity === 'high'
  );

  if (highPrioritySignals.length > 0) {
    // Fetch admin user IDs
    const { data: adminUsers } = await supabase
      .from('users')
      .select('id')
      .in('role', ['super_admin', 'admin', 'manager']);

    if (adminUsers && adminUsers.length > 0) {
      const notificationsToInsert: any[] = [];

      for (const signal of highPrioritySignals) {
        for (const admin of adminUsers) {
          notificationsToInsert.push({
            user_id: admin.id,
            title: `[AI Co-Founder] ${signal.title}`,
            message: signal.summary,
            category: 'UPDATES',
            type: 'system',
            link: '/co-founder',
          });
        }
      }

      if (notificationsToInsert.length > 0) {
        await supabase.from('notifications').insert(notificationsToInsert);
      }
    }
  }

  const durationMs = Date.now() - startTime;

  return {
    generatedCount: scanResult.generatedCount,
    suppressedCount: scanResult.suppressedCount,
    activeSignalCount: scanResult.activeSignals.length,
    durationMs,
    signals: scanResult.activeSignals.map((s) => ({
      id: s.id,
      fingerprint: s.fingerprint,
      severity: s.severity,
      title: s.title,
      recommendedAction: s.recommendedAction,
    })),
  };
}

export async function GET(req: NextRequest) {
  try {
    // Authenticate Vercel Cron or Admin via Bearer token
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const res = await runProactiveCronScan();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...res,
    });
  } catch (error: any) {
    console.error('Proactive cron scan failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Proactive scan error',
      },
      { status: 500 }
    );
  }
}
