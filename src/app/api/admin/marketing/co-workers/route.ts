import { NextResponse } from 'next/server';
import {
  getAllCoWorkerStatuses,
  setCoWorkerStatus,
} from '@/lib/ai/co-founder/workers/marketing/config';
import { MarketingCoWorkerId, CoWorkerStatus } from '@/lib/ai/co-founder/workers/marketing/types';
import { logAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const statuses = getAllCoWorkerStatuses();
    return NextResponse.json({ success: true, coWorkers: statuses });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to list co-worker statuses' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { coWorkerId, status } = body;

    if (!coWorkerId || !status) {
      return NextResponse.json(
        { error: 'coWorkerId and status (ENABLED | DISABLED) are required' },
        { status: 400 }
      );
    }

    const normalizedStatus = (status as string).toUpperCase() as CoWorkerStatus;
    if (normalizedStatus !== 'ENABLED' && normalizedStatus !== 'DISABLED') {
      return NextResponse.json(
        { error: 'status must be ENABLED or DISABLED' },
        { status: 400 }
      );
    }

    setCoWorkerStatus(coWorkerId as MarketingCoWorkerId, normalizedStatus);

    await logAuditEvent({
      portal: 'admin',
      action: `toggle_marketing_coworker_${normalizedStatus.toLowerCase()}`,
      entityType: 'marketing_coworker',
      entityId: coWorkerId,
      changes: { status: normalizedStatus },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      coWorkerId,
      status: normalizedStatus,
      message: `Marketing Co-worker ${coWorkerId} is now ${normalizedStatus}.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update co-worker status' },
      { status: 500 }
    );
  }
}
