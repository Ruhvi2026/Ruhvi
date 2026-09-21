import 'server-only';

import {
  extractBearerToken,
  hashApiKey,
  hasPermission,
  touchLastUsed,
} from '@/lib/api-keys';
import { getServiceClient } from '@/lib/supabase/service';

// ---------------------------------------------------------------------------
// MCP Auth Guard
//
// Authenticates requests to /api/mcp using the existing API-key system.
// The key must carry one of the two MCP scopes:
//   - mcp_tools:read   → AI may call read-only tools only
//   - mcp_tools:write  → AI may call read AND write tools
//
// Security contract (identical to /api/external/* routes):
//   - Incoming key is hashed (SHA-256) before any DB lookup.
//   - Error messages are intentionally vague (never leak key existence).
//   - Revoked keys are treated identically to missing keys (401).
//   - last_used_at is updated fire-and-forget.
// ---------------------------------------------------------------------------

export type McpScopeLevel = 'read' | 'write';

export interface McpAuthSuccess {
  ok: true;
  keyId: string;
  keyName: string;
  /** Highest granted MCP scope level for this key. */
  scopeLevel: McpScopeLevel;
}

export interface McpAuthFailure {
  ok: false;
  status: 401 | 403;
  message: string;
}

export type McpAuthResult = McpAuthSuccess | McpAuthFailure;

/**
 * Authenticate an incoming MCP request.
 *
 * Reads the `Authorization: Bearer <token>` header, hashes the token,
 * looks it up in the `api_keys` table, and checks that the key holds at
 * least `mcp_tools:read`.  If it also holds `mcp_tools:write` the higher
 * scope level is returned so individual tools can enforce their own floor.
 */
export async function authenticateMcpRequest(
  authHeader: string | null | undefined
): Promise<McpAuthResult> {
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
      return { ok: false, status: 401, message: 'Unauthorized' };
    }

    if (keyRow.revoked_at !== null) {
      return { ok: false, status: 401, message: 'Unauthorized' };
    }

    const scopes: string[] = Array.isArray(keyRow.scopes) ? keyRow.scopes : [];

    // Must have at minimum mcp_tools:read
    if (!hasPermission(scopes, 'mcp_tools', 'read')) {
      return { ok: false, status: 403, message: 'Forbidden' };
    }

    // Determine highest granted level
    const scopeLevel: McpScopeLevel = hasPermission(
      scopes,
      'mcp_tools',
      'write'
    )
      ? 'write'
      : 'read';

    // Fire-and-forget last_used_at update
    touchLastUsed(keyRow.id);

    return {
      ok: true,
      keyId: keyRow.id,
      keyName: keyRow.name,
      scopeLevel,
    };
  } catch {
    // Fail closed on any unexpected error
    return { ok: false, status: 401, message: 'Unauthorized' };
  }
}

/**
 * Assert that the authenticated scope satisfies a minimum level.
 * Returns an error object if not; returns null if allowed.
 */
export function assertMcpScope(
  scopeLevel: McpScopeLevel,
  required: McpScopeLevel
): { error: string } | null {
  if (required === 'write' && scopeLevel !== 'write') {
    return { error: 'This tool requires mcp_tools:write scope.' };
  }
  return null;
}
