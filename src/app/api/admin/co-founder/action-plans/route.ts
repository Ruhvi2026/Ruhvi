import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/service';
import {
  generateActionPlanFromStrategy,
  saveActionPlan,
  executeActionPlanToTaskManager,
} from '@/lib/ai/co-founder/action-planner';
import { formulateStrategicSolution } from '@/lib/ai/co-founder/strategy-engine';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const supabase = getServiceClient();
    const { data: plans, error } = await supabase
      .from('co_founder_action_plans')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      plans: plans || [],
    });
  } catch (err: any) {
    console.error('Error in GET /api/admin/co-founder/action-plans:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      action,
      planId,
      strategyTitle,
      strategyObjective,
      strategyRecommendation,
      staffUserId,
    } = body;

    // Action 1: Execute existing action plan into Task Manager
    if (action === 'execute') {
      if (!planId) {
        return NextResponse.json(
          { error: 'planId is required for execution' },
          { status: 400 }
        );
      }

      const execRes = await executeActionPlanToTaskManager(
        planId,
        staffUserId || '00000000-0000-0000-0000-000000000000'
      );

      return NextResponse.json(execRes);
    }

    // Action 2: Generate and save new action plan
    if (!strategyTitle || !strategyObjective) {
      return NextResponse.json(
        { error: 'strategyTitle and strategyObjective are required' },
        { status: 400 }
      );
    }

    const solution = formulateStrategicSolution({
      title: strategyTitle,
      issueType: strategyTitle,
      additionalContext: strategyRecommendation,
    });

    const plan = generateActionPlanFromStrategy(solution, {
      problemStatement: body.problemStatement,
      recommendationId: body.recommendationId,
      signalId: body.signalId,
    });

    const saveRes = await saveActionPlan(plan, staffUserId);

    return NextResponse.json({
      success: saveRes.success,
      planId: saveRes.planId,
      plan,
      error: saveRes.error,
    });
  } catch (err: any) {
    console.error('Error in POST /api/admin/co-founder/action-plans:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
