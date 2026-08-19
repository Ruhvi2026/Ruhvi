'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Ticket,
  Mail,
  Calendar,
  User,
  Tag,
  Clock,
  ArrowRight,
  CornerDownLeft,
  Loader2,
  MessageSquare,
  AlertCircle,
  Paperclip,
} from 'lucide-react';
import Link from 'next/link';

function StatusCheckContent() {
  const searchParams = useSearchParams();

  // Auth Integration
  const { user } = useAuth();

  // Search Form State
  const [ticketNumber, setTicketNumber] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Result State
  const [ticket, setTicket] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);

  // Reply State
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [attachmentsList, setAttachmentsList] = useState<
    {
      file_name: string;
      file_type: string;
      file_size: number;
      storage_url: string;
    }[]
  >([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  const handleAttachmentUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingAttachment(true);
    // Dynamic import to avoid SSR issues if any
    try {
      const { uploadAttachment } = await import('@/services/cloudinaryService');
      const uploaded: typeof attachmentsList = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Size limits: 2MB for images, 5MB for videos/files
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        const maxSize = isImage ? 2 * 1024 * 1024 : 5 * 1024 * 1024;

        if (file.size > maxSize) {
          alert(
            `File "${file.name}" exceeds size limit (${isImage ? '2MB for images' : '5MB for videos/files'})`
          );
          continue;
        }

        const res = await uploadAttachment(file);
        if (res?.secure_url) {
          uploaded.push({
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            storage_url: res.secure_url,
          });
        }
      }

      setAttachmentsList((prev) => [...prev, ...uploaded]);
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploadingAttachment(false);
      e.target.value = '';
    }
  };

  // Prefill from query params and handle auto-tracking if logged in
  useEffect(() => {
    const tParam = searchParams.get('ticket');
    const eParam = searchParams.get('email');
    if (tParam) setTicketNumber(tParam);

    // Auto-populate email if user is logged in
    if (user?.email) {
      setEmail(user.email);
    } else if (eParam) {
      setEmail(eParam);
    }

    if (tParam) {
      const activeEmail = user?.email || eParam || email;
      if (activeEmail) {
        handleSearch(tParam, activeEmail);
      }
    }
  }, [searchParams, user]);

  const handleSearch = async (tNum = ticketNumber, uEmail = email) => {
    const trackingEmail = user?.email || uEmail;
    if (!tNum.trim() || !trackingEmail.trim()) {
      setError(
        'Ticket number is required. Guest users must also provide email.'
      );
      return;
    }

    setLoading(true);
    setError(null);
    setTicket(null);

    try {
      const res = await fetch(
        `/api/support/tickets/status?ticketNumber=${encodeURIComponent(tNum.trim())}&email=${encodeURIComponent(trackingEmail.trim())}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch ticket status.');
      }

      setTicket(data.ticket);
      setMessages(data.messages || []);
      setAttachments(data.attachments || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reply submit function
  const handleReplySubmit = async (e: React.FormEvent, ticketId: string) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setSendingReply(true);
    setReplyError(null);

    const trackingEmail = user?.email || email;

    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: replyText,
          email: trackingEmail,
          attachments: attachmentsList,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send message.');
      }

      if (attachmentsList.length > 0) {
        handleSearch();
      } else {
        setMessages((prev) => [...prev, data.message]);
      }
      setReplyText('');
      setAttachmentsList([]);
    } catch (err: any) {
      setReplyError(err.message);
    } finally {
      setSendingReply(false);
    }
  };

  const renderMessageAttachments = (msg: any) => {
    const msgAttachments = attachments.filter(
      (att: any) => att.message_id === msg.id
    );
    if (msgAttachments.length === 0) return null;

    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {msgAttachments.map((att: any) => {
          const isImg = att.file_type?.startsWith('image/');
          const isVid = att.file_type?.startsWith('video/');
          return (
            <div
              key={att.id}
              className="flex flex-col items-center gap-1 rounded-lg border border-white/5 bg-white/5 p-1.5"
            >
              {isImg ? (
                <a
                  href={att.storage_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={att.storage_url}
                    alt={att.file_name}
                    className="max-h-[100px] max-w-[150px] rounded border border-white/5 object-cover"
                  />
                </a>
              ) : isVid ? (
                <video
                  src={att.storage_url}
                  controls
                  className="max-w-[150px] rounded border border-white/5"
                />
              ) : (
                <a
                  href={att.storage_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] text-amber-400 hover:underline"
                >
                  📎{' '}
                  <span className="max-w-[120px] truncate">
                    {att.file_name}
                  </span>
                </a>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const STATUS_STEPS = [
    { key: 'new', label: 'Registered' },
    { key: 'open', label: 'Open' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'waiting_for_customer', label: 'Action Needed' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'closed', label: 'Closed' },
  ];

  const currentStatusIndex = ticket
    ? STATUS_STEPS.findIndex((s) => s.key === ticket.status)
    : 0;

  return (
    <div className="mx-auto min-h-[80vh] max-w-4xl px-4 py-12 text-cream-100">
      {/* Page Title */}
      <div className="mb-10 space-y-3 text-center">
        <h1 className="bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent text-white sm:text-4xl">
          Track Support Ticket
        </h1>
        <p className="mx-auto max-w-lg text-sm text-stone-400">
          Check status, view updates, and converse directly with our support
          concierge for any registered ticket.
        </p>
      </div>

      {/* Search Card */}
      <div className="rounded-2xl border border-white/5 bg-[#121520]/80 p-6 shadow-xl backdrop-blur-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="grid gap-4 sm:grid-cols-7"
        >
          <div className="relative sm:col-span-3">
            <Ticket className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold-400/60" />
            <input
              type="text"
              placeholder="Ticket Number (e.g. RUV-2026-000001)"
              value={ticketNumber}
              onChange={(e) => setTicketNumber(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-stone-500 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
              required
            />
          </div>
          {!user && (
            <div className="relative sm:col-span-3">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold-400/60" />
              <input
                type="email"
                placeholder="Associated Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-stone-500 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
                required
              />
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-3 text-sm font-bold text-stone-900 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 sm:col-span-1"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check'}
          </button>
        </form>

        {error && (
          <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Ticket Details Display */}
      {ticket && (
        <div className="animate-fadeIn mt-8 space-y-6">
          {/* Status Stepper */}
          <div className="rounded-2xl border border-white/5 bg-[#121520]/60 p-6">
            <h3 className="mb-6 text-xs font-bold uppercase tracking-wider text-stone-500">
              Ticket Progress
            </h3>
            <div className="relative flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
              {STATUS_STEPS.map((step, idx) => {
                const isCompleted = idx <= currentStatusIndex;
                const isCurrent = idx === currentStatusIndex;

                return (
                  <div
                    key={step.key}
                    className="relative z-10 flex w-full flex-1 items-center gap-3 md:flex-col md:gap-2"
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                        isCurrent
                          ? 'border-gold-400 bg-gold-400 text-stone-950 shadow-lg shadow-gold-500/20'
                          : isCompleted
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                            : 'border-white/10 bg-white/5 text-stone-600'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div className="text-left md:text-center">
                      <p
                        className={`text-xs font-semibold ${isCurrent ? 'font-bold text-gold-400' : isCompleted ? 'text-emerald-400/80' : 'text-stone-500'}`}
                      >
                        {step.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Details Overview */}
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-4 rounded-2xl border border-white/5 bg-[#121520]/60 p-6 md:col-span-2">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="rounded border border-gold-400/20 bg-gold-400/5 px-2 py-0.5 font-mono text-[10px] text-gold-400/70">
                    {ticket.ticket_number}
                  </span>
                  <h2 className="mt-1.5 text-lg font-bold text-white">
                    {ticket.title}
                  </h2>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                    ticket.priority === 'urgent'
                      ? 'border border-red-500/20 bg-red-500/10 text-red-400'
                      : ticket.priority === 'high'
                        ? 'border border-orange-500/20 bg-orange-500/10 text-orange-400'
                        : 'border border-blue-500/20 bg-blue-500/10 text-blue-400'
                  }`}
                >
                  {ticket.priority}
                </span>
              </div>

              <div className="border-t border-white/5 pt-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-500">
                  Description
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-300">
                  {ticket.description}
                </p>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-white/5 bg-[#121520]/60 p-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Ticket Information
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="flex items-center gap-1.5 text-stone-500">
                    <User className="h-3.5 w-3.5" /> Customer
                  </span>
                  <span className="font-medium text-stone-300">
                    {ticket.customer_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1.5 text-stone-500">
                    <Tag className="h-3.5 w-3.5" /> Category
                  </span>
                  <span className="font-medium text-stone-300">
                    {ticket.category}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1.5 text-stone-500">
                    <Calendar className="h-3.5 w-3.5" /> Registered
                  </span>
                  <span className="font-medium text-stone-300">
                    {new Date(ticket.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1.5 text-stone-500">
                    <Clock className="h-3.5 w-3.5" /> Last Activity
                  </span>
                  <span className="font-medium text-stone-300">
                    {new Date(ticket.updated_at).toLocaleDateString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Conversation History */}
          <div className="space-y-6 rounded-2xl border border-white/5 bg-[#121520]/60 p-6">
            <h3 className="flex items-center gap-2 border-b border-white/5 pb-3 text-sm font-bold text-white">
              <MessageSquare className="h-4 w-4 text-gold-400" />
              Conversation Updates
            </h3>

            {messages.length === 0 ? (
              <p className="py-6 text-center text-xs text-stone-500">
                No updates or replies posted yet.
              </p>
            ) : (
              <div className="max-h-96 space-y-4 overflow-y-auto pr-2">
                {messages.map((msg) => {
                  const isStaff = msg.sender_type === 'staff';
                  const isAI = msg.sender_type === 'ai';

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isStaff || isAI ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-4 text-xs ${
                          isStaff
                            ? 'border border-amber-500/20 bg-amber-500/10 text-stone-200'
                            : isAI
                              ? 'border border-purple-500/20 bg-purple-500/10 text-stone-200'
                              : 'border border-white/10 bg-white/5 text-stone-300'
                        }`}
                      >
                        <div className="mb-1 flex justify-between gap-6 text-[10px] font-semibold text-stone-500">
                          <span>
                            {isStaff
                              ? 'Staff Support'
                              : isAI
                                ? 'Gia Concierge'
                                : 'You (Customer)'}
                          </span>
                          <span>
                            {new Date(msg.created_at).toLocaleDateString(
                              'en-IN',
                              { hour: '2-digit', minute: '2-digit' }
                            )}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {msg.message}
                        </p>
                        {renderMessageAttachments(msg)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick Reply Form */}
            {ticket.status !== 'closed' && ticket.status !== 'resolved' && (
              <form
                onSubmit={(e) => handleReplySubmit(e, ticket.id)}
                className="space-y-3 border-t border-white/5 pt-4"
              >
                <textarea
                  rows={3}
                  placeholder="Post an update or reply to support..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white placeholder-stone-500 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
                  required
                />

                {/* Attachments List */}
                {attachmentsList.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {attachmentsList.map((att, idx) => (
                      <div
                        key={idx}
                        className="animate-fade-in flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/5 px-2.5 py-1 text-xs text-slate-300"
                      >
                        <span className="max-w-[120px] truncate">
                          {att.file_name}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setAttachmentsList((prev) =>
                              prev.filter((_, i) => i !== idx)
                            )
                          }
                          className="font-bold text-rose-400 hover:text-rose-300"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions Bar */}
                <div className="mt-2 flex items-center justify-between">
                  <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40">
                    <Paperclip className="h-3.5 w-3.5" />
                    <span>
                      {isUploadingAttachment ? 'Uploading...' : 'Attach Files'}
                    </span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={handleAttachmentUpload}
                      disabled={isUploadingAttachment}
                    />
                  </label>
                </div>

                {replyError && (
                  <p className="text-xs text-red-400">{replyError}</p>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={sendingReply}
                    className="flex items-center gap-1.5 rounded-lg bg-gold-400 px-4 py-2 text-xs font-bold text-stone-950 transition-all hover:bg-gold-500 active:scale-95 disabled:opacity-50"
                  >
                    {sendingReply ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        Send Message <CornerDownLeft className="h-3 w-3" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TicketStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gold-400" />
        </div>
      }
    >
      <StatusCheckContent />
    </Suspense>
  );
}
