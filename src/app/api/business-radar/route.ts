import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import {
  getBusinessRadarSummary,
  type DateRangePreset,
} from '@/lib/intelligence/radar-service';

/**
 * ============================================================================
 * GET /api/business-radar
 * ============================================================================
 * Permission-checked Business Radar aggregation endpoint (Track C - Phase 17).
 * Evaluates verified canonical metrics, comparison windows, trend directions,
 * and deterministic operational severities.
 *
 * Query Parameters:
 * - `preset`: 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'this_month' | 'custom'
 * - `start`: ISO start date string (required when preset='custom')
 * - `end`: ISO end date string (required when preset='custom')
 * - `fresh`: 'true' | 'false' (bypasses in-memory metric cache)
 *
 * Authorization:
 * - Requires verified internal session (Super Admin, Admin, Manager, Staff).
 * - Customers and unauthenticated callers receive 401/403.
 * - Department staff receive operations/inventory sections only; financial
 *   metrics (Gross/Net Sales, AOV) are strictly partitioned.
 */
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
    const preset =
      (searchParams.get('preset') as DateRangePreset) || 'last_7_days';
    const customStart = searchParams.get('start') || undefined;
    const customEnd = searchParams.get('end') || undefined;
    const fresh = searchParams.get('fresh') === 'true';

    const summary = await getBusinessRadarSummary(auth.role, {
      preset,
      customStart,
      customEnd,
      fresh,
    });

    return NextResponse.json({
      success: true,
      summary,
      role: auth.role,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[BusinessRadarAPI] Failed to generate summary:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          'Internal server error while generating Business Radar',
      },
      { status: 500 }
    );
  }
}
