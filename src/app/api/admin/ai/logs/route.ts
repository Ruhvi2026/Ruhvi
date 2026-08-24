import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireAdmin } from '@/lib/auth/require-admin';
import { createServerClient } from '@supabase/ssr';

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || 'all'; // today|7d|30d|all
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const parseDate = (value: string | null): Date | null => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const fromDate = parseDate(from);
  const toDate = parseDate(to);
  if ((from && !fromDate) || (to && !toDate)) {
    return NextResponse.json(
      { error: 'Invalid date param. Use a valid ISO date string.' },
      { status: 400 }
    );
  }

  try {
    const cookieStore = await cookies();
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
        'https://igrkrkxdantrolbldapj.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    // Compute time window
    let fromISO: string | null = null;
    const now = new Date();

    if (fromDate) {
      fromISO = fromDate.toISOString();
    } else if (period === 'today') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      fromISO = startOfDay.toISOString();
    } else if (period === '7d') {
      fromISO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (period === '30d') {
      fromISO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    let query = supabaseAdmin
      .from('ai_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (fromISO) query = query.gte('created_at', fromISO);
    if (toDate) query = query.lte('created_at', toDate.toISOString());

    const { data: logs, error } = await query;

    if (error) {
      console.warn(
        'Failed to fetch ai_logs, possibly migration not run yet.',
        error
      );
      return NextResponse.json({ logs: [], analytics: null });
    }

    const allLogs = logs || [];

    // ── Compute aggregated analytics ────────────────────────────────────
    const totalRequests = allLogs.length;
    const successCount = allLogs.filter((l) => l.status === 'success').length;
    const failedCount = allLogs.filter((l) => l.status === 'failed').length;
    const totalTokens = allLogs.reduce(
      (sum, l) => sum + (l.tokens_used || 0),
      0
    );
    const totalCost = allLogs.reduce(
      (sum, l) => sum + (Number(l.estimated_cost) || 0),
      0
    );

    // Per-provider breakdown
    const byProvider: Record<string, any> = {};
    for (const log of allLogs) {
      if (!byProvider[log.provider]) {
        byProvider[log.provider] = {
          requests: 0,
          successes: 0,
          failures: 0,
          tokens: 0,
        };
      }
      byProvider[log.provider].requests++;
      if (log.status === 'success') byProvider[log.provider].successes++;
      if (log.status === 'failed') byProvider[log.provider].failures++;
      byProvider[log.provider].tokens += log.tokens_used || 0;
    }

    // Per-model breakdown
    const byModel: Record<string, number> = {};
    for (const log of allLogs) {
      byModel[log.model] = (byModel[log.model] || 0) + 1;
    }

    // Per-credential breakdown (new)
    const byCredential: Record<string, any> = {};
    for (const log of allLogs) {
      if (!log.credential_id) continue;
      if (!byCredential[log.credential_id]) {
        byCredential[log.credential_id] = {
          credential_id: log.credential_id,
          provider: log.provider,
          requests: 0,
          successes: 0,
          failures: 0,
          tokens: 0,
        };
      }
      byCredential[log.credential_id].requests++;
      if (log.status === 'success') byCredential[log.credential_id].successes++;
      if (log.status === 'failed') byCredential[log.credential_id].failures++;
      byCredential[log.credential_id].tokens += log.tokens_used || 0;
    }

    // Failover count (requests that used a non-primary provider)
    const failoverLogs = allLogs.filter(
      (l) => l.retry_count && l.retry_count > 0
    );

    // Error rate by type
    const failedLogs = allLogs.filter((l) => l.status === 'failed');
    const byErrorMessage: Record<string, number> = {};
    for (const log of failedLogs) {
      const msg = log.error_message || 'Unknown error';
      const key = msg.length > 60 ? msg.substring(0, 60) + '...' : msg;
      byErrorMessage[key] = (byErrorMessage[key] || 0) + 1;
    }

    return NextResponse.json({
      logs: allLogs,
      analytics: {
        totalRequests,
        successCount,
        failedCount,
        successRate:
          totalRequests > 0
            ? Math.round((successCount / totalRequests) * 100)
            : 100,
        totalTokens,
        totalCost: Number(totalCost.toFixed(6)),
        failoverCount: failoverLogs.length,
        byProvider: Object.entries(byProvider).map(([id, stats]) => ({
          provider: id,
          ...stats,
        })),
        byModel: Object.entries(byModel)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 15)
          .map(([model, requests]) => ({ model, requests })),
        byCredential: Object.values(byCredential),
        recentErrors: Object.entries(byErrorMessage)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([message, count]) => ({ message, count })),
        period,
        fromISO,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
