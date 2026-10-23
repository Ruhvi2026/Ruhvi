'use client';

import { useEffect } from 'react';

export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Checkout Error]', error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="rounded-full bg-amber-50 p-4">
        <svg
          className="h-8 w-8 text-amber-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
          />
        </svg>
      </div>
      <div>
        <h2 className="text-ink text-xl font-semibold">Checkout Interrupted</h2>
        <p className="text-ink-soft mt-2 text-sm">
          We hit a snag processing your order. Your cart is safe — please try
          again.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-gray-400">
            Reference: {error.digest}
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="bg-gold hover:bg-gold-deep rounded-lg px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors"
        >
          Retry Checkout
        </button>
        <a
          href="/cart"
          className="text-ink rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
        >
          Back to Cart
        </a>
      </div>
    </div>
  );
}
