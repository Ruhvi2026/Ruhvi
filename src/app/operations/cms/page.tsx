'use client';

import React from 'react';
import Link from 'next/link';
import { Monitor, Globe, BookOpen, Eye, ArrowRight } from 'lucide-react';

const CMS_SECTIONS = [
  {
    title: 'Homepage Structure',
    description:
      'Manage hero carousel slides and featured sections on the storefront homepage.',
    href: '/operations/cms/homepage',
    icon: Monitor,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
  },
  {
    title: 'Banners & Hero',
    description:
      'Configure the top promotional banner shown across the storefront.',
    href: '/operations/cms/banners',
    icon: Globe,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    title: 'Blog Posts',
    description: 'Write, edit, and manage articles for the Ruhvi Journal.',
    href: '/operations/cms/blog',
    icon: BookOpen,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  {
    title: 'Review Queue',
    description: 'Review and approve blog posts submitted for publication.',
    href: '/operations/cms/blog/review',
    icon: Eye,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
  },
];

export default function CMSDashboardLandingPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Website CMS</h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage your storefront content, banners, hero sections, and blog.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {CMS_SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="group flex flex-col rounded-xl border border-white/5 bg-[#151520] p-6 shadow-xl transition-all hover:border-white/10 hover:bg-[#1a1a28]"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-lg ${section.bg}`}
                >
                  <Icon className={`h-6 w-6 ${section.color}`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white transition-colors group-hover:text-indigo-400">
                    {section.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {section.description}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 flex-shrink-0 text-slate-600 transition-colors group-hover:text-indigo-400" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
