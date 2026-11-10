'use client';

import React from 'react';
import {
  Mail,
  Star,
  Loader2,
  Paperclip,
  RefreshCw,
  Search,
} from 'lucide-react';
import type { EmailMessage, MailboxFolder } from '@/types/mailbox';

interface MailboxMessageListProps {
  messages: EmailMessage[];
  loading: boolean;
  folder: MailboxFolder;
  selectedMessageId?: string;
  onSelectMessage: (msg: EmailMessage) => void;
  onToggleStar: (msg: EmailMessage, e: React.MouseEvent) => void;
  onRefresh: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

const AVATAR_COLORS = [
  'bg-emerald-600',
  'bg-violet-600',
  'bg-blue-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-teal-600',
  'bg-indigo-600',
];

function getAvatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function getInitials(name?: string, email?: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return '??';
}

function formatListDate(dateIso: string): string {
  try {
    const d = new Date(dateIso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

export function MailboxMessageList({
  messages,
  loading,
  folder,
  selectedMessageId,
  onSelectMessage,
  onToggleStar,
  onRefresh,
  searchQuery,
  onSearchChange,
}: MailboxMessageListProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#0D111E]">
      {/* Search & Actions Bar */}
      <div className="flex items-center gap-2 border-b border-white/5 bg-[#13192B] p-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={`Search ${folder}...`}
            className="w-full rounded-xl border border-white/10 bg-[#0D111E] py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <button
          onClick={onRefresh}
          className="rounded-xl border border-white/10 bg-[#161D31] p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
          title="Refresh messages"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`}
          />
        </button>
      </div>

      {/* Message Feed */}
      <div className="flex-1 divide-y divide-white/5 overflow-y-auto">
        {loading && messages.length === 0 ? (
          <div className="flex h-56 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-56 flex-col items-center justify-center px-4 text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-slate-600">
              <Mail className="h-6 w-6" />
            </div>
            <p className="text-xs font-semibold capitalize text-slate-300">
              {searchQuery ? 'No matching emails found' : `${folder} is empty`}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {searchQuery
                ? 'Try a different search keyword'
                : 'Incoming messages for this mailbox will appear here.'}
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelected = selectedMessageId === msg.id;
            const isUnread = !msg.read;
            const senderName = msg.from.name || msg.from.email || 'Unknown';
            const avatarColorClass = getAvatarColor(msg.from.email || msg.id);

            return (
              <div
                key={msg.id}
                onClick={() => onSelectMessage(msg)}
                className={`group flex cursor-pointer select-none items-start gap-2.5 p-3 transition ${
                  isSelected
                    ? 'border-l-2 border-emerald-400 bg-emerald-500/10'
                    : isUnread
                      ? 'bg-white/[0.03] hover:bg-white/[0.06]'
                      : 'hover:bg-white/[0.03]'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-sm ${avatarColorClass}`}
                >
                  {getInitials(msg.from.name, msg.from.email)}
                </div>

                {/* Body Snippet */}
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center justify-between gap-1.5">
                    <span
                      className={`truncate text-xs ${
                        isUnread
                          ? 'font-bold text-white'
                          : 'font-medium text-slate-300'
                      }`}
                    >
                      {senderName}
                    </span>
                    <span className="flex-shrink-0 text-[10px] text-slate-500">
                      {formatListDate(msg.date)}
                    </span>
                  </div>

                  <h6
                    className={`truncate text-xs leading-snug ${
                      isUnread
                        ? 'font-semibold text-slate-100'
                        : 'text-slate-400'
                    }`}
                  >
                    {msg.subject || '(No Subject)'}
                  </h6>

                  <div className="mt-0.5 flex items-center gap-1.5">
                    <p className="flex-1 truncate text-[11px] text-slate-500">
                      {msg.snippet || 'No text preview available'}
                    </p>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <Paperclip className="h-3 w-3 flex-shrink-0 text-slate-500" />
                    )}
                  </div>
                </div>

                {/* Right controls: Star & Unread Dot */}
                <div className="flex flex-col items-center gap-2 pt-0.5">
                  <button
                    onClick={(e) => onToggleStar(msg, e)}
                    className="p-1 text-slate-600 transition hover:text-amber-400"
                    title={msg.starred ? 'Unstar' : 'Star'}
                  >
                    <Star
                      className={`h-3.5 w-3.5 ${
                        msg.starred ? 'fill-amber-400 text-amber-400' : ''
                      }`}
                    />
                  </button>

                  {isUnread && (
                    <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
