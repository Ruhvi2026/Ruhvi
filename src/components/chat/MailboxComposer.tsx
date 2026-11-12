'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  Loader2,
  Sparkles,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';
import type { ComposeEmailPayload } from '@/types/mailbox';

interface MailboxComposerProps {
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
  onClose: () => void;
  onSent: () => void;
}

const FALLBACK_FROM_OPTIONS = [
  'shreya.maity@ruhvi.in',
  'support@ruhvi.in',
  'notification@ruhvi.in',
  'noreply@ruhvi.in',
];

export function MailboxComposer({
  initialTo = '',
  initialSubject = '',
  initialBody = '',
  onClose,
  onSent,
}: MailboxComposerProps) {
  const [fromOptions, setFromOptions] = useState<string[]>(
    FALLBACK_FROM_OPTIONS
  );
  const [from, setFrom] = useState(FALLBACK_FROM_OPTIONS[0]);

  // Dynamically fetch mailboxes from accounts API
  useEffect(() => {
    fetch('/api/mailbox/accounts')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.mailboxes) && d.mailboxes.length > 0) {
          const emails: string[] = d.mailboxes.map(
            (mb: { email: string }) => mb.email
          );
          setFromOptions(emails);
          setFrom(emails[0]);
        }
      })
      .catch(() => {
        /* keep fallback */
      });
  }, []);

  const [to, setTo] = useState(initialTo);
  const [showCc, setShowCc] = useState(false);
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);

  const [sending, setSending] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to.trim()) {
      setError('Recipient email is required.');
      return;
    }
    if (!subject.trim()) {
      setError('Subject is required.');
      return;
    }
    if (!body.trim()) {
      setError('Message body cannot be empty.');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const payload: ComposeEmailPayload = {
        from,
        to: to.trim(),
        cc: cc.trim() || undefined,
        subject: subject.trim(),
        body: body.trim(),
      };

      const res = await fetch('/api/mailbox/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch email.');
      }

      onSent();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send error occurred.');
    } finally {
      setSending(false);
    }
  };

  const handleAIPolish = async () => {
    if (!body.trim()) {
      setError('Write a quick draft first, then AI can polish it.');
      return;
    }

    setPolishing(true);
    setError(null);

    try {
      const res = await fetch('/api/mailbox/ai/suggest-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          body,
          tone: 'professional',
        }),
      });

      const data = await res.json();
      if (data.success && data.suggestion?.body) {
        setBody(data.suggestion.body);
      }
    } catch (err) {
      console.warn('AI polish error:', err);
    } finally {
      setPolishing(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#0D111E]">
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-white/10 bg-[#161D31] px-3.5 py-2.5">
        <h4 className="text-xs font-bold text-white">New Message</h4>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Form Area */}
      <form
        onSubmit={handleSend}
        className="flex flex-1 flex-col space-y-2.5 overflow-hidden p-3"
      >
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-2 text-[11px] text-rose-300">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* From Picker */}
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#161D31] px-3 py-1.5 text-xs">
          <span className="w-12 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            From:
          </span>
          <div className="relative flex-1">
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full cursor-pointer appearance-none bg-transparent pr-5 text-xs font-medium text-slate-200 focus:outline-none"
            >
              {fromOptions.map((opt) => (
                <option
                  key={opt}
                  value={opt}
                  className="bg-[#161D31] text-slate-100"
                >
                  {opt}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          </div>
        </div>

        {/* Recipient To */}
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#161D31] px-3 py-1.5 text-xs">
          <span className="w-12 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            To:
          </span>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recipient@example.com"
            className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
            required
          />
          {!showCc && (
            <button
              type="button"
              onClick={() => setShowCc(true)}
              className="text-[10px] font-semibold text-slate-500 hover:text-emerald-400"
            >
              Cc
            </button>
          )}
        </div>

        {/* CC Field */}
        {showCc && (
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#161D31] px-3 py-1.5 text-xs">
            <span className="w-12 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Cc:
            </span>
            <input
              type="text"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="comma separated emails"
              className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
            />
          </div>
        )}

        {/* Subject */}
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#161D31] px-3 py-1.5 text-xs">
          <span className="w-12 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Sub:
          </span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject of the email"
            className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
            required
          />
        </div>

        {/* Body Textarea */}
        <div className="relative flex flex-1 flex-col">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Compose your message here..."
            className="w-full flex-1 resize-none rounded-xl border border-white/10 bg-[#161D31] p-3 text-xs leading-relaxed text-slate-200 placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
          />

          {/* AI Polish floating trigger inside composer */}
          <div className="absolute bottom-2.5 right-2.5">
            <button
              type="button"
              onClick={handleAIPolish}
              disabled={polishing || !body.trim()}
              className="flex items-center gap-1 rounded-lg border border-violet-500/40 bg-[#211B3D] px-2 py-1 text-[10px] font-semibold text-violet-300 shadow hover:bg-violet-900/60 disabled:opacity-40"
              title="Polish tone and fix grammar with AI"
            >
              {polishing ? (
                <Loader2 className="h-3 w-3 animate-spin text-violet-300" />
              ) : (
                <Sparkles className="h-3 w-3 text-violet-400" />
              )}
              <span>AI Polish</span>
            </button>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex flex-shrink-0 items-center justify-between border-t border-white/5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            Discard
          </button>

          <button
            type="submit"
            disabled={sending}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-md transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {sending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Send Email</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
