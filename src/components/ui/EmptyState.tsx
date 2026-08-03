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
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-stone-50 text-stone-400 mb-6">
        {icon}
      </div>
      <h3 className="text-2xl font-serif font-semibold text-stone-900 mb-2">
        {title}
      </h3>
      <p className="text-sm text-stone-500 max-w-sm mb-8">
        {description}
      </p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-flex items-center justify-center px-8 py-3 bg-amber-950 text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-amber-900 transition-colors"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
