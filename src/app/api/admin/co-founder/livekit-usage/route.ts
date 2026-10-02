import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getLiveKitCloudUsage } from '@/lib/livekit/usage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const usageReport = await getLiveKitCloudUsage();

    return NextResponse.json(usageReport);
  } catch (error: any) {
    console.error('[LiveKit Usage API Error]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch LiveKit usage statistics' },
      { status: 500 }
    );
  }
}

export async function POST() {
  // Allow explicit live re-fetch trigger
  return GET();
}
