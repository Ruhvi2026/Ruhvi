'use client';
import React, { useState } from 'react';
import { Share2, Copy, Check } from 'lucide-react';

export default function ReferralLink({
  referralCode,
}: {
  referralCode: string;
}) {
  const [copied, setCopied] = useState(false);
  const referralLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?ref=${referralCode}`
      : `https://ruhvi.vercel.app/?ref=${referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-8 flex items-center justify-between rounded-xl border border-gold-700/60 bg-charcoal-900/90 p-2 pl-4 shadow-inner backdrop-blur-sm">
      <span className="truncate pr-4 font-mono text-sm font-medium text-gold-200">
        {referralLink}
      </span>
      <div className="flex shrink-0 items-center space-x-2">
        <button
          onClick={handleCopy}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-600 text-white transition-colors hover:bg-gold-500"
          title="Copy Link"
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
        <button
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-400 font-bold text-amber-950 transition-colors hover:bg-amber-300"
          title="Share"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
