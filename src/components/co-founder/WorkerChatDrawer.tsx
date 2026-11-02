// src/components/co-founder/WorkerChatDrawer.tsx
//
// Dedicated Direct 1:1 Chat Drawer for talking to any Specialist AI Worker.

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { WorkerId } from '@/lib/ai/co-founder/workers/types';
import { SpeechToTextButton } from '@/components/chat/SpeechToTextButton';

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
}

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !workerId) return;

    // Reset messages and show initial greeting
    setMessages([
      {
        id: 'welcome',
        sender: 'worker',
        text: `Hello Founder, I am your ${workerName} (${workerRole}). How can I assist you with operational intelligence, metrics, or domain tasks today?`,
        timestamp: Date.now(),
      },
    ]);
  }, [isOpen, workerId, workerName, workerRole]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-neutral-200 bg-white shadow-2xl backdrop-blur-2xl dark:border-neutral-800 dark:bg-neutral-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 p-4 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-md">
            <Bot size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              {workerName}
            </h3>
            <span className="text-[11px] font-medium text-violet-600 dark:text-violet-400">
              {workerRole}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
        >
          <X size={18} />
        </button>
      </div>

      {/* Message Feed */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => {
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
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'border border-neutral-200 bg-neutral-100 text-neutral-900 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-100'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.text}</p>
              </div>

              {isUser ? (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-300 text-xs dark:bg-neutral-700">
                  <User size={14} />
                </div>
              ) : null}
            </div>
          );
        })}

        {loading ? (
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <Loader2 size={14} className="animate-spin text-violet-600" />
            <span>{workerName} is thinking...</span>
          </div>
        ) : null}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Composer */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t border-neutral-200 p-3 dark:border-neutral-800"
      >
        <SpeechToTextButton
          onTranscript={(t) => setInput((prev) => (prev ? `${prev} ${t}` : t))}
          disabled={loading}
        />

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Talk directly to ${workerName}...`}
          disabled={loading}
          className="flex-1 rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-2 text-xs text-neutral-900 focus:border-violet-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
        />

        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-700 disabled:opacity-50"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}
