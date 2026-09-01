'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  EyeOff,
  CalendarClock,
  ArrowRight,
  Search,
} from 'lucide-react';
import { listBlogPosts } from '../actions';
import type { BlogPostRow } from '../actions';

export default function BlogReviewQueuePage() {
  const [posts, setPosts] = useState<BlogPostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchPosts = async (term: string) => {
    const rows = await listBlogPosts({ status: 'review', search: term });
    setPosts(rows);
    setLoading(false);
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchPosts(search);
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Review Queue</h1>
        <p className="mt-1 text-sm text-slate-400">
          Posts submitted for approval. Review the latest revision, then approve
          or send back to draft.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search by title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-[#151520] py-2 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-white/5 bg-[#151520] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-black/20 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-6 py-4 font-medium">Post</th>
                <th className="px-6 py-4 font-medium">Author</th>
                <th className="px-6 py-4 font-medium">Submitted</th>
                <th className="px-6 py-4 font-medium">Waiting</th>
                <th className="px-6 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-slate-500"
                  >
                    Loading review queue...
                  </td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <EyeOff className="mb-4 h-12 w-12 opacity-20" />
                      <p>Nothing in the review queue.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                posts.map((post) => {
                  const submitted = post.submitted_for_review_at
                    ? new Date(post.submitted_for_review_at)
                    : null;
                  const waitingMs = submitted
                    ? Date.now() - submitted.getTime()
                    : 0;
                  const waitingHours = Math.floor(waitingMs / 3600000);
                  const overdue = waitingHours >= 24;
                  return (
                    <tr
                      key={post.id}
                      className="transition-colors hover:bg-white/5"
                    >
                      <td className="px-6 py-4">
                        <div className="max-w-[280px]">
                          <p className="truncate font-medium text-white">
                            {post.title}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            /blog/{post.slug}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {post.author_name || '—'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-xs text-slate-500">
                        {submitted
                          ? submitted.toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            overdue
                              ? 'bg-rose-500/10 text-rose-400'
                              : 'bg-slate-500/10 text-slate-400'
                          }`}
                        >
                          {overdue && (
                            <CalendarClock className="mr-1 h-3 w-3" />
                          )}
                          {waitingHours >= 24
                            ? `${Math.floor(waitingHours / 24)}d ${waitingHours % 24}h`
                            : `${waitingHours}h ${Math.floor((waitingMs % 3600000) / 60000)}m`}
                          {overdue ? ' ⚠️' : ''}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/operations/cms/blog/review/${post.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500"
                        >
                          Review
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <BookOpen className="h-4 w-4" />
        <span>
          {posts.length} post{posts.length === 1 ? '' : 's'} awaiting review
        </span>
      </div>
    </div>
  );
}
