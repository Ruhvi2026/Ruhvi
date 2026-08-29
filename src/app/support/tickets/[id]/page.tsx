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
  Sparkles,
  Zap,
  Users,
  Copy,
  Check,
  CreditCard,
  Truck,
  HelpCircle,
  ChevronDown,
  Phone,
  Mail,
  Wallet,
  Coins,
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
  {
    value: 'waiting_for_team',
    label: 'Waiting for Internal Team',
    color: 'bg-teal-500',
  },
  { value: 'resolved', label: 'Resolved', color: 'bg-green-500' },
  { value: 'closed', label: 'Closed', color: 'bg-slate-500' },
  { value: 'reopened', label: 'Reopened', color: 'bg-orange-500' },
  { value: 'rejected', label: 'Rejected', color: 'bg-rose-500' },
  { value: 'duplicate', label: 'Duplicate', color: 'bg-cyan-500' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'text-slate-400' },
  { value: 'normal', label: 'Normal', color: 'text-blue-400' },
  { value: 'high', label: 'High', color: 'text-orange-400' },
  { value: 'urgent', label: 'Urgent', color: 'text-red-400' },
];

interface CannedResponse {
  id: string;
  category: string;
  title: string;
  shortcut: string;
  content: string;
}

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  active_tickets_count: number;
}

export default function SupportTicketDetail() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;

  const [data, setData] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // Reply Composer
  const [replyText, setReplyText] = useState('');
  const [replyVisibility, setReplyVisibility] = useState<
    'customer' | 'internal'
  >('customer');
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [attachmentsList, setAttachmentsList] = useState<
    {
      file_name: string;
      file_type: string;
      file_size: number;
      storage_url: string;
    }[]
  >([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [copiedNum, setCopiedNum] = useState(false);
  const [showCannedMenu, setShowCannedMenu] = useState(false);
  const [tags, setTags] = useState<any[]>([]);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [tagQuery, setTagQuery] = useState('');
  const [addingTag, setAddingTag] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTicket();
    fetchMeta();
    fetchTags();
  }, [ticketId]);

  async function fetchTags() {
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/tags`);
      if (res.ok) {
        const data = await res.json();
        setTags(data.tags || []);
      }
    } catch {
      // ignore
    }
  }

  async function handleAddTag(tag: {
    tag_type: 'person' | 'team';
    tagged_staff_id?: string;
    tagged_team?: string;
  }) {
    if (addingTag) return;
    setAddingTag(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tag),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to add tag');
      } else {
        toast.success(
          tag.tag_type === 'team'
            ? `Tagged team ${tag.tagged_team}`
            : 'Mentioned team member'
        );
        setShowTagMenu(false);
        setTagQuery('');
        fetchTags();
      }
    } catch {
      toast.error('Failed to add tag');
    } finally {
      setAddingTag(false);
    }
  }

  async function handleResolveTag(tagId: string) {
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolve_tag_id: tagId }),
      });
      if (!res.ok) {
        toast.error('Failed to resolve tag');
        return;
      }
      toast.success('Tag resolved');
      fetchTags();
    } catch {
      toast.error('Failed to resolve tag');
    }
  }

  async function fetchMeta() {
    try {
      const [teamRes, crRes] = await Promise.all([
        fetch('/api/support/team'),
        fetch('/api/support/canned-responses'),
      ]);
      if (teamRes.ok) {
        const tData = await teamRes.json();
        setTeamMembers(tData.team || []);
      }
      if (crRes.ok) {
        const cData = await crRes.json();
        setCannedResponses(cData.canned_responses || []);
      }
    } catch {
      // ignore
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

  async function handleAutoAssignTicket() {
    setIsAutoAssigning(true);
    try {
      const res = await fetch('/api/support/auto-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: ticketId }),
      });
      const resData = await res.json();
      if (res.ok && resData.results?.[0]) {
        const assigned = resData.results[0].assigned_to;
        toast.success(
          `✨ Assigned to ${assigned.name} (Lowest active workload)`
        );
        fetchTicket();
      } else {
        toast.error(resData.error || 'Auto-assign failed');
      }
    } catch {
      toast.error('Network error during auto-assign');
    } finally {
      setIsAutoAssigning(false);
    }
  }

  async function handleSendReply(nextStatus?: string) {
    if (!replyText.trim()) {
      toast.error('Please enter a reply message');
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: replyText.trim(),
          visibility: replyVisibility,
          attachments: attachmentsList,
        }),
      });

      if (!res.ok) throw new Error('Failed to post message');

      // Update status if requested
      if (nextStatus && nextStatus !== data?.ticket?.status) {
        await fetch(`/api/support/tickets/${ticketId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus }),
        });
      }

      setReplyText('');
      setAttachmentsList([]);
      toast.success(
        replyVisibility === 'internal'
          ? 'Internal note saved'
          : 'Reply sent to customer'
      );
      fetchTicket();

      // Dispatch email notification in background for public customer replies
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
      toast.error('Failed to send reply');
    } finally {
      setSending(false);
    }
  }

  const handleAttachmentUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingAttachment(true);
    const loadingToast = toast.loading(
      `Uploading ${files.length} attachment(s)...`
    );

    try {
      const uploaded: typeof attachmentsList = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fd = new FormData();
        fd.append('file', file);

        // Server-side validated upload (spec §8): MIME + size + rate-limit.
        const res = await fetch('/api/support/upload', {
          method: 'POST',
          body: fd,
        });

        if (!res.ok) {
          const err = await res.json();
          toast.error(err.error || `Failed to upload "${file.name}"`);
          continue;
        }

        const up = await res.json();
        uploaded.push({
          file_name: up.file_name,
          file_type: up.file_type,
          file_size: up.file_size,
          storage_url: up.secure_url,
        });
      }

      setAttachmentsList((prev) => [...prev, ...uploaded]);
      toast.success('Attachments uploaded successfully!', { id: loadingToast });
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`, { id: loadingToast });
    } finally {
      setIsUploadingAttachment(false);
      e.target.value = '';
    }
  };

  const handleInsertCanned = (cr: CannedResponse) => {
    setReplyText((prev) => (prev ? `${prev}\n\n${cr.content}` : cr.content));
    setShowCannedMenu(false);
    toast.success(`Inserted template: ${cr.title}`);
  };

  const handleCopyTicket = () => {
    if (data?.ticket?.ticket_number) {
      navigator.clipboard.writeText(data.ticket.ticket_number);
      setCopiedNum(true);
      toast.success('Copied ticket number');
      setTimeout(() => setCopiedNum(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent shadow-md" />
        <p className="text-xs text-slate-500">Loading ticket details...</p>
      </div>
    );
  }

  if (!data?.ticket) return null;

  const {
    ticket,
    messages = [],
    attachments = [],
    auditLogs = [],
    orderItems = [],
    previousTickets = [],
    trackingUpdates = [],
  } = data;

  const isSlaOverdue =
    !['resolved', 'closed'].includes(ticket.status) &&
    (ticket.sla_breached ||
      (ticket.sla_due_at && new Date(ticket.sla_due_at) < new Date()));

  // Auto-close warning for agents (spec §3.2): waiting on customer, > 20h elapsed.
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

  const renderMessageAttachments = (msg: any) => {
    const msgAttachments = attachments.filter(
      (att: any) => att.message_id === msg.id
    );
    if (msgAttachments.length === 0) return null;

    return (
      <div className="mt-3 flex flex-wrap gap-2.5">
        {msgAttachments.map((att: any) => {
          const isImg = att.file_type?.startsWith('image/');
          const isVid = att.file_type?.startsWith('video/');
          return (
            <div
              key={att.id}
              className="flex flex-col items-center gap-1 rounded-lg border border-white/5 bg-white/[0.02] p-1.5"
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
                  className="flex items-center gap-1 text-[11px] text-indigo-400 hover:underline"
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

  return (
    <div className="space-y-5">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/support/tickets')}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            title="Back to queue"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-emerald-400">
                {ticket.ticket_number}
              </span>

              <button
                onClick={handleCopyTicket}
                className="text-slate-500 hover:text-slate-300"
                title="Copy ticket number"
              >
                {copiedNum ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>

              {ticket.ai_created && (
                <span className="rounded border border-violet-500/30 bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-bold text-violet-400">
                  AI CREATED
                </span>
              )}

              {isSlaOverdue && (
                <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/15 px-2 py-0.5 text-[9px] font-bold text-rose-400">
                  <Clock className="h-3 w-3" />
                  SLA OVERDUE
                </span>
              )}

              {autoCloseWarning && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold text-amber-400">
                  <Clock className="h-3 w-3" />
                  AUTO-CLOSE INCOMING (no reply from customer)
                </span>
              )}
            </div>

            <h1 className="mt-1 text-lg font-bold text-white sm:text-xl">
              {ticket.title}
            </h1>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/5 bg-[#131726] p-2">
          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5 px-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Status
            </span>
            <select
              value={ticket.status}
              onChange={(e) => handleUpdate({ status: e.target.value })}
              disabled={updating}
              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value} className="bg-[#131726]">
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Dropdown */}
          <div className="flex items-center gap-1.5 px-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Priority
            </span>
            <select
              value={ticket.priority}
              onChange={(e) => handleUpdate({ priority: e.target.value })}
              disabled={updating}
              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p.value} value={p.value} className="bg-[#131726]">
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Assignee / Auto-Assign */}
          <div className="flex items-center gap-1.5 px-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Assignee
            </span>
            <select
              value={ticket.assigned_to || ''}
              onChange={(e) => {
                if (e.target.value === 'AUTO_ASSIGN') {
                  handleAutoAssignTicket();
                } else {
                  handleUpdate({ assigned_to: e.target.value || null });
                }
              }}
              disabled={updating || isAutoAssigning}
              className={`rounded-lg border px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                ticket.assigned_to
                  ? 'border-white/10 bg-white/5 text-slate-200'
                  : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
              }`}
            >
              <option value="" className="bg-[#131726] text-amber-400">
                ⚡ Unassigned
              </option>
              <option
                value="AUTO_ASSIGN"
                className="bg-[#131726] font-bold text-emerald-400"
              >
                ✨ Auto-Assign (Lowest Load)
              </option>
              {teamMembers.map((m) => (
                <option
                  key={m.id}
                  value={m.id}
                  className="bg-[#131726] text-slate-200"
                >
                  {m.full_name} ({m.active_tickets_count} active)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* AI Summary Banner (if AI processed or summary available) */}
      {ticket.ai_summary && (
        <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-500/10 via-[#131726] to-violet-500/5 p-4 text-xs">
          <div className="flex items-center gap-2 font-bold text-violet-400">
            <Sparkles className="h-4 w-4" />
            <span>AI Customer Context & Intent Summary</span>
          </div>
          <p className="mt-1.5 leading-relaxed text-slate-300">
            {ticket.ai_summary}
          </p>
        </div>
      )}

      {/* Auto-close warning banner for agents (spec §3.2) */}
      {autoCloseWarning && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs">
          <div className="flex items-center gap-2 font-bold text-amber-400">
            <Clock className="h-4 w-4" />
            <span>Auto-close warning</span>
          </div>
          <p className="mt-1.5 leading-relaxed text-slate-300">
            This ticket is waiting on the customer and has not received a reply
            in over 20 hours. It will auto-close within 4 hours if the customer
            does not respond.
          </p>
        </div>
      )}

      {/* Main Grid: Left (Timeline + Composer), Right (Context 360) */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Left Column (2 cols): Conversation Timeline + Rich Reply Composer */}
        <div className="space-y-5 xl:col-span-2">
          {/* Conversation Timeline Stream */}
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="rounded-2xl border border-white/5 bg-[#131726] p-8 text-center text-slate-500">
                <MessageSquare className="mx-auto mb-2 h-8 w-8 text-slate-600" />
                <p className="text-xs">
                  No messages recorded in this conversation timeline yet.
                </p>
              </div>
            ) : (
              messages.map((msg: any) => {
                const isCustomer = msg.sender_type === 'customer';
                const isInternal = msg.visibility === 'internal';
                const isStaff = msg.sender_type === 'staff';
                const isSystem = msg.sender_type === 'system';

                if (isInternal) {
                  return (
                    <div
                      key={msg.id}
                      className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                          <Lock className="h-3.5 w-3.5" />
                          <span>Staff Internal Note</span>
                          <span className="py-0.2 rounded bg-amber-500/20 px-1 text-[9px] font-semibold text-amber-300">
                            Private (Hidden from Customer)
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {new Date(msg.created_at).toLocaleTimeString(
                            'en-IN',
                            {
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )}
                        </span>
                      </div>
                      <div className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-200">
                        {msg.message}
                      </div>
                      {renderMessageAttachments(msg)}
                      <div className="mt-2 text-[10px] text-slate-500">
                        Logged by{' '}
                        {msg.sender?.full_name ||
                          msg.sender?.email ||
                          'Support Staff'}
                      </div>
                    </div>
                  );
                }

                if (isCustomer) {
                  return (
                    <div
                      key={msg.id}
                      className="rounded-2xl border border-white/5 bg-[#131726] p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold text-white">
                            {ticket.customer?.full_name?.charAt(0) || 'C'}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white">
                              {ticket.customer?.full_name ||
                                ticket.customer?.email ||
                                'Customer'}
                            </span>
                            <span className="py-0.2 ml-2 rounded bg-slate-800 px-1.5 text-[9px] text-slate-400">
                              Customer
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {new Date(msg.created_at).toLocaleDateString(
                            'en-IN',
                            {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )}
                        </span>
                      </div>
                      <div className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-slate-200">
                        {msg.message}
                      </div>
                      {renderMessageAttachments(msg)}
                    </div>
                  );
                }

                // Staff Public Reply
                return (
                  <div
                    key={msg.id}
                    className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between border-b border-emerald-500/15 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-700 text-[10px] font-bold text-white">
                          {msg.sender?.full_name?.charAt(0) || 'R'}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-emerald-400">
                            {msg.sender?.full_name || 'Ruhvi Concierge Support'}
                          </span>
                          <span className="py-0.2 ml-2 rounded bg-emerald-500/20 px-1.5 text-[9px] font-semibold text-emerald-300">
                            Staff Reply
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {new Date(msg.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-slate-200">
                      {msg.message}
                    </div>
                    {renderMessageAttachments(msg)}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply Composer Box */}
          <div className="sticky bottom-4 z-20 mt-4 rounded-2xl border border-white/10 bg-[#131726] p-4 shadow-2xl ring-1 ring-black/50">
            {/* Mode Switch Tabs & Canned Dropdown */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setReplyVisibility('customer')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    replyVisibility === 'customer'
                      ? 'border border-emerald-500/30 bg-emerald-500/20 text-emerald-400'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Public Reply to Customer</span>
                </button>

                <button
                  onClick={() => setReplyVisibility('internal')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    replyVisibility === 'internal'
                      ? 'border border-amber-500/30 bg-amber-500/20 text-amber-300'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>Internal Staff Note (Private)</span>
                </button>
              </div>

              {/* Canned Responses Quick Picker */}
              <div className="relative">
                <button
                  onClick={() => setShowCannedMenu(!showCannedMenu)}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  <Sparkles className="h-3 w-3 text-amber-400" />
                  <span>Canned Responses</span>
                  <ChevronDown className="h-3 w-3" />
                </button>

                {showCannedMenu && (
                  <div className="absolute right-0 z-30 mt-2 w-72 rounded-xl border border-white/10 bg-[#1a1f33] p-2 shadow-2xl">
                    <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Select Template
                    </p>
                    <div className="max-h-60 space-y-1 overflow-y-auto">
                      {cannedResponses.map((cr) => (
                        <button
                          key={cr.id}
                          onClick={() => handleInsertCanned(cr)}
                          className="w-full rounded-lg p-2 text-left transition hover:bg-white/10"
                        >
                          <p className="truncate text-xs font-semibold text-white">
                            {cr.title}
                          </p>
                          <p className="truncate text-[10px] text-slate-400">
                            {cr.category}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Textarea */}
            <div className="mt-3">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={
                  replyVisibility === 'internal'
                    ? 'Write a private note for staff (e.g. tracking courier status, custom artisan instructions)...'
                    : 'Write a public response to the customer...'
                }
                rows={5}
                className="w-full rounded-xl border border-white/10 bg-white/5 p-3.5 text-xs text-slate-200 placeholder-slate-500 focus:border-emerald-500/50 focus:bg-white/[0.08] focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

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

            {/* Textarea Actions Bar */}
            <div className="mt-2 flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40">
                <Paperclip className="h-3.5 w-3.5" />
                <span>
                  {isUploadingAttachment ? 'Uploading...' : 'Attach Files'}
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*,application/pdf"
                  className="hidden"
                  onChange={handleAttachmentUpload}
                  disabled={isUploadingAttachment}
                />
              </label>
            </div>

            {/* Send Actions Bar */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3">
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                {replyVisibility === 'customer' ? (
                  <span>
                    Customer will receive an email update with this response
                  </span>
                ) : (
                  <span className="text-amber-400/80">
                    Visible only to support managers and staff
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {replyVisibility === 'customer' && (
                  <>
                    <button
                      onClick={() => handleSendReply('in_progress')}
                      disabled={sending || !replyText.trim()}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                    >
                      Send & In Progress
                    </button>
                    <button
                      onClick={() => handleSendReply('waiting_for_customer')}
                      disabled={sending || !replyText.trim()}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                    >
                      Send & Mark Waiting
                    </button>
                    <button
                      onClick={() => handleSendReply('resolved')}
                      disabled={sending || !replyText.trim()}
                      className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-500/20 disabled:opacity-40"
                    >
                      Send & Resolve
                    </button>
                  </>
                )}

                <button
                  onClick={() => handleSendReply()}
                  disabled={sending || !replyText.trim()}
                  className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold text-white shadow-md transition disabled:opacity-40 ${
                    replyVisibility === 'internal'
                      ? 'bg-amber-600 shadow-amber-900/30 hover:bg-amber-500'
                      : 'bg-emerald-600 shadow-emerald-900/30 hover:bg-emerald-500'
                  }`}
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>
                    {sending
                      ? 'Sending...'
                      : replyVisibility === 'internal'
                        ? 'Add Internal Note'
                        : 'Send Reply'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Deep Context Panels (Customer 360, Order, Past Tickets) */}
        <div className="space-y-5">
          {/* Customer 360 Card */}
          <div className="rounded-2xl border border-white/5 bg-[#131726] p-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Customer 360
                </h3>
              </div>
              <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                VERIFIED
              </span>
            </div>

            <div className="mt-3.5 space-y-2.5 text-xs">
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-500">
                  Full Name
                </p>
                <p className="font-semibold text-white">
                  {ticket.customer?.full_name || 'Guest User'}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-500">
                  Email Address
                </p>
                <div className="mt-0.5 flex items-center justify-between">
                  <p className="font-mono text-slate-300">
                    {ticket.customer?.email || '—'}
                  </p>
                  {ticket.customer?.email && (
                    <a
                      href={`mailto:${ticket.customer.email}`}
                      className="rounded bg-indigo-600/20 px-2 py-0.5 text-[10px] font-bold text-indigo-400 transition-colors hover:bg-indigo-600/30"
                    >
                      Email Customer
                    </a>
                  )}
                </div>
              </div>

              {ticket.customer?.phone && (
                <div>
                  <p className="text-[10px] font-semibold uppercase text-slate-500">
                    Phone Number
                  </p>
                  <div className="mt-0.5 flex items-center justify-between">
                    <p className="font-mono text-slate-300">
                      {ticket.customer?.phone}
                    </p>
                    <a
                      href={`tel:${ticket.customer.phone}`}
                      className="rounded bg-indigo-600/20 px-2 py-0.5 text-[10px] font-bold text-indigo-400 transition-colors hover:bg-indigo-600/30"
                    >
                      Call Agent
                    </a>
                  </div>
                </div>
              )}

              {/* Wallet & Coins balances */}
              <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-2">
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2 text-center">
                  <p className="text-[9px] font-semibold uppercase text-slate-500">
                    Wallet
                  </p>
                  <p className="text-xs font-bold text-emerald-400">
                    ₹{ticket.customer?.wallet_balance || 0}
                  </p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2 text-center">
                  <p className="text-[9px] font-semibold uppercase text-slate-500">
                    Coins
                  </p>
                  <p className="text-xs font-bold text-amber-400">
                    {ticket.customer?.reward_coins || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Linked Order Card (if order attached) */}
          {ticket.order && (
            <div className="rounded-2xl border border-white/5 bg-[#131726] p-5 shadow-lg">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    Linked Order
                  </h3>
                </div>
                <span className="font-mono text-xs font-bold text-emerald-400">
                  #{ticket.order.order_number}
                </span>
              </div>

              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Order Status:</span>
                  <span className="font-semibold capitalize text-white">
                    {ticket.order.status}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Total Amount:</span>
                  <span className="font-bold text-white">
                    ₹{ticket.order.total?.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Payment Status:</span>
                  <span className="font-medium capitalize text-emerald-400">
                    {ticket.order.payment_status || 'Paid'}
                  </span>
                </div>

                {/* AWB Tracking Code */}
                {ticket.order.awb_code && (
                  <div className="mt-2 rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                    <p className="text-[10px] font-semibold uppercase text-slate-500">
                      Courier & AWB
                    </p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-white">
                        {ticket.order.courier_name || 'Insured Courier'}:{' '}
                        {ticket.order.awb_code}
                      </span>
                      <Link
                        href={`https://ruhvi.in/tracking?awb=${ticket.order.awb_code}`}
                        target="_blank"
                        className="text-[10px] font-bold text-emerald-400 hover:underline"
                      >
                        Track →
                      </Link>
                    </div>
                  </div>
                )}

                {/* Order Items & Products */}
                {orderItems && orderItems.length > 0 && (
                  <div className="mt-3 border-t border-white/5 pt-3">
                    <p className="mb-1.5 text-[10px] font-semibold uppercase text-slate-500">
                      Products in Order
                    </p>
                    <div className="space-y-2">
                      {orderItems.map((item: any) => (
                        <div
                          key={item.id}
                          className="flex items-start justify-between rounded border border-white/5 bg-white/[0.01] p-1.5 text-xs"
                        >
                          <div>
                            <p className="font-semibold text-slate-200">
                              {item.product?.name || 'Product'}
                            </p>
                            <p className="font-mono text-[10px] text-slate-500">
                              SKU: {item.sku} | Qty: {item.quantity}
                            </p>
                          </div>
                          <span className="font-mono text-slate-300">
                            ₹{item.price_at_purchase?.toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Delivery Date & Return / Warranty */}
                <div className="mt-3 space-y-1.5 border-t border-white/5 pt-3 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Delivered On:</span>
                    <span className="text-slate-300">
                      {ticket.order.status === 'delivered' ||
                      ticket.order.status === 'completed'
                        ? new Date(
                            ticket.order.updated_at || ticket.order.created_at
                          ).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'Not delivered yet'}
                    </span>
                  </div>

                  {(ticket.order.status === 'delivered' ||
                    ticket.order.status === 'completed') && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">
                        15-Day Return Window:
                      </span>
                      <span className="font-medium text-rose-400">
                        {(() => {
                          const deliveryDate = new Date(
                            ticket.order.updated_at || ticket.order.created_at
                          );
                          const returnExpiry = new Date(
                            deliveryDate.setDate(deliveryDate.getDate() + 15)
                          );
                          const isExpired = returnExpiry < new Date();
                          return `${returnExpiry.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} (${isExpired ? 'Expired' : 'Active'})`;
                        })()}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-slate-500">Warranty (1-Year):</span>
                    <span className="font-medium text-emerald-400">
                      {(() => {
                        const orderDate = new Date(ticket.order.created_at);
                        const warrantyExpiry = new Date(
                          orderDate.setFullYear(orderDate.getFullYear() + 1)
                        );
                        const isExpired = warrantyExpiry < new Date();
                        return `Expires ${warrantyExpiry.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} (${isExpired ? 'Expired' : 'Active'})`;
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Customer Other Past Tickets */}
          {previousTickets.length > 0 && (
            <div className="rounded-2xl border border-white/5 bg-[#131726] p-5 shadow-lg">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    Previous Inquiries
                  </h3>
                </div>
                <span className="text-[10px] text-slate-500">
                  {previousTickets.length} past
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {previousTickets.map((pt: any) => (
                  <Link
                    key={pt.id}
                    href={`/support/tickets/${pt.id}`}
                    className="block rounded-xl border border-white/5 bg-white/[0.02] p-2.5 transition hover:border-white/10 hover:bg-white/[0.04]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold text-slate-400">
                        {pt.ticket_number}
                      </span>
                      <span className="text-[9px] capitalize text-slate-500">
                        {pt.status}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs font-medium text-slate-200">
                      {pt.title}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Audit History & Assignments Log */}
          {auditLogs.length > 0 && (
            <div className="rounded-2xl border border-white/5 bg-[#131726] p-5 shadow-lg">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <FileText className="h-4 w-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Audit Trail & History
                </h3>
              </div>

              <div className="mt-3 max-h-60 space-y-2.5 overflow-y-auto">
                {auditLogs.map((log: any) => {
                  let detailsStr = '';
                  if (log.action === 'status_changed') {
                    detailsStr = `Status: ${log.old_value?.status || 'new'} → ${log.new_value?.status}`;
                  } else if (log.action === 'priority_changed') {
                    detailsStr = `Priority: ${log.old_value?.priority || 'normal'} → ${log.new_value?.priority}`;
                  } else if (log.action === 'assignment_changed') {
                    detailsStr = log.new_value?.assigned_to
                      ? 'Assigned'
                      : 'Unassigned';
                  }

                  return (
                    <div
                      key={log.id}
                      className="border-b border-white/5 pb-2 text-[11px] text-slate-400 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold capitalize text-slate-300">
                          {log.action.replace(/_/g, ' ')}
                        </span>
                        <span className="font-mono text-[9px] text-slate-500">
                          {new Date(log.created_at).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        Actor:{' '}
                        <span className="text-slate-400">
                          {log.actor?.full_name || 'System'}
                        </span>
                        {detailsStr && (
                          <span className="mt-0.5 block font-semibold text-slate-300">
                            {detailsStr}
                          </span>
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tags / Mentions (spec §4.3) */}
          <div className="rounded-2xl border border-white/5 bg-[#131726] p-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Tags & Mentions
                </h3>
              </div>
              <button
                onClick={() => setShowTagMenu(!showTagMenu)}
                className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                + Tag
              </button>
            </div>

            {showTagMenu && (
              <div className="mt-3 rounded-xl border border-white/10 bg-[#1a1f33] p-2">
                <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Tag a person or team
                </p>
                <input
                  type="text"
                  value={tagQuery}
                  onChange={(e) => setTagQuery(e.target.value)}
                  placeholder="Search team members by name..."
                  className="mb-2 w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <div className="mb-2 max-h-32 space-y-1 overflow-y-auto">
                  {teamMembers
                    .filter(
                      (m) =>
                        !tagQuery ||
                        m.full_name
                          ?.toLowerCase()
                          .includes(tagQuery.toLowerCase()) ||
                        m.email?.toLowerCase().includes(tagQuery.toLowerCase())
                    )
                    .map((m) => (
                      <button
                        key={m.id}
                        onClick={() =>
                          handleAddTag({
                            tag_type: 'person',
                            tagged_staff_id: m.id,
                          })
                        }
                        disabled={addingTag}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-300 transition hover:bg-white/10"
                      >
                        <User className="h-3 w-3 text-slate-500" />
                        {m.full_name} ({m.email})
                      </button>
                    ))}
                </div>
                <div className="flex flex-wrap gap-1.5 border-t border-white/5 pt-2">
                  {['operations', 'marketing', 'orders', 'admin'].map(
                    (team) => (
                      <button
                        key={team}
                        onClick={() =>
                          handleAddTag({
                            tag_type: 'team',
                            tagged_team: team,
                          })
                        }
                        disabled={addingTag}
                        className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-300 transition hover:bg-white/10"
                      >
                        @{team}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            <div className="mt-3 space-y-2">
              {tags.length === 0 && !showTagMenu && (
                <p className="text-xs text-slate-500">
                  No tags yet. Add a team or person tag to loop them in.
                </p>
              )}
              {tags.map((tag: any) => {
                const isOpen = !tag.resolved_at;
                return (
                  <div
                    key={tag.id}
                    className={`flex items-center justify-between rounded-xl border p-2.5 text-xs ${
                      isOpen
                        ? 'border-amber-500/30 bg-amber-500/5'
                        : 'border-white/5 bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {tag.tag_type === 'person' ? (
                        <User className="h-3.5 w-3.5 text-slate-400" />
                      ) : (
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                      )}
                      <div>
                        <p className="font-semibold text-slate-200">
                          {tag.tag_type === 'person'
                            ? tag.tagged_staff?.full_name ||
                              tag.tagged_staff?.email
                            : `@${tag.tagged_team}`}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {tag.tag_type === 'person' ? 'Person' : 'Team'}{' '}
                          {isOpen ? (
                            <span className="text-amber-400">
                              · Awaiting response
                            </span>
                          ) : (
                            <span className="text-emerald-400">· Resolved</span>
                          )}
                        </p>
                      </div>
                    </div>
                    {isOpen && (
                      <button
                        onClick={() => handleResolveTag(tag.id)}
                        className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-400 transition hover:bg-emerald-500/20 hover:text-emerald-400"
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
