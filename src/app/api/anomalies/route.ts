import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/require-admin';
import {
  detectBusinessAnomalies,
  ENABLED_ANOMALY_RULES,
} from '@/lib/intelligence/anomaly-detector';
import {
  getAnomalyLifecycleRegistry,
  type AnomalyState,
} from '@/lib/intelligence/anomaly-lifecycle';
import { type DateRangePreset } from '@/lib/intelligence/metrics-service';

/**
 * ============================================================================
 * GET & PATCH /api/anomalies
 * ============================================================================
 * Authenticated API for Business Anomaly Triage & Lifecycle Management (Phase 22).
 *
 * Guarantees:
 * 1. Strict RBAC: Protected by requireAdmin(); customers & public callers receive 401/403.
 * 2. Deterministic Auditability: Staff acknowledgements and resolutions record actor
 *    identity and timestamp.
 * 3. Zero Automatic Repair: Action triage only; does not mutate production data silently.
 */

const TriageActionSchema = z.object({
  action: z.enum(['acknowledge', 'resolve']),
  anomalyId: z.string().min(1, 'Anomaly ID must not be empty'),
  reason: z
    .string()
    .min(3, 'Resolution reason must be at least 3 characters')
    .optional(),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok || !auth.role) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized' },
        { status: auth.status || 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const stateFilter =
      (searchParams.get('state') as AnomalyState | 'all') || 'all';
    const severityFilter =
      (searchParams.get('severity') as 'warning' | 'critical' | 'all') || 'all';
    const shouldScan = searchParams.get('scan') !== 'false';
    const preset =
      (searchParams.get('preset') as DateRangePreset) || 'last_7_days';

    const registry = getAnomalyLifecycleRegistry();

    // Trigger fresh deterministic scan if requested
    if (shouldScan) {
      const scanReport = await detectBusinessAnomalies({
        callerRole: auth.role,
        preset,
      });

      // Reconcile findings with lifecycle registry
      registry.reconcileWithScan(scanReport.anomalies, {
        evaluatedRuleIds: Object.keys(ENABLED_ANOMALY_RULES),
      });
    }

    const allRecords = registry.getRecords();
    const filteredRecords = registry.getRecords({
      state: stateFilter,
      severity: severityFilter,
    });

    const summary = {
      total: allRecords.length,
      open: allRecords.filter((r) => r.state === 'open').length,
      acknowledged: allRecords.filter((r) => r.state === 'acknowledged').length,
      resolved: allRecords.filter((r) => r.state === 'resolved').length,
      critical: allRecords.filter(
        (r) => r.severity === 'critical' && r.state !== 'resolved'
      ).length,
      warning: allRecords.filter(
        (r) => r.severity === 'warning' && r.state !== 'resolved'
      ).length,
    };

    return NextResponse.json({
      success: true,
      data: {
        summary,
        records: filteredRecords,
        evaluatedAt: new Date().toISOString(),
        callerRole: auth.role,
      },
    });
  } catch (err: any) {
    console.error('[AnomaliesAPI] GET failed:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok || !auth.role) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized' },
        { status: auth.status || 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = TriageActionSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { action, anomalyId, reason } = parseResult.data;
    const registry = getAnomalyLifecycleRegistry();
    const actorId = auth.uid || 'admin_user';

    let updatedRecord;
    if (action === 'acknowledge') {
      updatedRecord = registry.acknowledge(anomalyId, actorId);
    } else if (action === 'resolve') {
      if (!reason) {
        return NextResponse.json(
          { success: false, error: 'Resolution reason is required' },
          { status: 400 }
        );
      }
      updatedRecord = registry.resolve(anomalyId, reason);
    }

    return NextResponse.json({
      success: true,
      data: {
        record: updatedRecord,
        updatedBy: actorId,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error('[AnomaliesAPI] PATCH failed:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
