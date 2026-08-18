'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Send,
  Lock,
  User,
  Clock,
  Package,
  ShoppingBag,
  MapPin,
  MessageSquare,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Paperclip,
  ExternalLink,
  Shield,
  History,
} from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: 'new', label: 'New', color: 'bg-emerald-500' },
  { value: 'open', label: 'Open', color: 'bg-blue-500' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-amber-500' },
  {
    value: 'waiting_for_customer',
    label: 'Waiting for Customer',
    color: 'bg-purple-500',
  },
  { value: 'resolved', label: 'Resolved', color: 'bg-green-500' },
  { value: 'closed', label: 'Closed', color: 'bg-slate-500' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'text-slate-400' },
  { value: 'normal', label: 'Normal', color: 'text-blue-400' },
  { value: 'high', label: 'High', color: 'text-orange-400' },
  { value: 'urgent', label: 'Urgent', color: 'text-red-400' },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function timeSince(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function SupportTicketDetail() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [replyVisibility, setReplyVisibility] = useState<
    'customer' | 'internal'
  >('customer');
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTicket();
  }, [ticketId]);

  async function fetchTicket() {
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`);
      if (!res.ok) throw new Error('Not found');
      const json = await res.json();
      setData(json);
    } catch {
      toast.error('Ticket not found');
      router.push('/support/tickets');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(updates: any) {
    setUpdating(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Update failed');
      toast.success('Ticket updated');
      fetchTicket();
    } catch {
      toast.error('Failed to update ticket');
    } finally {
      setUpdating(false);
    }
  }

  async function handleSendReply() {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: replyText,
          visibility: replyVisibility,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      setReplyText('');
      toast.success(
        replyVisibility === 'internal' ? 'Internal note added' : 'Reply sent'
      );
      fetchTicket();

      // Send email notification for customer-visible replies
      if (replyVisibility === 'customer') {
        fetch(`/api/support/tickets/${ticketId}/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'staff_reply',
            reply_preview: replyText.substring(0, 200),
          }),
        }).catch(() => {});
      }
    } catch {
      toast.error('Failed to send');
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  if (!data?.ticket) return null;

  const {
    ticket,
    messages,
    attachments,
    auditLogs,
    orderItems,
    previousTickets,
    trackingUpdates,
  } = data;

  const slaStatus = ticket.sla_breached
    ? 'breached'
    : ticket.sla_due_at && new Date(ticket.sla_due_at) < new Date()
      ? 'overdue'
      : 'on_track';

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-slate-400">
              {ticket.ticket_number}
            </span>
            {ticket.ai_created && (
              <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-bold text-violet-400">
                AI Created
              </span>
            )}
            {slaStatus === 'breached' && (
              <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">
                SLA Breached
              </span>
            )}
            {slaStatus === 'overdue' && (
              <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-bold text-orange-400">
                SLA Overdue
              </span>
            )}
          </div>
          <h1 className="mt-1 truncate text-lg font-bold text-white">
            {ticket.title}
          </h1>
        </div>
      </div>

      {/* Main Grid: Left = Timeline, Right = Context Panels */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Left Column: Conversation + Reply */}
        <div className="space-y-4 xl:col-span-2">
          {/* Controls */}
          <div className="flex flex-wrap gap-3 rounded-xl border border-white/5 bg-[#131726] p-3">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                Status
              </label>
              <select
                value={ticket.status}
                onChange={(e) => handleUpdate({ status: e.target.value })}
                disabled={updating}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                Priority
              </label>
              <select
                value={ticket.priority}
                onChange={(e) => handleUpdate({ priority: e.target.value })}
                disabled={updating}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Conversation Timeline */}
          <div className="rounded-xl border border-white/5 bg-[#131726]">
            <div className="border-b border-white/5 px-5 py-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                <MessageSquare className="h-4 w-4 text-amber-400" />
                Conversation
              </h2>
            </div>
            <div className="max-h-[500px] space-y-4 overflow-y-auto px-5 py-4">
              {messages.map((msg: any) => {
                const isInternal = msg.visibility === 'internal';
                const isCustomer = msg.sender_type === 'customer';
                const isAI = msg.sender_type === 'ai';

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isCustomer ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-xl p-3.5 ${
                        isInternal
                          ? 'border border-amber-500/20 bg-amber-500/5'
                          : isCustomer
                            ? 'border border-white/10 bg-white/5'
                            : isAI
                              ? 'border border-violet-500/20 bg-violet-500/5'
                              : 'border border-blue-500/20 bg-blue-500/5'
                      }`}
                    >
                      <div className="mb-1.5 flex items-center gap-2 text-[10px]">
                        {isInternal && (
                          <Lock className="h-3 w-3 text-amber-400" />
                        )}
                        <span
                          className={`font-semibold ${
                            isInternal
                              ? 'text-amber-400'
                              : isCustomer
                                ? 'text-slate-400'
                                : isAI
                                  ? 'text-violet-400'
                                  : 'text-blue-400'
                          }`}
                        >
                          {isInternal
                            ? `Internal Note · ${msg.sender?.full_name || 'Staff'}`
                            : isCustomer
                              ? msg.sender?.full_name || 'Customer'
                              : isAI
                                ? 'GIA (AI Assistant)'
                                : msg.sender?.full_name || 'Support'}
                        </span>
                        <span className="text-slate-600">
                          {timeSince(msg.created_at)}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                        {msg.message}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Box */}
            <div className="border-t border-white/5 p-4">
              <div className="mb-2 flex items-center gap-2">
                <button
                  onClick={() => setReplyVisibility('customer')}
                  className={`rounded-full px-3 py-1 text-[10px] font-semibold transition-all ${
                    replyVisibility === 'customer'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-white/5 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Reply to Customer
                </button>
                <button
                  onClick={() => setReplyVisibility('internal')}
                  className={`flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-semibold transition-all ${
                    replyVisibility === 'internal'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-white/5 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Lock className="h-3 w-3" />
                  Internal Note
                </button>
              </div>
              <div className="flex gap-2">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={
                    replyVisibility === 'internal'
                      ? 'Add an internal note...'
                      : 'Reply to customer...'
                  }
                  rows={3}
                  className="flex-1 resize-none rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <button
                  onClick={handleSendReply}
                  disabled={sending || !replyText.trim()}
                  className="self-end rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-500 disabled:opacity-40"
                >
                  {sending ? '...' : <Send className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Audit Log */}
          {auditLogs.length > 0 && (
            <div className="rounded-xl border border-white/5 bg-[#131726]">
              <div className="border-b border-white/5 px-5 py-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <History className="h-4 w-4 text-slate-400" />
                  Activity Log
                </h2>
              </div>
              <div className="max-h-60 space-y-2 overflow-y-auto px-5 py-3">
                {auditLogs.map((log: any) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 text-[11px] text-slate-500"
                  >
                    <div className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-600" />
                    <div>
                      <span className="font-medium text-slate-400">
                        {log.actor?.full_name || log.actor_type}
                      </span>{' '}
                      {log.action.replace(/_/g, ' ')}
                      {log.new_value?.status && (
                        <span className="ml-1 font-medium text-amber-400/70">
                          → {log.new_value.status}
                        </span>
                      )}
                      {log.new_value?.priority && (
                        <span className="ml-1 font-medium text-amber-400/70">
                          → {log.new_value.priority}
                        </span>
                      )}
                      <span className="ml-2 text-slate-600">
                        {formatDate(log.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Context Panels */}
        <div className="space-y-4">
          {/* Customer Info */}
          <div className="rounded-xl border border-white/5 bg-[#131726]">
            <div className="border-b border-white/5 px-4 py-3">
              <h3 className="flex items-center gap-2 text-xs font-semibold text-white">
                <User className="h-3.5 w-3.5 text-amber-400" />
                Customer
              </h3>
            </div>
            <div className="space-y-2 px-4 py-3 text-xs">
              <p className="font-medium text-slate-200">
                {ticket.customer?.full_name || 'N/A'}
              </p>
              <p className="text-slate-500">{ticket.customer?.email}</p>
              {ticket.customer?.phone && (
                <p className="text-slate-500">{ticket.customer.phone}</p>
              )}
              <p className="text-slate-600">
                Member since{' '}
                {ticket.customer?.created_at
                  ? formatDate(ticket.customer.created_at)
                  : 'N/A'}
              </p>
            </div>
            {previousTickets.length > 0 && (
              <div className="border-t border-white/5 px-4 py-2">
                <p className="mb-1 text-[10px] font-semibold text-slate-600">
                  Previous Tickets
                </p>
                {previousTickets.map((pt: any) => (
                  <Link
                    key={pt.id}
                    href={`/support/tickets/${pt.id}`}
                    className="block py-0.5 text-[11px] text-slate-500 hover:text-amber-400"
                  >
                    {pt.ticket_number} — {pt.title}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Issue Info */}
          <div className="rounded-xl border border-white/5 bg-[#131726]">
            <div className="border-b border-white/5 px-4 py-3">
              <h3 className="flex items-center gap-2 text-xs font-semibold text-white">
                <FileText className="h-3.5 w-3.5 text-amber-400" />
                Issue Details
              </h3>
            </div>
            <div className="space-y-3 px-4 py-3 text-xs">
              <div>
                <span className="text-slate-600">Category</span>
                <p className="text-slate-300">
                  {ticket.category?.name || 'Uncategorized'}
                </p>
              </div>
              {ticket.subcategory && (
                <div>
                  <span className="text-slate-600">Subcategory</span>
                  <p className="text-slate-300">{ticket.subcategory.name}</p>
                </div>
              )}
              <div>
                <span className="text-slate-600">Created</span>
                <p className="text-slate-300">
                  {formatDate(ticket.created_at)}
                </p>
              </div>
              {ticket.sla_due_at && (
                <div>
                  <span className="text-slate-600">SLA Due</span>
                  <p
                    className={`font-medium ${slaStatus === 'on_track' ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {formatDate(ticket.sla_due_at)}
                  </p>
                </div>
              )}
              {ticket.ai_summary && (
                <div>
                  <span className="text-slate-600">AI Summary</span>
                  <p className="mt-1 rounded-lg border border-violet-500/10 bg-violet-500/5 p-2 text-[11px] leading-relaxed text-slate-400">
                    {ticket.ai_summary}
                  </p>
                </div>
              )}
              {ticket.description && (
                <div>
                  <span className="text-slate-600">Description</span>
                  <p className="mt-1 whitespace-pre-wrap leading-relaxed text-slate-400">
                    {ticket.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Order Info */}
          {ticket.order && (
            <div className="rounded-xl border border-white/5 bg-[#131726]">
              <div className="border-b border-white/5 px-4 py-3">
                <h3 className="flex items-center gap-2 text-xs font-semibold text-white">
                  <ShoppingBag className="h-3.5 w-3.5 text-amber-400" />
                  Order
                </h3>
              </div>
              <div className="space-y-2 px-4 py-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Order #</span>
                  <span className="font-mono font-medium text-slate-200">
                    {ticket.order.order_number}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Status</span>
                  <span className="capitalize text-slate-300">
                    {ticket.order.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Total</span>
                  <span className="font-medium text-slate-200">
                    ₹{ticket.order.total}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Payment</span>
                  <span className="capitalize text-slate-300">
                    {ticket.order.payment_status}
                  </span>
                </div>
                {ticket.order.awb_code && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Tracking</span>
                    <span className="font-mono text-slate-300">
                      {ticket.order.awb_code}
                    </span>
                  </div>
                )}

                {/* Order Items */}
                {orderItems.length > 0 && (
                  <div className="mt-2 space-y-1.5 border-t border-white/5 pt-2">
                    <p className="text-[10px] font-semibold text-slate-600">
                      Items
                    </p>
                    {orderItems.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex justify-between text-[11px]"
                      >
                        <span className="mr-2 truncate text-slate-400">
                          {item.product?.name || item.sku}
                        </span>
                        <span className="flex-shrink-0 text-slate-500">
                          ×{item.quantity} · ₹{item.price_at_purchase}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tracking Updates */}
                {trackingUpdates.length > 0 && (
                  <div className="mt-2 space-y-1 border-t border-white/5 pt-2">
                    <p className="text-[10px] font-semibold text-slate-600">
                      Tracking
                    </p>
                    {trackingUpdates.slice(0, 3).map((t: any) => (
                      <div key={t.id} className="text-[10px] text-slate-500">
                        <span className="text-slate-400">{t.status}</span> —{' '}
                        {t.activity}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Product Info */}
          {ticket.product && (
            <div className="rounded-xl border border-white/5 bg-[#131726]">
              <div className="border-b border-white/5 px-4 py-3">
                <h3 className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Package className="h-3.5 w-3.5 text-amber-400" />
                  Product
                </h3>
              </div>
              <div className="space-y-2 px-4 py-3 text-xs">
                <p className="font-medium text-slate-200">
                  {ticket.product.name}
                </p>
                {ticket.product.sku && (
                  <p className="text-slate-500">SKU: {ticket.product.sku}</p>
                )}
                {ticket.product.price && (
                  <p className="text-slate-500">
                    Price: ₹{ticket.product.price}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="rounded-xl border border-white/5 bg-[#131726]">
              <div className="border-b border-white/5 px-4 py-3">
                <h3 className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Paperclip className="h-3.5 w-3.5 text-amber-400" />
                  Attachments ({attachments.length})
                </h3>
              </div>
              <div className="space-y-1 px-4 py-2">
                {attachments.map((att: any) => (
                  <a
                    key={att.id}
                    href={att.storage_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <Paperclip className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{att.file_name}</span>
                    <ExternalLink className="h-3 w-3 flex-shrink-0 text-slate-600" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
