'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export default function AccountsLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
      <Loader2 className="h-10 w-10 animate-spin text-amber-400" />
      <p className="font-mono text-sm tracking-wider text-slate-400">
        Loading Accounts & GST Portal...
      </p>
    </div>
  );
}
