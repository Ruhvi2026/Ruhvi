import React from 'react';
import { MessageCircle, Construction } from 'lucide-react';

export default function WhatsappChannelsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">WhatsApp</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Configure your WhatsApp marketing campaigns.
          </p>
        </div>
      </div>
      <div className="flex h-[50vh] flex-col items-center justify-center rounded-xl border border-white/5 bg-[#131726] text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
          <Construction className="h-8 w-8 text-green-400" />
        </div>
        <h2 className="text-lg font-semibold text-white">Coming Soon</h2>
        <p className="mt-2 max-w-sm text-xs text-slate-400">
          WhatsApp integration is currently under development. Stay tuned!
        </p>
      </div>
    </div>
  );
}
