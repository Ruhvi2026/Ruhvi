import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Facebook,
  Twitter,
  Linkedin,
  Share2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

const FALLBACK_POSTS: Record<
  string,
  {
    title: string;
    excerpt: string;
    content: string;
    cover_image: string;
    published_at: string;
    category: string;
    author: string;
  }
> = {
  'how-to-care-for-22k-gold-jewellery': {
    title: 'How to Care for Your 22K Gold Jewellery at Home',
    excerpt:
      'Keep your Ruhvi pieces shining forever with these simple, expert-approved home cleaning techniques.',
    content: `
      <p>Fine jewellery is an investment meant to last a lifetime, but even the highest quality 22K gold needs a little tender loving care to maintain its radiant shine. In this guide, we will walk you through the safest and most effective ways to clean your Ruhvi pieces at home.</p>

      <h2>1. The Gentle Soap Method</h2>
      <p>The best way to clean your gold jewellery is often the simplest. Mix a few drops of mild dish soap into a bowl of warm (not hot) water. Let your jewellery soak for about 15-20 minutes to loosen any accumulated oils or dirt.</p>

      <h2>2. Use a Soft Brush</h2>
      <p>After soaking, use a soft-bristled toothbrush to gently scrub the pieces. Pay special attention to the areas around diamond or gemstone settings, as this is where lotion and dirt tend to build up. <strong>Never use toothpaste or baking soda</strong>, as these are abrasive and can scratch the gold.</p>

      <h2>3. Rinse and Dry Safely</h2>
      <p>Rinse the jewellery under warm running water. Always make sure the drain is plugged first! Pat the pieces dry with a soft, lint-free cloth. Avoid paper towels, which can leave tiny scratches on the metal's surface.</p>

      <h2>When to Seek Professional Cleaning</h2>
      <p>While home cleaning is great for regular maintenance, we recommend bringing your everyday pieces to a professional jeweller once a year for an ultrasonic cleaning and prong inspection to ensure your diamonds are secure.</p>
    `,
    cover_image: '/images/categories/necklaces.jpg',
    published_at: '2026-07-28T10:00:00Z',
    category: 'Care Guide',
    author: 'Ruhvi Editorial Team',
  },
};

interface BlogPost {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string;
  published_at: string;
  category: string;
  author: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchPost(slug);

  if (!post) {
    return { title: 'Article Not Found | Ruhvi' };
  }

  return {
    title: `${post.title} | Ruhvi Journal`,
    description: post.excerpt,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `/blog/${slug}`,
      images: post.cover_image ? [post.cover_image] : [],
      type: 'article',
      publishedTime: post.published_at,
    },
  };
}

async function fetchPost(slug: string): Promise<BlogPost | null> {
  const fallback = FALLBACK_POSTS[slug];

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle();

    if (data) {
      return {
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt || '',
        content: data.content,
        cover_image: data.cover_image || '/images/categories/necklaces.jpg',
        published_at: data.published_at || new Date().toISOString(),
        category: 'Journal',
        author: 'Ruhvi Editorial Team',
      };
    }
  } catch (err) {
    console.error('Failed to load blog post:', err);
  }

  return fallback
    ? {
        ...fallback,
        slug,
        excerpt: fallback.excerpt,
        content: fallback.content,
      }
    : null;
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await fetchPost(slug);

  if (!post) {
    notFound();
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ruhvi.in';
  const shareUrl = `${siteUrl}/blog/${slug}`;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(post.title);

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: post.cover_image,
    datePublished: post.published_at,
    author: { '@type': 'Organization', name: post.author },
    publisher: { '@type': 'Organization', name: 'Ruhvi Jewels' },
    mainEntityOfPage: shareUrl,
  };

  return (
    <div className="min-h-screen bg-white pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      {/* Article Header */}
      <div className="mx-auto max-w-4xl px-4 pb-8 pt-16 text-center sm:px-6 lg:px-8">
        <Link
          href="/blog"
          className="mb-8 inline-flex items-center text-sm font-semibold text-charcoal-500 transition-colors hover:text-charcoal-900"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Journal
        </Link>

        <div className="mb-6">
          <span className="rounded-full bg-taupe-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-charcoal-700">
            {post.category}
          </span>
        </div>

        <h1 className="mb-6 font-serif text-4xl font-bold leading-tight text-charcoal-900 sm:text-5xl md:text-6xl">
          {post.title}
        </h1>

        <p className="mx-auto mb-8 max-w-2xl text-xl text-charcoal-600">
          {post.excerpt}
        </p>

        <div className="flex items-center justify-center space-x-6 border-t border-taupe-200 pt-8 text-sm font-medium text-charcoal-500">
          <span>By {post.author}</span>
          <span className="h-1.5 w-1.5 rounded-full bg-taupe-300" />
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>
              {new Date(post.published_at).toLocaleDateString('en-IN', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Cover Image */}
      <div className="mx-auto mb-16 max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="relative aspect-[21/9] overflow-hidden rounded-3xl bg-taupe-100 shadow-xl">
          <Image
            src={post.cover_image}
            alt={post.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>

      {/* Article Body */}
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-12 md:flex-row">
          {/* Social Share Sidebar */}
          <div className="flex flex-shrink-0 space-x-4 pt-2 md:w-16 md:flex-col md:space-x-0 md:space-y-4">
            <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-charcoal-400 md:mb-4 md:flex-col">
              <Share2 className="h-4 w-4" />
              <span className="hidden md:inline">Share</span>
            </span>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Share on Facebook"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-taupe-200 text-charcoal-500 transition-colors hover:border-blue-600 hover:text-blue-600"
            >
              <Facebook className="h-4 w-4" />
            </a>
            <a
              href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Share on Twitter"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-taupe-200 text-charcoal-500 transition-colors hover:border-sky-500 hover:text-sky-500"
            >
              <Twitter className="h-4 w-4" />
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Share on LinkedIn"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-taupe-200 text-charcoal-500 transition-colors hover:border-blue-700 hover:text-blue-700"
            >
              <Linkedin className="h-4 w-4" />
            </a>
          </div>

          {/* Prose Content */}
          <div
            className="prose prose-lg prose-stone max-w-none prose-headings:font-serif prose-headings:font-bold prose-h2:mt-12 prose-h2:text-3xl prose-p:leading-relaxed prose-a:text-gold-700"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </div>
      </div>
    </div>
  );
}
