import { getServiceClient } from '@/lib/supabase/service';

// ---------------------------------------------------------------------------
// COD rules engine.
//
// Preserves the live checkout calculation EXACTLY (10% deposit of totalPayable,
// remaining 90% + ₹49 COD charge on delivery — see src/app/checkout/page.tsx).
// This module only handles the POST-purchase side: recording qualifying
// refusals/uncollected outcomes and toggling COD eligibility per customer.
//
// Public policy says "multiple" refusals — the exact threshold is NOT a public
// fact. It is read from the configurable `settings.cod_refusal_threshold`
// (seeded default 2) and can be changed by staff without a code change.
// ---------------------------------------------------------------------------

export interface CodEligibilityResult {
  cod_disabled: boolean;
  cod_refusal_count: number;
  last_refusal_at: string | null;
}

export interface RecordRefusalInput {
  customerId: string;
  orderId: string;
  result?: string; // 'refused' | 'uncollected' | other delivery outcome
  notes?: string;
}

/** Read the configurable refusal threshold (default 2). */
export async function getCodRefusalThreshold(supabase?: any): Promise<number> {
  const client = supabase || getServiceClient();
  try {
    const { data } = await client
      .from('settings')
      .select('value')
      .eq('key', 'cod_refusal_threshold')
      .maybeSingle();
    const value = Number(data?.value);
    if (!Number.isFinite(value) || value < 1) return 2;
    return Math.floor(value);
  } catch {
    return 2;
  }
}

/** Fetch a customer's current COD eligibility state. */
export async function getCodEligibility(
  customerId: string
): Promise<CodEligibilityResult> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from('cod_eligibility')
    .select('cod_disabled, cod_refusal_count, last_refusal_at')
    .eq('customer_id', customerId)
    .maybeSingle();

  return {
    cod_disabled: data?.cod_disabled ?? false,
    cod_refusal_count: data?.cod_refusal_count ?? 0,
    last_refusal_at: data?.last_refusal_at ?? null,
  };
}

/**
 * Record a COD refusal/uncollected outcome.
 *
 * Only `refused` and `uncollected` outcomes count toward COD eligibility.
 *
 * Concurrency-safe design:
 *  1. The dedupe marker (`cod_eligibility_events`) is inserted FIRST; its
 *     UNIQUE constraint on order_id makes a duplicate insert fail atomically.
 *     If the insert conflicts, the refusal was already recorded — no-op.
 *  2. Only after a successful marker insert do we increment the counter, using
 *     an atomic `UPDATE ... SET cod_refusal_count = cod_refusal_count + 1`
 *     (upsert via `INSERT ... ON CONFLICT` to create the row when missing).
 *  3. When the count reaches the configurable threshold, COD is disabled.
 */
export async function recordCodRefusal(
  input: RecordRefusalInput
): Promise<{ ok: boolean; disabled: boolean; refusal_count: number; error?: string }> {
  const qualifying = ['refused', 'uncollected'];
  if (!qualifying.includes((input.result || '').toLowerCase())) {
    return { ok: false, disabled: false, refusal_count: 0, error: 'Not a qualifying COD refusal outcome' };
  }

  const supabase = getServiceClient();

  // Step 1 — atomic dedupe marker. Unique on order_id, so concurrent retries
  // of the same order can only succeed once.
  const { error: markerError } = await supabase.from('cod_eligibility_events').insert({
    customer_id: input.customerId,
    order_id: input.orderId,
    result: input.result,
    notes: input.notes || null,
  });
  if (markerError) {
    if (markerError.code === '23505') {
      // Already recorded for this order — idempotent no-op.
      const state = await getCodEligibility(input.customerId);
      return { ok: true, disabled: state.cod_disabled, refusal_count: state.cod_refusal_count };
    }
    return { ok: false, disabled: false, refusal_count: 0, error: markerError.message };
  }

  // Step 2 — atomic counter increment via the increment_cod_refusal RPC
  // (single INSERT ... ON CONFLICT DO UPDATE ... RETURNING). The returned
  // value is the authoritative post-increment count.
  const { data: incrementedCount, error: incrementError } = await supabase.rpc(
    'increment_cod_refusal',
    { p_customer_id: input.customerId }
  );

  if (incrementError) {
    console.error('COD counter increment failed:', incrementError);
    return { ok: false, disabled: false, refusal_count: 0, error: incrementError.message };
  }

  const threshold = await getCodRefusalThreshold(supabase);
  const nextCount = Number(incrementedCount) || 1;

  const shouldDisable = nextCount >= threshold;
  if (shouldDisable) {
    await supabase
      .from('cod_eligibility')
      .update({ cod_disabled: true })
      .eq('customer_id', input.customerId);
  }

  return { ok: true, disabled: shouldDisable, refusal_count: nextCount };
}

/** Re-enable COD for a customer (staff action, clears the counter). */
export async function resetCodEligibility(
  customerId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getServiceClient();
  const { error } = await supabase
    .from('cod_eligibility')
    .update({
      cod_disabled: false,
      cod_refusal_count: 0,
      last_refusal_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('customer_id', customerId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
