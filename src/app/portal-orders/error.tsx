'use client';

import { useEffect } from 'react';

export default function PortalOrdersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Orders Portal Error]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="rounded-full bg-blue-100 p-4 dark:bg-blue-900/30">
        <svg
          className="h-8 w-8 text-blue-600 dark:text-blue-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
      </div>
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Orders Dashboard Error
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Something went wrong loading the orders portal. Your orders are safe.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-gray-500">
            Error ID: {error.digest}
          </p>
        )}
      </div>
      <button
        onClick={reset}
        className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
      >
        Refresh Dashboard
      </button>
    </div>
  );
}
