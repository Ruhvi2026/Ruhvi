import 'server-only';

/**
 * ============================================================================
 * SYNTHETIC READ-ONLY HEALTH PROBES (TRACK H - PHASE 40)
 * ============================================================================
 * Safe, non-destructive automated probes for core customer and staff routes.
 *
 * Guarantees:
 * 1. Zero Mutation Guarantee:
 *    - Executes exclusively GET requests. Never submits orders, posts reviews,
 *      charges payment gateways, or mutates database state.
 * 2. Route Coverage:
 *    - Root Storefront (/), Catalog (/products), Search (/api/products?search=gold),
 *      Cart (/cart), Admin Security Barrier (/admin/dashboard without auth),
 *      and Public Catalog API (/api/products).
 * 3. Latency & Failure Tracking:
 *    - Records exact millisecond latency per probe.
 *    - Flags timeouts (> 3,000ms) and unexpected HTTP statuses as FAIL or WARN.
 * 4. Security Barrier Verification:
 *    - Confirms admin routes strictly reject unauthenticated visitors (307/401/403).
 *      A 200 OK on /admin/dashboard without credentials triggers an immediate FAIL.
 */

export type ProbeStatus = 'PASS' | 'WARN' | 'FAIL';

export interface ProbeConfig {
  id: string;
  name: string;
  path: string;
  expectedStatuses: number[];
  maxLatencyMs: number;
  warnLatencyMs: number;
  isSecurityBarrier?: boolean;
}

export interface ProbeDiagnostic {
  probeId: string;
  name: string;
  targetPath: string;
  expectedStatus: number[];
  observedStatus: number;
  latencyMs: number;
  status: ProbeStatus;
  message: string;
  checkedAt: string;
  isReadOnly: true;
}

export interface SyntheticHealthReport {
  summary: {
    totalProbes: number;
    passed: number;
    warnings: number;
    failed: number;
    overallStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
    averageLatencyMs: number;
    evaluatedAt: string;
  };
  probes: ProbeDiagnostic[];
}

export const PROBE_DEFINITIONS: ProbeConfig[] = [
  {
    id: 'PROBE_HOME',
    name: 'Storefront Homepage',
    path: '/',
    expectedStatuses: [200],
    maxLatencyMs: 3000,
    warnLatencyMs: 1500,
  },
  {
    id: 'PROBE_CATALOG',
    name: 'Product Catalog Listing',
    path: '/products',
    expectedStatuses: [200],
    maxLatencyMs: 3000,
    warnLatencyMs: 1500,
  },
  {
    id: 'PROBE_SEARCH',
    name: 'Catalog Search API',
    path: '/api/products?search=gold&pageSize=4',
    expectedStatuses: [200],
    maxLatencyMs: 2500,
    warnLatencyMs: 1200,
  },
  {
    id: 'PROBE_CART_READ',
    name: 'Customer Cart Page',
    path: '/cart',
    expectedStatuses: [200],
    maxLatencyMs: 2500,
    warnLatencyMs: 1200,
  },
  {
    id: 'PROBE_PUBLIC_API',
    name: 'Public Products API',
    path: '/api/products?pageSize=1',
    expectedStatuses: [200],
    maxLatencyMs: 2000,
    warnLatencyMs: 1000,
  },
  {
    id: 'PROBE_ADMIN_BARRIER',
    name: 'Admin Security Barrier (Unauthenticated)',
    path: '/admin/dashboard',
    // Must redirect to login (307/308) or deny access (401/403)
    expectedStatuses: [307, 308, 401, 403],
    maxLatencyMs: 2000,
    warnLatencyMs: 1000,
    isSecurityBarrier: true,
  },
];

/**
 * Executes a single synthetic probe against a target base URL.
 */
export async function executeProbe(
  config: ProbeConfig,
  baseUrl: string,
  fetchFn: typeof fetch = fetch
): Promise<ProbeDiagnostic> {
  const url = `${baseUrl.replace(/\/$/, '')}${config.path}`;
  const startedAt = Date.now();
  const checkedAt = new Date().toISOString();
  const controller = new AbortController();
  const timeoutMs = (config.maxLatencyMs || 3000) + 2000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetchFn(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Ruhvi-Synthetic-QA-Probe/1.0',
        Accept: 'text/html,application/json',
      },
      redirect: 'manual', // Do not automatically follow redirects so we can verify 307/308
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const latencyMs = Date.now() - startedAt;
    const observedStatus = res.status;

    // Security Barrier evaluation:
    if (config.isSecurityBarrier) {
      if (observedStatus === 200) {
        return {
          probeId: config.id,
          name: config.name,
          targetPath: config.path,
          expectedStatus: config.expectedStatuses,
          observedStatus,
          latencyMs,
          status: 'FAIL',
          message:
            'Security breach: Protected admin route returned 200 OK without authentication credentials.',
          checkedAt,
          isReadOnly: true,
        };
      }
    }

    const isExpectedStatus = config.expectedStatuses.includes(observedStatus);

    let status: ProbeStatus = 'PASS';
    let message = `Probe succeeded with HTTP ${observedStatus} in ${latencyMs}ms.`;

    if (!isExpectedStatus) {
      status = 'FAIL';
      message = `HTTP status mismatch: expected [${config.expectedStatuses.join(', ')}], observed ${observedStatus}.`;
    } else if (latencyMs > config.maxLatencyMs) {
      status = 'FAIL';
      message = `Latency exceeded critical threshold (${latencyMs}ms > ${config.maxLatencyMs}ms).`;
    } else if (latencyMs > config.warnLatencyMs) {
      status = 'WARN';
      message = `Latency elevated (${latencyMs}ms > ${config.warnLatencyMs}ms).`;
    }

    return {
      probeId: config.id,
      name: config.name,
      targetPath: config.path,
      expectedStatus: config.expectedStatuses,
      observedStatus,
      latencyMs,
      status,
      message,
      checkedAt,
      isReadOnly: true,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startedAt;
    return {
      probeId: config.id,
      name: config.name,
      targetPath: config.path,
      expectedStatus: config.expectedStatuses,
      observedStatus: 0,
      latencyMs,
      status: 'FAIL',
      message: `Network or probe execution error: ${err?.message || 'Connection refused'}`,
      checkedAt,
      isReadOnly: true,
    };
  }
}

/**
 * Runs all configured synthetic read-only health probes.
 */
export async function runSyntheticHealthProbes(
  baseUrl: string,
  fetchFn: typeof fetch = fetch
): Promise<SyntheticHealthReport> {
  const evaluatedAt = new Date().toISOString();
  const probeResults = await Promise.all(
    PROBE_DEFINITIONS.map((config) => executeProbe(config, baseUrl, fetchFn))
  );

  let passed = 0;
  let warnings = 0;
  let failed = 0;
  let totalLatency = 0;

  for (const p of probeResults) {
    totalLatency += p.latencyMs;
    if (p.status === 'PASS') passed++;
    else if (p.status === 'WARN') warnings++;
    else failed++;
  }

  const averageLatencyMs =
    probeResults.length > 0
      ? Math.round(totalLatency / probeResults.length)
      : 0;

  let overallStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' = 'HEALTHY';
  if (failed > 0) {
    overallStatus = 'CRITICAL';
  } else if (warnings > 0) {
    overallStatus = 'DEGRADED';
  }

  return {
    summary: {
      totalProbes: probeResults.length,
      passed,
      warnings,
      failed,
      overallStatus,
      averageLatencyMs,
      evaluatedAt,
    },
    probes: probeResults,
  };
}
