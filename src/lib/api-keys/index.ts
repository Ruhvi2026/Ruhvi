import crypto from 'crypto';
import { getServiceClient } from '@/lib/supabase/service';

// ---------------------------------------------------------------------------
// API Key Authentication Helper
//
// Used by every /api/external/* route.  Each route passes the required scope
// string; this module handles all hashing, lookup, and scope-checking so that
// no per-route code duplicates any of that logic.
//
// Security contract:
//  - Incoming key is hashed (SHA-256 hex) before any DB lookup.
//  - Error messages are intentionally vague: do NOT leak whether a key exists
//    but lacks scope vs. doesn't exist at all.  Callers always receive a plain
//    401 or 403.
//  - last_used_at update is fire-and-forget — it must never block the response.
// ---------------------------------------------------------------------------

export type ApiKeyScope =
  | 'blog:write'
  | 'blog:read'
  | 'orders:read'
  | 'orders:write'
  | 'inventory:read'
  | 'inventory:write'
  | 'support:read'
  | 'support:write';

export interface ApiKeyAuthResult {
  ok: true;
  keyId: string;
  name: string;
  scopes: string[];
}

export interface ApiKeyAuthError {
  ok: false;
  status: 401 | 403;
  message: string;
}

export type ApiKeyAuthOutcome = ApiKeyAuthResult | ApiKeyAuthError;

/**
 * Hash the raw API key exactly the same way it was hashed at creation time.
 */
export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

/**
 * Extract the Bearer token from an Authorization header value.
 * Returns null if the header is missing or malformed.
 */
export function extractBearerToken(
  authHeader: string | null | undefined
): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return null;
  const token = parts[1].trim();
  return token.length > 0 ? token : null;
}

/**
 * Authenticate an incoming external API request.
 *
 * @param authHeader  The raw `Authorization` header value from the request.
 * @param requiredScope  The scope this endpoint requires, e.g. `"blog:write"`.
 */
export async function authenticateApiKey(
  authHeader: string | null | undefined,
  requiredScope: ApiKeyScope
): Promise<ApiKeyAuthOutcome> {
  const rawKey = extractBearerToken(authHeader);
  if (!rawKey) {
    return { ok: false, status: 401, message: 'Unauthorized' };
  }

  const keyHash = hashApiKey(rawKey);

  try {
    const supabase = getServiceClient();

    const { data: keyRow, error } = await supabase
      .from('api_keys')
      .select('id, name, scopes, revoked_at')
      .eq('key_hash', keyHash)
      .maybeSingle();

    if (error || !keyRow) {
      // Key does not exist — return a generic 401
      return { ok: false, status: 401, message: 'Unauthorized' };
    }

    if (keyRow.revoked_at !== null) {
      // Key has been revoked — same generic 401
      return { ok: false, status: 401, message: 'Unauthorized' };
    }

    const scopes: string[] = Array.isArray(keyRow.scopes) ? keyRow.scopes : [];

    if (!scopes.includes(requiredScope)) {
      // Key exists but lacks the scope — 403 Forbidden, still no leak
      return { ok: false, status: 403, message: 'Forbidden' };
    }

    // All checks passed — fire-and-forget last_used_at update
    touchLastUsed(keyRow.id);

    return {
      ok: true,
      keyId: keyRow.id,
      name: keyRow.name,
      scopes,
    };
  } catch {
    // Fail closed on any unexpected error
    return { ok: false, status: 401, message: 'Unauthorized' };
  }
}

/**
 * Best-effort update of last_used_at.  Intentionally not awaited by callers.
 */
export function touchLastUsed(keyId: string): void {
  try {
    const supabase = getServiceClient();
    supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyId)
      .then(() => {
        /* fire-and-forget */
      });
  } catch {
    /* non-blocking — never throw */
  }
}

// ---------------------------------------------------------------------------
// Admin-side helpers (used by the Key Management UI server actions)
// ---------------------------------------------------------------------------

const KEY_PREFIX_DISPLAY_LENGTH = 8;

/**
 * Generate a cryptographically random API key, its hash, and its display prefix.
 *
 * The raw key is returned only once and must be shown to the admin immediately.
 * Only the hash is persisted.
 */
export function generateApiKey(): {
  rawKey: string;
  keyHash: string;
  keyPrefix: string;
} {
  // 32 random bytes → 64 hex chars.  Prefixed with `ruhvi_` for recognisability.
  const random = crypto.randomBytes(32).toString('hex');
  const rawKey = `ruhvi_${random}`;
  const keyHash = hashApiKey(rawKey);
  // Keep a short display-safe prefix, e.g. "ruhvi_ab12cd34"
  const keyPrefix =
    rawKey.slice(0, 'ruhvi_'.length + KEY_PREFIX_DISPLAY_LENGTH) + '...';
  return { rawKey, keyHash, keyPrefix };
}

export interface CreateApiKeyInput {
  name: string;
  scopes: ApiKeyScope[];
  createdBy: string; // uid of the admin who created it
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  created_at: string;
  created_by: string | null;
  revoked_at: string | null;
  last_used_at: string | null;
}

/**
 * Create a new API key and persist its hash.
 * Returns the ApiKeyRecord (without hash) AND the one-time rawKey.
 */
export async function createApiKey(
  input: CreateApiKeyInput
): Promise<{ record: ApiKeyRecord; rawKey: string }> {
  const { rawKey, keyHash, keyPrefix } = generateApiKey();
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      name: input.name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      scopes: input.scopes,
      created_by: input.createdBy,
    })
    .select(
      'id, name, key_prefix, scopes, created_at, created_by, revoked_at, last_used_at'
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create API key');
  }

  return { record: data as ApiKeyRecord, rawKey };
}

/**
 * List all API keys (hash is never returned).
 */
export async function listApiKeys(): Promise<ApiKeyRecord[]> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('api_keys')
    .select(
      'id, name, key_prefix, scopes, created_at, created_by, revoked_at, last_used_at'
    )
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as ApiKeyRecord[]) || [];
}

/**
 * Revoke an API key by setting revoked_at to now.
 */
export async function revokeApiKey(keyId: string): Promise<void> {
  const supabase = getServiceClient();
  const { error } = await supabase
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId);

  if (error) throw new Error(error.message);
}
