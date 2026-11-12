'use client';

import React, { useState } from 'react';
import type { ChatMessage, ChatReaction } from '@/types/chat';
import { Pin, Smile, Reply, CheckCheck, Hash } from 'lucide-react';
import AutoLinkText from '@/components/chat/AutoLinkText';
import { VoiceNotePlayer } from '@/components/chat/VoiceNotePlayer';
import { UserAvatar } from './UserAvatar';
import { AttachmentPreview } from './AttachmentPreview';
import { formatTime } from './chat-helpers';

export function MessageBubble({
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

  const isDeleted = !msg.deleted_at;

  return (
    <div
      className={`group flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar � other user only */}
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
              {/* Standalone Voice Note guard if attachments are empty */}
              {msg.message_type === 'voice_note' &&
                (!msg.attachments || msg.attachments.length === 0) && (
                  <div className="my-1 min-w-[240px] max-w-[320px]">
                    <VoiceNotePlayer
                      src={(msg as any).voice_note?.cloudinaryUrl || ''}
                      duration={(msg as any).voice_note?.durationSeconds || 0}
                      isUser={isOwn}
                      status={(msg as any).voice_note?.status || 'expired'}
                    />
                  </div>
                )}
              {/* Text content with clickable links (hide generic 'Voice Note' placeholder) */}
              {msg.text_content &&
                !(
                  msg.message_type === 'voice_note' &&
                  msg.text_content === 'Voice Note'
                ) && (
                  <AutoLinkText
                    text={msg.text_content}
                    className="block whitespace-pre-wrap break-words text-sm leading-relaxed"
                  />
                )}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="space-y-1.5">
                  {msg.attachments.map((att) => (
                    <AttachmentPreview key={att.id} att={att} isOwn={isOwn} />
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
                {['??', '??', '??', '??', '??', '??'].map((em) => (
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
