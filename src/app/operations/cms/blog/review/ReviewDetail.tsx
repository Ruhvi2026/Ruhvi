'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getBlogPost,
  getLatestBlogRevision,
  approvePost,
  rejectPost,
} from '../actions';
import type { BlogPostRow, BlogRevisionRow } from '../actions';

interface ReviewDetailPageProps {
  postId: string;
}

export default function ReviewDetailPage({ postId }: ReviewDetailPageProps) {
  const router = useRouter();
  const [post, setPost] = useState<BlogPostRow | null>(null);
  const [revision, setRevision] = useState<BlogRevisionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectNotes, setRejectNotes] = useState('');
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [p, r] = await Promise.all([
        getBlogPost(postId),
        getLatestBlogRevision(postId),
      ]);
      if (!mounted) return;
      setPost(p);
      setRevision(r);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [postId]);

  const handleApprove = async () => {
    setBusy('approve');
    const result = await approvePost(postId);
    setBusy(null);
    if (result.success) {
      toast.success('Post approved and published');
      router.push('/operations/cms/blog/review');
    } else {
      toast.error(result.error || 'Failed to approve');
    }
  };

  const handleReject = async () => {
    setBusy('reject');
    const result = await rejectPost(postId, rejectNotes);
    setBusy(null);
    if (result.success) {
      toast.success('Post sent back to draft');
      router.push('/operations/cms/blog/review');
    } else {
      toast.error(result.error || 'Failed to reject');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading review...
      </div>
    );
  }

  if (!post) {
    return (
      <div className="p-12 text-center text-slate-500">Post not found.</div>
    );
  }

  const revisionContent = revision?.content || post.content;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/operations/cms/blog/review')}
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-[#151520] px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Queue
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">{post.title}</h1>
            <p className="text-xs text-slate-500">
              Reviewing revision submitted{' '}
              {post.submitted_for_review_at
                ? new Date(post.submitted_for_review_at).toLocaleString('en-IN')
                : 'recently'}{' '}
              · by {post.author_name || 'unknown author'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revision (submitted content) */}
        <div className="overflow-hidden rounded-xl border border-white/5 bg-[#151520] shadow-xl">
          <div className="border-b border-white/10 bg-amber-500/10 px-4 py-3">
            <h2 className="text-sm font-bold text-amber-400">
              Submitted Revision
            </h2>
            {revision && (
              <p className="text-xs text-slate-500">
                {new Date(revision.created_at).toLocaleString('en-IN')}
              </p>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-5">
            <article
              className="prose prose-stone prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: revisionContent }}
            />
          </div>
        </div>

        {/* Currently published (if any) */}
        <div className="overflow-hidden rounded-xl border border-white/5 bg-[#151520] shadow-xl">
          <div className="border-b border-white/10 bg-emerald-500/10 px-4 py-3">
            <h2 className="text-sm font-bold text-emerald-400">
              Currently Published
            </h2>
            {post.is_published && post.published_at && (
              <p className="text-xs text-slate-500">
                Published {new Date(post.published_at).toLocaleString('en-IN')}
              </p>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-5">
            {post.is_published && post.content ? (
              <article
                className="prose prose-stone prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            ) : (
              <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-slate-500">
                No published version yet — this is a new post.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review notes + actions */}
      <div className="overflow-hidden rounded-xl border border-white/5 bg-[#151520] shadow-xl">
        <div className="space-y-4 p-4">
          {post.review_notes && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
              <strong>Previous rejection note:</strong> {post.review_notes}
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              Rejection notes (required if rejecting)
            </label>
            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              rows={2}
              placeholder="Explain what the author needs to change..."
              className="w-full resize-y rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              onClick={handleReject}
              disabled={busy !== null}
              className="flex items-center justify-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-400 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
            >
              {busy === 'reject' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Send Back to Draft
            </button>
            <button
              onClick={handleApprove}
              disabled={busy !== null}
              className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
            >
              {busy === 'approve' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Approve & Publish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
