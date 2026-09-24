'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import type {
  ChatConversation,
  ChatMessage,
  ChatUserProfile,
  ChatAttachment,
  ChatReaction,
} from '@/types/chat';
import {
  MessageCircle,
  Search,
  Plus,
  Send,
  Paperclip,
  X,
  ChevronLeft,
  Users,
  MoreVertical,
  Check,
  CheckCheck,
  FileText,
  Download,
  Hash,
  AlertCircle,
  Loader2,
  UserPlus,
  LogOut,
  Info,
  ArrowLeft,
  Reply,
  Shield,
  Pin,
  Smile,
  Lock,
} from 'lucide-react';
import Link from 'next/link';
import AutoLinkText from '@/components/chat/AutoLinkText';

// ─── Utility helpers ─────────────────────────────────────────────────────────

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0)
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString('en-IN', { weekday: 'short' });
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function formatDateDivider(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
  });
}

function getInitials(name: string | null, email: string | null) {
  const n = name || email || '?';
  const parts = n.split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return n.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  'bg-emerald-600',
  'bg-violet-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-sky-600',
  'bg-pink-600',
  'bg-teal-600',
  'bg-orange-600',
];

function avatarColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++)
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function sameDay(a: string, b: string) {
  const da = new Date(a),
    db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

function UserAvatar({
  user,
  size = 'md',
}: {
  user: ChatUserProfile | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const szClass =
    size === 'sm'
      ? 'h-7 w-7 text-xs'
      : size === 'lg'
        ? 'h-11 w-11 text-base'
        : 'h-9 w-9 text-sm';
  if (!user)
    return (
      <div
        className={`${szClass} flex flex-shrink-0 items-center justify-center rounded-full bg-slate-700 text-slate-400`}
      >
        <Users className="h-4 w-4" />
      </div>
    );
  return (
    <div
      className={`${szClass} ${avatarColor(user.id)} flex flex-shrink-0 select-none items-center justify-center rounded-full font-bold text-white`}
    >
      {getInitials(user.full_name, user.email)}
    </div>
  );
}

// ─── Attachment preview ───────────────────────────────────────────────────────

function AttachmentPreview({ att }: { att: ChatAttachment }) {
  if (att.resource_type === 'image') {
    return (
      <a href={att.cloudinary_url} target="_blank" rel="noopener noreferrer">
        <div className="group relative mt-1.5 max-w-[240px] cursor-pointer overflow-hidden rounded-xl">
          <img
            src={att.cloudinary_url}
            alt={att.file_name}
            className="max-h-52 w-full rounded-xl object-cover transition-opacity group-hover:opacity-90"
            loading="lazy"
          />
          <div className="absolute inset-0 rounded-xl bg-black/0 transition-colors group-hover:bg-black/10" />
          <div className="absolute bottom-0 left-0 right-0 rounded-b-xl bg-gradient-to-t from-black/60 px-2 py-1.5">
            <p className="truncate text-[10px] text-white/80">
              {att.file_name}
            </p>
          </div>
        </div>
      </a>
    );
  }
  return (
    <a
      href={att.cloudinary_url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1.5 flex max-w-[240px] items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 transition-colors hover:bg-white/10"
    >
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-violet-500/20 text-violet-400">
        <FileText className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-white">
          {att.file_name}
        </p>
        <p className="text-[10px] text-slate-400">
          {att.file_size ? `${(att.file_size / 1024).toFixed(0)} KB` : 'File'}
        </p>
      </div>
      <Download className="h-4 w-4 flex-shrink-0 text-slate-400" />
    </a>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  isOwn,
  showSenderInfo,
  isAdmin,
  currentUserId,
  onReply,
  onReact,
  onPin,
}: {
  msg: ChatMessage;
  isOwn: boolean;
  showSenderInfo: boolean;
  isAdmin: boolean;
  currentUserId: string;
  onReply: (msg: ChatMessage) => void;
  onReact: (msgId: string, emoji: string) => void;
  onPin: (msgId: string, action: 'pin' | 'unpin') => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  if (msg.message_type === 'system') {
    return (
      <div className="my-2 flex justify-center">
        <span className="rounded-full border border-white/5 bg-white/5 px-3 py-1 text-[11px] italic text-slate-400">
          {msg.text_content}
        </span>
      </div>
    );
  }

  const isDeleted = !!msg.deleted_at;

  return (
    <div
      className={`group flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar — other user only */}
      {!isOwn && (
        <div className="mb-1 flex-shrink-0">
          {showSenderInfo ? (
            <UserAvatar user={msg.sender || null} size="sm" />
          ) : (
            <div className="h-7 w-7" />
          )}
        </div>
      )}

      <div
        className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[72%] sm:max-w-[58%]`}
      >
        {/* Sender name (group, other person only) */}
        {!isOwn && showSenderInfo && msg.sender && (
          <p className="mb-0.5 ml-1 text-[10px] font-semibold text-emerald-400">
            {msg.sender.department
              ? `${msg.sender.full_name || msg.sender.email} (${msg.sender.department})`
              : msg.sender.full_name || msg.sender.email}
          </p>
        )}

        {/* Reply preview */}
        {msg.reply_to && (
          <div
            className={`mb-1 w-full max-w-full rounded-lg border-l-2 border-emerald-500/70 bg-white/5 px-2.5 py-1.5 text-xs text-slate-400`}
          >
            <p className="mb-0.5 text-[10px] font-semibold text-emerald-400">
              {msg.reply_to.sender?.department
                ? `${msg.reply_to.sender?.full_name || msg.reply_to.sender?.email || 'Someone'} (${msg.reply_to.sender.department})`
                : msg.reply_to.sender?.full_name ||
                  msg.reply_to.sender?.email ||
                  'Someone'}
            </p>
            <p className="truncate">
              {msg.reply_to.text_content || '[attachment]'}
            </p>
          </div>
        )}

        {/* Pinned indicator */}
        {msg.pinned_at && (
          <div
            className={`mb-1 flex items-center gap-1 text-[10px] font-semibold ${isOwn ? 'text-emerald-300' : 'text-slate-400'}`}
          >
            <Pin className="h-3 w-3" /> Pinned
          </div>
        )}

        {/* Bubble */}
        <div
          className={`relative rounded-2xl px-3.5 py-2.5 shadow-sm transition-shadow ${
            isOwn
              ? 'rounded-br-sm bg-emerald-600 text-white'
              : 'rounded-bl-sm border border-white/[0.06] bg-[#1e2235] text-slate-200'
          }`}
        >
          {isDeleted ? (
            <p className="text-xs italic text-slate-400/70">Message deleted</p>
          ) : (
            <>
              {msg.text_content && (
                <AutoLinkText
                  text={msg.text_content}
                  className="block whitespace-pre-wrap break-words text-sm leading-relaxed"
                />
              )}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="space-y-1.5">
                  {msg.attachments.map((att) => (
                    <AttachmentPreview key={att.id} att={att} />
                  ))}
                </div>
              )}
              {msg.entity_refs && msg.entity_refs.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {msg.entity_refs.map((ref) => {
                    let href = '#';
                    if (ref.entity_type === 'order')
                      href = `/admin/orders?search=${encodeURIComponent(ref.entity_id)}`;
                    else if (ref.entity_type === 'support_ticket')
                      href = `/support/tickets/${ref.entity_id}`;
                    else if (ref.entity_type === 'product')
                      href = `/admin/products?search=${encodeURIComponent(ref.entity_id)}`;

                    return (
                      <a
                        key={ref.id}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/10 px-2 py-0.5 font-mono text-[11px] font-medium text-emerald-300 shadow-sm transition-colors hover:bg-white/20"
                        title={`View ${ref.entity_type}: ${ref.entity_id}`}
                      >
                        <Hash className="h-3 w-3" />
                        {ref.display_label || ref.entity_id}
                      </a>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Reactions */}
        {!isDeleted && msg.reactions && msg.reactions.length > 0 && (
          <div
            className={`mt-1 flex flex-wrap gap-1 ${isOwn ? 'justify-end' : 'justify-start'} w-full`}
          >
            {Object.entries(
              msg.reactions.reduce(
                (acc, r) => {
                  acc[r.emoji] = acc[r.emoji] || [];
                  acc[r.emoji].push(r);
                  return acc;
                },
                {} as Record<string, ChatReaction[]>
              )
            ).map(([emoji, reacts]) => {
              const hasReacted = reacts.some(
                (r) => r.user_id === currentUserId
              );
              return (
                <button
                  key={emoji}
                  onClick={() => onReact(msg.id, emoji)}
                  className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                    hasReacted
                      ? 'border border-emerald-500/30 bg-emerald-500/20 text-emerald-300'
                      : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                  title={reacts
                    .map((r) => r.user?.full_name || r.user?.email || 'Someone')
                    .join(', ')}
                >
                  <span>{emoji}</span>
                  <span className="opacity-80">{reacts.length}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Timestamp */}
        <p className="mt-0.5 select-none px-1 text-[10px] text-slate-500">
          {formatTime(msg.created_at)}
          {isOwn && (
            <CheckCheck className="ml-1 inline h-3 w-3 text-emerald-400" />
          )}
        </p>
      </div>

      {/* Action buttons */}
      {!isDeleted && showActions && (
        <div
          className={`mb-6 flex flex-shrink-0 items-center gap-1 opacity-0 transition-all group-hover:opacity-100 ${isOwn ? 'mr-1' : 'ml-1'}`}
        >
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400 transition-all hover:bg-white/10 hover:text-emerald-400"
              title="React"
            >
              <Smile className="h-3.5 w-3.5" />
            </button>
            {showEmojiPicker && (
              <div className="absolute bottom-full left-1/2 z-50 mb-1 flex -translate-x-1/2 gap-1 rounded-full border border-white/10 bg-[#1a1e2e] p-1 shadow-lg">
                {['👍', '❤️', '😂', '😮', '😢', '👏'].map((em) => (
                  <button
                    key={em}
                    onClick={() => {
                      onReact(msg.id, em);
                      setShowEmojiPicker(false);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-sm transition-colors hover:bg-white/10"
                  >
                    {em}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => onReply(msg)}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400 transition-all hover:bg-white/10 hover:text-white"
            title="Reply"
          >
            <Reply className="h-3.5 w-3.5" />
          </button>
          {(isAdmin || msg.pinned_at) && (
            <button
              onClick={() => onPin(msg.id, msg.pinned_at ? 'unpin' : 'pin')}
              className={`flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-all ${msg.pinned_at ? 'text-emerald-400 hover:text-emerald-300' : 'text-slate-400 hover:text-white'} hover:bg-white/10`}
              title={msg.pinned_at ? 'Unpin' : 'Pin'}
            >
              <Pin className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Department & Role Mentions ───────────────────────────────────────────
const DEPARTMENTS: ChatUserProfile[] = [
  {
    id: 'dept_all',
    full_name: 'All Staff (@all)',
    email: 'all@ruhvi.in',
    role: 'all',
  },
  {
    id: 'dept_ops',
    full_name: 'Operations Team (@operations)',
    email: 'operations@ruhvi.in',
    role: 'operations',
  },
  {
    id: 'dept_tech',
    full_name: 'Tech & IT Team (@tech)',
    email: 'tech@ruhvi.in',
    role: 'tech',
  },
  {
    id: 'dept_support',
    full_name: 'Customer Support (@support)',
    email: 'support@ruhvi.in',
    role: 'support',
  },
  {
    id: 'dept_marketing',
    full_name: 'Marketing Team (@marketing)',
    email: 'marketing@ruhvi.in',
    role: 'marketing',
  },
  {
    id: 'dept_management',
    full_name: 'Management (@management)',
    email: 'management@ruhvi.in',
    role: 'admin',
  },
];

function MentionDropdown({
  query,
  staffList,
  onSelect,
}: {
  query: string;
  staffList: ChatUserProfile[];
  onSelect: (user: ChatUserProfile) => void;
}) {
  const combinedList = [...DEPARTMENTS, ...staffList];
  const filtered = combinedList
    .filter(
      (u) =>
        (u.full_name || '').toLowerCase().includes(query.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(query.toLowerCase()) ||
        (u.role || '').toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 8);

  if (filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 z-50 mb-1 overflow-hidden rounded-xl border border-white/10 bg-[#1a1e2e] shadow-2xl">
      {filtered.map((u, i) => (
        <button
          key={u.id}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(u);
          }}
          className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/5"
        >
          <UserAvatar user={u} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {u.full_name || u.email}
            </p>
            {u.full_name && (
              <p className="truncate text-[10px] text-slate-400">{u.email}</p>
            )}
          </div>
          <span className="flex-shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px] capitalize text-slate-400">
            {u.role}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Entity Reference picker ──────────────────────────────────────────────────

function EntityRefPicker({
  onAdd,
  onClose,
}: {
  onAdd: (ref: {
    entity_type: string;
    entity_id: string;
    display_label: string;
  }) => void;
  onClose: () => void;
}) {
  const [entityType, setEntityType] = useState<
    'order' | 'support_ticket' | 'product'
  >('order');
  const [entityId, setEntityId] = useState('');

  const labelMap: Record<string, string> = {
    order: 'Order ID (e.g. RUH12345)',
    support_ticket: 'Ticket ID',
    product: 'Product Slug / ID',
  };
  const prefixMap: Record<string, string> = {
    order: 'Order',
    support_ticket: 'Ticket',
    product: 'Product',
  };

  return (
    <div className="absolute bottom-full left-0 z-50 mb-1 w-72 rounded-xl border border-white/10 bg-[#1a1e2e] p-4 shadow-2xl">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold text-white">Add Reference</p>
        <button onClick={onClose}>
          <X className="h-4 w-4 text-slate-400" />
        </button>
      </div>
      <div className="mb-3 flex gap-1.5">
        {(['order', 'support_ticket', 'product'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setEntityType(t)}
            className={`flex-1 rounded-lg py-1.5 text-[10px] font-medium transition-colors ${entityType === t ? 'bg-emerald-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
          >
            {t === 'support_ticket'
              ? 'Ticket'
              : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <input
        autoFocus
        value={entityId}
        onChange={(e) => setEntityId(e.target.value)}
        placeholder={labelMap[entityType]}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && entityId.trim()) {
            onAdd({
              entity_type: entityType,
              entity_id: entityId.trim(),
              display_label: `${prefixMap[entityType]} ${entityId.trim()}`,
            });
            setEntityId('');
            onClose();
          }
        }}
      />
      <button
        disabled={!entityId.trim()}
        onClick={() => {
          if (entityId.trim()) {
            onAdd({
              entity_type: entityType,
              entity_id: entityId.trim(),
              display_label: `${prefixMap[entityType]} ${entityId.trim()}`,
            });
            setEntityId('');
            onClose();
          }
        }}
        className="mt-2.5 w-full rounded-lg bg-emerald-600 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
      >
        Add Reference
      </button>
    </div>
  );
}

// ─── Conversation list item ───────────────────────────────────────────────────

function ConversationItem({
  conv,
  isActive,
  currentUserId,
  onClick,
}: {
  conv: ChatConversation;
  isActive: boolean;
  currentUserId: string;
  onClick: () => void;
}) {
  const displayName =
    conv.type === 'group'
      ? conv.group_name || 'Group Chat'
      : conv.other_user?.department
        ? `${conv.other_user?.full_name || conv.other_user?.email || 'Staff Member'} (${conv.other_user.department})`
        : conv.other_user?.full_name ||
          conv.other_user?.email ||
          'Staff Member';

  const lastText = conv.last_message?.deleted_at
    ? 'Message deleted'
    : conv.last_message?.text_content
      ? conv.last_message.text_content.slice(0, 45)
      : conv.last_message?.message_type === 'attachment'
        ? '📎 Attachment'
        : conv.last_message?.message_type === 'system'
          ? conv.last_message.text_content?.slice(0, 45) || ''
          : '';

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all ${isActive ? 'bg-emerald-500/10 ring-1 ring-emerald-500/20' : 'hover:bg-white/5'}`}
    >
      <div className="relative flex-shrink-0">
        {conv.type === 'group' ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600">
            <Users className="h-5 w-5 text-white" />
          </div>
        ) : (
          <UserAvatar user={conv.other_user || null} size="md" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-white">
            {displayName}
          </p>
          {conv.last_message && (
            <p className="flex-shrink-0 text-[10px] text-slate-500">
              {formatTime(conv.last_message.created_at)}
            </p>
          )}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className="truncate text-[11px] text-slate-400">
            {lastText || 'No messages yet'}
          </p>
          {(conv.unread_count ?? 0) > 0 && (
            <span className="flex h-5 min-w-[20px] flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
              {(conv.unread_count ?? 0) > 99 ? '99+' : conv.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── New Conversation Modal ───────────────────────────────────────────────────

function NewConversationModal({
  staffList,
  onClose,
  onStartDirect,
  onCreateGroup,
}: {
  staffList: ChatUserProfile[];
  onClose: () => void;
  onStartDirect: (userId: string) => void;
  onCreateGroup: (memberIds: string[], name: string, topic?: string) => void;
}) {
  const [mode, setMode] = useState<'select' | 'group'>('select');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupTopic, setGroupTopic] = useState('');

  const filtered = staffList.filter(
    (u) =>
      !search ||
      (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#131726] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <h3 className="text-sm font-bold text-white">
            {mode === 'group' ? 'Create Group Chat' : 'New Conversation'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 transition-colors hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {mode === 'select' ? (
            <>
              <input
                autoFocus
                type="text"
                placeholder="Search staff by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <div className="max-h-60 space-y-0.5 overflow-y-auto">
                {filtered.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      if (selected.length === 0) {
                        onStartDirect(u.id);
                      } else {
                        toggle(u.id);
                      }
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${selected.includes(u.id) ? 'bg-emerald-500/10 ring-1 ring-emerald-500/20' : 'hover:bg-white/5'}`}
                  >
                    <UserAvatar user={u} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {u.department
                          ? `${u.full_name || u.email} (${u.department})`
                          : u.full_name || u.email}
                      </p>
                      {u.full_name && (
                        <p className="truncate text-[11px] text-slate-400">
                          {u.email}
                        </p>
                      )}
                    </div>
                    {selected.includes(u.id) && (
                      <Check className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                    )}
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="py-6 text-center text-sm text-slate-500">
                    No staff found
                  </p>
                )}
              </div>
              {selected.length > 0 && (
                <button
                  onClick={() => setMode('group')}
                  className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
                >
                  Create Group ({selected.length} selected) →
                </button>
              )}
              <p className="text-center text-[11px] text-slate-500">
                Tap one person for a direct chat · Select multiple to create a
                group
              </p>
            </>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {selected.map((id) => {
                  const u = staffList.find((s) => s.id === id);
                  return (
                    <span
                      key={id}
                      className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-1 text-xs text-emerald-300"
                    >
                      {u?.full_name || u?.email}
                      <button onClick={() => toggle(id)}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
              <input
                autoFocus
                type="text"
                placeholder="Group name *"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <input
                type="text"
                placeholder="Topic / description (optional)"
                value={groupTopic}
                onChange={(e) => setGroupTopic(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setMode('select')}
                  className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm text-slate-400 transition-colors hover:text-white"
                >
                  ← Back
                </button>
                <button
                  disabled={!groupName.trim() || selected.length === 0}
                  onClick={() => {
                    if (groupName.trim())
                      onCreateGroup(
                        selected,
                        groupName.trim(),
                        groupTopic.trim() || undefined
                      );
                  }}
                  className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Create Group
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Group Info Panel ─────────────────────────────────────────────────────────

function GroupInfoPanel({
  conv,
  staffList,
  currentUserId,
  onClose,
  onAddMembers,
  onLeave,
}: {
  conv: ChatConversation;
  staffList: ChatUserProfile[];
  currentUserId: string;
  onClose: () => void;
  onAddMembers: (userIds: string[]) => void;
  onLeave: () => void;
}) {
  const [addMode, setAddMode] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const memberIds = new Set((conv.members || []).map((m) => m.user_id));
  const nonMembers = staffList.filter(
    (u) => !memberIds.has(u.id) && u.id !== currentUserId
  );
  const filteredNon = nonMembers.filter(
    (u) =>
      !search ||
      (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex w-72 flex-col border-l border-white/5 bg-[#131726]">
      <div className="flex h-14 items-center justify-between border-b border-white/5 px-4">
        <h3 className="text-sm font-bold text-white">Group Info</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        {/* Group avatar + name */}
        <div className="flex flex-col items-center gap-2 py-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-600">
            <Users className="h-8 w-8 text-white" />
          </div>
          <p className="text-base font-bold text-white">{conv.group_name}</p>
          {conv.group_topic && (
            <p className="text-center text-xs text-slate-400">
              {conv.group_topic}
            </p>
          )}
          <p className="text-[11px] text-slate-500">
            {(conv.members || []).length} members
          </p>
        </div>

        {/* Members list */}
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Members
          </p>
          <div className="space-y-1">
            {(conv.members || [])
              .filter((m) => !m.left_at)
              .map((m) => {
                const u = m.user as ChatUserProfile | undefined;
                return (
                  <div
                    key={m.user_id}
                    className="flex items-center gap-2.5 rounded-lg px-2 py-2"
                  >
                    <UserAvatar user={u || null} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-white">
                        {u?.department
                          ? `${u?.full_name || u?.email || 'Staff'} (${u.department})`
                          : u?.full_name || u?.email || 'Staff'}
                      </p>
                      <p className="text-[10px] capitalize text-slate-400">
                        {u?.role}
                        {m.is_admin ? ' · admin' : ''}
                      </p>
                    </div>
                    {m.user_id === currentUserId && (
                      <span className="text-[10px] text-emerald-400">You</span>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Add members */}
        {!addMode ? (
          <button
            onClick={() => setAddMode(true)}
            className="flex w-full items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <UserPlus className="h-4 w-4" />
            Add Members
          </button>
        ) : (
          <div className="space-y-2">
            <input
              autoFocus
              type="text"
              placeholder="Search staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <div className="max-h-40 space-y-0.5 overflow-y-auto">
              {filteredNon.map((u) => (
                <button
                  key={u.id}
                  onClick={() =>
                    setSelected((prev) =>
                      prev.includes(u.id)
                        ? prev.filter((x) => x !== u.id)
                        : [...prev, u.id]
                    )
                  }
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${selected.includes(u.id) ? 'bg-emerald-500/10' : 'hover:bg-white/5'}`}
                >
                  <UserAvatar user={u} size="sm" />
                  <span className="flex-1 truncate text-xs text-white">
                    {u.full_name || u.email}
                  </span>
                  {selected.includes(u.id) && (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  )}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setAddMode(false);
                  setSelected([]);
                }}
                className="flex-1 rounded-lg border border-white/10 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                disabled={selected.length === 0}
                onClick={() => {
                  onAddMembers(selected);
                  setAddMode(false);
                  setSelected([]);
                }}
                className="flex-1 rounded-lg bg-emerald-600 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                Add {selected.length > 0 ? `(${selected.length})` : ''}
              </button>
            </div>
          </div>
        )}

        {/* Leave group */}
        <button
          onClick={onLeave}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-400 transition-colors hover:bg-rose-500/10"
        >
          <LogOut className="h-4 w-4" />
          Leave Group
        </button>
      </div>
    </div>
  );
}

// ─── Main Chat Page ───────────────────────────────────────────────────────────

export default function InternalChatPage() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [text, setText] = useState('');
  const [staffList, setStaffList] = useState<ChatUserProfile[]>([]);
  const [showNewConv, setShowNewConv] = useState(false);
  const [searchConv, setSearchConv] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<any[]>([]);
  const [pendingEntityRefs, setPendingEntityRefs] = useState<any[]>([]);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [error, setError] = useState<string | null>(null);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showEntityPicker, setShowEntityPicker] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);

  // In-Chat Search State (WhatsApp style)
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [inChatSearchQuery, setInChatSearchQuery] = useState('');

  // Global message search state for sidebar
  const [sidebarMatchedMessages, setSidebarMatchedMessages] = useState<any[]>(
    []
  );
  const [searchingSidebarMessages, setSearchingSidebarMessages] =
    useState(false);

  const handleSidebarSearch = async (val: string) => {
    setSearchConv(val);
    if (!val.trim() || val.trim().length < 2) {
      setSidebarMatchedMessages([]);
      return;
    }
    setSearchingSidebarMessages(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(
          `
          id,
          conversation_id,
          text_content,
          created_at,
          sender:sender_id (
            id,
            full_name,
            email
          ),
          conversation:conversation_id (
            id,
            type,
            group_name
          )
        `
        )
        .ilike('text_content', `%${val.trim()}%`)
        .order('created_at', { ascending: false })
        .limit(15);

      if (!error && data) {
        setSidebarMatchedMessages(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearchingSidebarMessages(false);
    }
  };

  // @mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [pendingMentions, setPendingMentions] = useState<string[]>([]); // user_ids

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const activeConv = conversations.find((c) => c.id === activeConvId) || null;

  // ── Fetch conversations ──
  const fetchConversations = useCallback(async () => {
    setLoadingConvs(true);
    try {
      const res = await fetch('/api/internal-chat/conversations');
      if (!res.ok) throw new Error('Failed to load conversations');
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  const fetchMessages = useCallback(async (convId: string) => {
    setLoadingMsgs(true);
    try {
      const res = await fetch(
        `/api/internal-chat/conversations/${convId}/messages?limit=60`
      );
      if (!res.ok) throw new Error('Failed to load messages');
      const data = await res.json();
      setMessages((data.messages || []).reverse());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  const fetchStaff = useCallback(async () => {
    const res = await fetch('/api/internal-chat/staff');
    if (res.ok) {
      const data = await res.json();
      setStaffList(data.staff || []);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    fetchStaff();
  }, [fetchConversations, fetchStaff]);

  // ── Mark read ──
  const markRead = useCallback(async (convId: string) => {
    try {
      await fetch(`/api/internal-chat/conversations/${convId}/read`, {
        method: 'POST',
      });
      // Update local unread count
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c))
      );
    } catch {
      /* silent */
    }
  }, []);

  // ── Select conversation ──
  const selectConversation = useCallback(
    (convId: string) => {
      setActiveConvId(convId);
      setMessages([]);
      setReplyTo(null);
      fetchMessages(convId);
      markRead(convId);
      setMobileView('chat');
      setShowGroupInfo(false);

      if (channelRef.current) supabase.removeChannel(channelRef.current);

      const channel = supabase
        .channel(`chat_conv_${convId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `conversation_id=eq.${convId}`,
          },
          async (payload: { new: Record<string, unknown> }) => {
            const newMsg = payload.new as unknown as ChatMessage;
            const { data: sender } = await supabase
              .from('users')
              .select('id, full_name, email, role')
              .eq('id', newMsg.sender_id as string)
              .maybeSingle();
            setMessages((prev) => [
              ...prev,
              {
                ...newMsg,
                sender: sender || undefined,
                attachments: [],
                mentions: [],
                entity_refs: [],
                reactions: [],
              },
            ]);
            fetchConversations();
            // Auto-mark read if this conv is active
            if (newMsg.sender_id !== user?.uid) markRead(convId);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'chat_messages',
            filter: `conversation_id=eq.${convId}`,
          },
          () => fetchMessages(convId)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'chat_message_reactions' },
          () => fetchMessages(convId)
        )
        .subscribe();

      channelRef.current = channel;
    },
    [supabase, fetchMessages, fetchConversations, markRead, user]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── @mention detection ──
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    // Detect @mention: find the last @ that isn't followed by a space yet
    const match = val.match(/@([\w.]*)$/);
    setMentionQuery(match ? match[1] : null);
    // Auto-resize
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 130) + 'px';
  };

  const insertMention = (u: ChatUserProfile) => {
    const name =
      u.full_name?.replace(/\s+/g, '') || u.email?.split('@')[0] || 'user';
    const newText = text.replace(/@[\w.]*$/, `@${name} `);
    setText(newText);
    setPendingMentions((prev) =>
      prev.includes(u.id) ? prev : [...prev, u.id]
    );
    setMentionQuery(null);
    textareaRef.current?.focus();
  };

  // ── Send message ──
  const sendMessage = useCallback(async () => {
    if (!activeConvId) return;
    const trimmed = text.trim();
    if (!trimmed && pendingAttachments.length === 0) return;
    setSendingMsg(true);
    try {
      const payload: any = {
        message_type: pendingAttachments.length > 0 ? 'attachment' : 'text',
        text_content: trimmed || undefined,
        reply_to_id: replyTo?.id || undefined,
        attachments:
          pendingAttachments.length > 0 ? pendingAttachments : undefined,
        mentions: pendingMentions.length > 0 ? pendingMentions : undefined,
        entity_refs:
          pendingEntityRefs.length > 0 ? pendingEntityRefs : undefined,
      };
      const res = await fetch(
        `/api/internal-chat/conversations/${activeConvId}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Send failed');
      }
      setText('');
      setPendingAttachments([]);
      setPendingMentions([]);
      setPendingEntityRefs([]);
      setReplyTo(null);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    } catch (e: any) {
      setError(e.message);
    }
  }, [
    activeConvId,
    text,
    pendingAttachments,
    pendingMentions,
    pendingEntityRefs,
    replyTo,
  ]);

  // ── Reactions & Pins ──
  const handleReact = useCallback(
    async (msgId: string, emoji: string) => {
      if (!activeConvId) return;
      try {
        const res = await fetch(
          `/api/internal-chat/conversations/${activeConvId}/messages/${msgId}/react`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emoji }),
          }
        );
        if (res.ok) fetchMessages(activeConvId);
      } catch (e) {
        console.error(e);
      }
    },
    [activeConvId, fetchMessages]
  );

  const handlePin = useCallback(
    async (msgId: string, action: 'pin' | 'unpin') => {
      if (!activeConvId) return;
      try {
        const res = await fetch(
          `/api/internal-chat/conversations/${activeConvId}/messages/${msgId}/pin`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action }),
          }
        );
        if (!res.ok) {
          const err = await res.json();
          setError(err.error || 'Failed to pin');
        } else {
          fetchMessages(activeConvId);
        }
      } catch (e) {
        console.error(e);
      }
    },
    [activeConvId, fetchMessages]
  );

  // ── File upload ──
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      setUploadingFile(true);
      try {
        for (const file of files) {
          if (file.size > 20 * 1024 * 1024) {
            setError(`${file.name} exceeds 20 MB limit`);
            continue;
          }
          const fd = new FormData();
          fd.append('file', file);
          const res = await fetch('/api/internal-chat/upload', {
            method: 'POST',
            body: fd,
          });
          if (!res.ok) {
            const err = await res.json();
            setError(err.error || 'Upload failed');
            continue;
          }
          const data = await res.json();
          setPendingAttachments((prev) => [...prev, data]);
        }
      } finally {
        setUploadingFile(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    []
  );

  // ── Direct chat ──
  const startDirectChat = useCallback(
    async (targetUserId: string) => {
      setShowNewConv(false);
      const res = await fetch('/api/internal-chat/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: targetUserId }),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchConversations();
        selectConversation(data.conversation_id);
      }
    },
    [fetchConversations, selectConversation]
  );

  // ── Create group ──
  const createGroup = useCallback(
    async (memberIds: string[], name: string, topic?: string) => {
      setShowNewConv(false);
      const res = await fetch('/api/internal-chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_name: name,
          group_topic: topic,
          member_ids: memberIds,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchConversations();
        selectConversation(data.conversation.id);
      }
    },
    [fetchConversations, selectConversation]
  );

  // ── Add members to group ──
  const addMembersToGroup = useCallback(
    async (userIds: string[]) => {
      if (!activeConvId) return;
      await fetch(`/api/internal-chat/conversations/${activeConvId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_ids: userIds }),
      });
      await fetchConversations();
    },
    [activeConvId, fetchConversations]
  );

  // ── Leave group ──
  const leaveGroup = useCallback(async () => {
    if (!activeConvId || !user?.uid) return;
    await fetch(`/api/internal-chat/conversations/${activeConvId}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.uid }),
    });
    setActiveConvId(null);
    setShowGroupInfo(false);
    await fetchConversations();
  }, [activeConvId, user, fetchConversations]);

  // ── Key handler ──
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      setMentionQuery(null);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && mentionQuery === null) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Filtered conversations ──
  const filteredConvs = useMemo(() => {
    if (!searchConv) return conversations;
    const q = searchConv.toLowerCase();
    return conversations.filter((c) => {
      const name =
        c.type === 'group'
          ? (c.group_name || '').toLowerCase()
          : (
              c.other_user?.full_name ||
              c.other_user?.email ||
              ''
            ).toLowerCase();
      return name.includes(q);
    });
  }, [conversations, searchConv]);

  const totalUnread = useMemo(
    () => conversations.reduce((s, c) => s + (c.unread_count || 0), 0),
    [conversations]
  );

  const convTitle =
    activeConv?.type === 'group'
      ? activeConv.group_name || 'Group Chat'
      : activeConv?.other_user?.department
        ? `${activeConv.other_user?.full_name || activeConv.other_user?.email || 'Chat'} (${activeConv.other_user.department})`
        : activeConv?.other_user?.full_name ||
          activeConv?.other_user?.email ||
          'Chat';

  const convSubtitle =
    activeConv?.type === 'group'
      ? `${(activeConv.members || []).filter((m) => !m.left_at).length} members`
      : activeConv?.other_user?.role
        ? `${activeConv.other_user.role}`
        : '';

  const isAdmin =
    user?.role === 'super_admin' ||
    (activeConv?.members?.find((m) => m.user_id === user?.uid)?.is_admin ??
      false);

  const displayedMessages = useMemo(() => {
    if (!inChatSearchQuery.trim()) return messages;
    const q = inChatSearchQuery.trim().toLowerCase();
    return messages.filter((m) =>
      (m.text_content || '').toLowerCase().includes(q)
    );
  }, [messages, inChatSearchQuery]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden rounded-xl border border-white/5 bg-[#0d0f1a]">
      {/* ── Left: Conversation list ── */}
      <div
        className={`flex flex-col border-r border-white/5 bg-[#131726] ${mobileView === 'chat' ? 'hidden lg:flex' : 'flex'} w-full flex-shrink-0 lg:w-[300px]`}
      >
        <div className="flex h-14 items-center justify-between border-b border-white/5 px-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Staff Chat</h2>
            {totalUnread > 0 && (
              <span className="flex h-5 items-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white">
                {totalUnread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {user?.role === 'super_admin' && (
              <Link
                href="/admin/chat/manage"
                className="flex h-8 items-center justify-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2 text-[10px] font-bold uppercase tracking-wider text-violet-300 transition-colors hover:bg-violet-500/20"
                title="Manage All Chats"
              >
                <Shield className="h-3.5 w-3.5" />
                All
              </Link>
            )}
            <button
              onClick={() => setShowNewConv(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white transition-colors hover:bg-emerald-500"
              title="New conversation"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="border-b border-white/5 px-3 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search chats, messages, broadcasts..."
              value={searchConv}
              onChange={(e) => handleSidebarSearch(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-8 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            {searchConv && (
              <button
                onClick={() => handleSidebarSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
          {loadingConvs ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <MessageCircle className="h-10 w-10 text-slate-600" />
              <p className="text-sm text-slate-500">No conversations yet</p>
              <button
                onClick={() => setShowNewConv(true)}
                className="rounded-lg bg-emerald-600/20 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-600/30"
              >
                Start a conversation
              </button>
            </div>
          ) : (
            filteredConvs.map((conv) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                isActive={conv.id === activeConvId}
                currentUserId={user?.uid || ''}
                onClick={() => selectConversation(conv.id)}
              />
            ))
          )}

          {searchConv.trim().length >= 2 && (
            <div className="mt-2 rounded-xl border-t border-white/5 bg-white/[0.02] p-3">
              <div className="mb-2 flex items-center gap-1.5">
                <Search className="h-3 w-3 text-emerald-400" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Messages Matching "{searchConv}" (
                  {sidebarMatchedMessages.length})
                </p>
                {searchingSidebarMessages && (
                  <Loader2 className="ml-auto h-3 w-3 animate-spin text-emerald-400" />
                )}
              </div>
              {sidebarMatchedMessages.length === 0 &&
              !searchingSidebarMessages ? (
                <p className="text-xs italic text-slate-500">
                  No message text found
                </p>
              ) : (
                <div className="max-h-48 space-y-1.5 overflow-y-auto">
                  {sidebarMatchedMessages.map((m) => {
                    const isBcast = m.conversation?.type === 'broadcast';
                    const title = isBcast
                      ? '📢 Official Staff Broadcast'
                      : m.conversation?.group_name ||
                        m.sender?.full_name ||
                        m.sender?.email ||
                        'Chat';
                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          selectConversation(m.conversation_id);
                          setShowInChatSearch(true);
                          setInChatSearchQuery(searchConv);
                        }}
                        className="w-full rounded-lg bg-white/5 p-2 text-left transition-colors hover:bg-white/10"
                      >
                        <p className="truncate text-[11px] font-semibold text-white">
                          {title}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-slate-400">
                          {m.text_content}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Center: Chat area ── */}
      <div
        className={`flex flex-1 flex-col overflow-hidden ${mobileView === 'list' ? 'hidden lg:flex' : 'flex'}`}
      >
        {!activeConvId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
              <MessageCircle className="h-10 w-10 text-emerald-400" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-white">Ruhvi Staff Chat</h3>
              <p className="mt-1 text-sm text-slate-400">
                Select a conversation or start a new one
              </p>
            </div>
            <button
              onClick={() => setShowNewConv(true)}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
            >
              <Plus className="h-4 w-4" /> New Conversation
            </button>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-white/5 bg-[#131726] px-4">
              <button
                onClick={() => setMobileView('list')}
                className="text-slate-400 hover:text-white lg:hidden"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              {activeConv?.type === 'group' ? (
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-violet-600">
                  <Users className="h-5 w-5 text-white" />
                </div>
              ) : (
                <UserAvatar user={activeConv?.other_user || null} />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">
                  {convTitle}
                </p>
                <p className="truncate text-[11px] capitalize text-slate-400">
                  {convSubtitle}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setShowInChatSearch((v) => !v);
                    if (showInChatSearch) setInChatSearchQuery('');
                  }}
                  className={`rounded-lg p-2 transition-colors ${showInChatSearch ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                  title="Search in this conversation"
                >
                  <Search className="h-4 w-4" />
                </button>
                {activeConv?.type === 'group' && (
                  <button
                    onClick={() => setShowGroupInfo((v) => !v)}
                    className={`rounded-lg p-2 transition-colors ${showGroupInfo ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                    title="Group info"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* In-Chat Search Bar */}
            {showInChatSearch && (
              <div className="flex items-center gap-2 border-b border-white/5 bg-[#171b2c] px-4 py-2">
                <Search className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search in this conversation or broadcast..."
                  value={inChatSearchQuery}
                  onChange={(e) => setInChatSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                />
                {inChatSearchQuery && (
                  <span className="text-[11px] font-medium text-emerald-400">
                    {displayedMessages.length} found
                  </span>
                )}
                <button
                  onClick={() => {
                    setShowInChatSearch(false);
                    setInChatSearchQuery('');
                  }}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Pinned Messages Banner */}
            {messages.filter((m) => m.pinned_at && !m.deleted_at).length >
              0 && (
              <div className="flex flex-col gap-1 border-b border-white/5 bg-emerald-500/5 px-4 py-2">
                {messages
                  .filter((m) => m.pinned_at && !m.deleted_at)
                  .map((pinned) => (
                    <div
                      key={`pin-${pinned.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg bg-emerald-500/10 px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Pin className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-semibold text-emerald-400">
                            {pinned.sender?.full_name || pinned.sender?.email}
                          </p>
                          <p className="truncate text-xs text-slate-300">
                            {pinned.text_content || '[attachment]'}
                          </p>
                        </div>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => handlePin(pinned.id, 'unpin')}
                          className="flex-shrink-0 text-slate-400 hover:text-rose-400"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto bg-[#0d0f1a] px-4 py-4">
              {loadingMsgs ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
                </div>
              ) : displayedMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-sm text-slate-500">
                  {inChatSearchQuery ? (
                    <>
                      <Search className="mb-2 h-8 w-8 text-slate-600" />
                      <p>No messages match "{inChatSearchQuery}"</p>
                    </>
                  ) : (
                    'Start the conversation 👋'
                  )}
                </div>
              ) : (
                <div className="space-y-0.5">
                  {displayedMessages.map((msg, idx) => {
                    const isOwn = msg.sender_id === user?.uid;
                    const prev = idx > 0 ? messages[idx - 1] : null;
                    const showSenderInfo =
                      !prev ||
                      prev.sender_id !== msg.sender_id ||
                      new Date(msg.created_at).getTime() -
                        new Date(prev.created_at).getTime() >
                        3 * 60 * 1000;
                    const showDivider =
                      !prev || !sameDay(prev.created_at, msg.created_at);

                    return (
                      <React.Fragment key={msg.id}>
                        {showDivider && (
                          <div className="flex items-center gap-3 py-3">
                            <div className="h-px flex-1 bg-white/5" />
                            <span className="px-2 text-[10px] text-slate-500">
                              {formatDateDivider(msg.created_at)}
                            </span>
                            <div className="h-px flex-1 bg-white/5" />
                          </div>
                        )}
                        <div
                          className={
                            showSenderInfo && idx > 0 && !showDivider
                              ? 'mt-3'
                              : 'mt-0.5'
                          }
                        >
                          <MessageBubble
                            msg={msg}
                            isOwn={isOwn}
                            showSenderInfo={showSenderInfo}
                            isAdmin={isAdmin}
                            currentUserId={user?.uid || ''}
                            onReply={setReplyTo}
                            onReact={handleReact}
                            onPin={handlePin}
                          />
                        </div>
                      </React.Fragment>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Pending attachments */}
            {pendingAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2 border-t border-white/5 bg-[#131726] px-4 py-2">
                {pendingAttachments.map((att, i) => (
                  <div key={i} className="relative">
                    {att.resource_type === 'image' ? (
                      <img
                        src={att.cloudinary_url}
                        alt={att.file_name}
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                        <FileText className="h-6 w-6 text-slate-400" />
                      </div>
                    )}
                    <button
                      onClick={() =>
                        setPendingAttachments((prev) =>
                          prev.filter((_, j) => j !== i)
                        )
                      }
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white shadow"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Pending entity refs */}
            {pendingEntityRefs.length > 0 && (
              <div className="flex flex-wrap gap-1.5 border-t border-white/5 bg-[#131726] px-4 py-2">
                {pendingEntityRefs.map((ref, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300"
                  >
                    <Hash className="h-3 w-3" />
                    {ref.display_label}
                    <button
                      onClick={() =>
                        setPendingEntityRefs((prev) =>
                          prev.filter((_, j) => j !== i)
                        )
                      }
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Reply banner */}
            {replyTo && (
              <div className="flex items-center gap-3 border-t border-white/5 bg-[#131726] px-4 py-2">
                <Reply className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold text-emerald-400">
                    Replying to{' '}
                    {replyTo.sender?.full_name ||
                      replyTo.sender?.email ||
                      'someone'}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {replyTo.text_content || '[attachment]'}
                  </p>
                </div>
                <button
                  onClick={() => setReplyTo(null)}
                  className="flex-shrink-0 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Error bar */}
            {error && (
              <div className="flex items-center gap-2 border-t border-rose-500/20 bg-rose-500/5 px-4 py-2 text-xs text-rose-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1">{error}</span>
                <button onClick={() => setError(null)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Composer */}
            {activeConv?.type === 'broadcast' &&
            !activeConv?.allow_replies &&
            !isAdmin ? (
              <div className="flex-shrink-0 border-t border-white/5 bg-[#131726] px-4 py-4 text-center">
                <div className="inline-flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
                  <Lock className="h-4 w-4 text-amber-400" />
                  <span>
                    Broadcast channel is read-only. Only administrators can post
                    announcements.
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex-shrink-0 border-t border-white/5 bg-[#131726] px-3 py-3">
                <div className="relative">
                  {/* @mention dropdown */}
                  {mentionQuery !== null && (
                    <MentionDropdown
                      query={mentionQuery}
                      staffList={staffList}
                      onSelect={insertMention}
                    />
                  )}
                  {/* Entity picker */}
                  {showEntityPicker && (
                    <EntityRefPicker
                      onAdd={(ref) => {
                        setPendingEntityRefs((prev) => [...prev, ref]);
                        setShowEntityPicker(false);
                      }}
                      onClose={() => setShowEntityPicker(false)}
                    />
                  )}

                  <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-[#0d0f1a] px-3 py-2.5">
                    {/* Attach file */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile}
                      className="mb-0.5 flex-shrink-0 text-slate-400 transition-colors hover:text-emerald-400 disabled:opacity-50"
                      title="Attach file (max 20 MB)"
                    >
                      {uploadingFile ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Paperclip className="h-5 w-5" />
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,video/mp4,video/webm"
                      onChange={handleFileSelect}
                    />

                    {/* Entity ref picker trigger */}
                    <button
                      onClick={() => setShowEntityPicker((v) => !v)}
                      className={`mb-0.5 flex-shrink-0 transition-colors ${showEntityPicker ? 'text-emerald-400' : 'text-slate-400 hover:text-emerald-400'}`}
                      title="Reference order / ticket / product"
                    >
                      <Hash className="h-5 w-5" />
                    </button>

                    {/* Textarea */}
                    <textarea
                      ref={textareaRef}
                      value={text}
                      onChange={handleTextChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Message… (Enter to send · Shift+Enter for newline · @ to mention)"
                      rows={1}
                      className="flex-1 resize-none bg-transparent text-sm leading-relaxed text-white placeholder-slate-500 focus:outline-none"
                      style={{ maxHeight: '130px' }}
                    />

                    {/* Send */}
                    <button
                      onClick={sendMessage}
                      disabled={
                        sendingMsg ||
                        (!text.trim() && pendingAttachments.length === 0)
                      }
                      className="mb-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {sendingMsg ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Right: Group Info Panel ── */}
      {showGroupInfo && activeConv?.type === 'group' && (
        <GroupInfoPanel
          conv={activeConv}
          staffList={staffList}
          currentUserId={user?.uid || ''}
          onClose={() => setShowGroupInfo(false)}
          onAddMembers={addMembersToGroup}
          onLeave={leaveGroup}
        />
      )}

      {/* New Conversation Modal */}
      {showNewConv && (
        <NewConversationModal
          staffList={staffList}
          onClose={() => setShowNewConv(false)}
          onStartDirect={startDirectChat}
          onCreateGroup={createGroup}
        />
      )}
    </div>
  );
}
