import React from 'react';
import Link from 'next/link';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-cream-50 text-stone-400">
        {icon}
      </div>
      <h3 className="mb-2 font-serif text-2xl font-semibold text-stone-900">
        {title}
      </h3>
      <p className="mb-8 max-w-sm text-sm text-stone-500">{description}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-flex items-center justify-center rounded-lg bg-charcoal-900 px-8 py-3 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-charcoal-800"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
