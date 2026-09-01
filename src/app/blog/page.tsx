import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { BookOpen, ArrowRight, Calendar } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

// Uses cookies() via createClient(), so it must render on demand, not at build time.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'The Ruhvi Journal | Ruhvi Fine Jewellery',
  description:
    'Stories of craftsmanship, styling tips, and guides to understanding fine jewellery from Ruhvi.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'The Ruhvi Journal',
    description:
      'Stories of craftsmanship, styling tips, and guides to understanding fine jewellery from Ruhvi.',
    type: 'website',
    url: '/blog',
    siteName: 'Ruhvi Fine Jewellery',
  },
};

interface BlogPostRow {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image: string | null;
  published_at: string | null;
}

export default async function BlogIndexPage() {
  let posts: BlogPostRow[] = [];

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('blog_posts')
      .select('title, slug, excerpt, cover_image, published_at')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(9);

    if (data && data.length > 0) {
      posts = (data as BlogPostRow[]).map((p) => ({
        ...p,
        excerpt: p.excerpt || '',
        cover_image: p.cover_image || '',
        published_at: p.published_at || new Date().toISOString(),
        category: 'Journal',
      }));
    }
  } catch (err) {
    console.error('Failed to load blog posts:', err);
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-taupe-200 bg-champagne-100 px-4 py-20 text-center">
        <div className="mx-auto max-w-3xl space-y-6">
          <BookOpen className="mx-auto h-8 w-8 text-gold-700" />
          <h1 className="font-serif text-4xl font-bold text-charcoal-900 sm:text-5xl">
            The Ruhvi Journal
          </h1>
          <p className="text-lg text-charcoal-600">
            Stories of craftsmanship, styling tips, and guides to understanding
            fine jewellery.
          </p>
        </div>
      </div>

      {/* Blog Grid */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {posts.length > 0 ? (
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <article key={post.slug} className="group flex h-full flex-col">
                <Link
                  href={`/blog/${post.slug}`}
                  className="relative mb-6 block aspect-[4/3] overflow-hidden rounded-2xl bg-taupe-100"
                >
                  <Image
                    src={post.cover_image}
                    alt={post.title}
                    fill
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-charcoal-900 backdrop-blur-sm">
                    {post.category}
                  </div>
                </Link>

                <div className="flex flex-grow flex-col">
                  <div className="mb-3 flex items-center space-x-2 font-mono text-xs uppercase text-charcoal-400">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {new Date(post.published_at).toLocaleDateString('en-IN', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <Link href={`/blog/${post.slug}`}>
                    <h2 className="mb-3 line-clamp-2 font-serif text-2xl font-bold text-charcoal-900 transition-colors group-hover:text-gold-700">
                      {post.title}
                    </h2>
                  </Link>

                  <p className="mb-6 line-clamp-3 text-sm leading-relaxed text-charcoal-600">
                    {post.excerpt}
                  </p>

                  <div className="mt-auto">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-gold-700 transition-all group-hover:space-x-3"
                    >
                      <span>Read Article</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-taupe-200 bg-white p-12 text-center">
            <BookOpen className="mx-auto mb-4 h-10 w-10 text-taupe-300" />
            <h3 className="mb-2 font-serif text-lg font-bold text-charcoal-800">
              No Journal Articles Yet
            </h3>
            <p className="text-sm text-charcoal-500">
              Check back soon for stories, styling tips, and guides from Ruhvi.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
