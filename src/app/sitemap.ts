import { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';

/**
 * Generates the XML sitemap for Ruhvi E-commerce (Finding E1).
 *
 * Best practices enforced:
 * 1. Omit lastModified for static/category pages where true update timestamps are untracked,
 *    preventing search engines from treating unchanged pages as continuously modified.
 * 2. Use real `updated_at` timestamps for dynamic products and published blog articles.
 * 3. Log database and query errors explicitly with console.error instead of silently swallowing them.
 * 4. Apply defensive limits and null-safety to prevent malformed sitemap entries.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ruhvi.in';

  // Base static pages: omit lastModified since they are versioned by deployment
  const staticPages: MetadataRoute.Sitemap = [
    '',
    '/about',
    '/contact',
    '/products',
    '/blog',
    '/faq',
    '/offers',
    '/testimonials',
    '/gift-guide',
    '/size-guide',
    '/jewelry-care',
    '/privacy-policy',
    '/shipping-policy',
    '/return-policy',
    '/terms-and-conditions',
    '/cancellation-policy',
    '/warranty-policy',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));

  // Categories
  const categorySlugs = ['rings', 'earrings', 'bangles', 'necklaces', 'chains'];
  const categoryEntries: MetadataRoute.Sitemap = categorySlugs.map((slug) => ({
    url: `${baseUrl}/category/${slug}`,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Fetch dynamic products from Supabase
  let productEntries: MetadataRoute.Sitemap = [];
  try {
    const supabase = await createClient();
    const { data: dbProducts, error: dbError } = await supabase
      .from('products')
      .select('slug, updated_at')
      .neq('status', 'hidden')
      .order('updated_at', { ascending: false })
      .limit(5000);

    if (dbError) {
      console.error(
        '[sitemap] Supabase error fetching products for sitemap:',
        dbError
      );
    } else if (dbProducts && dbProducts.length > 0) {
      productEntries = dbProducts
        .filter((p: any) => Boolean(p.slug))
        .map((p: any) => ({
          url: `${baseUrl}/products/${p.slug}`,
          ...(p.updated_at ? { lastModified: new Date(p.updated_at) } : {}),
          changeFrequency: 'daily' as const,
          priority: 0.9,
        }));
    }
  } catch (error: any) {
    console.error(
      '[sitemap] Unexpected error generating product sitemap entries:',
      error
    );
    productEntries = [];
  }

  // Fetch dynamic published blog posts from Supabase
  let blogEntries: MetadataRoute.Sitemap = [];
  try {
    const supabase = await createClient();
    const { data: dbBlogs, error: blogError } = await supabase
      .from('blog_posts')
      .select('slug, updated_at, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(1000);

    if (blogError) {
      console.error(
        '[sitemap] Supabase error fetching blogs for sitemap:',
        blogError
      );
    } else if (dbBlogs && dbBlogs.length > 0) {
      blogEntries = dbBlogs
        .filter((b: any) => Boolean(b.slug))
        .map((b: any) => ({
          url: `${baseUrl}/blog/${b.slug}`,
          ...(b.updated_at || b.published_at
            ? { lastModified: new Date(b.updated_at || b.published_at) }
            : {}),
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        }));
    }
  } catch (error: any) {
    console.error(
      '[sitemap] Unexpected error generating blog sitemap entries:',
      error
    );
    blogEntries = [];
  }

  return [
    ...staticPages,
    ...categoryEntries,
    ...productEntries,
    ...blogEntries,
  ];
}
