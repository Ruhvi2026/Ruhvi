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

type BlogStatus = 'draft' | 'review' | 'published' | 'scheduled';

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function optionalString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string') {
      return value.trim() || null;
    }
  }
  return null;
}

function hasValue(...values: unknown[]): boolean {
  return values.some((value) => value !== undefined);
}

function toStringArray(value: unknown): string[] {
  const values = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];

  return values
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function normalizeStatus(value: unknown): BlogStatus {
  const status = typeof value === 'string' ? value.trim().toLowerCase() : '';

  if (
    status === 'draft' ||
    status === 'review' ||
    status === 'published' ||
    status === 'scheduled'
  ) {
    return status;
  }

  return 'draft';
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
    firstString(body.slug, body.urlSlug) || slugify(title.trim());
  const status = normalizeStatus(
    body.status ?? (body.is_published === false ? 'draft' : 'published')
  );
  const isPublished =
    typeof body.is_published === 'boolean'
      ? body.is_published
      : status === 'published';

  const row = {
    title: title.trim(),
    slug: finalSlug,
    content: content.trim(),
    excerpt: optionalString(body.excerpt),
    meta_title: optionalString(body.meta_title, body.seoTitleTag),
    meta_description: optionalString(
      body.meta_description,
      body.metaDescription
    ),
    h1_tag: optionalString(body.h1_tag, body.h1Tag),
    seo_keywords: toStringArray(body.seo_keywords ?? body.keywords),
    canonical_url: optionalString(body.canonical_url, body.canonicalUrl),
    cover_image: optionalString(body.cover_image, body.coverImageUrl),
    cover_image_alt: optionalString(
      body.cover_image_alt,
      body.coverImageAltText
    ),
    category: optionalString(body.category),
    tags: toStringArray(body.tags),
    image_generation_prompt: optionalString(
      body.image_generation_prompt,
      body.image_prompt,
      body.imagePrompt,
      body.image_Prompt
    ),
    author: firstString(body.author, body.authorName) || 'Ruhvi Editorial',
    author_name: firstString(body.author_name, body.authorName),
    status,
    is_published: isPublished,
    published_at:
      firstString(body.published_at, body.publishedAt) ||
      (isPublished ? new Date().toISOString() : null),
    created_by_api_key: auth.keyId,
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

  const updates: Record<string, unknown> = {};

  const title = firstString(body.title);
  if (title) updates.title = title;

  const slug = firstString(body.slug, body.urlSlug);
  if (slug) updates.slug = slug;

  const content = firstString(body.content);
  if (content) updates.content = content;

  if (hasValue(body.excerpt)) {
    updates.excerpt = optionalString(body.excerpt);
  }
  if (hasValue(body.meta_title, body.seoTitleTag)) {
    updates.meta_title = optionalString(body.meta_title, body.seoTitleTag);
  }
  if (hasValue(body.meta_description, body.metaDescription)) {
    updates.meta_description = optionalString(
      body.meta_description,
      body.metaDescription
    );
  }
  if (hasValue(body.h1_tag, body.h1Tag)) {
    updates.h1_tag = optionalString(body.h1_tag, body.h1Tag);
  }
  if (hasValue(body.seo_keywords, body.keywords)) {
    updates.seo_keywords = toStringArray(body.seo_keywords ?? body.keywords);
  }
  if (hasValue(body.canonical_url, body.canonicalUrl)) {
    updates.canonical_url = optionalString(
      body.canonical_url,
      body.canonicalUrl
    );
  }
  if (hasValue(body.cover_image, body.coverImageUrl)) {
    updates.cover_image = optionalString(body.cover_image, body.coverImageUrl);
  }
  if (hasValue(body.cover_image_alt, body.coverImageAltText)) {
    updates.cover_image_alt = optionalString(
      body.cover_image_alt,
      body.coverImageAltText
    );
  }
  if (hasValue(body.category)) {
    updates.category = optionalString(body.category);
  }
  if (hasValue(body.tags)) {
    updates.tags = toStringArray(body.tags);
  }
  if (
    hasValue(
      body.image_generation_prompt,
      body.image_prompt,
      body.imagePrompt,
      body.image_Prompt
    )
  ) {
    updates.image_generation_prompt = optionalString(
      body.image_generation_prompt,
      body.image_prompt,
      body.imagePrompt,
      body.image_Prompt
    );
  }
  if (hasValue(body.author, body.authorName, body.author_name)) {
    const author = firstString(body.author, body.authorName, body.author_name);
    if (author) {
      updates.author = author;
      updates.author_name = author;
    }
  }
  if (hasValue(body.status)) {
    const status = normalizeStatus(body.status);
    updates.status = status;
    if (typeof body.is_published !== 'boolean') {
      updates.is_published = status === 'published';
    }
  }
  if (typeof body.is_published === 'boolean') {
    updates.is_published = body.is_published;
  }
  if (hasValue(body.published_at, body.publishedAt)) {
    updates.published_at = optionalString(body.published_at, body.publishedAt);
  }
  updates.updated_at = new Date().toISOString();

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
