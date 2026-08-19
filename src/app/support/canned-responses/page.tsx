'use client';

import React, { useEffect, useState } from 'react';
import {
  MessageSquare,
  Search,
  Copy,
  Check,
  Sparkles,
  Tag,
  BookOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface CannedResponse {
  id: string;
  category: string;
  title: string;
  shortcut: string;
  content: string;
  tags: string[];
}

export default function SupportCannedResponsesPage() {
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    async function loadResponses() {
      try {
        const res = await fetch('/api/support/canned-responses');
        if (res.ok) {
          const data = await res.json();
          setResponses(data.canned_responses || []);
        }
      } catch {
        toast.error('Failed to load canned responses');
      } finally {
        setLoading(false);
      }
    }
    loadResponses();
  }, []);

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    toast.success('Template copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const categories = Array.from(new Set(responses.map((r) => r.category)));

  const filtered = responses.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      r.title.toLowerCase().includes(q) ||
      r.content.toLowerCase().includes(q) ||
      r.shortcut.toLowerCase().includes(q) ||
      r.tags.some((t) => t.toLowerCase().includes(q));
    const matchCategory = !categoryFilter || r.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent shadow-md" />
        <p className="text-xs text-slate-500">
          Loading Canned Response Library...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Canned Responses & Knowledge
          </h1>
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
            {responses.length} Templates
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Pre-approved jewellery concierge templates for fast, consistent
          customer communications
        </p>
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search templates by title, keyword or shortcut (e.g. !hallmark)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#131726] py-2 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-white/10 bg-[#131726] px-3.5 py-2 text-xs text-slate-200 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="flex flex-col justify-between rounded-2xl border border-white/5 bg-[#131726] p-5 shadow-lg transition hover:border-white/10"
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="rounded bg-white/5 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                    {item.category}
                  </span>
                  <h3 className="mt-1.5 text-sm font-bold text-white">
                    {item.title}
                  </h3>
                </div>

                <span className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 font-mono text-xs font-bold text-amber-400">
                  {item.shortcut}
                </span>
              </div>

              {/* Body */}
              <div className="mt-3.5 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl border border-white/5 bg-white/[0.02] p-3 font-sans text-xs leading-relaxed text-slate-300">
                {item.content}
              </div>

              {/* Tags */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-slate-400"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Copy Button */}
            <div className="mt-4 flex justify-end border-t border-white/5 pt-3">
              <button
                onClick={() => handleCopy(item.id, item.content)}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white"
              >
                {copiedId === item.id ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
