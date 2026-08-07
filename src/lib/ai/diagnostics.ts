import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export interface DiagnosticEntry {
  id?: string;
  feature: string;
  primary_provider: string;
  failed_provider: string;
  fallback_provider?: string;
  model?: string;
  error_message: string;
  error_type?:
    | 'RATE_LIMIT_EXCEEDED'
    | 'TIMEOUT'
    | 'PROVIDER_DOWN'
    | 'AUTH_ERROR'
    | 'BAD_REQUEST'
    | 'PARSE_ERROR'
    | 'GENERAL_FAILURE'
    | string;
  stack_trace?: string;
  user_identifier?: string;
  user_role?: string;
  latency_ms?: number;
  attempt_number?: number;
  recovery_status: 'recovered' | 'exhausted' | 'retrying';
  metadata?: Record<string, any>;
  created_at?: string;
  expires_at?: string;
  ttl_seconds_remaining?: number;
  ttl_formatted?: string;
}

export interface DiagnosticStats {
  total24hFailures: number;
  recoveredCount: number;
  exhaustedCount: number;
  recoveryRatePercent: number;
  avgFailoverLatencyMs: number;
  activeTtlHours: number;
  purgedExpiredCount: number;
  lastPurgeTimestamp: string;
}

// In-memory 24-hour buffer for high performance & fallback operation
const memoryDiagnostics: DiagnosticEntry[] = [];
let lastPurgeTime = Date.now();
let totalPurgedLifetime = 0;

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * Format remaining seconds into a human-readable TTL string (e.g., "23h 45m" or "42m 10s")
 */
function formatTTL(secondsRemaining: number): string {
  if (secondsRemaining <= 0) return 'Expired';
  const hours = Math.floor(secondsRemaining / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = secondsRemaining % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Clean memory buffer of items that have expired (TTL >= 24 hours)
 */
function purgeMemoryExpired(): number {
  const now = Date.now();
  const initialLength = memoryDiagnostics.length;
  for (let i = memoryDiagnostics.length - 1; i >= 0; i--) {
    const item = memoryDiagnostics[i];
    const itemExpiry = item.expires_at
      ? new Date(item.expires_at).getTime()
      : 0;
    const itemCreated = item.created_at
      ? new Date(item.created_at).getTime()
      : 0;

    if (
      (itemExpiry > 0 && itemExpiry <= now) ||
      (itemCreated > 0 && now - itemCreated >= TWENTY_FOUR_HOURS_MS)
    ) {
      memoryDiagnostics.splice(i, 1);
    }
  }
  const purged = initialLength - memoryDiagnostics.length;
  totalPurgedLifetime += purged;
  lastPurgeTime = now;
  return purged;
}

/**
 * Log a failure diagnostic and fallback history event with an explicit 24-hour expiration TTL.
 */
export async function logFailureDiagnostic(
  entry: Omit<DiagnosticEntry, 'id' | 'created_at' | 'expires_at'>
): Promise<DiagnosticEntry> {
  const now = new Date();
  const createdAtISO = now.toISOString();
  const expiresAtISO = new Date(
    now.getTime() + TWENTY_FOUR_HOURS_MS
  ).toISOString();

  const fullEntry: DiagnosticEntry = {
    ...entry,
    id: `diag_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    user_role: entry.user_role || 'guest',
    user_identifier: entry.user_identifier || 'anonymous',
    latency_ms: entry.latency_ms || 0,
    attempt_number: entry.attempt_number || 1,
    created_at: createdAtISO,
    expires_at: expiresAtISO,
    ttl_seconds_remaining: Math.floor(TWENTY_FOUR_HOURS_MS / 1000),
    ttl_formatted: '24h 0m',
  };

  // 1. Maintain in memory buffer with 24h expiration
  purgeMemoryExpired();
  memoryDiagnostics.unshift(fullEntry);
  if (memoryDiagnostics.length > 500) {
    memoryDiagnostics.pop();
  }

  // 2. Persist to Supabase if database table exists
  try {
    const cookieStore = await cookies().catch(() => null);
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
        'https://igrkrkxdantrolbldapj.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      {
        cookies: {
          getAll() {
            return cookieStore?.getAll() || [];
          },
          setAll() {},
        },
      }
    );

    await supabaseAdmin.from('ai_failure_diagnostics').insert([
      {
        feature: fullEntry.feature,
        primary_provider: fullEntry.primary_provider,
        failed_provider: fullEntry.failed_provider,
        fallback_provider: fullEntry.fallback_provider || null,
        model: fullEntry.model || null,
        error_message: fullEntry.error_message,
        error_type: fullEntry.error_type || 'GENERAL_FAILURE',
        stack_trace: fullEntry.stack_trace || null,
        user_identifier: fullEntry.user_identifier,
        user_role: fullEntry.user_role,
        latency_ms: fullEntry.latency_ms,
        attempt_number: fullEntry.attempt_number,
        recovery_status: fullEntry.recovery_status,
        metadata: fullEntry.metadata || {},
        created_at: createdAtISO,
        expires_at: expiresAtISO,
      },
    ]);
  } catch (err) {
    // Database insert is non-blocking; memory cache guarantees availability
    console.warn(
      '[AI Diagnostics] Failed to insert to DB, persisted in memory:',
      err
    );
  }

  return fullEntry;
}

/**
 * Get active Failure Diagnostics & Fallback History, automatically purging any entries older than 24 hours.
 */
export async function getActiveDiagnostics(): Promise<{
  items: DiagnosticEntry[];
  stats: DiagnosticStats;
}> {
  // 1. Purge expired entries in memory
  const memoryPurged = purgeMemoryExpired();
  let dbPurged = 0;
  let rawDbItems: any[] = [];

  const nowMs = Date.now();
  const nowISO = new Date(nowMs).toISOString();

  // 2. Try fetching from Supabase and running DB purge
  try {
    const cookieStore = await cookies().catch(() => null);
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
        'https://igrkrkxdantrolbldapj.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      {
        cookies: {
          getAll() {
            return cookieStore?.getAll() || [];
          },
          setAll() {},
        },
      }
    );

    // Call automatic purge on DB
    const { data: purgeResult } = await supabaseAdmin
      .rpc('purge_expired_ai_diagnostics')
      .maybeSingle();
    if (typeof purgeResult === 'number') {
      dbPurged = purgeResult;
      totalPurgedLifetime += dbPurged;
    } else {
      // Direct delete query for 24h expiration
      const { count } = await supabaseAdmin
        .from('ai_failure_diagnostics')
        .delete({ count: 'exact' })
        .lte('expires_at', nowISO);
      if (count) {
        dbPurged = count;
        totalPurgedLifetime += count;
      }
    }

    // Fetch active entries within 24h window
    const { data: dbData, error } = await supabaseAdmin
      .from('ai_failure_diagnostics')
      .select('*')
      .gt('expires_at', nowISO)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && dbData && dbData.length > 0) {
      rawDbItems = dbData;
    }
  } catch (e) {
    console.warn(
      '[AI Diagnostics] Could not fetch DB diagnostics, using memory buffer:',
      e
    );
  }

  // 3. Merge DB and memory items, avoiding duplicates
  const itemsMap = new Map<string, DiagnosticEntry>();

  // Add DB items first
  rawDbItems.forEach((row) => {
    const key = `${row.created_at}_${row.failed_provider}_${row.feature}`;
    const expiresMs = new Date(row.expires_at).getTime();
    const remainingSecs = Math.max(0, Math.floor((expiresMs - nowMs) / 1000));

    itemsMap.set(key, {
      ...row,
      ttl_seconds_remaining: remainingSecs,
      ttl_formatted: formatTTL(remainingSecs),
    });
  });

  // Add memory items
  memoryDiagnostics.forEach((mem) => {
    const key = `${mem.created_at}_${mem.failed_provider}_${mem.feature}`;
    if (!itemsMap.has(key)) {
      const expiresMs = mem.expires_at
        ? new Date(mem.expires_at).getTime()
        : nowMs + TWENTY_FOUR_HOURS_MS;
      const remainingSecs = Math.max(0, Math.floor((expiresMs - nowMs) / 1000));
      if (remainingSecs > 0) {
        itemsMap.set(key, {
          ...mem,
          ttl_seconds_remaining: remainingSecs,
          ttl_formatted: formatTTL(remainingSecs),
        });
      }
    }
  });

  const activeItems = Array.from(itemsMap.values()).sort((a, b) => {
    const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tB - tA;
  });

  // 4. Calculate 24h Stats
  const total = activeItems.length;
  const recovered = activeItems.filter(
    (i) => i.recovery_status === 'recovered'
  ).length;
  const exhausted = activeItems.filter(
    (i) => i.recovery_status === 'exhausted'
  ).length;
  const recoveryRate = total > 0 ? Math.round((recovered / total) * 100) : 100;

  const totalLatency = activeItems.reduce(
    (acc, curr) => acc + (curr.latency_ms || 0),
    0
  );
  const avgLatency = total > 0 ? Math.round(totalLatency / total) : 0;

  const stats: DiagnosticStats = {
    total24hFailures: total,
    recoveredCount: recovered,
    exhaustedCount: exhausted,
    recoveryRatePercent: recoveryRate,
    avgFailoverLatencyMs: avgLatency,
    activeTtlHours: 24,
    purgedExpiredCount: memoryPurged + dbPurged,
    lastPurgeTimestamp: new Date(lastPurgeTime).toISOString(),
  };

  return {
    items: activeItems,
    stats,
  };
}

/**
 * Manually trigger full purge of all expired entries older than 24 hours.
 */
export async function purgeExpiredNow(): Promise<{
  purged: number;
  remaining: number;
}> {
  const memoryPurged = purgeMemoryExpired();
  let dbPurged = 0;
  const nowISO = new Date().toISOString();

  try {
    const cookieStore = await cookies().catch(() => null);
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
        'https://igrkrkxdantrolbldapj.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      {
        cookies: {
          getAll() {
            return cookieStore?.getAll() || [];
          },
          setAll() {},
        },
      }
    );

    const { count } = await supabaseAdmin
      .from('ai_failure_diagnostics')
      .delete({ count: 'exact' })
      .lte('expires_at', nowISO);

    if (count) dbPurged = count;
  } catch (e) {
    console.warn('[AI Diagnostics] DB purge error:', e);
  }

  const totalPurged = memoryPurged + dbPurged;
  return {
    purged: totalPurged,
    remaining: memoryDiagnostics.length,
  };
}

/**
 * Clear all diagnostic entries (both DB and memory).
 */
export async function clearAllDiagnostics(): Promise<void> {
  memoryDiagnostics.length = 0;
  try {
    const cookieStore = await cookies().catch(() => null);
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
        'https://igrkrkxdantrolbldapj.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      {
        cookies: {
          getAll() {
            return cookieStore?.getAll() || [];
          },
          setAll() {},
        },
      }
    );

    await supabaseAdmin
      .from('ai_failure_diagnostics')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
  } catch (e) {
    console.warn('[AI Diagnostics] DB clear error:', e);
  }
}
