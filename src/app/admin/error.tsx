'use client';

import { useEffect } from 'react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Admin Portal Error]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="rounded-full bg-red-100 p-4 dark:bg-red-900/30">
        <svg
          className="h-8 w-8 text-red-600 dark:text-red-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Admin Panel Error
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Something went wrong loading this admin page.
          {error.digest && (
            <span className="mt-1 block font-mono text-xs text-gray-400">
              Error ID: {error.digest}
            </span>
          )}
        </p>
      </div>
      <button
        onClick={reset}
        className="rounded-lg bg-charcoal-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-charcoal-800 dark:bg-white dark:text-charcoal-900 dark:hover:bg-gray-200"
      >
        Try Again
      </button>
    </div>
  );
}
