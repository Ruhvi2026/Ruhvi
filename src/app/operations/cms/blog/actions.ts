'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminClient } from '@/lib/auth/require-admin-client';
import { generateAIContent } from '@/lib/ai';

// -----------------------------------------------------------------------------
// Blog Creation Module — server actions.
// See BLOG_CREATION_MODULE_SPEC.md for the full functional specification.
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

function sanitizeKeywords(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0)
    .slice(0, 20);
}

function sanitizeTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .slice(0, 20);
}

// -----------------------------------------------------------------------------
// Blog post CRUD
// -----------------------------------------------------------------------------

export interface BlogPostRow {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  cover_image_alt: string | null;
  meta_title: string | null;
  meta_description: string | null;
  h1_tag: string | null;
  seo_keywords: string[] | null;
  canonical_url: string | null;
  category: string | null;
  tags: string[] | null;
  content_images: any;
  author_id: string | null;
  author_name: string | null;
  status: string;
  is_published: boolean;
  published_at: string | null;
  scheduled_publish_at: string | null;
  submitted_for_review_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  created_by_api_key: string | null;
}

/** Fetch a single post (for the editor + review page). */
export async function getBlogPost(id: string): Promise<BlogPostRow | null> {
  try {
    const { supabase } = await requireAdminClient();
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data as BlogPostRow) || null;
  } catch {
    return null;
  }
}

/** List posts with optional status filter (for the blog list table). */
export async function listBlogPosts(options?: {
  status?: string;
  search?: string;
}): Promise<BlogPostRow[]> {
  try {
    const { supabase } = await requireAdminClient();
    let query = supabase
      .from('blog_posts')
      .select('*')
      .order('updated_at', { ascending: false });

    if (options?.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }

    if (options?.search && options.search.trim().length > 0) {
      query = query.ilike('title', `%${options.search.trim()}%`);
    }

    const { data, error } = await query.limit(200);
    if (error) throw error;
    return (data as BlogPostRow[]) || [];
  } catch {
    return [];
  }
}

/** Create an initial draft post. Returns the new post id. */
export async function createBlogPost(formData: FormData) {
  try {
    const { supabase, userId } = await requireAdminClient();

    const title = (formData.get('title') as string) || '';
    if (!title.trim()) {
      return { success: false, error: 'Title is required.' };
    }

    const slug = await uniqueSlug(
      supabase,
      (formData.get('slug') as string) || slugify(title),
      null
    );

    const author_name = (formData.get('author_name') as string) || '';
    const { data: userRow } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle();

    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        title: title.trim(),
        slug,
        content: (formData.get('content') as string) || '',
        excerpt: (formData.get('excerpt') as string) || null,
        category: (formData.get('category') as string) || null,
        tags: sanitizeTags(formData.get('tags') as string),
        seo_keywords: sanitizeKeywords(formData.get('seo_keywords') as string),
        meta_title: (formData.get('meta_title') as string) || null,
        meta_description: (formData.get('meta_description') as string) || null,
        h1_tag: (formData.get('h1_tag') as string) || null,
        canonical_url: (formData.get('canonical_url') as string) || null,
        cover_image: (formData.get('cover_image') as string) || null,
        cover_image_alt: (formData.get('cover_image_alt') as string) || null,
        author_id: userId,
        author_name: author_name || userRow?.full_name || null,
        status: 'draft',
        is_published: false,
      })
      .select('id, slug')
      .single();

    if (error) {
      if (error.code === '23505') {
        return {
          success: false,
          error: 'A post with this slug already exists.',
        };
      }
      throw error;
    }

    revalidatePath('/operations/cms/blog');
    return { success: true, id: (data as { id: string }).id, slug };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create post.' };
  }
}

/** Save draft content / fields. Only allowed while status is 'draft'. */
export async function updateBlogPost(id: string, formData: FormData) {
  try {
    const { supabase } = await requireAdminClient();

    const { data: existing } = await supabase
      .from('blog_posts')
      .select('status')
      .eq('id', id)
      .maybeSingle();

    if (!existing) {
      return { success: false, error: 'Post not found.' };
    }
    if (existing.status !== 'draft') {
      return { success: false, error: 'Only drafts can be edited.' };
    }

    const title = (formData.get('title') as string) || '';
    if (!title.trim()) {
      return { success: false, error: 'Title is required.' };
    }

    const rawSlug = (formData.get('slug') as string) || slugify(title);
    const slug = await uniqueSlug(supabase, rawSlug, id);

    const { error } = await supabase
      .from('blog_posts')
      .update({
        title: title.trim(),
        slug,
        content: (formData.get('content') as string) || '',
        excerpt: (formData.get('excerpt') as string) || null,
        category: (formData.get('category') as string) || null,
        tags: sanitizeTags(formData.get('tags') as string),
        seo_keywords: sanitizeKeywords(formData.get('seo_keywords') as string),
        meta_title: (formData.get('meta_title') as string) || null,
        meta_description: (formData.get('meta_description') as string) || null,
        h1_tag: (formData.get('h1_tag') as string) || null,
        canonical_url: (formData.get('canonical_url') as string) || null,
        cover_image: (formData.get('cover_image') as string) || null,
        cover_image_alt: (formData.get('cover_image_alt') as string) || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      if (error.code === '23505') {
        return {
          success: false,
          error: 'A post with this slug already exists.',
        };
      }
      throw error;
    }

    revalidatePath('/operations/cms/blog');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to save draft.' };
  }
}

export async function deleteBlogPost(id: string) {
  try {
    const { supabase } = await requireAdminClient();
    const { error } = await supabase.from('blog_posts').delete().eq('id', id);
    if (error) throw error;
    revalidatePath('/operations/cms/blog');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete post.' };
  }
}

// -----------------------------------------------------------------------------
// Slug generation
// -----------------------------------------------------------------------------

/** Generate a unique slug server-side from a title. */
export async function generateSlug(title: string, existingId?: string) {
  try {
    const { supabase } = await requireAdminClient();
    if (!title.trim()) return { success: true, slug: '' };
    const slug = await uniqueSlug(supabase, slugify(title), existingId || null);
    return { success: true, slug };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to generate slug.' };
  }
}

async function uniqueSlug(
  supabase: any,
  base: string,
  excludeId: string | null
): Promise<string> {
  let candidate = base || 'untitled';
  let counter = 2;
  for (let i = 0; i < 50; i++) {
    let query = supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();
    if (excludeId) query = query.neq('id', excludeId);
    const { data } = await query;
    if (!data) return candidate;
    candidate = `${base}-${counter}`;
    counter += 1;
  }
  return `${base}-${Date.now().toString(36)}`;
}

// -----------------------------------------------------------------------------
// Media management
// -----------------------------------------------------------------------------

export interface BlogMediaRow {
  id: string;
  post_id: string | null;
  url: string;
  public_id: string;
  alt_text: string;
  width: number | null;
  height: number | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  sort_order: number;
  created_at: string;
}

/** List media attached to a post. */
export async function listBlogMedia(postId: string): Promise<BlogMediaRow[]> {
  try {
    const { supabase } = await requireAdminClient();
    const { data, error } = await supabase
      .from('blog_media')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data as BlogMediaRow[]) || [];
  } catch {
    return [];
  }
}

/** Register a Cloudinary upload URL as a blog_media row. */
export async function addBlogMedia(formData: FormData) {
  try {
    const { supabase } = await requireAdminClient();
    const postId = formData.get('post_id') as string;
    const url = formData.get('url') as string;
    const publicId = (formData.get('public_id') as string) || '';
    const altText = (formData.get('alt_text') as string) || '';
    const width = parseInt(formData.get('width') as string, 10) || null;
    const height = parseInt(formData.get('height') as string, 10) || null;
    const fileSize =
      parseInt(formData.get('file_size_bytes') as string, 10) || null;
    const mimeType = (formData.get('mime_type') as string) || 'image/webp';

    if (!url) {
      return { success: false, error: 'Image URL is required.' };
    }

    const { data, error } = await supabase
      .from('blog_media')
      .insert({
        post_id: postId || null,
        url,
        public_id: publicId,
        alt_text: altText,
        width,
        height,
        file_size_bytes: fileSize,
        mime_type: mimeType,
      })
      .select('id')
      .single();

    if (error) throw error;
    return { success: true, id: (data as { id: string }).id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to add media.' };
  }
}

/** Update alt-text on a media row. */
export async function updateBlogMediaAltText(mediaId: string, altText: string) {
  try {
    const { supabase } = await requireAdminClient();
    const { error } = await supabase
      .from('blog_media')
      .update({ alt_text: altText })
      .eq('id', mediaId);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to update alt text.',
    };
  }
}

/** Delete a media row (also cascades content_images reference cleanup later). */
export async function deleteBlogMedia(mediaId: string) {
  try {
    const { supabase } = await requireAdminClient();
    const { error } = await supabase
      .from('blog_media')
      .delete()
      .eq('id', mediaId);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete media.' };
  }
}

export interface BlogRevisionRow {
  id: string;
  post_id: string;
  content: string;
  title: string;
  excerpt: string | null;
  created_by: string | null;
  created_at: string;
}

/** Fetch the most recent revision for a post (used by the review screen). */
export async function getLatestBlogRevision(
  postId: string
): Promise<BlogRevisionRow | null> {
  try {
    const { supabase } = await requireAdminClient();
    const { data, error } = await supabase
      .from('blog_revisions')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as BlogRevisionRow) || null;
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// Review workflow
// -----------------------------------------------------------------------------

/** Snapshot current content into blog_revisions, then move status -> review. */
export async function submitForReview(id: string) {
  try {
    const { supabase, userId } = await requireAdminClient();

    const { data: post } = await supabase
      .from('blog_posts')
      .select('content, title, excerpt, status')
      .eq('id', id)
      .maybeSingle();

    if (!post) return { success: false, error: 'Post not found.' };
    if (post.status === 'review') {
      return { success: false, error: 'Post is already in review.' };
    }

    const { error: revError } = await supabase.from('blog_revisions').insert({
      post_id: id,
      content: post.content,
      title: post.title,
      excerpt: post.excerpt,
      created_by: userId,
    });
    if (revError) throw revError;

    const { error } = await supabase
      .from('blog_posts')
      .update({
        status: 'review',
        submitted_for_review_at: new Date().toISOString(),
        review_notes: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
    revalidatePath('/operations/cms/blog');
    revalidatePath('/operations/cms/blog/review');
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to submit for review.',
    };
  }
}

/** Approve: publish the post. */
export async function approvePost(id: string) {
  try {
    const { supabase, userId } = await requireAdminClient();
    const now = new Date().toISOString();

    const { data: post } = await supabase
      .from('blog_posts')
      .select('published_at')
      .eq('id', id)
      .maybeSingle();

    const { error } = await supabase
      .from('blog_posts')
      .update({
        status: 'published',
        is_published: true,
        published_at: post?.published_at || now,
        scheduled_publish_at: null,
        reviewed_by: userId,
        review_notes: null,
        updated_at: now,
      })
      .eq('id', id);

    if (error) throw error;
    revalidatePath('/operations/cms/blog');
    revalidatePath('/operations/cms/blog/review');
    revalidatePath('/blog');
    revalidatePath('/blog');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to approve post.' };
  }
}

/** Reject: move back to draft with optional notes. */
export async function rejectPost(id: string, notes: string) {
  try {
    const { supabase } = await requireAdminClient();
    const { error } = await supabase
      .from('blog_posts')
      .update({
        status: 'draft',
        review_notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
    revalidatePath('/operations/cms/blog');
    revalidatePath('/operations/cms/blog/review');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to reject post.' };
  }
}

// -----------------------------------------------------------------------------
// Publishing
// -----------------------------------------------------------------------------

/** Publish now (from draft or review). */
export async function publishPost(id: string) {
  try {
    const { supabase } = await requireAdminClient();
    const now = new Date().toISOString();

    const { data: post } = await supabase
      .from('blog_posts')
      .select('published_at')
      .eq('id', id)
      .maybeSingle();

    const { error } = await supabase
      .from('blog_posts')
      .update({
        status: 'published',
        is_published: true,
        published_at: post?.published_at || now,
        scheduled_publish_at: null,
        updated_at: now,
      })
      .eq('id', id);

    if (error) throw error;
    revalidatePath('/operations/cms/blog');
    revalidatePath('/blog');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to publish post.' };
  }
}

/** Schedule a post for a future publish time. */
export async function schedulePost(id: string, scheduledAt: string) {
  try {
    const { supabase } = await requireAdminClient();
    const parsed = new Date(scheduledAt);
    if (isNaN(parsed.getTime())) {
      return { success: false, error: 'Invalid schedule time.' };
    }

    const { error } = await supabase
      .from('blog_posts')
      .update({
        status: 'scheduled',
        scheduled_publish_at: parsed.toISOString(),
        is_published: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
    revalidatePath('/operations/cms/blog');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to schedule post.' };
  }
}

/** Unpublish: take a live post down (back to draft). */
export async function unpublishPost(id: string) {
  try {
    const { supabase } = await requireAdminClient();
    const { error } = await supabase
      .from('blog_posts')
      .update({
        status: 'draft',
        is_published: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
    revalidatePath('/operations/cms/blog');
    revalidatePath('/blog');
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to unpublish post.',
    };
  }
}

// -----------------------------------------------------------------------------
// AI-powered meta description generation
// -----------------------------------------------------------------------------

/**
 * Generate a meta description using the AI routing engine.
 * Requires the `blog_meta_description` feature to be enabled in ai_features.
 */
export async function generateMetaDescription(formData: FormData) {
  try {
    await requireAdminClient();
    const title = (formData.get('title') as string) || '';
    const excerpt = (formData.get('excerpt') as string) || '';
    const keywords = (formData.get('seo_keywords') as string) || '';

    const prompt = `You are an SEO specialist for Ruhvi, a premium gold-plated jewellery brand. Generate a single meta description (max 160 characters) for the blog post below.

BLOG TITLE:
${title || '(untitled)'}

EXCERPT:
${excerpt || '(none)'}

${keywords ? `FOCUS KEYWORDS:\n${keywords}` : ''}

INSTRUCTIONS:
- Output strictly valid JSON with one field: {"meta_description": "..."}
- The description must be under 160 characters, compelling, and naturally include the primary keyword when available.`;

    const result = await generateAIContent('blog_meta_description', prompt);
    const description =
      (result as any)?.meta_description ||
      (result as any)?.response ||
      (result as any)?.metaDescription ||
      '';

    if (!description) {
      return {
        success: false,
        error: 'AI returned an empty description. Try again or write manually.',
      };
    }

    return {
      success: true,
      meta_description: String(description).slice(0, 160),
    };
  } catch (err: any) {
    console.error('[blog] meta description generation failed:', err);
    return {
      success: false,
      error:
        err.message?.includes('disabled') || err.message?.includes('disabled')
          ? 'AI meta description generation is currently disabled.'
          : 'AI generation failed. Please try again or write manually.',
    };
  }
}
