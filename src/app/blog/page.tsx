'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, ArrowRight, Calendar } from 'lucide-react';

const MOCK_POSTS = [
  {
    slug: 'how-to-care-for-18k-gold-jewellery',
    title: 'How to Care for Your 22K Gold Jewellery at Home',
    excerpt:
      'Keep your Ruhvi pieces shining forever with these simple, expert-approved home cleaning techniques.',
    cover_image:
      'https://images.unsplash.com/photo-1599643478524-fb66f70a0066?auto=format&fit=crop&q=80',
    published_at: '2026-07-28T10:00:00Z',
    category: 'Care Guide',
  },
  {
    slug: 'gold-plated-vs-solid-gold',
    title: 'Gold Plated vs Solid Gold: What You Need to Know',
    excerpt:
      'Learn how Ruhvi\u2019s premium 22K gold-plated pieces are crafted and how to make their brilliance last.',
    cover_image:
      'https://images.unsplash.com/photo-1605100804763-247f67b2548e?auto=format&fit=crop&q=80',
    published_at: '2026-07-20T10:00:00Z',
    category: 'Education',
  },
  {
    slug: 'bridal-trends-2026',
    title: 'Bridal Jewellery Trends: The Return to Minimalism',
    excerpt:
      'Discover why modern brides are opting for lightweight, elegant statement pieces over heavy traditional sets.',
    cover_image:
      'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80',
    published_at: '2026-07-15T10:00:00Z',
    category: 'Style & Trends',
  },
];

export default function BlogIndexPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-stone-200 bg-[#FAF6ED] px-4 py-20 text-center">
        <div className="mx-auto max-w-3xl space-y-6">
          <BookOpen className="mx-auto h-8 w-8 text-amber-900" />
          <h1 className="font-serif text-4xl font-bold text-stone-900 sm:text-5xl">
            The Ruhvi Journal
          </h1>
          <p className="text-lg text-stone-600">
            Stories of craftsmanship, styling tips, and guides to understanding
            fine jewellery.
          </p>
        </div>
      </div>

      {/* Blog Grid */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-3">
          {MOCK_POSTS.map((post) => (
            <article
              key={post.slug}
              className="group flex h-full cursor-pointer flex-col"
            >
              <Link
                href={`/blog/${post.slug}`}
                className="relative mb-6 block aspect-[4/3] overflow-hidden rounded-2xl bg-stone-100"
              >
                <Image
                  src={post.cover_image}
                  alt={post.title}
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-900 backdrop-blur-sm">
                  {post.category}
                </div>
              </Link>

              <div className="flex flex-grow flex-col">
                <div className="mb-3 flex items-center space-x-2 font-mono text-xs uppercase text-stone-400">
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
                  <h2 className="mb-3 line-clamp-2 font-serif text-2xl font-bold text-stone-900 transition-colors group-hover:text-amber-900">
                    {post.title}
                  </h2>
                </Link>

                <p className="mb-6 line-clamp-3 text-sm leading-relaxed text-stone-600">
                  {post.excerpt}
                </p>

                <div className="mt-auto">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-amber-900 transition-all group-hover:space-x-3"
                  >
                    <span>Read Article</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
