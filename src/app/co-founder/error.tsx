'use client';

import { useEffect } from 'react';

export default function CoFounderError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AI Co-Founder Error]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="rounded-full bg-purple-100 p-4 dark:bg-purple-900/30">
        <svg
          className="h-8 w-8 text-purple-600 dark:text-purple-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </div>
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          AI Co-Founder Workspace Error
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          The AI workspace encountered an issue. This doesn&apos;t affect your
          store operations.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-gray-500">
            Error ID: {error.digest}
          </p>
        )}
      </div>
      <button
        onClick={reset}
        className="rounded-lg bg-purple-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-purple-700"
      >
        Reload Workspace
      </button>
    </div>
  );
}
