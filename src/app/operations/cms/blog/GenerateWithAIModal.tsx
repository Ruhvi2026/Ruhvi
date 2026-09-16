'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const GENERATE_DRAFT_ENDPOINT = '/api/operations/blog/generate-draft';

interface GenerateWithAIModalProps {
  open: boolean;
  onClose: () => void;
}

export default function GenerateWithAIModal({
  open,
  onClose,
}: GenerateWithAIModalProps) {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!topic.trim()) {
      toast.error('Please enter a topic');
      return;
    }

    const payload = {
      topic: topic.trim(),
      keywords: keywords
        .split('\n')
        .map((k) => k.trim())
        .filter(Boolean),
    };

    setSubmitting(true);
    try {
      const res = await fetch(GENERATE_DRAFT_ENDPOINT, {
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

      toast.success('Draft generation request sent');
      setTopic('');
      setKeywords('');
      onClose();
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to send draft request'
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
          <h2 className="text-lg font-semibold text-white">Generate with AI</h2>
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
              htmlFor="generate-draft-topic"
              className="mb-1.5 block text-sm font-medium text-slate-300"
            >
              Topic
            </label>
            <input
              id="generate-draft-topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. 5 Ayurvedic secrets for glowing skin"
              className="w-full rounded-lg border border-white/10 bg-[#0f0f18] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="generate-draft-keywords"
              className="mb-1.5 block text-sm font-medium text-slate-300"
            >
              Keywords <span className="text-slate-500">(optional)</span>
            </label>
            <textarea
              id="generate-draft-keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="One keyword per line"
              rows={4}
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
                <Sparkles className="h-4 w-4" />
              )}
              {submitting ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
