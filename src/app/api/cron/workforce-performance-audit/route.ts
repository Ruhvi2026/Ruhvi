import { NextRequest, NextResponse } from 'next/server';
import { performanceIntelligenceWorker } from '@/lib/ai/co-founder/workers/worker-performance-intelligence';
import { getServiceClient } from '@/lib/supabase/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get('timeframe') || '7d';

    const result = await performanceIntelligenceWorker.execute({
      task: 'Scheduled workforce performance audit & snapshot persistence',
      timeframe,
    });

    const report = result.data?.report;

    // PERF-11: Validate worker execution status and require report before returning success
    if (result.executionStatus === 'failed' || !report || !report.reportId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Workforce audit failed or returned missing report',
          problems: result.problems,
        },
        { status: 500 }
      );
    }

    try {
      const db = getServiceClient();
      // Persist snapshot to workforce_performance_snapshots (PERF-11: inspect errors)
      for (const card of report.scorecards || []) {
        const { error: cardError } = await db
          .from('workforce_performance_snapshots')
          .upsert(
            {
              member_id: card.memberId,
              entity_type: card.entityType,
              role_id: card.roleId,
              period_from: card.period.from,
              period_to: card.period.to,
              overall_score: card.overallScore,
              grade: card.grade,
              coverage_state: card.state,
              confidence: card.confidence,
              confidence_score: card.confidenceScore,
              weighted_coverage: card.weightedCoverage,
              kpis: card.kpis,
              task_counts: card.taskCounts,
              strengths: card.strengths,
              weaknesses: card.weaknesses,
              achievement_points: card.achievementPoints,
              score_version: card.scoreVersion,
              calculated_at: card.calculatedAt,
            },
            { onConflict: 'member_id,period_from,period_to' }
          );
        if (cardError) {
          throw new Error(
            `workforce_performance_snapshots upsert failed: ${cardError.message}`
          );
        }
      }

      // Persist audit run record
      const { error: runError } = await db.from('workforce_audit_runs').insert({
        id: report.reportId,
        report_type: report.reportType,
        period_from: report.period.from,
        period_to: report.period.to,
        data_health_status: report.dataHealth.status,
        population_summary: report.populationSummary,
        recommendations: report.recommendations,
        audit_payload: report,
        created_at: report.generatedAt,
      });
      if (runError) {
        throw new Error(
          `workforce_audit_runs insert failed: ${runError.message}`
        );
      }
    } catch (dbErr: any) {
      console.error(
        '[WorkforcePerformanceAuditCron] DB persistence failed:',
        dbErr
      );
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to persist audit snapshots to database',
          details: dbErr?.message || String(dbErr),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reportId: report?.reportId,
      findings: result.findings,
      timestamp: result.timestamp,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Workforce audit cron error' },
      { status: 500 }
    );
  }
}
