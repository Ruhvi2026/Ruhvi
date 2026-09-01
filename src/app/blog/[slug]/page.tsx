import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import BlogEngagement from './BlogEngagement';

interface BlogPost {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string;
  cover_image_alt: string;
  meta_title: string;
  meta_description: string;
  h1_tag: string;
  seo_keywords: string[];
  canonical_url: string;
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
    title: post.meta_title || `${post.title} | Ruhvi Journal`,
    description: post.meta_description || post.excerpt,
    keywords: post.seo_keywords,
    alternates: { canonical: post.canonical_url || `/blog/${slug}` },
    openGraph: {
      title: post.meta_title || post.title,
      description: post.meta_description || post.excerpt,
      url: `/blog/${slug}`,
      images: post.cover_image ? [post.cover_image] : [],
      type: 'article',
      publishedTime: post.published_at,
    },
  };
}

async function fetchPost(slug: string): Promise<BlogPost | null> {
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
        cover_image: data.cover_image || '',
        cover_image_alt: data.cover_image_alt || '',
        meta_title: data.meta_title || '',
        meta_description: data.meta_description || '',
        h1_tag: data.h1_tag || '',
        seo_keywords: data.seo_keywords || [],
        canonical_url: data.canonical_url || '',
        published_at: data.published_at || new Date().toISOString(),
        category: data.category || 'Journal',
        author: data.author_name || 'Ruhvi Editorial Team',
      };
    }
  } catch (err) {
    console.error('Failed to load blog post:', err);
  }

  return null;
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
          {post.h1_tag || post.title}
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
            alt={post.cover_image_alt || post.title}
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
          <div className="flex flex-shrink-0 pt-2 md:w-16 md:flex-col md:items-center">
            <BlogEngagement
              slug={post.slug}
              title={post.title}
              siteUrl={siteUrl}
            />
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
