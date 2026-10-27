import { NextResponse } from 'next/server';
import { runSyntheticHealthProbes } from '@/lib/qa/health-probes';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    const report = await runSyntheticHealthProbes(baseUrl);

    const httpStatus = report.summary.overallStatus === 'CRITICAL' ? 503 : 200;

    return NextResponse.json(report, { status: httpStatus });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || 'Failed to execute synthetic health probes',
      },
      { status: 500 }
    );
  }
}
