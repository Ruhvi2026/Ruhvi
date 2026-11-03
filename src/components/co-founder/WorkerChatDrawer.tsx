// src/components/co-founder/WorkerChatDrawer.tsx
//
// Dedicated Direct 1:1 Chat Drawer for talking to any Specialist AI Worker.
// Keeps worker conversations strictly isolated from the main Co-Founder conversation sidebar.

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Mic,
} from 'lucide-react';
import { WorkerId } from '@/lib/ai/co-founder/workers/types';
import { SpeechToTextButton } from '@/components/chat/SpeechToTextButton';
import { VoiceNotePlayer } from '@/components/chat/VoiceNotePlayer';
import { VoiceNoteRecorder } from '@/components/chat/VoiceNoteRecorder';
import AutoLinkText from '@/components/chat/AutoLinkText';
import {
  CoWorkerAvatar,
  CoWorkerRole,
} from '@/components/co-founder/CoWorkerAvatar';

interface WorkerChatDrawerProps {
  workerId: WorkerId | null;
  workerName: string;
  workerRole: string;
  isOpen: boolean;
  onClose: () => void;
}

interface WorkerMessage {
  id: string;
  sender: 'user' | 'worker';
  text: string;
  timestamp: number;
  voiceNote?: {
    url: string;
    duration: number;
  };
}

const WORKER_ID_TO_AVATAR_ROLE: Record<string, CoWorkerRole> = {
  worker_analytics_performance: 'analyst',
  worker_marketing: 'marketer',
  worker_seo: 'researcher',
  worker_product: 'designer',
  worker_competitor_research: 'researcher',
  worker_sales_conversion: 'analyst',
  worker_customer_support: 'writer',
  worker_content_blog: 'writer',
  worker_inventory: 'coder',
  worker_review_feedback: 'analyst',
  worker_execution: 'coder',
  worker_monitoring_verification: 'analyst',
  worker_orders_logistics: 'coder',
  worker_accounts_tax: 'analyst',
};

export function WorkerChatDrawer({
  workerId,
  workerName,
  workerRole,
  isOpen,
  onClose,
}: WorkerChatDrawerProps) {
  const [messages, setMessages] = useState<WorkerMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(false);
  const [responsibilities, setResponsibilities] = useState<string[]>([]);
  const [showResponsibilities, setShowResponsibilities] = useState(false);
  const [isRecordingVoiceNote, setIsRecordingVoiceNote] = useState(false);
  const [uploadingVoiceNote, setUploadingVoiceNote] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSendVoiceNote = async (blob: Blob, duration: number) => {
    if (!workerId || loading) return;
    setUploadingVoiceNote(true);
    try {
      let promptText = 'Voice Note';
      try {
        const formData = new FormData();
        formData.append('audio', blob, 'voice_note.webm');
        const trRes = await fetch('/api/chat/transcribe', {
          method: 'POST',
          body: formData,
        });
        if (trRes.ok) {
          const trData = await trRes.json();
          if (trData.transcript?.trim()) {
            promptText = trData.transcript.trim();
          }
        }
      } catch (trErr) {
        console.warn('[WorkerChatDrawer] Transcription warning:', trErr);
      }

      const audioUrl = URL.createObjectURL(blob);
      const newMsg: WorkerMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: promptText,
        timestamp: Date.now(),
        voiceNote: {
          url: audioUrl,
          duration,
        },
      };
      setMessages((prev) => [...prev, newMsg]);
      setIsRecordingVoiceNote(false);

      setLoading(true);
      const res = await fetch(
        `/api/admin/co-founder/workers/${workerId}/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: promptText }),
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Worker did not respond');
      }

      const botMsg: WorkerMessage = {
        id: `bot-${Date.now()}`,
        sender: 'worker',
        text: data.response,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error('[WorkerChatDrawer] Voice note send error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'worker',
          text: `Error: ${err.message || 'Worker service temporarily unavailable. Please try again.'}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setUploadingVoiceNote(false);
      setLoading(false);
    }
  };

  const loadHistory = useCallback(
    async (id: WorkerId) => {
      try {
        setFetchingHistory(true);
        const res = await fetch(`/api/admin/co-founder/workers/${id}/chat`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        if (data.success) {
          if (Array.isArray(data.responsibilities)) {
            setResponsibilities(data.responsibilities);
          }
          if (Array.isArray(data.messages) && data.messages.length > 0) {
            setMessages(data.messages);
            return;
          }
        }
        // If no past messages, show default welcome greeting
        setMessages([
          {
            id: 'welcome',
            sender: 'worker',
            text: `Hello Founder, I am your ${workerName || 'Specialist'} (${workerRole || 'Specialist AI Worker'}). How can I assist you with operational intelligence, metrics, or domain tasks today?`,
            timestamp: Date.now(),
          },
        ]);
      } catch (err) {
        console.warn('[WorkerChatDrawer] History fetch fallback:', err);
        setMessages([
          {
            id: 'welcome',
            sender: 'worker',
            text: `Hello Founder, I am your ${workerName || 'Specialist'} (${workerRole || 'Specialist AI Worker'}). How can I assist you with operational intelligence, metrics, or domain tasks today?`,
            timestamp: Date.now(),
          },
        ]);
      } finally {
        setFetchingHistory(false);
      }
    },
    [workerName, workerRole]
  );

  useEffect(() => {
    if (!isOpen || !workerId) return;
    loadHistory(workerId);
  }, [isOpen, workerId, loadHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || !workerId || loading) return;

    const userText = input.trim();
    setInput('');

    const newMsg: WorkerMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, newMsg]);

    try {
      setLoading(true);
      const res = await fetch(
        `/api/admin/co-founder/workers/${workerId}/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userText }),
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Worker did not respond');
      }

      const botMsg: WorkerMessage = {
        id: `bot-${Date.now()}`,
        sender: 'worker',
        text: data.response,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error('[WorkerChatDrawer] Send error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'worker',
          text: `Error: ${err.message || 'Worker service temporarily unavailable. Please try again.'}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !workerId) return null;

  const avatarRole = WORKER_ID_TO_AVATAR_ROLE[workerId] || 'analyst';

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-neutral-200 bg-white shadow-2xl backdrop-blur-2xl dark:border-neutral-800 dark:bg-neutral-900">
      {/* Header with Avatar, Badge, Status & Responsibilities */}
      <div className="flex flex-col border-b border-neutral-200 bg-neutral-50/70 p-4 dark:border-neutral-800 dark:bg-neutral-900/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CoWorkerAvatar
              role={avatarRole}
              status={loading ? 'thinking' : 'idle'}
              size="sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  {workerName}
                </h3>
                <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-2 py-0.5 text-[9px] font-bold text-violet-700 dark:text-violet-300">
                  SPECIALIST
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                  {workerRole}
                </span>
                <span className="py-0.2 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            aria-label="Close worker conversation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Responsibilities Dropdown Strip */}
        {responsibilities.length > 0 && (
          <div className="mt-3 border-t border-neutral-200/60 pt-2 dark:border-neutral-800/60">
            <button
              type="button"
              onClick={() => setShowResponsibilities((prev) => !prev)}
              className="flex w-full items-center justify-between text-[11px] font-medium text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              <span className="flex items-center gap-1">
                <ShieldCheck size={12} className="text-amber-500" />
                <span>{responsibilities.length} Domain Responsibilities</span>
              </span>
              {showResponsibilities ? (
                <ChevronUp size={13} />
              ) : (
                <ChevronDown size={13} />
              )}
            </button>

            {showResponsibilities && (
              <ul className="mt-2 space-y-1 rounded-xl bg-neutral-100/80 p-2.5 text-[10px] text-neutral-600 dark:bg-neutral-800/80 dark:text-neutral-300">
                {responsibilities.map((r, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-amber-500">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Message Feed */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {fetchingHistory ? (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-neutral-400">
            <Loader2 size={16} className="animate-spin text-violet-600" />
            <span>Loading conversation history...</span>
          </div>
        ) : (
          messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <div
                key={m.id}
                className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser ? (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs text-white">
                    <Bot size={14} />
                  </div>
                ) : null}

                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    isUser
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'border border-neutral-200 bg-neutral-100 text-neutral-900 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-100'
                  }`}
                >
                  {m.voiceNote ? (
                    <div className="mb-1">
                      <VoiceNotePlayer
                        src={m.voiceNote.url}
                        duration={m.voiceNote.duration}
                        isUser={isUser}
                        status="active"
                      />
                    </div>
                  ) : null}
                  {m.text && m.text !== 'Voice Note' ? (
                    <AutoLinkText
                      text={m.text}
                      className="whitespace-pre-wrap leading-relaxed"
                    />
                  ) : null}
                </div>

                {isUser ? (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-300 text-xs dark:bg-neutral-700">
                    <User size={14} />
                  </div>
                ) : null}
              </div>
            );
          })
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <Loader2 size={14} className="animate-spin text-violet-600" />
            <span>{workerName} is analyzing...</span>
          </div>
        ) : null}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Composer / Voice Recorder */}
      {isRecordingVoiceNote ? (
        <div className="border-t border-neutral-200 p-2 dark:border-neutral-800">
          <VoiceNoteRecorder
            onSend={handleSendVoiceNote}
            onCancel={() => setIsRecordingVoiceNote(false)}
            isUploading={uploadingVoiceNote}
          />
        </div>
      ) : (
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 border-t border-neutral-200 p-3 dark:border-neutral-800"
        >
          {/* Voice Note Recording Trigger */}
          <button
            type="button"
            onClick={() => setIsRecordingVoiceNote(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-500 transition hover:bg-violet-500/10 hover:text-rose-500 dark:text-neutral-400 dark:hover:text-rose-400"
            title="Record Voice Note (Bengali, Hindi, English)"
          >
            <Mic size={16} />
          </button>

          {/* Speech to Text Dictation Button */}
          <SpeechToTextButton
            onTranscript={(t) =>
              setInput((prev) => (prev ? `${prev} ${t}` : t))
            }
            disabled={loading || fetchingHistory}
          />

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Talk directly to ${workerName}...`}
            disabled={loading || fetchingHistory}
            className="flex-1 rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-2 text-xs text-neutral-900 focus:border-violet-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          />

          <button
            type="submit"
            disabled={!input.trim() || loading || fetchingHistory}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-700 disabled:opacity-50"
            aria-label="Send message"
          >
            <Send size={15} />
          </button>
        </form>
      )}
    </div>
  );
}
