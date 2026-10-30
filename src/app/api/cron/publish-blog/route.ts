import { NextResponse } from 'next/server';
import { runBlogPublisher } from '@/lib/cron/blog-publisher';

// ---------------------------------------------------------------------------
// GET /api/cron/publish-blog
//
// Publishes scheduled blog posts whose publish timestamp has arrived.
// Cadence Architecture (Finding C1):
// - Secured by CRON_SECRET (fail-closed 401 Unauthorized if missing/invalid).
// - Daily execution is bundled in /api/cron/automations (0 4 * * *).
// - Can also be invoked independently on-demand or by scheduled workflows.
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const res = await runBlogPublisher();

    return NextResponse.json({
      success: true,
      ...res,
    });
  } catch (error: any) {
    console.error('[cron/publish-blog] error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
