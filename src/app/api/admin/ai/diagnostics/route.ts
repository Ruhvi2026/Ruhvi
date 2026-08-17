import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import {
  getActiveDiagnostics,
  purgeExpiredNow,
  clearAllDiagnostics,
  logFailureDiagnostic,
} from '@/lib/ai/diagnostics';

async function verifyAdmin() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('__session')?.value;
  if (!sessionCookie) return false;
  try {
    const decoded = decodeJwt(sessionCookie);
    if (!decoded || !decoded.sub) return false;
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * GET /api/admin/ai/diagnostics
 * Returns active failure diagnostics & fallback history (strictly within 24h TTL)
 * Automatically cleans up any entries older than 24 hours.
 */
export async function GET(req: Request) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { items, stats } = await getActiveDiagnostics();
    return NextResponse.json({
      success: true,
      diagnostics: items,
      stats,
      ttl_policy: {
        active_ttl_hours: 24,
        auto_purge_enabled: true,
        description:
          'Failure diagnostics and fallback execution traces are preserved for exactly 24 hours before automatic purging.',
      },
    });
  } catch (err: any) {
    console.error('Error fetching AI diagnostics:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/ai/diagnostics
 * Allows admins to:
 * 1. Action: "purge_expired" - Immediately purge any expired entries older than 24h
 * 2. Action: "simulate_failure" - Trigger a simulated multi-tier fallback failure & recovery event to test diagnostics & TTL logging
 */
export async function POST(req: Request) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'simulate_failure';

    if (action === 'purge_expired') {
      const purgeResult = await purgeExpiredNow();
      return NextResponse.json({
        success: true,
        message: `Successfully purged ${purgeResult.purged} expired diagnostic records older than 24 hours.`,
        purgedCount: purgeResult.purged,
        remainingActive: purgeResult.remaining,
      });
    }

    if (action === 'simulate_failure') {
      const testFeature = body.feature || 'chatbot';
      const failedProvider = body.primary_provider || 'gemini';
      const fallbackProvider = body.fallback_provider || 'anthropic';
      const recoveryType = body.recovery_type || 'recovered'; // 'recovered' or 'exhausted'
      const simulatedRole = body.user_role || 'guest';

      const simulatedEntry = await logFailureDiagnostic({
        feature: testFeature,
        primary_provider: failedProvider,
        failed_provider: failedProvider,
        fallback_provider:
          recoveryType === 'recovered' ? fallbackProvider : undefined,
        model:
          recoveryType === 'recovered'
            ? 'claude-3-haiku'
            : 'gemini-3.5-flash-lite',
        error_message:
          recoveryType === 'recovered'
            ? `Primary provider '${failedProvider}' timed out after 3500ms. Fallback successfully engaged with '${fallbackProvider}'.`
            : `Primary provider '${failedProvider}' quota exhausted (429 Too Many Requests). Fallback chain completely exhausted.`,
        error_type:
          recoveryType === 'recovered' ? 'TIMEOUT' : 'RATE_LIMIT_EXCEEDED',
        user_identifier: 'simulated_test_user',
        user_role: simulatedRole,
        latency_ms: recoveryType === 'recovered' ? 185 : 4200,
        attempt_number: recoveryType === 'recovered' ? 2 : 3,
        recovery_status:
          recoveryType === 'recovered' ? 'recovered' : 'exhausted',
        metadata: {
          simulated: true,
          client_ip: '127.0.0.1',
          test_scenario:
            recoveryType === 'recovered'
              ? 'Multi-Tier Fallback Recovery'
              : 'Complete Provider Outage',
        },
      });

      return NextResponse.json({
        success: true,
        message:
          'Simulated failure diagnostic and fallback event recorded with active 24-hour TTL.',
        entry: simulatedEntry,
      });
    }

    return NextResponse.json(
      { error: `Unknown action '${action}'` },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('Error handling AI diagnostics POST:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/ai/diagnostics
 * Clears all failure diagnostics on demand.
 */
export async function DELETE(req: Request) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await clearAllDiagnostics();
    return NextResponse.json({
      success: true,
      message: 'Failure diagnostics history successfully cleared.',
    });
  } catch (err: any) {
    console.error('Error clearing diagnostics:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
