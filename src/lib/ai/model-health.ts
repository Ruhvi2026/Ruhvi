/**
 * AI Model Health Manager
 *
 * Tracks per-model availability, capability, and health status.
 * Provides the routing engine with filtered, validated model lists
 * instead of raw discovery results.
 *
 * Key design decisions:
 * - Model health is cached in DB (ai_model_health table) to avoid re-probing on every request
 * - Validation only runs when admin triggers "Refresh Models" or cache is stale
 * - Deprecated/unavailable models are filtered out from routing
 * - Default model is configurable per provider
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export interface ModelHealthRecord {
  id: string;
  provider_id: string;
  model_id: string;
  status:
    | 'active'
    | 'degraded'
    | 'rate_limited'
    | 'unavailable'
    | 'deprecated'
    | 'invalid'
    | 'unknown';
  capabilities: ModelCapabilities;
  last_checked_at: string | null;
  last_success_at: string | null;
  is_default: boolean;
  priority: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ModelCapabilities {
  text?: boolean;
  vision?: boolean;
  json?: boolean;
  streaming?: boolean;
  function_calling?: boolean;
  embeddings?: boolean;
  image_generation?: boolean;
  long_context?: boolean;
  context_window?: number;
}

// Model ID patterns that indicate deprecation/unavailability
const DEPRECATED_PATTERNS = [
  /-exp$/i, // Experimental versions that may be removed
  /-preview-\d/i, // Versioned previews
  /^legacy-/i, // Explicitly legacy
  /\d{8}$/, // Date-suffixed old versions (e.g., model-20231010)
];

// Models known to support vision (kept in sync with provider capabilities)
const VISION_CAPABLE_PATTERNS = [
  /vision/i,
  /gemini.*pro/i,
  /gemini.*flash/i,
  /gpt-4.*vision/i,
  /gpt-4o/i,
  /claude-3/i,
];

// Models known to support JSON mode
const JSON_CAPABLE_PATTERNS = [
  /gemini/i,
  /gpt-4/i,
  /gpt-3\.5-turbo/i,
  /claude-3/i,
  /deepseek/i,
];

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
 * Infer model capabilities from model ID patterns.
 * This is a best-effort heuristic; actual capabilities
 * should be verified through provider metadata or probing.
 */
export function inferModelCapabilities(
  modelId: string,
  providerMetadata?: any
): ModelCapabilities {
  const id = modelId.toLowerCase();
  return {
    text: true, // All current models support text
    vision: VISION_CAPABLE_PATTERNS.some((p) => p.test(id)),
    json: JSON_CAPABLE_PATTERNS.some((p) => p.test(id)),
    streaming: true, // Most models support streaming
    function_calling: /gpt-4|gpt-3\.5|claude-3|gemini.*flash|gemini.*pro/i.test(
      id
    ),
    embeddings: /embed/i.test(id),
    image_generation: /dall-e|imagen|stable/i.test(id),
    long_context: /128k|200k|1m|2m|long/i.test(id) || /gemini.*1\.5/i.test(id),
    context_window: providerMetadata?.inputTokenLimit || undefined,
  };
}

/**
 * Check if a model ID matches known deprecated patterns.
 */
export function isLikelyDeprecated(modelId: string): boolean {
  return DEPRECATED_PATTERNS.some((p) => p.test(modelId));
}

/**
 * Get active (usable) models for a provider.
 * Returns models with status 'active' or 'degraded', sorted by priority.
 * Falls back to 'unknown' status models if no active ones exist.
 */
export async function getActiveModels(
  providerId: string,
  supabaseAdmin?: any
): Promise<ModelHealthRecord[]> {
  const db =
    supabaseAdmin || createAdminClient(await cookies().catch(() => null));

  const { data, error } = await db
    .from('ai_model_health')
    .select('*')
    .eq('provider_id', providerId)
    .eq('is_enabled', true)
    .in('status', ['active', 'degraded', 'unknown'])
    .order('priority', { ascending: true })
    .order('is_default', { ascending: false }); // Prefer default model first

  if (error || !data || data.length === 0) return [];
  return data;
}

/**
 * Get the configured default model for a provider.
 * Falls back to first active model if no default is set.
 */
export async function getDefaultModel(
  providerId: string,
  supabaseAdmin?: any
): Promise<ModelHealthRecord | null> {
  const db =
    supabaseAdmin || createAdminClient(await cookies().catch(() => null));

  // Try to get the explicitly set default
  const { data: defaultModel } = await db
    .from('ai_model_health')
    .select('*')
    .eq('provider_id', providerId)
    .eq('is_default', true)
    .eq('is_enabled', true)
    .in('status', ['active', 'degraded', 'unknown'])
    .single();

  if (defaultModel) return defaultModel;

  // Fall back to first active model by priority
  const activeModels = await getActiveModels(providerId, db);
  return activeModels[0] || null;
}

/**
 * Mark a specific model as unavailable (e.g., after a MODEL_ERROR).
 */
export async function markModelUnavailable(
  providerId: string,
  modelId: string,
  reason?: string,
  supabaseAdmin?: any
): Promise<void> {
  const db =
    supabaseAdmin || createAdminClient(await cookies().catch(() => null));

  await db.from('ai_model_health').upsert(
    {
      provider_id: providerId,
      model_id: modelId,
      status: 'unavailable',
      last_checked_at: new Date().toISOString(),
    },
    { onConflict: 'provider_id,model_id' }
  );

  console.warn(
    `[AI_MODEL_UNAVAILABLE] provider=${providerId} model=${modelId} reason="${reason || 'unknown'}"`
  );
}

/**
 * Mark a model as active after a successful request.
 */
export async function markModelActive(
  providerId: string,
  modelId: string,
  supabaseAdmin?: any
): Promise<void> {
  const db =
    supabaseAdmin || createAdminClient(await cookies().catch(() => null));

  await db.from('ai_model_health').upsert(
    {
      provider_id: providerId,
      model_id: modelId,
      status: 'active',
      last_success_at: new Date().toISOString(),
      last_checked_at: new Date().toISOString(),
    },
    { onConflict: 'provider_id,model_id' }
  );
}

/**
 * Set a model as the default for a provider.
 * Clears any existing default first.
 */
export async function setDefaultModel(
  providerId: string,
  modelId: string,
  supabaseAdmin?: any
): Promise<void> {
  const db =
    supabaseAdmin || createAdminClient(await cookies().catch(() => null));

  // Clear existing default
  await db
    .from('ai_model_health')
    .update({ is_default: false })
    .eq('provider_id', providerId)
    .eq('is_default', true);

  // Set new default
  await db.from('ai_model_health').upsert(
    {
      provider_id: providerId,
      model_id: modelId,
      is_default: true,
    },
    { onConflict: 'provider_id,model_id' }
  );
}

/**
 * Bulk upsert model health records from a discovery result.
 * Called after running model discovery.
 */
export async function upsertModelsFromDiscovery(
  providerId: string,
  modelIds: string[],
  supabaseAdmin?: any
): Promise<void> {
  const db =
    supabaseAdmin || createAdminClient(await cookies().catch(() => null));

  const now = new Date().toISOString();
  const records = modelIds.map((modelId, index) => ({
    provider_id: providerId,
    model_id: modelId,
    status: isLikelyDeprecated(modelId) ? 'deprecated' : 'unknown',
    capabilities: inferModelCapabilities(modelId),
    last_checked_at: now,
    is_enabled: !isLikelyDeprecated(modelId),
    priority: index + 1,
  }));

  if (records.length === 0) return;

  // Upsert in batches of 50 to avoid payload limits
  const batchSize = 50;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await db.from('ai_model_health').upsert(batch, {
      onConflict: 'provider_id,model_id',
      ignoreDuplicates: false,
    });

    if (error) {
      console.warn('[AI Model Health] Upsert batch error:', error);
    }
  }
}

/**
 * Get all model health records for a provider (for admin display).
 */
export async function getAllModelHealth(
  providerId: string,
  supabaseAdmin?: any
): Promise<ModelHealthRecord[]> {
  const db =
    supabaseAdmin || createAdminClient(await cookies().catch(() => null));

  const { data } = await db
    .from('ai_model_health')
    .select('*')
    .eq('provider_id', providerId)
    .order('is_default', { ascending: false })
    .order('priority', { ascending: true });

  return data || [];
}

/**
 * Find the next fallback model for a provider after a MODEL_ERROR.
 * Returns the next active model that is not the failing one.
 */
export async function getModelFallback(
  providerId: string,
  failingModelId: string,
  supabaseAdmin?: any
): Promise<ModelHealthRecord | null> {
  const db =
    supabaseAdmin || createAdminClient(await cookies().catch(() => null));

  const activeModels = await getActiveModels(providerId, db);
  const fallback = activeModels.find((m) => m.model_id !== failingModelId);
  return fallback || null;
}

/**
 * Check if model health data is stale for a provider.
 * Used to decide whether to re-run discovery.
 */
export async function isModelHealthStale(
  providerId: string,
  intervalMinutes: number = 15,
  supabaseAdmin?: any
): Promise<boolean> {
  const db =
    supabaseAdmin || createAdminClient(await cookies().catch(() => null));

  const { data } = await db
    .from('ai_model_health')
    .select('last_checked_at')
    .eq('provider_id', providerId)
    .order('last_checked_at', { ascending: false })
    .limit(1)
    .single();

  if (!data?.last_checked_at) return true;

  const lastCheck = new Date(data.last_checked_at).getTime();
  const staleThreshold = Date.now() - intervalMinutes * 60 * 1000;

  return lastCheck < staleThreshold;
}
