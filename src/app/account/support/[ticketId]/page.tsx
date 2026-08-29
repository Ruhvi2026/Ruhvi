'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowLeft,
  Send,
  Clock,
  CheckCircle2,
  Paperclip,
  User,
  MessageSquare,
  ShoppingBag,
} from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-emerald-100 text-emerald-700',
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  waiting_for_customer: 'bg-purple-100 text-purple-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'Submitted',
  open: 'Being Reviewed',
  in_progress: 'Being Worked On',
  waiting_for_customer: 'Needs Your Response',
  resolved: 'Resolved',
  closed: 'Closed',
};

export default function CustomerTicketDetail() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const ticketId = params.ticketId as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [attachmentsList, setAttachmentsList] = useState<
    {
      file_name: string;
      file_type: string;
      file_size: number;
      storage_url: string;
      cloudinary_public_id: string | null;
    }[]
  >([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) fetchTicket();
  }, [user, ticketId]);

  async function handleAttachmentUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingAttachment(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fd = new FormData();
        fd.append('file', file);

        const res = await fetch('/api/support/upload', {
          method: 'POST',
          body: fd,
        });
        if (!res.ok) {
          const err = await res.json();
          toast.error(err.error || `Failed to upload ${file.name}`);
          continue;
        }
        const up = await res.json();
        setAttachmentsList((prev) => [
          ...prev,
          {
            file_name: up.file_name,
            file_type: up.file_type,
            file_size: up.file_size,
            storage_url: up.secure_url,
            cloudinary_public_id: up.public_id,
          },
        ]);
      }
      toast.success('Attachment(s) uploaded');
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setIsUploadingAttachment(false);
      e.target.value = '';
    }
  }

  async function fetchTicket() {
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`);
      if (!res.ok) throw new Error('Not found');
      const json = await res.json();
      setData(json);
    } catch {
      toast.error('Ticket not found');
      router.push('/account/support');
    } finally {
      setLoading(false);
    }
  }

  async function handleReply() {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: replyText,
          visibility: 'customer',
          attachments: attachmentsList,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      setReplyText('');
      setAttachmentsList([]);
      toast.success('Reply sent');
      fetchTicket();
    } catch {
      toast.error('Failed to send reply');
    } finally {
      setSending(false);
    }
  }

  async function handleReopen() {
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to reopen');
      }
      toast.success('Ticket reopened');
      fetchTicket();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reopen ticket');
    }
  }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-500 border-t-transparent" />
      </div>
    );
  }

  if (!data?.ticket) return null;

  const { ticket, messages, attachments } = data;
  const isClosed = ticket.status === 'closed' || ticket.status === 'resolved';

  // Auto-close warning (spec §3.2): show when waiting_on_customer and > 20h elapsed.
  const autoCloseWarning =
    ticket.status === 'waiting_for_customer' &&
    ticket.pending_customer_reply_since
      ? (() => {
          const elapsed =
            (Date.now() -
              new Date(ticket.pending_customer_reply_since).getTime()) /
            3600000;
          return elapsed >= 20;
        })()
      : false;

  const canReopen =
    ticket.status === 'closed' &&
    ticket.close_reason === 'auto_closed_no_reply' &&
    ticket.auto_close_eligible_until &&
    new Date(ticket.auto_close_eligible_until) >= new Date();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/account/support"
          className="mb-4 inline-flex items-center gap-1 text-sm text-charcoal-400 transition-colors hover:text-charcoal-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Support
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-charcoal-400">
                {ticket.ticket_number}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  STATUS_COLORS[ticket.status] || STATUS_COLORS.open
                }`}
              >
                {STATUS_LABELS[ticket.status] || ticket.status}
              </span>
            </div>
            <h1 className="mt-2 text-xl font-bold text-charcoal-900">
              {ticket.title}
            </h1>
          </div>
        </div>

        {/* Ticket Info */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-charcoal-400">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {new Date(ticket.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {ticket.category && (
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              {ticket.category.name}
            </span>
          )}
          {ticket.order && (
            <span className="flex items-center gap-1">
              <ShoppingBag className="h-3.5 w-3.5" />
              Order #{ticket.order.order_number}
            </span>
          )}
        </div>
      </div>

      {/* Status Banner */}
      {ticket.status === 'waiting_for_customer' && (
        <div className="mb-6 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3">
          <p className="text-sm font-semibold text-purple-700">
            Your Response Needed
          </p>
          <p className="mt-0.5 text-xs text-purple-600">
            Our support team is waiting for your response. Please reply below.
          </p>
        </div>
      )}

      {autoCloseWarning && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-5 py-3">
          <p className="text-sm font-semibold text-amber-700">
            We haven't heard back from you
          </p>
          <p className="mt-0.5 text-xs text-amber-600">
            This ticket will auto-close soon if we don't get a reply. Respond
            below to keep it open.
          </p>
        </div>
      )}

      {canReopen && (
        <div className="mb-6 rounded-xl border border-charcoal-200 bg-charcoal-50 px-5 py-3">
          <p className="text-sm font-semibold text-charcoal-700">
            This ticket was auto-closed
          </p>
          <p className="mt-0.5 text-xs text-charcoal-500">
            You can reopen it within 30 days of closing.
          </p>
          <button
            onClick={handleReopen}
            className="mt-3 rounded-xl bg-charcoal-900 px-4 py-2 text-xs font-semibold text-cream-50 transition-colors hover:bg-charcoal-800"
          >
            Reopen Ticket
          </button>
        </div>
      )}

      {ticket.status === 'resolved' && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-5 py-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <p className="text-sm font-semibold text-green-700">
              This ticket has been resolved
            </p>
          </div>
          {ticket.resolved_at && (
            <p className="mt-0.5 text-xs text-green-600">
              Resolved on{' '}
              {new Date(ticket.resolved_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          )}
        </div>
      )}

      {/* Conversation */}
      <div className="overflow-hidden rounded-xl border border-charcoal-100 bg-white">
        <div className="border-b border-charcoal-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-charcoal-700">
            Conversation
          </h2>
        </div>
        <div className="max-h-[500px] space-y-4 overflow-y-auto px-5 py-4">
          {messages.map((msg: any) => {
            const isCustomer = msg.sender_type === 'customer';

            return (
              <div
                key={msg.id}
                className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    isCustomer
                      ? 'rounded-br-md bg-charcoal-900 text-cream-50'
                      : 'rounded-bl-md border border-charcoal-100 bg-charcoal-50 text-charcoal-800'
                  }`}
                >
                  <div className="mb-1 flex items-center gap-1.5 text-[10px]">
                    <span
                      className={
                        isCustomer ? 'text-cream-200' : 'text-charcoal-400'
                      }
                    >
                      {isCustomer
                        ? 'You'
                        : msg.sender_type === 'ai'
                          ? 'GIA (AI Assistant)'
                          : 'Support Team'}
                    </span>
                    <span
                      className={
                        isCustomer ? 'text-cream-300/60' : 'text-charcoal-300'
                      }
                    >
                      ·
                    </span>
                    <span
                      className={
                        isCustomer ? 'text-cream-300/60' : 'text-charcoal-300'
                      }
                    >
                      {new Date(msg.created_at).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {msg.message}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Box */}
        {!isClosed && (
          <div className="border-t border-charcoal-100 p-4">
            {attachmentsList.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {attachmentsList.map((att, idx) => (
                  <span
                    key={idx}
                    className="flex items-center gap-1 rounded-lg border border-charcoal-100 bg-charcoal-50 px-2 py-1 text-[11px] text-charcoal-500"
                  >
                    {att.file_name}
                    <button
                      type="button"
                      onClick={() =>
                        setAttachmentsList((prev) =>
                          prev.filter((_, i) => i !== idx)
                        )
                      }
                      className="font-bold text-charcoal-400 hover:text-rose-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <label htmlFor="ticket-reply" className="sr-only">
                Type your reply
              </label>
              <textarea
                id="ticket-reply"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply..."
                rows={2}
                className="flex-1 resize-none rounded-xl border border-charcoal-200 bg-white p-3 text-sm text-charcoal-800 placeholder-charcoal-300 focus:outline-none focus:ring-2 focus:ring-gold-400/50"
              />
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="ticket-reply-attach"
                  className={`flex cursor-pointer items-center justify-center self-end rounded-xl border border-charcoal-200 p-2.5 text-charcoal-400 transition-colors hover:bg-charcoal-50 ${isUploadingAttachment ? 'opacity-40' : ''}`}
                  title="Attach image or PDF (max 10MB)"
                >
                  <Paperclip className="h-4 w-4" />
                  <input
                    id="ticket-reply-attach"
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={handleAttachmentUpload}
                    disabled={isUploadingAttachment}
                  />
                </label>
                <button
                  onClick={handleReply}
                  disabled={sending || !replyText.trim()}
                  className="self-end rounded-xl bg-charcoal-900 px-4 py-2.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-charcoal-800 disabled:opacity-40"
                >
                  {sending ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-cream-200 border-t-transparent" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Attachments */}
      {attachments && attachments.length > 0 && (
        <div className="mt-4 rounded-xl border border-charcoal-100 bg-white p-4">
          <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-charcoal-600">
            <Paperclip className="h-3.5 w-3.5" />
            Attachments
          </h3>
          <div className="flex flex-wrap gap-2">
            {attachments.map((att: any) => (
              <a
                key={att.id}
                href={att.storage_url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-charcoal-100 px-3 py-1.5 text-xs text-charcoal-500 transition-colors hover:bg-charcoal-50 hover:text-charcoal-700"
              >
                {att.file_name}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
