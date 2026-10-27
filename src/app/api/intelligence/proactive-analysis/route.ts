import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import {
  getScheduledAnalysisController,
  type ScheduledAnalysisOptions,
} from '@/lib/intelligence/scheduled-proactive-analysis';
import type { DateRangePreset } from '@/lib/intelligence/metrics-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * ============================================================================
 * PROACTIVE ANALYSIS CRON & MANUAL TRIGGER API (TRACK E - PHASE 28)
 * ============================================================================
 * Endpoints for scheduled automated runs (Vercel Cron) and manual administrative triggers.
 *
 * GET /api/intelligence/proactive-analysis
 *   - Bearer CRON_SECRET: Triggers automated cron analysis run.
 *   - Admin Session: Returns scheduler status and audit history (or triggers if ?trigger=true).
 *
 * POST /api/intelligence/proactive-analysis
 *   - Admin Session: Triggers on-demand manual analysis with optional force and preset overrides.
 */

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isCronTrigger = Boolean(
      cronSecret && authHeader === `Bearer ${cronSecret}`
    );

    const controller = getScheduledAnalysisController();

    // 1. Cron Trigger Branch
    if (isCronTrigger) {
      const run = await controller.executeAnalysis({
        trigger: 'cron',
        actorId: 'system_cron',
        callerRole: 'admin',
        preset: 'last_7_days',
      });

      return NextResponse.json({
        success: run.status !== 'failed',
        timestamp: new Date().toISOString(),
        run,
      });
    }

    // 2. Admin Session Branch
    const auth = await requireAdmin();
    if (!auth.ok || !auth.role) {
      return NextResponse.json(
        {
          success: false,
          error:
            auth.error || 'Unauthorized: CRON_SECRET or Admin Session required',
        },
        { status: auth.status || 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const triggerNow = searchParams.get('trigger') === 'true';
    const force = searchParams.get('force') === 'true';
    const preset =
      (searchParams.get('preset') as DateRangePreset) || 'last_7_days';

    if (triggerNow) {
      const run = await controller.executeAnalysis({
        trigger: 'admin_manual',
        actorId: auth.uid || 'admin_user',
        callerRole: auth.role,
        preset,
        force,
      });

      return NextResponse.json({
        success: run.status !== 'failed',
        timestamp: new Date().toISOString(),
        run,
      });
    }

    // Return Status & History
    return NextResponse.json({
      success: true,
      data: {
        status: controller.getStatus(),
        history: controller.getHistory(),
      },
    });
  } catch (err: any) {
    console.error('[ProactiveAnalysisRoute] GET failed:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok || !auth.role) {
      return NextResponse.json(
        {
          success: false,
          error: auth.error || 'Unauthorized: Admin Session required',
        },
        { status: auth.status || 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const preset = (body.preset as DateRangePreset) || 'last_7_days';
    const force = Boolean(body.force);

    const controller = getScheduledAnalysisController();
    const run = await controller.executeAnalysis({
      trigger: 'admin_manual',
      actorId: auth.uid || 'admin_user',
      callerRole: auth.role,
      preset,
      force,
    });

    return NextResponse.json({
      success: run.status !== 'failed',
      timestamp: new Date().toISOString(),
      run,
    });
  } catch (err: any) {
    console.error('[ProactiveAnalysisRoute] POST failed:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
