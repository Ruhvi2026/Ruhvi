import { NextRequest, NextResponse } from 'next/server';
import { runProactiveCronScan } from '@/lib/ai/co-founder/proactive';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Authenticate Vercel Cron or Admin via Bearer token
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const res = await runProactiveCronScan();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...res,
    });
  } catch (error: any) {
    console.error('Proactive cron scan failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Proactive scan error',
      },
      { status: 500 }
    );
  }
}
