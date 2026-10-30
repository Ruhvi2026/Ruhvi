import 'server-only';

export interface AutomationRunRecord {
  runId: string;
  startedAt: number;
}

export function generateRunId(jobName = 'automations'): string {
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${jobName}_${dateStr}_${randomSuffix}`;
}

/**
 * Record the start of a cron automation run in the durable ledger.
 */
export async function startAutomationRun(
  supabase: any,
  jobName = 'daily_automations'
): Promise<AutomationRunRecord> {
  const startedAt = Date.now();
  const runId = generateRunId(jobName);

  try {
    if (supabase?.from) {
      const { error } = await supabase.from('cron_automation_runs').insert({
        run_id: runId,
        job_name: jobName,
        status: 'running',
        started_at: new Date(startedAt).toISOString(),
        step_counts: {},
        errors: [],
      });

      if (error) {
        console.warn(
          `[automation-ledger] Could not persist run start for ${runId}:`,
          error.message
        );
      }
    }
  } catch (err: any) {
    console.warn(
      `[automation-ledger] Failed to initialize run ${runId}:`,
      err?.message
    );
  }

  return { runId, startedAt };
}

/**
 * Record the completion of a cron automation run with final step counts, errors, and duration.
 */
export async function finishAutomationRun(
  supabase: any,
  params: {
    runId: string;
    startedAt: number;
    stepCounts: Record<string, any>;
    errors?: any[];
  }
): Promise<{
  status: 'completed' | 'partial_failure' | 'failed';
  durationMs: number;
}> {
  const { runId, startedAt, stepCounts, errors = [] } = params;
  const completedAt = Date.now();
  const durationMs = completedAt - startedAt;

  const hasErrors = errors.length > 0;
  const status = hasErrors ? 'partial_failure' : 'completed';

  try {
    if (supabase?.from) {
      const { error } = await supabase
        .from('cron_automation_runs')
        .update({
          status,
          completed_at: new Date(completedAt).toISOString(),
          duration_ms: durationMs,
          step_counts: stepCounts,
          errors: errors.map((e) =>
            typeof e === 'string' ? e : e?.message || JSON.stringify(e)
          ),
        })
        .eq('run_id', runId);

      if (error) {
        console.warn(
          `[automation-ledger] Could not update run finish for ${runId}:`,
          error.message
        );
      }
    }
  } catch (err: any) {
    console.warn(
      `[automation-ledger] Failed to persist run completion for ${runId}:`,
      err?.message
    );
  }

  return { status, durationMs };
}

/**
 * Enforce idempotency on campaign email dispatches.
 * Returns claimed: true if this is the first dispatch attempt for (userId, campaignType, campaignPeriod).
 * Returns claimed: false if already dispatched or in-progress, preventing duplicate emails.
 */
export async function claimMarketingDispatch(
  supabase: any,
  params: {
    userId: string;
    campaignType: string;
    campaignPeriod: string;
    metadata?: Record<string, any>;
  }
): Promise<{ claimed: boolean; dispatchId?: string }> {
  const { userId, campaignType, campaignPeriod, metadata = {} } = params;

  try {
    if (!supabase?.from) {
      // In disconnected fallback environment, allow single dispatch
      return { claimed: true };
    }

    // Try to insert a pending record. The database UNIQUE constraint prevents duplicate dispatches.
    const { data, error } = await supabase
      .from('marketing_campaign_dispatches')
      .insert({
        user_id: userId,
        campaign_type: campaignType,
        campaign_period: campaignPeriod,
        status: 'pending',
        metadata,
      })
      .select('id')
      .single();

    if (error) {
      // Duplicate key or conflict means already claimed/sent
      return { claimed: false };
    }

    return { claimed: true, dispatchId: data?.id };
  } catch {
    // If table doesn't exist, fail-safe claim
    return { claimed: true };
  }
}

/**
 * Update dispatch status after sending email.
 */
export async function completeMarketingDispatch(
  supabase: any,
  dispatchId?: string,
  success = true,
  errorMessage?: string
): Promise<void> {
  if (!dispatchId || !supabase?.from) return;

  try {
    await supabase
      .from('marketing_campaign_dispatches')
      .update({
        status: success ? 'sent' : 'failed',
        error_message: errorMessage || null,
        dispatched_at: new Date().toISOString(),
      })
      .eq('id', dispatchId);
  } catch (err: any) {
    console.warn(
      `[automation-ledger] Failed to mark dispatch ${dispatchId}:`,
      err?.message
    );
  }
}
