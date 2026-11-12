'use client';

import React from 'react';
import type { ChatAttachment } from '@/types/chat';
import { VoiceNotePlayer } from '@/components/chat/VoiceNotePlayer';
import { FileText, Download } from 'lucide-react';

export function AttachmentPreview({
  att,
  isOwn,
}: {
  att: ChatAttachment;
  isOwn?: boolean;
}) {
  if (
    att.mime_type?.startsWith('audio/') ||
    att.file_name?.includes('Voice Note') ||
    (att.resource_type === 'video' && att.file_name?.endsWith('.webm'))
  ) {
    return (
      <div className="my-1 min-w-[240px] max-w-[320px]">
        <VoiceNotePlayer
          src={att.cloudinary_url}
          duration={att.duration || 0}
          isUser={isOwn}
          status={att.cloudinary_url ? 'active' : 'expired'}
        />
      </div>
    );
  }
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
