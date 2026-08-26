import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  url: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://ruhvi.in/',
      },
      ...items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 2,
        name: item.label,
        item: `https://ruhvi.in${item.url}`,
      })),
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex items-center text-xs font-medium text-stone-500"
      >
        <Link
          href="/"
          className="flex items-center transition-colors hover:text-gold-600"
        >
          <Home className="h-3.5 w-3.5" />
          <span className="sr-only">Home</span>
        </Link>
        {items.map((item, index) => (
          <React.Fragment key={item.url}>
            <ChevronRight className="mx-2 h-3 w-3 flex-shrink-0 text-stone-400" />
            {index === items.length - 1 ? (
              <span className="truncate text-stone-900" aria-current="page">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.url}
                className="truncate transition-colors hover:text-gold-600"
              >
                {item.label}
              </Link>
            )}
          </React.Fragment>
        ))}
      </nav>
    </>
  );
}
