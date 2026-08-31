'use client';

import React, { useEffect, useState } from 'react';
import { UserSquare2, Loader2, Search, Download, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubscribers = async () => {
    try {
      const res = await fetch('/api/admin/marketing/subscribers');
      if (res.ok) {
        const json = await res.json();
        setSubscribers(json.subscribers || []);
      } else {
        toast.error('Failed to load subscribers');
      }
    } catch (e) {
      toast.error('Network error loading subscribers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Subscribers</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            View and manage your mailing list subscribers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/50 px-4 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white">
            <Upload className="h-4 w-4" />
            Import CSV
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-fuchsia-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-fuchsia-700">
            <Download className="h-4 w-4" />
            Export List
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/5 bg-[#131726]">
        <div className="flex items-center gap-4 border-b border-white/5 bg-white/[0.02] p-4">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by email or name..."
              className="w-full rounded-lg border border-white/10 bg-black/50 py-2 pl-9 pr-4 text-xs text-white focus:border-fuchsia-500 focus:outline-none"
            />
          </div>
          <select className="rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs text-slate-300 focus:border-fuchsia-500 focus:outline-none">
            <option value="all">All Statuses</option>
            <option value="subscribed">Subscribed</option>
            <option value="unsubscribed">Unsubscribed</option>
          </select>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-fuchsia-400" />
          </div>
        ) : subscribers.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">
            No subscribers found.
          </div>
        ) : (
          <table className="w-full text-left text-xs text-slate-400">
            <thead className="border-b border-white/5 bg-white/[0.02] text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="p-4 font-medium">Customer Details</th>
                <th className="p-4 font-medium">Source</th>
                <th className="p-4 font-medium">Date Subscribed</th>
                <th className="p-4 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {subscribers.map((sub) => (
                <tr
                  key={sub.id}
                  className="transition-colors hover:bg-white/[0.02]"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white">
                        {sub.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-white">{sub.name}</p>
                        <p className="text-[10px] text-slate-500">
                          {sub.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-slate-400">{sub.source}</td>
                  <td className="p-4 text-slate-500">{sub.date}</td>
                  <td className="p-4 text-right">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                        sub.status === 'Subscribed'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {sub.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
