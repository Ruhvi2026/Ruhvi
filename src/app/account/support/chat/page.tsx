'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import CustomerSupportChat from '@/components/CustomerSupportChat';

export default function SupportChatPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/account/support"
        className="mb-4 inline-flex items-center gap-1 text-sm text-charcoal-400 transition-colors hover:text-charcoal-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Support
      </Link>

      <div className="mb-5">
        <h1 className="text-2xl font-bold text-charcoal-900">Chat with Gia</h1>
        <p className="mt-1 text-sm text-charcoal-500">
          Tell us what&apos;s on your mind. Gia will understand your issue and
          create a support ticket if needed.
        </p>
      </div>

      <div className="h-[calc(100dvh-260px)] min-h-[460px] overflow-hidden rounded-2xl border border-charcoal-100 bg-white shadow-sm">
        <CustomerSupportChat embedded />
      </div>
    </div>
  );
}
