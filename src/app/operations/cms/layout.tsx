'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Monitor, Globe, BookOpen, Eye } from 'lucide-react';

const CMS_TABS = [
  { label: 'Overview', href: '/operations/cms', icon: LayoutDashboard },
  {
    label: 'Homepage Structure',
    href: '/operations/cms/homepage',
    icon: Monitor,
  },
  { label: 'Banners & Hero', href: '/operations/cms/banners', icon: Globe },
  { label: 'Blog Posts', href: '/operations/cms/blog', icon: BookOpen },
  { label: 'Review Queue', href: '/operations/cms/blog/review', icon: Eye },
];

export default function CMSLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {CMS_TABS.map((tab) => {
          const active = isActive(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
