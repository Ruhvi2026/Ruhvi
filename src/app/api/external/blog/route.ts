import { NextRequest, NextResponse } from 'next/server';
import { extractBearerToken, hashApiKey, hasPermission } from '@/lib/api-keys';
import { getServiceClient } from '@/lib/supabase/service';
import { logAuditEvent } from '@/lib/audit';

// ---------------------------------------------------------------------------
// Helper to authenticate request and check scopes
// ---------------------------------------------------------------------------
async function getAuthenticatedKey(
  req: NextRequest,
  minLevel: 'read' | 'write' | 'admin'
) {
  const rawKey = extractBearerToken(req.headers.get('authorization'));
  if (!rawKey) {
    return { error: 'Unauthorized', status: 401 };
  }

  const keyHash = hashApiKey(rawKey);
  const supabaseAuth = getServiceClient();
  const { data: keyRow } = await supabaseAuth
    .from('api_keys')
    .select('id, name, scopes, revoked_at')
    .eq('key_hash', keyHash)
    .maybeSingle();

  if (!keyRow || keyRow.revoked_at !== null) {
    return { error: 'Unauthorized', status: 401 };
  }

  const scopes: string[] = Array.isArray(keyRow.scopes) ? keyRow.scopes : [];
  if (!hasPermission(scopes, 'blog', minLevel)) {
    return { error: 'Forbidden', status: 403 };
  }

  return { keyId: keyRow.id, keyName: keyRow.name, scopes };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // strip non-word chars except hyphens
    .replace(/[\s_]+/g, '-') // spaces/underscores → hyphens
    .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
    .slice(0, 200); // max length guard
}

// ---------------------------------------------------------------------------
// GET /api/external/blog
// Read list of blog posts or single post
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'read');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const postId = searchParams.get('id');
  const slug = searchParams.get('slug');
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get('limit')) || 20)
  );

  const supabase = getServiceClient();
  const offset = (page - 1) * limit;

  // Single record mode
  if (postId || slug) {
    let query = supabase.from('blog_posts').select('*');
    if (postId) {
      query = query.eq('id', postId);
    } else if (slug) {
      query = query.eq('slug', slug);
    }

    // Standard read scopes can only see published posts
    if (!hasPermission(auth.scopes, 'blog', 'admin')) {
      query = query.eq('is_published', true);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      console.error('[external/blog GET] Single error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
    if (!data) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, post: data }, { status: 200 });
  }

  // List mode
  let query = supabase
    .from('blog_posts')
    .select('*', { count: 'exact' })
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (!hasPermission(auth.scopes, 'blog', 'admin')) {
    query = query.eq('is_published', true);
  }

  const { data: posts, error, count } = await query;

  if (error) {
    console.error('[external/blog GET] List error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      posts: posts || [],
      pagination: { page, limit, total: count || 0 },
    },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// POST /api/external/blog
// Create a new blog post
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'write');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

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

  const finalSlug =
    typeof body.slug === 'string' && body.slug.trim().length > 0
      ? body.slug.trim()
      : slugify(title.trim());

  const row = {
    title: title.trim(),
    slug: finalSlug,
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
  };

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('blog_posts')
    .insert(row)
    .select('id, slug, title')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: `A post with slug "${finalSlug}" already exists` },
        { status: 409 }
      );
    }
    console.error('[external/blog POST] Create error:', error);
    return NextResponse.json(
      { error: 'Failed to create blog post' },
      { status: 500 }
    );
  }

  await logAuditEvent({
    portal: 'admin',
    action: 'EXTERNAL_API_BLOG_CREATED',
    entityType: 'blog_post',
    entityId: data.id,
    changes: { title: row.title, slug: row.slug, apiKey: auth.keyId },
  });

  return NextResponse.json({ success: true, post: data }, { status: 201 });
}

// ---------------------------------------------------------------------------
// PUT /api/external/blog
// Update an existing blog post
// ---------------------------------------------------------------------------
export async function PUT(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'write');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const postId = body.id as string | undefined;
  if (!postId) {
    return NextResponse.json(
      { error: '`id` is required to update a post' },
      { status: 422 }
    );
  }

  const updates: Record<string, any> = {};

  if (typeof body.title === 'string' && body.title.trim().length > 0) {
    updates.title = body.title.trim();
  }
  if (typeof body.slug === 'string' && body.slug.trim().length > 0) {
    updates.slug = body.slug.trim();
  }
  if (typeof body.content === 'string' && body.content.trim().length > 0) {
    updates.content = body.content.trim();
  }
  if (typeof body.excerpt === 'string') {
    updates.excerpt = body.excerpt.trim() || null;
  }
  if (typeof body.cover_image === 'string') {
    updates.cover_image = body.cover_image.trim() || null;
  }
  if (Array.isArray(body.tags)) {
    updates.tags = body.tags.filter((t) => typeof t === 'string');
  }
  if (typeof body.author === 'string' && body.author.trim().length > 0) {
    updates.author = body.author.trim();
  }
  if (typeof body.published_at === 'string') {
    updates.published_at = body.published_at;
  }
  if (typeof body.is_published === 'boolean') {
    updates.is_published = body.is_published;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'No fields provided to update' },
      { status: 422 }
    );
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('blog_posts')
    .update(updates)
    .eq('id', postId)
    .select('id, slug, title')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: `A post with slug "${updates.slug}" already exists` },
        { status: 409 }
      );
    }
    console.error('[external/blog PUT] Update error:', error);
    return NextResponse.json(
      { error: 'Failed to update blog post' },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json({ error: 'Blog post not found' }, { status: 404 });
  }

  await logAuditEvent({
    portal: 'admin',
    action: 'EXTERNAL_API_BLOG_UPDATED',
    entityType: 'blog_post',
    entityId: data.id,
    changes: { updates, apiKey: auth.keyId },
  });

  return NextResponse.json({ success: true, post: data }, { status: 200 });
}

// ---------------------------------------------------------------------------
// DELETE /api/external/blog
// Delete a blog post (Admin only)
// ---------------------------------------------------------------------------
export async function DELETE(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'admin');
  if ('error' in auth) {
    return NextResponse.json(
      {
        error:
          'Forbidden: `blog` module is read/write for standard keys. Requires Admin scope to delete posts.',
      },
      { status: 403 }
    );
  }

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const postId = body.id as string | undefined;
  if (!postId) {
    return NextResponse.json(
      { error: '`id` is required to delete a post' },
      { status: 422 }
    );
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('blog_posts')
    .delete()
    .eq('id', postId)
    .select('id, title')
    .single();

  if (error) {
    console.error('[external/blog DELETE] Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete blog post' },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json({ error: 'Blog post not found' }, { status: 404 });
  }

  await logAuditEvent({
    portal: 'admin',
    action: 'EXTERNAL_API_BLOG_DELETED',
    entityType: 'blog_post',
    entityId: data.id,
    changes: { title: data.title, apiKey: auth.keyId },
  });

  return NextResponse.json(
    { success: true, message: 'Blog post deleted successfully' },
    { status: 200 }
  );
}
