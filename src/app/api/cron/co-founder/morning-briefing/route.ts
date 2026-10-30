import { NextRequest, NextResponse } from 'next/server';
import { generateDailyMorningBriefing } from '@/lib/ai/co-founder/morning-briefing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await generateDailyMorningBriefing();
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Morning Briefing error' },
      { status: 500 }
    );
  }
}
