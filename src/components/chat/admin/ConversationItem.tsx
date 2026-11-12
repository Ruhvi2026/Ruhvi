'use client';

import React from 'react';
import type { ChatConversation } from '@/types/chat';
import { Users } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { formatTime } from './chat-helpers';

export function ConversationItem({
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
        ? '?? Attachment'
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
