import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * Base accessible skeleton pulse component
 */
export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded bg-stone-200/70 dark:bg-stone-800/60 ${className}`}
      {...props}
    />
  );
}

/**
 * Luxury jewelry product card skeleton placeholder
 */
export function ProductCardSkeleton() {
  return (
    <div aria-hidden="true" className="group flex h-full flex-col gap-4">
      {/* Product Image placeholder with shimmer */}
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[4px] bg-[var(--cream-deep,#f5efe6)]">
        <div className="h-full w-full animate-pulse bg-gradient-to-tr from-stone-200/50 via-amber-100/30 to-stone-200/50" />
      </div>

      {/* Product Information */}
      <div className="flex flex-col items-center space-y-2 text-center">
        <div className="h-4 w-3/4 animate-pulse rounded bg-stone-200/70" />
        <div className="h-3.5 w-1/3 animate-pulse rounded bg-stone-200/50" />
      </div>
    </div>
  );
}
