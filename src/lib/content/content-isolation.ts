/**
 * ============================================================================
 * PUBLIC CONTENT INTEGRITY & TEST ISOLATION FILTER (PHASE 54)
 * ============================================================================
 * Protects the public storefront, sitemap, catalog, category grids, and editorial
 * journal from exposing internal sandbox/test products or draft articles.
 *
 * Rules:
 * 1. Strict Exclusion: Confirmed test products ('finale-test', 'testing', etc.)
 *    are never presented to public shoppers or search engine indexers.
 * 2. Case-Insensitive Pattern Match: Any item with confirmed test identifiers
 *    or explicitly marked test slugs is rejected from public presentation.
 * 3. Editorial Integrity: Draft/test blog posts ('test-blog') are isolated, and
 *    verified typographical errors (e.g. 'Benifits' -> 'Benefits') are normalized.
 * 4. Non-Destructive Filtering: Safeguards existing genuine luxury products and
 *    editorial articles without data loss or unauthorized mutation.
 */

export const EXCLUDED_TEST_PRODUCT_SLUGS = [
  'finale-test',
  'testing',
  'test-product',
  'test-ring',
  'test-necklace',
] as const;

export const EXCLUDED_TEST_BLOG_SLUGS = [
  'test-blog',
  'draft-post',
  'test-article',
] as const;

/**
 * Checks whether a product slug or title represents confirmed internal test content.
 */
export function isTestProduct(
  slug?: string | null,
  title?: string | null
): boolean {
  if (slug) {
    const cleanSlug = slug.trim().toLowerCase();
    if (EXCLUDED_TEST_PRODUCT_SLUGS.some((s) => cleanSlug === s)) {
      return true;
    }
    // Any slug explicitly starting with 'test-' or ending with '-test'
    if (
      cleanSlug === 'test' ||
      cleanSlug.startsWith('test-') ||
      cleanSlug.endsWith('-test')
    ) {
      return true;
    }
  }

  if (title) {
    const cleanTitle = title.trim().toLowerCase();
    if (
      cleanTitle === 'finale test' ||
      cleanTitle === 'testing' ||
      cleanTitle === 'test product' ||
      cleanTitle === 'test ring' ||
      cleanTitle === 'test item'
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Checks whether a blog post slug or title represents confirmed internal test content.
 */
export function isTestBlogPost(
  slug?: string | null,
  title?: string | null
): boolean {
  if (slug) {
    const cleanSlug = slug.trim().toLowerCase();
    if (EXCLUDED_TEST_BLOG_SLUGS.some((s) => cleanSlug === s)) {
      return true;
    }
    if (cleanSlug === 'test-blog' || cleanSlug === 'draft-test') {
      return true;
    }
  }

  if (title) {
    const cleanTitle = title.trim().toLowerCase();
    if (
      cleanTitle === 'test blog' ||
      cleanTitle === 'test post' ||
      cleanTitle === 'draft post'
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Normalizes editorial typos in public blog titles.
 * Specifically corrects 'Benifits' -> 'Benefits'.
 */
export function normalizeBlogTitle(title?: string | null): string {
  if (!title) return '';
  return title
    .replace(/\bBenifits\b/g, 'Benefits')
    .replace(/\bbenifits\b/g, 'benefits');
}

/**
 * Pure filter helper to filter out test products from any product array.
 */
export function filterPublicProducts<
  T extends {
    slug?: string | null;
    name?: string | null;
    title?: string | null;
  },
>(products: T[] | null | undefined): T[] {
  if (!products || !Array.isArray(products)) return [];
  return products.filter((p) => !isTestProduct(p.slug, p.name || p.title));
}

/**
 * Pure filter helper to filter out test blog posts from any blog array.
 */
export function filterPublicBlogPosts<
  T extends { slug?: string | null; title?: string | null },
>(posts: T[] | null | undefined): T[] {
  if (!posts || !Array.isArray(posts)) return [];
  return posts
    .filter((p) => !isTestBlogPost(p.slug, p.title))
    .map((p) => ({
      ...p,
      title: normalizeBlogTitle(p.title),
    }));
}
