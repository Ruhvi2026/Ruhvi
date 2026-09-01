import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@supabase/ssr';

// ---------------------------------------------------------------------------
// GET  /api/blog/[slug]/like?visitorKey=<key>
//   → { count, liked }
// POST /api/blog/[slug]/like
//   body: { visitorKey, action: 'like' | 'unlike' }
//   → { count, liked }
//
// Guest-friendly likes: visitors are identified by a client-generated
// visitorKey stored in localStorage. One like per (post, visitor).
// ---------------------------------------------------------------------------

const toggleSchema = z.object({
  visitorKey: z.string().min(8).max(128),
  action: z.enum(['like', 'unlike']),
});

function makeClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
      'https://igrkrkxdantrolbldapj.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    }
  );
}

async function resolvePost(
  supabase: any,
  slug: string
): Promise<string | null> {
  const { data } = await supabase
    .from('blog_posts')
    .select('id')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();
  return data?.id || null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = makeClient();
    const postId = await resolvePost(supabase, slug);
    if (!postId) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const visitorKey = req.nextUrl.searchParams.get('visitorKey') || '';
    const { data } = await supabase
      .from('blog_likes')
      .select('id', { count: 'exact' })
      .eq('post_id', postId);

    let liked = false;
    if (visitorKey) {
      const { data: mine } = await supabase
        .from('blog_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('visitor_key', visitorKey)
        .maybeSingle();
      liked = Boolean(mine);
    }

    return NextResponse.json({ count: data?.length || 0, liked });
  } catch (err) {
    console.error('[blog like GET] error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await req.json().catch(() => null);
    const parsed = toggleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const supabase = makeClient();
    const postId = await resolvePost(supabase, slug);
    if (!postId) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const { visitorKey, action } = parsed.data;

    if (action === 'like') {
      const { error } = await supabase.from('blog_likes').insert({
        post_id: postId,
        visitor_key: visitorKey,
      });
      if (error) {
        // Unique violation means already liked — treat as idempotent success.
        if (error.code !== '23505') {
          console.error('[blog like] insert error:', error);
          return NextResponse.json(
            { error: 'Could not save your like' },
            { status: 500 }
          );
        }
      }
    } else {
      const { error } = await supabase
        .from('blog_likes')
        .delete()
        .eq('post_id', postId)
        .eq('visitor_key', visitorKey);
      if (error) {
        console.error('[blog like] delete error:', error);
        return NextResponse.json(
          { error: 'Could not remove your like' },
          { status: 500 }
        );
      }
    }

    const { data } = await supabase
      .from('blog_likes')
      .select('id', { count: 'exact' })
      .eq('post_id', postId);

    return NextResponse.json({
      count: data?.length || 0,
      liked: action === 'like',
    });
  } catch (err) {
    console.error('[blog like POST] error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
