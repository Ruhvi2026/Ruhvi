'use client';

import React, { use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Calendar, Facebook, Twitter, Linkedin, Share2 } from 'lucide-react';
import { notFound } from 'next/navigation';

export default function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  // Mock post content
  const post = {
    title: 'How to Care for Your 18K Gold Jewellery at Home',
    excerpt: 'Keep your Ruhvi pieces shining forever with these simple, expert-approved home cleaning techniques.',
    content: `
      <p>Fine jewellery is an investment meant to last a lifetime, but even the highest quality 18K gold needs a little tender loving care to maintain its radiant shine. In this guide, we will walk you through the safest and most effective ways to clean your Ruhvi pieces at home.</p>
      
      <h2>1. The Gentle Soap Method</h2>
      <p>The best way to clean your gold jewellery is often the simplest. Mix a few drops of mild dish soap into a bowl of warm (not hot) water. Let your jewellery soak for about 15-20 minutes to loosen any accumulated oils or dirt.</p>
      
      <h2>2. Use a Soft Brush</h2>
      <p>After soaking, use a soft-bristled toothbrush to gently scrub the pieces. Pay special attention to the areas around diamond or gemstone settings, as this is where lotion and dirt tend to build up. <strong>Never use toothpaste or baking soda</strong>, as these are abrasive and can scratch the gold.</p>
      
      <h2>3. Rinse and Dry Safely</h2>
      <p>Rinse the jewellery under warm running water. Always make sure the drain is plugged first! Pat the pieces dry with a soft, lint-free cloth. Avoid paper towels, which can leave tiny scratches on the metal's surface.</p>
      
      <h2>When to Seek Professional Cleaning</h2>
      <p>While home cleaning is great for regular maintenance, we recommend bringing your everyday pieces to a professional jeweller once a year for an ultrasonic cleaning and prong inspection to ensure your diamonds are secure.</p>
    `,
    cover_image: 'https://images.unsplash.com/photo-1599643478524-fb66f70a0066?auto=format&fit=crop&q=80',
    published_at: '2026-07-28T10:00:00Z',
    category: 'Care Guide',
    author: 'Ruhvi Editorial Team'
  };

  // Simulate missing post
  if (slug === 'not-found') {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Article Header */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8 text-center">
        <Link href="/blog" className="inline-flex items-center text-stone-500 hover:text-stone-900 text-sm font-semibold transition-colors mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Journal
        </Link>
        
        <div className="mb-6">
          <span className="bg-stone-100 text-stone-700 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
            {post.category}
          </span>
        </div>
        
        <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-stone-900 mb-6 leading-tight">
          {post.title}
        </h1>
        
        <p className="text-xl text-stone-600 max-w-2xl mx-auto mb-8">
          {post.excerpt}
        </p>

        <div className="flex items-center justify-center space-x-6 text-sm text-stone-500 font-medium border-t border-stone-200 pt-8">
          <span>By {post.author}</span>
          <span className="w-1.5 h-1.5 bg-stone-300 rounded-full" />
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4" />
            <span>{new Date(post.published_at).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* Cover Image */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="relative aspect-[21/9] rounded-3xl overflow-hidden bg-stone-100 shadow-xl">
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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-12">
          
          {/* Social Share Sidebar */}
          <div className="md:w-16 flex-shrink-0 flex md:flex-col space-x-4 md:space-x-0 md:space-y-4 pt-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 md:mb-4 flex items-center md:flex-col gap-2">
              <Share2 className="w-4 h-4" />
              <span className="hidden md:inline">Share</span>
            </span>
            <button className="w-10 h-10 rounded-full border border-stone-200 flex items-center justify-center text-stone-500 hover:text-blue-600 hover:border-blue-600 transition-colors">
              <Facebook className="w-4 h-4" />
            </button>
            <button className="w-10 h-10 rounded-full border border-stone-200 flex items-center justify-center text-stone-500 hover:text-sky-500 hover:border-sky-500 transition-colors">
              <Twitter className="w-4 h-4" />
            </button>
            <button className="w-10 h-10 rounded-full border border-stone-200 flex items-center justify-center text-stone-500 hover:text-blue-700 hover:border-blue-700 transition-colors">
              <Linkedin className="w-4 h-4" />
            </button>
          </div>

          {/* Prose Content */}
          <div className="prose prose-stone prose-lg max-w-none prose-headings:font-serif prose-headings:font-bold prose-h2:text-3xl prose-h2:mt-12 prose-a:text-amber-900 prose-p:leading-relaxed"
               dangerouslySetInnerHTML={{ __html: post.content }} />
        </div>
      </div>
    </div>
  );
}
