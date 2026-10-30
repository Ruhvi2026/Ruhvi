import { getServiceClient } from '@/lib/supabase/service';

/**
 * Publishes blog posts whose `scheduled_publish_at` <= now and `status` = 'scheduled'.
 *
 * Cadence Architecture (Finding C1):
 * - Bundled into the daily /api/cron/automations workflow executed at 04:00 UTC (0 4 * * *) via Vercel Cron.
 * - Dedicated on-demand endpoint GET /api/cron/publish-blog is secured with CRON_SECRET (fail-closed).
 * - Note on Vercel limits: Vercel Hobby permits 1 execution/day. If more frequent publishing is required,
 *   /api/cron/publish-blog can be scheduled via GitHub Actions or an external worker.
 */
export async function runBlogPublisher(
  options: { nowIso?: string; client?: any } = {}
) {
  const supabase = options.client || getServiceClient();
  const now = options.nowIso || new Date().toISOString();

  const { data: due, error: fetchError } = await supabase
    .from('blog_posts')
    .select('id, slug, scheduled_publish_at')
    .eq('status', 'scheduled')
    .lte('scheduled_publish_at', now)
    .limit(50);

  if (fetchError) throw fetchError;

  let published = 0;
  const ids = (due || []).map((p: any) => p.id);

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

  return { published, due: (due || []).map((p: any) => p.slug) };
}
