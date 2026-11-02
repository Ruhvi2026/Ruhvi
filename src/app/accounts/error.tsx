'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function AccountsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Accounts Portal Error]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-400">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h2 className="text-xl font-bold text-white">Something went wrong</h2>
      <p className="max-w-md text-sm text-slate-400">
        An error occurred while loading this accounts module. Please try again
        or refresh the page.
      </p>
      <button
        onClick={() => reset()}
        className="inline-flex items-center space-x-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400"
      >
        <RotateCcw className="h-4 w-4" />
        <span>Try Again</span>
      </button>
    </div>
  );
}
