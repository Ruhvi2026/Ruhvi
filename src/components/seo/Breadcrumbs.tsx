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
      <nav aria-label="Breadcrumb" className="flex items-center text-xs text-stone-500 mb-6 font-medium">
        <Link href="/" className="hover:text-amber-700 transition-colors flex items-center">
          <Home className="w-3.5 h-3.5" />
          <span className="sr-only">Home</span>
        </Link>
        {items.map((item, index) => (
          <React.Fragment key={item.url}>
            <ChevronRight className="w-3 h-3 mx-2 text-stone-400 flex-shrink-0" />
            {index === items.length - 1 ? (
              <span className="text-stone-900 truncate" aria-current="page">
                {item.label}
              </span>
            ) : (
              <Link href={item.url} className="hover:text-amber-700 transition-colors truncate">
                {item.label}
              </Link>
            )}
          </React.Fragment>
        ))}
      </nav>
    </>
  );
}
