/**
 * AI Credential Manager
 *
 * Centralized service for managing provider API credentials including:
 * - Health state tracking (healthy, rate_limited, cooldown, invalid)
 * - Priority-based credential selection
 * - Atomic state transitions with optimistic locking (concurrency-safe)
 * - Exponential backoff cooldown calculation
 * - Per-credential usage tracking
 *
 * Concurrency Safety:
 * Since this runs in serverless (Vercel), we cannot use in-process locks.
 * Instead, we use DB-level optimistic locking via the `updated_at` timestamp.
 * Only the first concurrent request to trigger a state transition wins;
 * subsequent requests read the already-updated state.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { encryptApiKey, decryptApiKey } from './credential-encryption';

export interface ProviderCredential {
  id: string;
  provider_id: string;
  display_name: string;
  priority: number;
  is_enabled: boolean;
  health_status:
    | 'healthy'
    | 'rate_limited'
    | 'quota_exhausted'
    | 'cooldown'
    | 'invalid'
    | 'unknown';
  failure_count: number;
  success_count: number;
  total_requests: number;
  rate_limit_count: number;
  quota_exhaustion_count: number;
  cooldown_until: string | null;
  last_used_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  // encrypted_key is NEVER returned to the application layer directly
  // It is fetched separately when needed for the actual API call
}

export interface CredentialForRequest extends ProviderCredential {
  apiKey: string; // Decrypted key for the actual request
}

// Exponential backoff cooldown schedule (in seconds)
const COOLDOWN_SCHEDULE = [60, 120, 240, 480, 960, 1920, 3600]; // Max 1 hour
const MAX_COOLDOWN_SECONDS = 3600;

/**
 * Calculate cooldown duration based on failure count using exponential backoff
 */
export function getNextCooldownSeconds(failureCount: number): number {
  const index = Math.min(failureCount, COOLDOWN_SCHEDULE.length - 1);
  return COOLDOWN_SCHEDULE[index];
}

/**
 * Create a Supabase admin client for credential operations.
 * Uses service role to bypass RLS since credentials are server-only.
 */
function createAdminClient(cookieStore?: any) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
      'https://igrkrkxdantrolbldapj.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore?.getAll() || [];
        },
        setAll() {},
      },
    }
  );
}

/**
 * Get all healthy credentials for a provider, ordered by priority.
 * A credential is "healthy" if:
 *   - is_enabled = true
 *   - health_status is 'healthy' or 'unknown'
 *   - OR health_status is 'rate_limited'/'cooldown'/'quota_exhausted' but cooldown_until has passed
 *
 * Returns raw credential rows WITHOUT the encrypted key (key fetched separately).
 */
export async function getHealthyCredentials(
  providerId: string,
  supabaseAdmin?: any
): Promise<ProviderCredential[]> {
  const db =
    supabaseAdmin || createAdminClient(await cookies().catch(() => null));

  const { data, error } = await db
    .from('ai_provider_credentials')
    .select(
      'id, provider_id, display_name, priority, is_enabled, health_status, failure_count, success_count, total_requests, rate_limit_count, quota_exhaustion_count, cooldown_until, last_used_at, last_success_at, last_failure_at, last_error, created_at, updated_at'
    )
    .eq('provider_id', providerId)
    .eq('is_enabled', true)
    .neq('health_status', 'invalid')
    .order('priority', { ascending: true });

  if (error || !data) return [];

  const now = Date.now();

  // Filter out credentials still in cooldown
  return data.filter((c: any) => {
    if (c.health_status === 'healthy' || c.health_status === 'unknown')
      return true;
    if (c.cooldown_until) {
      return new Date(c.cooldown_until).getTime() <= now;
    }
    return false;
  });
}

/**
 * Get all credentials for a provider (for admin display — no keys, no unhealthy filter).
 */
export async function getAllCredentials(
  providerId: string,
  supabaseAdmin?: any
): Promise<ProviderCredential[]> {
  const db =
    supabaseAdmin || createAdminClient(await cookies().catch(() => null));

  const { data, error } = await db
    .from('ai_provider_credentials')
    .select(
      'id, provider_id, display_name, priority, is_enabled, health_status, failure_count, success_count, total_requests, rate_limit_count, quota_exhaustion_count, cooldown_until, last_used_at, last_success_at, last_failure_at, last_error, created_at, updated_at'
    )
    .eq('provider_id', providerId)
    .order('priority', { ascending: true });

  return data || [];
}

/**
 * Get the raw API key for a credential (server-side only).
 * Returns empty string if credential not found.
 */
export async function getCredentialKey(
  credentialId: string,
  supabaseAdmin?: any
): Promise<string> {
  const db =
    supabaseAdmin || createAdminClient(await cookies().catch(() => null));

  const { data, error } = await db
    .from('ai_provider_credentials')
    .select('encrypted_key')
    .eq('id', credentialId)
    .single();

  if (error || !data) return '';

  // Keys are stored AES-256-GCM encrypted at rest (see credential-encryption).
  // Legacy plaintext rows are still returned as-is to avoid breaking existing data.
  return decryptApiKey(data.encrypted_key || '');
}

/**
 * Atomically mark a credential as rate-limited and start its cooldown.
 * Uses optimistic locking (updated_at check) to prevent race conditions.
 *
 * Concurrency behavior:
 * - First request to detect rate limit wins the state transition
 * - Subsequent concurrent requests will see health_status='rate_limited' on next read
 * - This prevents multiple requests from independently marking the same credential
 */
export async function markCredentialRateLimited(
  credentialId: string,
  supabaseAdmin?: any
): Promise<{ success: boolean; cooldownSeconds: number }> {
  const db =
    supabaseAdmin || createAdminClient(await cookies().catch(() => null));

  // Fetch current state for optimistic lock + backoff calculation
  const { data: current } = await db
    .from('ai_provider_credentials')
    .select('health_status, failure_count, updated_at')
    .eq('id', credentialId)
    .single();

  if (!current) return { success: false, cooldownSeconds: 60 };

  // If already rate_limited (another concurrent request beat us), return gracefully
  if (
    current.health_status === 'rate_limited' ||
    current.health_status === 'quota_exhausted'
  ) {
    const cooldownSeconds = getNextCooldownSeconds(current.failure_count || 0);
    return { success: true, cooldownSeconds };
  }

  const newFailureCount = (current.failure_count || 0) + 1;
  const cooldownSeconds = getNextCooldownSeconds(newFailureCount);
  const cooldownUntil = new Date(
    Date.now() + cooldownSeconds * 1000
  ).toISOString();

  // Atomic update with optimistic lock: only succeeds if updated_at hasn't changed
  const { error } = await db
    .from('ai_provider_credentials')
    .update({
      health_status: 'rate_limited',
      failure_count: newFailureCount,
      rate_limit_count: db.rpc ? undefined : current.rate_limit_count, // handled below
      cooldown_until: cooldownUntil,
      last_failure_at: new Date().toISOString(),
      last_error: 'Rate limit / quota exceeded',
      // updated_at is auto-set by trigger — acts as our optimistic lock
    })
    .eq('id', credentialId)
    .eq('updated_at', current.updated_at); // Optimistic lock

  // Separately increment rate_limit_count (handles concurrent updates gracefully)
  await db
    .rpc('increment_credential_counter', {
      p_id: credentialId,
      p_field: 'rate_limit_count',
    })
    .catch(() => {
      // Fallback: direct update if RPC not available
      db.from('ai_provider_credentials')
        .update({ rate_limit_count: (current.rate_limit_count || 0) + 1 })
        .eq('id', credentialId)
        .then(() => {});
    });

  console.log(
    `[AI_RATE_LIMIT] credential=${credentialId} cooldown=${cooldownSeconds}s`
  );

  return { success: !error, cooldownSeconds };
}

/**
 * Atomically mark a credential as quota-exhausted (longer cooldown than rate limit).
 */
export async function markCredentialQuotaExhausted(
  credentialId: string,
  supabaseAdmin?: any
): Promise<{ success: boolean; cooldownSeconds: number }> {
  const db =
    supabaseAdmin || createAdminClient(await cookies().catch(() => null));

  const { data: current } = await db
    .from('ai_provider_credentials')
    .select('failure_count, updated_at, quota_exhaustion_count')
    .eq('id', credentialId)
    .single();

  if (!current)
    return { success: false, cooldownSeconds: MAX_COOLDOWN_SECONDS };

  const newFailureCount = (current.failure_count || 0) + 1;
  // Quota exhaustion gets a longer cooldown
  const cooldownSeconds = Math.min(
    getNextCooldownSeconds(newFailureCount) * 2,
    MAX_COOLDOWN_SECONDS
  );
  const cooldownUntil = new Date(
    Date.now() + cooldownSeconds * 1000
  ).toISOString();

  await db
    .from('ai_provider_credentials')
    .update({
      health_status: 'quota_exhausted',
      failure_count: newFailureCount,
      quota_exhaustion_count: (current.quota_exhaustion_count || 0) + 1,
      cooldown_until: cooldownUntil,
      last_failure_at: new Date().toISOString(),
      last_error: 'Quota exhausted',
    })
    .eq('id', credentialId)
    .eq('updated_at', current.updated_at);

  console.log(
    `[AI_QUOTA_EXHAUSTED] credential=${credentialId} cooldown=${cooldownSeconds}s`
  );

  return { success: true, cooldownSeconds };
}

/**
 * Mark a credential as permanently invalid (bad API key).
 * Unlike rate limits, this is not recovered automatically.
 * Admin must manually reset or delete.
 */
export async function markCredentialInvalid(
  credentialId: string,
  errorMessage: string,
  supabaseAdmin?: any
): Promise<void> {
  const db =
    supabaseAdmin || createAdminClient(await cookies().catch(() => null));

  await db
    .from('ai_provider_credentials')
    .update({
      health_status: 'invalid',
      last_failure_at: new Date().toISOString(),
      last_error: errorMessage,
    })
    .eq('id', credentialId);

  console.warn(
    `[AI_CREDENTIAL_INVALID] credential=${credentialId} reason="${errorMessage}"`
  );
}

/**
 * Mark a request as successful for a credential.
 * Resets failure state and updates usage stats.
 */
export async function markCredentialSuccess(
  credentialId: string,
  supabaseAdmin?: any
): Promise<void> {
  const db =
    supabaseAdmin || createAdminClient(await cookies().catch(() => null));

  const { data: current } = await db
    .from('ai_provider_credentials')
    .select('success_count, total_requests')
    .eq('id', credentialId)
    .single();

  if (!current) return;

  await db
    .from('ai_provider_credentials')
    .update({
      health_status: 'healthy',
      success_count: (current.success_count || 0) + 1,
      total_requests: (current.total_requests || 0) + 1,
      cooldown_until: null,
      last_success_at: new Date().toISOString(),
      last_used_at: new Date().toISOString(),
      last_error: null,
    })
    .eq('id', credentialId);
}

/**
 * Increment total_requests counter when a request starts.
 */
export async function incrementCredentialRequests(
  credentialId: string,
  supabaseAdmin?: any
): Promise<void> {
  const db =
    supabaseAdmin || createAdminClient(await cookies().catch(() => null));

  const { data: current } = await db
    .from('ai_provider_credentials')
    .select('total_requests')
    .eq('id', credentialId)
    .single();

  if (!current) return;

  await db
    .from('ai_provider_credentials')
    .update({
      total_requests: (current.total_requests || 0) + 1,
      last_used_at: new Date().toISOString(),
    })
    .eq('id', credentialId);
}

/**
 * Manually reset a credential's health state (admin action).
 * Clears cooldown, resets failure count.
 */
export async function resetCredentialHealth(
  credentialId: string,
  supabaseAdmin?: any
): Promise<void> {
  const db =
    supabaseAdmin || createAdminClient(await cookies().catch(() => null));

  await db
    .from('ai_provider_credentials')
    .update({
      health_status: 'unknown',
      failure_count: 0,
      cooldown_until: null,
      last_error: null,
    })
    .eq('id', credentialId);
}

/**
 * Create a new credential for a provider.
 * Returns the created credential (without the key).
 */
export async function createCredential(
  input: {
    provider_id: string;
    display_name: string;
    apiKey: string;
    priority?: number;
    is_enabled?: boolean;
  },
  supabaseAdmin?: any
): Promise<ProviderCredential | null> {
  const db =
    supabaseAdmin || createAdminClient(await cookies().catch(() => null));

  // Determine next priority if not specified
  let priority = input.priority;
  if (!priority) {
    const { data: existing } = await db
      .from('ai_provider_credentials')
      .select('priority')
      .eq('provider_id', input.provider_id)
      .order('priority', { ascending: false })
      .limit(1);
    priority = (existing?.[0]?.priority || 0) + 1;
  }

  const { data, error } = await db
    .from('ai_provider_credentials')
    .insert({
      provider_id: input.provider_id,
      display_name: input.display_name,
      encrypted_key: encryptApiKey(input.apiKey), // AES-256-GCM encrypted at rest, never returned to frontend
      priority,
      is_enabled: input.is_enabled !== false,
      health_status: 'unknown',
    })
    .select(
      'id, provider_id, display_name, priority, is_enabled, health_status, failure_count, success_count, total_requests, rate_limit_count, quota_exhaustion_count, cooldown_until, last_used_at, last_success_at, last_failure_at, last_error, created_at, updated_at'
    )
    .single();

  if (error) {
    console.error('[AI Credentials] Create failed:', error);
    return null;
  }

  return data;
}

/**
 * Check if a provider has ANY credentials in the new system.
 * Used for backward-compatibility fallback: if no credentials exist,
 * the engine falls back to the legacy apiKey in settings.
 */
export async function hasCredentials(
  providerId: string,
  supabaseAdmin?: any
): Promise<boolean> {
  const db =
    supabaseAdmin || createAdminClient(await cookies().catch(() => null));

  const { count } = await db
    .from('ai_provider_credentials')
    .select('*', { count: 'exact', head: true })
    .eq('provider_id', providerId)
    .eq('is_enabled', true);

  return (count || 0) > 0;
}

/**
 * Get credential health summary for a provider (for Dashboard/Provider cards).
 */
export async function getProviderCredentialSummary(
  providerId: string,
  supabaseAdmin?: any
): Promise<{
  total: number;
  healthy: number;
  rateLimited: number;
  invalid: number;
  totalRequests: number;
  totalSuccesses: number;
}> {
  const db =
    supabaseAdmin || createAdminClient(await cookies().catch(() => null));

  const { data } = await db
    .from('ai_provider_credentials')
    .select('health_status, total_requests, success_count')
    .eq('provider_id', providerId);

  if (!data)
    return {
      total: 0,
      healthy: 0,
      rateLimited: 0,
      invalid: 0,
      totalRequests: 0,
      totalSuccesses: 0,
    };

  const now = Date.now();
  return {
    total: data.length,
    healthy: data.filter(
      (c: any) => c.health_status === 'healthy' || c.health_status === 'unknown'
    ).length,
    rateLimited: data.filter(
      (c: any) =>
        c.health_status === 'rate_limited' ||
        c.health_status === 'quota_exhausted'
    ).length,
    invalid: data.filter((c: any) => c.health_status === 'invalid').length,
    totalRequests: data.reduce(
      (sum: number, c: any) => sum + (c.total_requests || 0),
      0
    ),
    totalSuccesses: data.reduce(
      (sum: number, c: any) => sum + (c.success_count || 0),
      0
    ),
  };
}
