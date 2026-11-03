// src/components/chat/InternalChatComposer.tsx
//
// Dedicated Composer component for Ru Chat with Voice Notes, Speech-to-Text, and Attachments.

'use client';

import React, { useState, useRef } from 'react';
import { Paperclip, Mic, Send, Loader2 } from 'lucide-react';
import { VoiceNoteRecorder } from './VoiceNoteRecorder';
import { SpeechToTextButton } from './SpeechToTextButton';

export interface InternalChatComposerProps {
  onSendMessage: (text: string) => Promise<void> | void;
  onSendVoiceNote: (
    audioBlob: Blob,
    durationSeconds: number
  ) => Promise<void> | void;
  onUploadAttachment?: (file: File) => Promise<void> | void;
  isSending?: boolean;
  isUploadingVoice?: boolean;
  isUploadingFile?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function InternalChatComposer({
  onSendMessage,
  onSendVoiceNote,
  onUploadAttachment,
  isSending = false,
  isUploadingVoice = false,
  isUploadingFile = false,
  disabled = false,
  placeholder = 'Type a message, record voice, or dictate...',
  className = '',
}: InternalChatComposerProps) {
  const [text, setText] = useState('');
  const [isVoiceNoteMode, setIsVoiceNoteMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isSending || disabled) return;
    const toSend = text;
    setText('');
    await onSendMessage(toSend);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadAttachment) {
      onUploadAttachment(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (isVoiceNoteMode) {
    return (
      <div className={`p-2 ${className}`}>
        <VoiceNoteRecorder
          onSend={async (blob, duration) => {
            await onSendVoiceNote(blob, duration);
            setIsVoiceNoteMode(false);
          }}
          onCancel={() => setIsVoiceNoteMode(false)}
          isUploading={isUploadingVoice}
        />
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex items-center gap-2 border-t border-white/10 bg-[#13192B] p-2.5 ${className}`}
    >
      {/* File Attachment */}
      {onUploadAttachment && (
        <>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingFile || disabled}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-emerald-400 disabled:opacity-50"
            title="Attach file"
          >
            {isUploadingFile ? (
              <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />
        </>
      )}

      {/* Mic Button: Starts WhatsApp-style Voice Note */}
      <button
        type="button"
        onClick={() => setIsVoiceNoteMode(true)}
        disabled={disabled}
        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-rose-400 disabled:opacity-50"
        title="Record WhatsApp-style Voice Note"
      >
        <Mic className="h-4 w-4" />
      </button>

      {/* Dictate Button: Gemini Speech to Text Draft Populator */}
      <SpeechToTextButton
        onTranscript={(transcript) => {
          setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }}
        disabled={disabled || isSending}
      />

      {/* Text Input Box */}
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        disabled={disabled || isSending}
        className="flex-1 rounded-xl bg-white/5 px-3 py-1.5 text-xs text-white placeholder-slate-400 outline-none transition focus:bg-white/10 focus:ring-1 focus:ring-emerald-500/50 disabled:opacity-50"
      />

      {/* Send Button */}
      <button
        type="submit"
        disabled={!text.trim() || isSending || disabled}
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-white transition hover:bg-emerald-600 disabled:opacity-40"
        title="Send Message"
      >
        {isSending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Send className="h-3.5 w-3.5" />
        )}
      </button>
    </form>
  );
}
