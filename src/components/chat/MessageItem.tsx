// src/components/chat/MessageItem.tsx
//
// Standalone Message Bubble item supporting text, attachments, and WhatsApp-style Voice Notes.

'use client';

import React from 'react';
import { ChatMessage, ChatAttachment } from '@/types/chat';
import { VoiceNotePlayer } from './VoiceNotePlayer';
import AutoLinkText from './AutoLinkText';
import { FileText, Download } from 'lucide-react';

export interface MessageItemProps {
  message: ChatMessage;
  isMe?: boolean;
  className?: string;
}

export function MessageItem({
  message,
  isMe = false,
  className = '',
}: MessageItemProps) {
  const isVoiceNote =
    message.message_type === 'voice_note' ||
    Boolean(message.voice_note_id) ||
    Boolean(
      message.attachments?.some(
        (att) =>
          att.mime_type?.startsWith('audio/') ||
          att.file_name?.toLowerCase().includes('voice note')
      )
    );

  const attachments = message.attachments || [];
  const voiceAttachment = attachments.find(
    (att) =>
      att.mime_type?.startsWith('audio/') ||
      att.file_name?.toLowerCase().includes('voice note') ||
      att.resource_type === 'video'
  );

  const cleanText = message.text_content?.trim() || '';
  const hideRedundantVoiceText =
    isVoiceNote &&
    (cleanText === 'Voice Note' || cleanText === '🎤 Voice Note');

  return (
    <div
      className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs shadow-sm ${
        isMe
          ? 'rounded-br-none bg-emerald-600 text-white'
          : 'rounded-bl-none border border-white/5 bg-[#182136] text-slate-200'
      } ${className}`}
    >
      {/* 1. Voice Note Bubble Rendering */}
      {isVoiceNote && (
        <div className="mb-1">
          <VoiceNotePlayer
            src={
              voiceAttachment?.cloudinary_url ||
              message.voice_note?.cloudinaryUrl ||
              ''
            }
            duration={
              voiceAttachment?.duration ||
              message.voice_note?.durationSeconds ||
              0
            }
            isUser={isMe}
            status={
              message.voice_note?.status ||
              (voiceAttachment?.cloudinary_url ? 'active' : 'expired')
            }
          />
        </div>
      )}

      {/* 2. Standard Non-Audio Attachments */}
      {attachments
        .filter((att) => att !== voiceAttachment)
        .map((att: ChatAttachment) => (
          <div key={att.id} className="mb-1.5">
            {att.resource_type === 'image' ? (
              <a
                href={att.cloudinary_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src={att.cloudinary_url}
                  alt={att.file_name}
                  className="max-h-44 rounded-lg object-cover"
                />
              </a>
            ) : (
              <a
                href={att.cloudinary_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg bg-black/20 p-2 text-white hover:bg-black/30"
              >
                <FileText className="h-4 w-4 text-emerald-300" />
                <span className="max-w-[160px] truncate">{att.file_name}</span>
                <Download className="h-3.5 w-3.5 text-slate-400" />
              </a>
            )}
          </div>
        ))}

      {/* 3. Text Content */}
      {cleanText && !hideRedundantVoiceText && (
        <AutoLinkText
          text={cleanText}
          className="whitespace-pre-wrap break-words leading-relaxed"
          linkClassName={
            isMe
              ? 'text-white underline font-semibold'
              : 'text-violet-300 hover:text-white underline'
          }
        />
      )}
    </div>
  );
}
