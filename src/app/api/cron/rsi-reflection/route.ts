import { NextRequest, NextResponse } from 'next/server';
import { getRsiCoordinator } from '@/lib/ai/co-founder/rsi';
import { FailureClass } from '@/lib/ai/co-founder/rsi/types';
import { getServiceClient } from '@/lib/supabase/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function mapFailureClass(
  blockerCode?: string,
  eventType?: string
): FailureClass {
  const code = (blockerCode || eventType || '').toLowerCase();
  if (
    code.includes('tool') ||
    code.includes('schema') ||
    code.includes('param')
  ) {
    return 'tool_schema';
  }
  if (
    code.includes('policy') ||
    code.includes('permission') ||
    code.includes('forbidden')
  ) {
    return 'policy';
  }
  if (
    code.includes('timeout') ||
    code.includes('latency') ||
    code.includes('abort')
  ) {
    return 'latency';
  }
  if (
    code.includes('cost') ||
    code.includes('quota') ||
    code.includes('budget')
  ) {
    return 'cost';
  }
  if (
    code.includes('context') ||
    code.includes('missing') ||
    code.includes('not_found')
  ) {
    return 'missing_context';
  }
  return 'model_quality';
}

export async function GET(req: NextRequest) {
  try {
    // 1. Fail-closed authorization
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. RSI Feature Flag check
    const rsi = getRsiCoordinator();
    if (!rsi.config.enabled || !rsi.config.reflectionEnabled) {
      return NextResponse.json({
        success: true,
        status: 'skipped',
        reason: 'RSI or Reflection engine is disabled via feature flags',
      });
    }

    // 3. Query failure events from the past 24 hours
    const db = getServiceClient();
    const twentyFourHoursAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: failureEvents, error: dbError } = await db
      .from('workforce_task_events')
      .select(
        'event_id, event_type, member_id, role_id, task_id, blocker_code, tool_error_count, retry_count, verification_status, metadata'
      )
      .gte('occurred_at', twentyFourHoursAgo)
      .or(
        'tool_error_count.gt.0,retry_count.gt.0,blocker_code.not.is.null,verification_status.eq.failed'
      )
      .order('occurred_at', { ascending: false })
      .limit(100);

    if (dbError) {
      console.error(
        '[RsiReflectionCron] Failed to fetch task failure events:',
        dbError
      );
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to query workforce failure telemetry',
          details: dbError.message,
        },
        { status: 500 }
      );
    }

    if (!failureEvents || failureEvents.length === 0) {
      return NextResponse.json({
        success: true,
        status: 'healthy',
        message: 'No workforce failure patterns detected in the last 24 hours.',
        eventsAnalyzed: 0,
        candidatesCreated: 0,
        gapsIdentified: 0,
      });
    }

    // 4. Cluster failures by member_id and root issue
    const clusteredFailures = new Map<
      string,
      {
        memberId: string;
        roleId: string;
        blockerCode?: string;
        eventType: string;
        sampleError: string;
        eventIds: string[];
      }
    >();

    for (const evt of failureEvents) {
      const clusterKey = `${evt.member_id}:${evt.blocker_code || evt.event_type}`;
      const existing = clusteredFailures.get(clusterKey);
      const sampleMsg =
        evt.metadata?.errorMessage ||
        evt.metadata?.error ||
        evt.blocker_code ||
        `Task failure in ${evt.event_type}`;

      if (existing) {
        existing.eventIds.push(evt.event_id);
      } else {
        clusteredFailures.set(clusterKey, {
          memberId: evt.member_id,
          roleId: evt.role_id,
          blockerCode: evt.blocker_code || undefined,
          eventType: evt.event_type,
          sampleError: String(sampleMsg).slice(0, 300),
          eventIds: [evt.event_id],
        });
      }
    }

    // 5. Turn recurring patterns (count >= 2) into candidate lessons
    let candidatesCreated = 0;
    let gapsIdentified = 0;
    const createdLessons: string[] = [];

    for (const cluster of clusteredFailures.values()) {
      if (cluster.eventIds.length >= 2) {
        const failureClass = mapFailureClass(
          cluster.blockerCode,
          cluster.eventType
        );
        const lessonDesc = `Automated observation for ${cluster.memberId} (${cluster.roleId}): Recurring failure in ${cluster.eventType} (${cluster.eventIds.length} occurrences in 24h).`;

        const res = await rsi.reflection.createCandidateLesson({
          failureClass,
          lesson: lessonDesc,
          observedFailure: cluster.sampleError,
          hypothesis: `Review tool parameter schemas and error tolerance for ${cluster.memberId}.`,
          evidenceRefs: cluster.eventIds.slice(0, 5).map((id) => `event:${id}`),
          initialConfidence: Math.min(
            0.85,
            0.5 + cluster.eventIds.length * 0.1
          ),
        });

        if (res.success && res.candidateId) {
          candidatesCreated++;
          createdLessons.push(res.candidateId);
        }

        // If blocker code indicates a missing capability, record a capability gap
        if (
          failureClass === 'tool_schema' ||
          cluster.blockerCode?.includes('MISSING_CAPABILITY')
        ) {
          const gapRes = await rsi.gapDetector.recordGap({
            title: `Capability Gap: ${cluster.memberId} ${cluster.eventType}`,
            description: cluster.sampleError,
            category: failureClass,
            evidenceRefs: cluster.eventIds
              .slice(0, 5)
              .map((id) => `event:${id}`),
            severity: cluster.eventIds.length > 5 ? 'high' : 'medium',
            factors: {
              impact: 3,
              confidence: 0.8,
              urgency: cluster.eventIds.length > 5 ? 4 : 2,
              recurrence: cluster.eventIds.length,
              effort: 2,
              riskPenalty: 0.2,
            },
          });

          if (gapRes.success) {
            gapsIdentified++;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      status: 'completed',
      eventsAnalyzed: failureEvents.length,
      clustersFound: clusteredFailures.size,
      candidatesCreated,
      gapsIdentified,
      createdLessonIds: createdLessons,
      dryRun: rsi.config.dryRun,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[RsiReflectionCron] Unexpected fatal error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'RSI reflection cron execution failed',
      },
      { status: 500 }
    );
  }
}
