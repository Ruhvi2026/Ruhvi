'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, ArrowRight, Calendar } from 'lucide-react';

const MOCK_POSTS = [
  {
    slug: 'how-to-care-for-18k-gold-jewellery',
    title: 'How to Care for Your 22K Gold Jewellery at Home',
    excerpt: 'Keep your Ruhvi pieces shining forever with these simple, expert-approved home cleaning techniques.',
    cover_image: 'https://images.unsplash.com/photo-1599643478524-fb66f70a0066?auto=format&fit=crop&q=80',
    published_at: '2026-07-28T10:00:00Z',
    category: 'Care Guide'
  },
  {
    slug: 'understanding-bis-hallmark',
    title: 'Decoding the BIS Hallmark: What You Need to Know',
    excerpt: 'We break down what the 6-digit HUID code means and why it guarantees the purity of your gold investment.',
    cover_image: 'https://images.unsplash.com/photo-1605100804763-247f67b2548e?auto=format&fit=crop&q=80',
    published_at: '2026-07-20T10:00:00Z',
    category: 'Education'
  },
  {
    slug: 'bridal-trends-2026',
    title: 'Bridal Jewellery Trends: The Return to Minimalism',
    excerpt: 'Discover why modern brides are opting for lightweight, elegant statement pieces over heavy traditional sets.',
    cover_image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80',
    published_at: '2026-07-15T10:00:00Z',
    category: 'Style & Trends'
  }
];

export default function BlogIndexPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-[#FAF6ED] py-20 px-4 text-center border-b border-stone-200">
        <div className="max-w-3xl mx-auto space-y-6">
          <BookOpen className="w-8 h-8 text-amber-900 mx-auto" />
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-stone-900">
            The Ruhvi Journal
          </h1>
          <p className="text-stone-600 text-lg">
            Stories of craftsmanship, styling tips, and guides to understanding fine jewellery.
          </p>
        </div>
      </div>

      {/* Blog Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {MOCK_POSTS.map((post) => (
            <article key={post.slug} className="group flex flex-col h-full cursor-pointer">
              <Link href={`/blog/${post.slug}`} className="block relative aspect-[4/3] rounded-2xl overflow-hidden mb-6 bg-stone-100">
                <Image 
                  src={post.cover_image} 
                  alt={post.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm text-stone-900 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
                  {post.category}
                </div>
              </Link>
              
              <div className="flex flex-col flex-grow">
                <div className="flex items-center space-x-2 text-stone-400 text-xs font-mono uppercase mb-3">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(post.published_at).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
                
                <Link href={`/blog/${post.slug}`}>
                  <h2 className="font-serif text-2xl font-bold text-stone-900 group-hover:text-amber-900 transition-colors mb-3 line-clamp-2">
                    {post.title}
                  </h2>
                </Link>
                
                <p className="text-stone-600 text-sm leading-relaxed mb-6 line-clamp-3">
                  {post.excerpt}
                </p>
                
                <div className="mt-auto">
                  <Link 
                    href={`/blog/${post.slug}`}
                    className="inline-flex items-center space-x-2 text-amber-900 text-xs font-bold uppercase tracking-wider group-hover:space-x-3 transition-all"
                  >
                    <span>Read Article</span>
                    <ArrowRight className="w-4 h-4" />
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
