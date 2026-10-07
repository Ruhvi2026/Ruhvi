import { NextResponse } from 'next/server';
import { runBlogPublisher } from '@/lib/cron/blog-publisher';

// ---------------------------------------------------------------------------
// GET /api/cron/publish-blog
//
// Publishes blog posts whose `scheduled_publish_at` <= now and `status` =
// 'scheduled'. Runs every 15 minutes via Vercel Cron. Secured by CRON_SECRET.
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
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
