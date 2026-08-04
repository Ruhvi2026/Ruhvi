'use client';
import React, { useState } from 'react';
import { Share2, Copy, Check } from 'lucide-react';

export default function ReferralLink({ referralCode }: { referralCode: string }) {
  const [copied, setCopied] = useState(false);
  const referralLink = typeof window !== 'undefined' ? ${window.location.origin}/?ref=${referralCode} : 'https://ruhvi.vercel.app/?ref=${referralCode}';

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className=mt-8 bg-purple-950/40 p-2 pl-4 rounded-xl border border-purple-800 backdrop-blur-sm flex items-center justify-between shadow-inner>
      <span className=font-mono text-purple-100 font-medium truncate pr-4 text-sm>{referralLink}</span>
      <div className=flex items-center space-x-2 shrink-0>
        <button 
          onClick={handleCopy}
          className=flex items-center justify-center w-10 h-10 rounded-lg bg-purple-700 hover:bg-purple-600 text-purple-50 transition-colors
          title=Copy Link
        >
          {copied ? <Check className=w-4 h-4 /> : <Copy className=w-4 h-4 />}
        </button>
        <button 
          className=flex items-center justify-center w-10 h-10 rounded-lg bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold transition-colors
          title=Share
        >
          <Share2 className=w-4 h-4 />
        </button>
      </div>
    </div>
  );
}
