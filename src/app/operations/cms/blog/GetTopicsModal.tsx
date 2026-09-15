'use client';

import React, { useState } from 'react';
import { X, Loader2, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

const TOPICS_ENDPOINT = '/api/operations/blog/topics';

interface GetTopicsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function GetTopicsModal({ open, onClose }: GetTopicsModalProps) {
  const [niche, setNiche] = useState('');
  const [seedQueries, setSeedQueries] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!niche.trim()) {
      toast.error('Please enter a niche');
      return;
    }
    if (!seedQueries.trim()) {
      toast.error('Please enter at least one seed query');
      return;
    }

    const payload = {
      niche: niche.trim(),
      seed_queries: seedQueries
        .split('\n')
        .map((q) => q.trim())
        .filter(Boolean),
    };

    setSubmitting(true);
    try {
      const res = await fetch(TOPICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let message = `Request failed with ${res.status}`;
        try {
          const data = await res.json();
          if (data && typeof data.error === 'string') message = data.error;
        } catch {
          // keep default message when body is not JSON
        }
        throw new Error(message);
      }

      toast.success('Topics request sent');
      setNiche('');
      setSeedQueries('');
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to send topics request'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-xl border border-white/10 bg-[#151520] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Get Topics</h2>
          <button
            onClick={onClose}
            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="get-topics-niche"
              className="mb-1.5 block text-sm font-medium text-slate-300"
            >
              Niche
            </label>
            <input
              id="get-topics-niche"
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="e.g. Ayurvedic skincare"
              className="w-full rounded-lg border border-white/10 bg-[#0f0f18] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="get-topics-seed"
              className="mb-1.5 block text-sm font-medium text-slate-300"
            >
              Seed Queries
            </label>
            <textarea
              id="get-topics-seed"
              value={seedQueries}
              onChange={(e) => setSeedQueries(e.target.value)}
              placeholder="One query per line"
              rows={5}
              className="w-full resize-y rounded-lg border border-white/10 bg-[#0f0f18] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {submitting ? 'Sending...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
