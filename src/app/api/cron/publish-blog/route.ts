import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const now = new Date().toISOString();

    const { data: due, error: fetchError } = await supabase
      .from('blog_posts')
      .select('id, slug, scheduled_publish_at')
      .eq('status', 'scheduled')
      .lte('scheduled_publish_at', now)
      .limit(50);

    if (fetchError) throw fetchError;

    let published = 0;
    const ids = (due || []).map((p) => p.id);

    if (ids.length > 0) {
      const { error: updateError } = await supabase
        .from('blog_posts')
        .update({
          status: 'published',
          is_published: true,
          published_at: now,
          scheduled_publish_at: null,
          updated_at: now,
        })
        .in('id', ids);

      if (updateError) throw updateError;
      published = ids.length;
    }

    return NextResponse.json({
      success: true,
      published,
      due: (due || []).map((p) => p.slug),
    });
  } catch (error: any) {
    console.error('[cron/publish-blog] error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
