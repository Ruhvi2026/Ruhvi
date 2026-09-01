import { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ruhvi.in';

  // Base static pages
  const staticPages = [
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
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));

  // Fetch dynamic products from Supabase
  let productEntries: MetadataRoute.Sitemap = [];
  try {
    const supabase = await createClient();
    const { data: dbProducts } = await supabase
      .from('products')
      .select('slug, updated_at')
      .neq('status', 'hidden');

    const products = dbProducts && dbProducts.length > 0 ? dbProducts : [];

    productEntries = products.map((p: any) => ({
      url: `${baseUrl}/products/${p.slug}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    }));
  } catch (error) {
    productEntries = [];
  }

  // Categories
  const categorySlugs = ['rings', 'earrings', 'bangles', 'necklaces', 'chains'];
  const categoryEntries = categorySlugs.map((slug) => ({
    url: `${baseUrl}/category/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...staticPages, ...categoryEntries, ...productEntries];
}
