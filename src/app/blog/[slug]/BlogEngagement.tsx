'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Heart,
  Facebook,
  Twitter,
  Linkedin,
  Share2,
  MessageCircle,
  Link2,
  Check,
} from 'lucide-react';

interface BlogEngagementProps {
  slug: string;
  title: string;
  siteUrl: string;
}

const VISITOR_KEY_STORAGE = 'ruhvi_blog_visitor_key';

function getVisitorKey(): string {
  try {
    let key = localStorage.getItem(VISITOR_KEY_STORAGE);
    if (!key) {
      key = `v_${crypto.randomUUID()}`;
      localStorage.setItem(VISITOR_KEY_STORAGE, key);
    }
    return key;
  } catch {
    return `v_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  }
}

export default function BlogEngagement({
  slug,
  title,
  siteUrl,
}: BlogEngagementProps) {
  const shareUrl = `${siteUrl}/blog/${slug}`;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  const [count, setCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const visitorKeyRef = useRef<string>('');

  const fetchState = async () => {
    const key = getVisitorKey();
    visitorKeyRef.current = key;
    try {
      const res = await fetch(
        `/api/blog/${slug}/like?visitorKey=${encodeURIComponent(key)}`
      );
      const data = await res.json();
      if (res.ok) {
        setCount(data.count || 0);
        setLiked(Boolean(data.liked));
      }
    } catch {
      /* non-blocking */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const handleLike = async () => {
    if (busy || loading) return;
    setBusy(true);
    const next = !liked;
    // Optimistic update
    setLiked(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    try {
      const res = await fetch(`/api/blog/${slug}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorKey: visitorKeyRef.current || getVisitorKey(),
          action: next ? 'like' : 'unlike',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCount(data.count || 0);
        setLiked(Boolean(data.liked));
      } else {
        // Rollback on failure
        setLiked(!next);
        setCount((c) => Math.max(0, c + (next ? -1 : 1)));
      }
    } catch {
      setLiked(!next);
      setCount((c) => Math.max(0, c + (next ? -1 : 1)));
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleNativeShare = async () => {
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function'
    ) {
      try {
        await navigator.share({
          title,
          url: shareUrl,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      handleCopy();
    }
  };

  const iconClass = (hover: string) =>
    `flex h-10 w-10 items-center justify-center rounded-full border border-taupe-200 text-charcoal-500 transition-colors hover:${hover}`;

  return (
    <div className="flex flex-row items-center gap-3 md:flex-col md:gap-2">
      {/* Like */}
      <div className="flex items-center gap-1 md:flex-col">
        <button
          onClick={handleLike}
          disabled={busy}
          aria-pressed={liked}
          aria-label={liked ? 'Unlike this post' : 'Like this post'}
          title={liked ? 'Unlike' : 'Like'}
          className={`group flex h-10 w-10 items-center justify-center rounded-full border transition-all ${
            liked
              ? 'border-rose-300 bg-rose-50 text-rose-500'
              : 'border-taupe-200 text-charcoal-500 hover:border-rose-300 hover:text-rose-500'
          } disabled:opacity-60`}
        >
          <Heart
            className={`h-4 w-4 transition-transform group-active:scale-75 ${
              liked ? 'fill-rose-500' : ''
            }`}
          />
        </button>
        <span className="text-xs font-semibold text-charcoal-500">{count}</span>
      </div>

      <div className="h-8 w-px bg-taupe-200 md:h-px md:w-8" />

      {/* Share */}
      <div className="flex flex-row items-center gap-3 md:flex-col">
        <span className="hidden items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-charcoal-400 md:flex md:flex-col">
          <Share2 className="h-4 w-4" />
          <span>Share</span>
        </span>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on Facebook"
          className={iconClass('border-blue-600 text-blue-600')}
        >
          <Facebook className="h-4 w-4" />
        </a>
        <a
          href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on Twitter"
          className={iconClass('border-sky-500 text-sky-500')}
        >
          <Twitter className="h-4 w-4" />
        </a>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on LinkedIn"
          className={iconClass('border-blue-700 text-blue-700')}
        >
          <Linkedin className="h-4 w-4" />
        </a>
        <a
          href={`https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on WhatsApp"
          className={iconClass('border-emerald-600 text-emerald-600')}
        >
          <MessageCircle className="h-4 w-4" />
        </a>
        <button
          onClick={handleCopy}
          aria-label="Copy link"
          title="Copy link"
          className={iconClass('border-gold-700 text-gold-700')}
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <Link2 className="h-4 w-4" />
          )}
        </button>
        {typeof navigator !== 'undefined' &&
          typeof navigator.share === 'function' && (
            <button
              onClick={handleNativeShare}
              aria-label="Share via device"
              title="More share options"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-taupe-200 text-charcoal-500 transition-colors hover:border-charcoal-500 hover:text-charcoal-900"
            >
              <Share2 className="h-4 w-4" />
            </button>
          )}
      </div>
    </div>
  );
}
