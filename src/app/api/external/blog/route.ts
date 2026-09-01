import { NextRequest, NextResponse } from 'next/server';
import { extractBearerToken, hashApiKey, hasPermission } from '@/lib/api-keys';
import { getServiceClient } from '@/lib/supabase/service';

// ---------------------------------------------------------------------------
// POST /api/external/blog
//
// Machine-to-machine endpoint — no user session required.
// Authentication: `Authorization: Bearer <api_key>` (requires `blog:write` scope).
//
// Request body (JSON):
//   title        string  required
//   content      string  required  (HTML or markdown — stored as-is)
//   excerpt      string  optional
//   cover_image  string  optional  (URL)
//   slug         string  optional  (auto-generated from title if omitted)
//   tags         string[] optional
//   author       string  optional  (defaults to "Ruhvi Editorial")
//   published_at string  optional  (ISO-8601; defaults to now)
//   is_published boolean optional  (defaults to true)
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // 1. Authenticate
  const rawKey = extractBearerToken(req.headers.get('authorization'));
  if (!rawKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const keyHash = hashApiKey(rawKey);
  const supabaseAuth = getServiceClient();
  const { data: keyRow } = await supabaseAuth
    .from('api_keys')
    .select('id, scopes, revoked_at')
    .eq('key_hash', keyHash)
    .maybeSingle();

  if (!keyRow || keyRow.revoked_at !== null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const scopes: string[] = Array.isArray(keyRow.scopes) ? keyRow.scopes : [];
  // blog:write, blog:read_write, and blog:admin all satisfy this requirement
  if (!hasPermission(scopes, 'blog', 'write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const keyId: string = keyRow.id;

  // 2. Parse body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // 3. Validate required fields
  const title = body.title as string | undefined;
  const content = body.content as string | undefined;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return NextResponse.json({ error: '`title` is required' }, { status: 422 });
  }
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json(
      { error: '`content` is required' },
      { status: 422 }
    );
  }

  // 4. Build the row
  const slug =
    typeof body.slug === 'string' && body.slug.trim().length > 0
      ? body.slug.trim()
      : slugify(title.trim());

  const row = {
    title: title.trim(),
    slug,
    content: content.trim(),
    excerpt:
      typeof body.excerpt === 'string' && body.excerpt.trim().length > 0
        ? body.excerpt.trim()
        : null,
    cover_image:
      typeof body.cover_image === 'string' && body.cover_image.trim().length > 0
        ? body.cover_image.trim()
        : null,
    tags: Array.isArray(body.tags)
      ? body.tags.filter((t) => typeof t === 'string')
      : [],
    author:
      typeof body.author === 'string' && body.author.trim().length > 0
        ? body.author.trim()
        : 'Ruhvi Editorial',
    published_at:
      typeof body.published_at === 'string'
        ? body.published_at
        : new Date().toISOString(),
    is_published:
      typeof body.is_published === 'boolean' ? body.is_published : true,
    // Track which API key created this post
    created_by_api_key: keyId,
  };

  // 5. Insert
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('blog_posts')
      .insert(row)
      .select('id, slug, title, published_at, is_published')
      .single();

    if (error) {
      // Duplicate slug → 409
      if (error.code === '23505') {
        return NextResponse.json(
          { error: `A post with slug "${slug}" already exists` },
          { status: 409 }
        );
      }
      console.error('[external/blog POST] Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to create blog post' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        post: data,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[external/blog POST] unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // strip non-word chars except hyphens
    .replace(/[\s_]+/g, '-') // spaces/underscores → hyphens
    .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
    .slice(0, 200); // max length guard
}
