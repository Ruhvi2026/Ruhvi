'use client';

import React, { useRef, useEffect } from 'react';
import { User, Bot, Sparkles, Send, Mic, Volume2 } from 'lucide-react';
import {
  getRoleTheme,
  getWorkerIcon,
  SwarmWorkerNode,
} from '@/components/co-founder/swarm/swarmTypes';

export interface ChatMessageItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  role?: SwarmWorkerNode['role'];
  workerName?: string;
  timestamp?: number;
  provider?: string;
  model?: string;
  fallbackUsed?: boolean;
}

export interface VoiceTranscriptWindowProps {
  messages: ChatMessageItem[];
  interimTranscript?: string;
  isListening?: boolean;
  isSpeaking?: boolean;
  onSendMessage?: (text: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function VoiceTranscriptWindow({
  messages = [],
  interimTranscript = '',
  isListening = false,
  isSpeaking = false,
  onSendMessage,
  isLoading = false,
  className = '',
}: VoiceTranscriptWindowProps) {
  const [inputText, setInputText] = React.useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest speech or message transcript
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimTranscript]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    if (onSendMessage) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-3xl border border-neutral-200/80 bg-nm-light-bg/95 p-4 text-nm-light-textPrimary shadow-nm-flat backdrop-blur-md transition-all dark:border-neutral-800/90 dark:bg-nm-dark-bg/95 dark:text-nm-dark-textPrimary dark:shadow-nm-flat-dark ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200/80 pb-3 dark:border-neutral-800">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-nm-gradient-light shadow-nm-flat dark:bg-nm-gradient-dark dark:shadow-nm-flat-dark">
            <Sparkles className="h-4 w-4 text-violet-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-tight text-nm-light-textPrimary dark:text-white">
              Co-Founder Conversation
              <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[9px] font-bold text-violet-700 dark:text-violet-300">
                Live Transcript
              </span>
            </h3>
            <p className="text-[10px] text-nm-light-textSecondary dark:text-neutral-400">
              Real-time WebRTC audio & speech transcription
            </p>
          </div>
        </div>

        {/* Live Audio Activity Indicators */}
        <div className="flex items-center gap-2">
          {isSpeaking && (
            <span className="flex animate-pulse items-center gap-1 rounded-full border border-violet-500/40 bg-violet-500/20 px-2.5 py-0.5 font-mono text-[10px] font-bold text-violet-700 dark:text-violet-300">
              <Volume2 className="h-3 w-3 text-violet-600 dark:text-violet-400" />
              <span>Speaking</span>
            </span>
          )}
          {isListening && (
            <span className="flex animate-pulse items-center gap-1 rounded-full border border-cyan-500/40 bg-cyan-500/20 px-2.5 py-0.5 font-mono text-[10px] font-bold text-cyan-700 dark:text-cyan-300">
              <Mic className="h-3 w-3 text-cyan-600 dark:text-cyan-400" />
              <span>Listening</span>
            </span>
          )}
        </div>
      </div>

      {/* Transcript Messages Thread Panel */}
      <div className="scrollbar-thin max-h-[360px] min-h-[220px] flex-1 space-y-3.5 overflow-y-auto py-3 pr-1">
        {messages.length === 0 && !interimTranscript ? (
          <div className="flex h-full min-h-[180px] flex-col items-center justify-center text-center">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-nm-light-bg shadow-nm-inset dark:bg-nm-dark-bg dark:shadow-nm-inset-dark">
              <Bot className="h-5 w-5 text-violet-500/70" />
            </div>
            <p className="text-xs font-medium text-nm-light-textSecondary dark:text-neutral-400">
              Tap the mic or type to speak with your AI Co-Founder...
            </p>
            <p className="mt-1 text-[10px] text-neutral-400 dark:text-neutral-500">
              Live transcripts will stream here in real-time as spoken.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isUser = m.sender === 'user';
            const role = isUser ? undefined : m.role || 'cofounder';
            const roleTheme = role ? getRoleTheme(role) : null;
            const workerName = isUser ? 'You' : m.workerName || 'AI Co-Founder';

            return (
              <div
                key={m.id}
                className={`flex gap-2.5 ${
                  isUser ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* Avatar Micro-Badge */}
                <div className="shrink-0 pt-0.5">
                  {isUser ? (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border border-cyan-400/50 bg-cyan-500/20 text-cyan-700 shadow-[0_0_10px_rgba(0,207,255,0.25)] dark:text-cyan-300">
                      <User size={13} />
                    </div>
                  ) : (
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                        roleTheme?.badge ||
                        'border-violet-500/50 bg-violet-500/20 text-violet-700 shadow-[0_0_12px_rgba(139,92,246,0.35)] dark:text-violet-300'
                      }`}
                    >
                      {getWorkerIcon(role || 'cofounder')}
                    </div>
                  )}
                </div>

                {/* Speech Bubble */}
                <div
                  className={`max-w-[82%] rounded-2xl p-3 text-xs leading-relaxed ${
                    isUser
                      ? 'rounded-tr-none border border-cyan-500/20 bg-nm-gradient-light font-medium text-violet-950 shadow-nm-flat dark:bg-nm-gradient-dark dark:text-white dark:shadow-nm-flat-dark'
                      : `border-l-3 rounded-tl-none ${
                          roleTheme?.border || 'border-violet-500'
                        } border-y border-r border-neutral-200/80 bg-violet-500/10 text-nm-light-textPrimary shadow-nm-flat dark:border-neutral-800 dark:bg-violet-950/30 dark:text-violet-100 dark:shadow-nm-flat-dark`
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-semibold opacity-90">
                    <span className="font-bold">{workerName}</span>
                    {!isUser && (m.model || m.provider) && (
                      <span className="font-mono text-[9px] text-violet-600 dark:text-violet-400">
                        {m.model || m.provider}
                      </span>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>
              </div>
            );
          })
        )}

        {/* Live Streaming Interim Transcript Bubble */}
        {interimTranscript && (
          <div className="flex flex-row gap-2.5">
            <div className="flex h-7 w-7 shrink-0 animate-pulse items-center justify-center rounded-full border border-cyan-400/50 bg-cyan-500/20 text-cyan-300 shadow-[0_0_10px_rgba(0,207,255,0.3)]">
              <Mic size={13} />
            </div>
            <div className="max-w-[82%] rounded-2xl rounded-tl-none border border-cyan-400/40 bg-cyan-500/10 p-3 text-xs italic text-cyan-900 shadow-nm-flat dark:text-cyan-200 dark:shadow-nm-flat-dark">
              <span className="mr-1">{interimTranscript}</span>
              <span className="inline-block h-3 w-1.5 animate-pulse bg-cyan-400 align-middle" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      {onSendMessage && (
        <form
          onSubmit={handleSubmit}
          className="mt-2 flex items-center gap-2 border-t border-neutral-200/80 pt-3 dark:border-neutral-800"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 rounded-2xl border border-neutral-300/80 bg-nm-light-bg px-3.5 py-2 text-xs text-nm-light-textPrimary placeholder-neutral-400 shadow-nm-inset focus:border-violet-500/50 focus:outline-none dark:border-neutral-800 dark:bg-nm-dark-bg dark:text-white dark:placeholder-neutral-500 dark:shadow-nm-inset-dark"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-nm-gradient-light text-violet-700 shadow-nm-flat transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 dark:bg-nm-gradient-dark dark:text-amber-400 dark:shadow-nm-flat-dark"
          >
            <Send size={14} />
          </button>
        </form>
      )}
    </div>
  );
}
