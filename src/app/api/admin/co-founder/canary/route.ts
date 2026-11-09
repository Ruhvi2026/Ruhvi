import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import {
  workforceCanaryEngine,
  CanaryStage,
} from '@/lib/ai/co-founder/workforce/canary-engine';
import { workforceScorecardEngine } from '@/lib/ai/co-founder/workforce/scorecard-engine';
import { isGlobalKillSwitchActive } from '@/lib/ai/co-founder/workforce/config';
import { WorkerId } from '@/lib/ai/co-founder/workforce/types';

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
    const workerId = (searchParams.get('workerId') || '') as WorkerId;

    const canaryStates = workforceCanaryEngine.getAllCanaryStates();
    const shadowEvaluations = workforceCanaryEngine.getShadowEvaluations(
      workerId ? workerId : undefined,
      50
    );
    const scorecards = workerId
      ? [workforceScorecardEngine.generateScorecard(workerId)]
      : workforceScorecardEngine.generateAllScorecards();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      globalKillSwitchActive: isGlobalKillSwitchActive(),
      canaryStates,
      shadowEvaluations,
      scorecards,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch canary state';
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

    const body = await req.json().catch(() => ({}));
    const action = body.action || '';

    if (action === 'update_stage') {
      const { workerId, stage, trafficPercentage, reason } = body;
      if (!workerId || !stage) {
        return NextResponse.json(
          { error: 'workerId and stage are required' },
          { status: 400 }
        );
      }
      const updated = workforceCanaryEngine.setWorkerStage(
        workerId as WorkerId,
        stage as CanaryStage,
        trafficPercentage,
        reason
      );
      return NextResponse.json({ success: true, updated });
    }

    if (action === 'run_shadow') {
      const { workerId, inputTask, baselineSummary, candidateOutput } = body;
      if (!workerId || !inputTask || !baselineSummary || !candidateOutput) {
        return NextResponse.json(
          { error: 'Missing required parameters for shadow evaluation' },
          { status: 400 }
        );
      }
      const evalResult = await workforceCanaryEngine.runShadowEvaluation({
        workerId: workerId as WorkerId,
        inputTask,
        baselineSummary,
        candidateOutput,
      });
      return NextResponse.json({ success: true, evalResult });
    }

    if (action === 'rollback_worker') {
      const { workerId, targetStage, reason } = body;
      if (!workerId) {
        return NextResponse.json(
          { error: 'workerId is required' },
          { status: 400 }
        );
      }
      const result = await workforceCanaryEngine.executeWorkerRollback(
        workerId as WorkerId,
        targetStage || 'shadow',
        reason
      );
      return NextResponse.json({ success: true, result });
    }

    if (action === 'global_rollback') {
      const { reason } = body;
      const result = workforceCanaryEngine.executeGlobalRollback(reason);
      return NextResponse.json({ success: true, result });
    }

    if (action === 'test_rollback') {
      // Deterministic drill testing worker rollback mechanism
      const testWorkerId: WorkerId = 'worker_sales_conversion';
      // 1. Stage in canary
      workforceCanaryEngine.setWorkerStage(
        testWorkerId,
        'canary',
        10,
        'Rollback drill test setup'
      );
      // 2. Execute rollback
      const rollbackResult = await workforceCanaryEngine.executeWorkerRollback(
        testWorkerId,
        'shadow',
        'Rollback drill verification'
      );
      return NextResponse.json({
        success: true,
        drillVerified: rollbackResult.newStage === 'shadow',
        rollbackResult,
      });
    }

    return NextResponse.json(
      { error: `Unknown action '${action}'` },
      { status: 400 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Canary action failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
