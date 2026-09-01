'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  BookOpen,
  Eye,
  EyeOff,
  CalendarClock,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { listBlogPosts, deleteBlogPost, unpublishPost } from './actions';
import type { BlogPostRow } from './actions';

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-slate-500/10 text-slate-400',
  },
  review: {
    label: 'Review',
    className: 'bg-amber-500/10 text-amber-400',
  },
  published: {
    label: 'Published',
    className: 'bg-emerald-500/10 text-emerald-400',
  },
  scheduled: {
    label: 'Scheduled',
    className: 'bg-blue-500/10 text-blue-400',
  },
};

export default function BlogPostsListingPage() {
  const [posts, setPosts] = useState<BlogPostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isPending, startTransition] = useTransition();

  const fetchPosts = async (status: string, term: string) => {
    const rows = await listBlogPosts({ status, search: term });
    setPosts(rows);
    setLoading(false);
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchPosts(statusFilter, search);
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [search, statusFilter]);

  const handleDelete = (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteBlogPost(id);
      if (result.success) {
        toast.success('Post deleted');
        fetchPosts(statusFilter, search);
      } else {
        toast.error(result.error || 'Failed to delete post');
      }
    });
  };

  const handleMoveToDraft = (id: string, title: string) => {
    if (
      !confirm(
        `Move "${title}" back to draft? It will be taken offline immediately.`
      )
    )
      return;
    startTransition(async () => {
      const result = await unpublishPost(id);
      if (result.success) {
        toast.success('Moved to draft');
        fetchPosts(statusFilter, search);
      } else {
        toast.error(result.error || 'Failed to move to draft');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Blog Posts</h1>
          <p className="mt-1 text-sm text-slate-400">
            Write, review, and publish articles for the Ruhvi Journal.
          </p>
        </div>
        <Link
          href="/operations/cms/blog/new"
          className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          New Post
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#151520] py-2 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-[#151520] px-4 py-2 text-sm text-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="review">Review</option>
          <option value="published">Published</option>
          <option value="scheduled">Scheduled</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/5 bg-[#151520] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-black/20 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-6 py-4 font-medium">Post</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Author</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Updated</th>
                <th className="px-6 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-slate-500"
                  >
                    Loading posts...
                  </td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <BookOpen className="mb-4 h-12 w-12 opacity-20" />
                      <p>No blog posts found.</p>
                      {search && (
                        <p className="mt-1 text-xs">
                          Try adjusting your search criteria.
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                posts.map((post) => {
                  const status =
                    STATUS_STYLES[post.status] || STATUS_STYLES.draft;
                  return (
                    <tr
                      key={post.id}
                      className="transition-colors hover:bg-white/5"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-slate-800">
                            {post.cover_image ? (
                              <Image
                                src={post.cover_image}
                                alt={post.cover_image_alt || post.title}
                                fill
                                className="object-cover"
                                sizes="40px"
                              />
                            ) : (
                              <BookOpen className="h-5 w-5 text-slate-500" />
                            )}
                          </div>
                          <div className="max-w-[220px]">
                            <p
                              className="truncate font-medium text-white"
                              title={post.title}
                            >
                              {post.title}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              /blog/{post.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${status.className}`}
                        >
                          {post.status === 'published' && (
                            <Eye className="mr-1 h-3 w-3" />
                          )}
                          {post.status === 'scheduled' && (
                            <CalendarClock className="mr-1 h-3 w-3" />
                          )}
                          {post.status === 'review' && (
                            <EyeOff className="mr-1 h-3 w-3" />
                          )}
                          {status.label}
                        </span>
                        {post.status === 'published' && post.published_at && (
                          <p className="mt-1 text-[10px] text-slate-500">
                            {new Date(post.published_at).toLocaleDateString(
                              'en-IN',
                              {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              }
                            )}
                          </p>
                        )}
                        {post.status === 'scheduled' &&
                          post.scheduled_publish_at && (
                            <p className="mt-1 text-[10px] text-slate-500">
                              {new Date(
                                post.scheduled_publish_at
                              ).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                          )}
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {post.author_name || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-300">
                          {post.category || 'Uncategorized'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-xs text-slate-500">
                        {new Date(post.updated_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {(post.status === 'published' ||
                          post.status === 'scheduled') && (
                          <button
                            onClick={() =>
                              handleMoveToDraft(post.id, post.title)
                            }
                            disabled={isPending}
                            className="mr-1 inline-flex items-center justify-center rounded p-1.5 text-amber-400 transition-colors hover:bg-amber-500/10 disabled:opacity-50"
                            title="Move to Draft (undo publish)"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                        )}
                        <Link
                          href={`/operations/cms/blog/${post.id}/edit`}
                          className="inline-flex items-center justify-center rounded p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                          title="Edit Post"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(post.id, post.title)}
                          disabled={isPending}
                          className="ml-2 inline-flex items-center justify-center rounded p-1.5 text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-50"
                          title="Delete Post"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
