import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { performanceIntelligenceWorker } from '@/lib/ai/co-founder/workers/worker-performance-intelligence';
import { getServiceClient } from '@/lib/supabase/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.status }
      );
    }

    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get('timeframe') || '7d';
    const memberId = searchParams.get('memberId') || undefined;

    const result = await performanceIntelligenceWorker.execute({
      task: memberId
        ? `Generate scorecard for ${memberId}`
        : 'Workforce performance intelligence audit',
      timeframe,
      parameters: {
        memberId,
        timeframe,
      },
    });

    return NextResponse.json({
      success: true,
      data: result.data || {},
      findings: result.findings,
      evidence: result.evidence,
      problems: result.problems,
      opportunities: result.opportunities,
      recommendations: result.recommendations,
      timestamp: result.timestamp,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to fetch workforce performance intelligence';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.status }
      );
    }

    const body = await req.json();
    const { action, alertId, reason } = body;

    if (action === 'acknowledge_alert' && alertId) {
      try {
        const db = getServiceClient();
        await db
          .from('workforce_alerts')
          .update({
            acknowledged_at: new Date().toISOString(),
          })
          .eq('id', alertId);
      } catch {}
      return NextResponse.json({
        success: true,
        message: 'Alert acknowledged',
      });
    }

    if (action === 'resolve_alert' && alertId) {
      try {
        const db = getServiceClient();
        await db
          .from('workforce_alerts')
          .update({
            resolved_at: new Date().toISOString(),
          })
          .eq('id', alertId);
      } catch {}
      return NextResponse.json({ success: true, message: 'Alert resolved' });
    }

    // Default trigger re-evaluation
    const result = await performanceIntelligenceWorker.execute({
      task: 'Trigger workforce performance audit run',
      timeframe: body.timeframe || '7d',
    });

    return NextResponse.json({
      success: true,
      data: result.data || {},
      message: 'Audit executed successfully',
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Action execution failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
