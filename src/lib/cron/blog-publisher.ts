import { createClient } from '@supabase/supabase-js';

/**
 * Publishes blog posts whose `scheduled_publish_at` <= now and `status` =
 * 'scheduled'. Runs every 15 minutes via Vercel Cron.
 */
export async function runBlogPublisher() {
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

  return { published, due: (due || []).map((p) => p.slug) };
}
