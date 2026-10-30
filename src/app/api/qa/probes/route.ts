import { NextResponse } from 'next/server';
import { runSyntheticHealthProbes } from '@/lib/qa/health-probes';
import { requireAdmin } from '@/lib/auth/require-admin';

export const dynamic = 'force-dynamic';

/**
 * Resolves the probe target URL safely:
 * 1. Prefers configured site URLs (NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_SITE_URL).
 * 2. If deriving from the request, strictly enforces an allowlist of trusted domains
 *    to prevent SSRF or abuse of arbitrary host targets.
 */
export function getTrustedProbeTarget(request: Request): string | null {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    try {
      const parsed = new URL(configured);
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      // Ignore invalid configured URL and proceed to allowlist check
    }
  }

  try {
    const url = new URL(request.url);
    const hostname = url.hostname.toLowerCase();
    const isAllowed =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === 'ruhvi.in' ||
      hostname.endsWith('.ruhvi.in') ||
      hostname.endsWith('.vercel.app');

    if (isAllowed) {
      return `${url.protocol}//${url.host}`;
    }
  } catch {
    // Malformed request URL
  }

  return null;
}

export async function GET(request: Request) {
  try {
    // 1. Authorization Guard: Bearer CRON_SECRET or Staff/Admin session token
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    const isCronAuthorized =
      Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`;

    if (!isCronAuthorized) {
      const adminAuth = await requireAdmin();
      if (!adminAuth.ok) {
        return NextResponse.json(
          {
            error: 'Unauthorized: Admin session or valid Cron Secret required',
          },
          { status: 401 }
        );
      }
    }

    // 2. Resolve and validate target base URL against allowlist
    const baseUrl = getTrustedProbeTarget(request);
    if (!baseUrl) {
      return NextResponse.json(
        { error: 'Invalid or untrusted target host' },
        { status: 400 }
      );
    }

    // 3. Execute safe synthetic read-only health probes
    const report = await runSyntheticHealthProbes(baseUrl);
    const httpStatus = report.summary.overallStatus === 'CRITICAL' ? 503 : 200;

    return NextResponse.json(report, {
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || 'Failed to execute synthetic health probes',
      },
      { status: 500 }
    );
  }
}
