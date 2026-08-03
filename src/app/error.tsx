'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCcw, Home } from 'lucide-react';
import { logDevError } from '@/lib/api-errors';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    logDevError('Global Application Error', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 text-red-500 mb-6">
        <AlertCircle className="w-8 h-8" />
      </div>
      
      <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mb-4">
        Something went wrong
      </h1>
      
      <p className="text-stone-500 max-w-md mx-auto mb-8 text-sm">
        We apologize for the inconvenience. Our team has been notified. 
        Please try refreshing the page or navigating back home.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-sm">
        <button
          onClick={() => reset()}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 bg-amber-950 text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-amber-900 transition-colors"
        >
          <RefreshCcw className="w-4 h-4" />
          <span>Try Again</span>
        </button>
        
        <Link 
          href="/"
          className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 bg-white border border-stone-200 text-stone-900 text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-stone-50 transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Go Home</span>
        </Link>
      </div>
    </div>
  );
}
