import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { buildLiveWorkforceStatus } from '@/lib/ai/co-founder/workers/status-builder';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.status }
      );
    }

    const status = await buildLiveWorkforceStatus();

    return NextResponse.json({
      nodes: status.nodes,
      summary: {
        totalWorkers: status.nodes.length,
        activeWorkers: status.nodes.filter(
          (n) =>
            n.state === 'analyzing' ||
            n.state === 'executing' ||
            n.state === 'generating' ||
            n.state === 'thinking' ||
            n.state === 'waiting_approval'
        ).length,
        pendingApprovals: status.pendingApprovals,
        activeSignals: status.activeSignals,
        criticalSignals: status.criticalSignals,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch workforce status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
