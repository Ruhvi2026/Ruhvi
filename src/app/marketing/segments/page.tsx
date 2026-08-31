'use client';

import React, { useEffect, useState } from 'react';
import { Users, Plus, Loader2, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SegmentsPage() {
  const [segments, setSegments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newSegment, setNewSegment] = useState({ name: '', description: '' });

  const fetchSegments = async () => {
    try {
      const res = await fetch('/api/admin/marketing/segments');
      if (res.ok) {
        const json = await res.json();
        setSegments(json.segments || []);
      } else {
        toast.error('Failed to load segments');
      }
    } catch (e) {
      toast.error('Network error loading segments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSegments();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/admin/marketing/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSegment),
      });

      if (res.ok) {
        toast.success('Segment created successfully!');
        setShowCreateModal(false);
        setNewSegment({ name: '', description: '' });
        fetchSegments(); // refresh list
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create segment');
      }
    } catch (e) {
      toast.error('Network error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Customer Segments</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Manage and view your audience segments for targeted campaigns.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-fuchsia-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-fuchsia-700"
        >
          <Plus className="h-4 w-4" />
          Create Segment
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/5 bg-[#131726]">
        <div className="flex items-center gap-4 border-b border-white/5 bg-white/[0.02] p-4">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search segments..."
              className="w-full rounded-lg border border-white/10 bg-black/50 py-2 pl-9 pr-4 text-xs text-white focus:border-fuchsia-500 focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-fuchsia-400" />
          </div>
        ) : segments.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">
            No segments found.
          </div>
        ) : (
          <table className="w-full text-left text-xs text-slate-400">
            <thead className="border-b border-white/5 bg-white/[0.02] text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="p-4 font-medium">Segment Name</th>
                <th className="p-4 font-medium">Description</th>
                <th className="p-4 text-right font-medium">Size (Users)</th>
                <th className="p-4 text-right font-medium">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {segments.map((seg) => (
                <tr
                  key={seg.id}
                  className="transition-colors hover:bg-white/[0.02]"
                >
                  <td className="p-4 font-medium text-white">{seg.name}</td>
                  <td className="max-w-sm truncate p-4" title={seg.description}>
                    {seg.description}
                  </td>
                  <td className="p-4 text-right">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 font-medium text-blue-400">
                      <Users className="h-3 w-3" />
                      {seg.size.toLocaleString()}
                    </span>
                  </td>
                  <td className="p-4 text-right text-slate-500">
                    {seg.lastUpdated}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative w-full max-w-md rounded-xl border border-white/10 bg-[#131726] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 p-4">
              <h2 className="text-sm font-semibold text-white">
                Create New Segment
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 p-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">
                  Segment Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP Customers"
                  value={newSegment.name}
                  onChange={(e) =>
                    setNewSegment({ ...newSegment, name: e.target.value })
                  }
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white focus:border-fuchsia-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Users who have spent over ₹10k"
                  value={newSegment.description}
                  onChange={(e) =>
                    setNewSegment({
                      ...newSegment,
                      description: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white focus:border-fuchsia-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newSegment.name}
                  className="flex items-center gap-2 rounded-lg bg-fuchsia-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-fuchsia-700 disabled:opacity-50"
                >
                  {creating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Create Segment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
