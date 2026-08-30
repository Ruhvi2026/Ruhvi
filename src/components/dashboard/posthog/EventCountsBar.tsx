'use client';

import React from 'react';
import { BarChart3 } from 'lucide-react';
import type { EventCount } from '@/types/posthog-analytics';

interface EventCountsBarProps {
  events: EventCount[];
}

const EVENT_LABELS: Record<string, string> = {
  product_viewed: 'Product Viewed',
  product_added_to_cart: 'Added to Cart',
  product_added_to_wishlist: 'Wishlisted',
  checkout_started: 'Checkout Started',
  purchase_completed: 'Purchased',
  signup_completed: 'Signups',
};

export default function EventCountsBar({ events }: EventCountsBarProps) {
  const max = Math.max(1, ...events.map((e) => e.count));
  const hasData = events.length > 0;

  return (
    <div className="rounded-lg border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
          <BarChart3 className="h-4 w-4 text-violet-500" />
          Conversion Events
        </h2>
        <span className="text-xs text-slate-400">Last 30 days</span>
      </div>

      {hasData ? (
        <div className="space-y-4">
          {events.map((item) => (
            <div key={item.event} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700">
                  {EVENT_LABELS[item.event] ?? item.event}
                </span>
                <span className="font-semibold text-slate-800">
                  {item.count.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-400 to-violet-600 transition-all duration-500"
                  style={{ width: `${(item.count / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-[180px] items-center justify-center text-sm text-slate-400">
          No events captured yet.
        </div>
      )}
    </div>
  );
}
