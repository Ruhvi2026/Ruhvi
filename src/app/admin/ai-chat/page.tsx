'use client';

import { useState } from 'react';
import { Send, Bot, User, Mic, MessageSquare, Sparkles } from 'lucide-react';
import { LiveVoiceVisualizer } from '@/components/co-founder/LiveVoiceVisualizer';
import { useLiveKitVoice } from '@/hooks/useLiveKitVoice';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp?: number;
}

export default function AdminAiChatPage() {
  const [activeTab, setActiveTab] = useState<'voice' | 'chat'>('voice');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello Founder! I am your Ruhvi AI Co-Founder. You can converse with me in real-time via voice or use the interactive chat below. What are we focusing on today?',
      timestamp: Date.now(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  // Realtime LiveKit Voice Hook
  const voice = useLiveKitVoice({
    onTranscript: (speaker, text) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: speaker,
          text,
          timestamp: Date.now(),
        },
      ]);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: input.trim(),
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            sender: m.sender,
            text: m.text,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: data.response || 'No response received.',
          timestamp: Date.now(),
        },
      ]);
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : 'Unknown error';
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: `Error: ${errorText}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-7xl flex-col p-4 text-neutral-100 md:p-6">
      {/* Top Header & Tab Controls */}
      <div className="flex flex-col justify-between gap-4 border-b border-neutral-800 pb-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 shadow-lg shadow-amber-500/20">
            <Sparkles className="h-5 w-5 text-neutral-950" />
          </div>
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold tracking-tight text-white">
              AI Co-Founder
              <span className="rounded-full border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-amber-400">
                Executive
              </span>
            </h1>
            <p className="text-xs text-neutral-400">
              Live Voice Assistant & Strategic Intelligence Engine
            </p>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center rounded-xl border border-neutral-800 bg-neutral-900 p-1">
          <button
            onClick={() => setActiveTab('voice')}
            className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-medium transition-all duration-200 ${
              activeTab === 'voice'
                ? 'bg-amber-500 font-semibold text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Mic className="h-3.5 w-3.5" />
            <span>Realtime Voice</span>
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-medium transition-all duration-200 ${
              activeTab === 'chat'
                ? 'bg-amber-500 font-semibold text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Interactive Chat</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid flex-1 grid-cols-1 gap-6 overflow-hidden pt-6 lg:grid-cols-12">
        {/* Left Column: Voice Visualizer or Chat */}
        <div
          className={`${
            activeTab === 'voice'
              ? 'flex flex-col justify-center lg:col-span-7'
              : 'hidden flex-col justify-center opacity-75 lg:col-span-5 lg:flex'
          }`}
        >
          <LiveVoiceVisualizer
            state={voice.state}
            isMuted={voice.isMuted}
            onToggleMute={voice.toggleMute}
            onDisconnect={voice.disconnect}
            onStart={voice.startSession}
            errorMessage={voice.errorMessage}
            roomName={voice.roomName}
          />
        </div>

        {/* Right Column: Conversation Stream & Message Box */}
        <div
          className={`flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-950/60 backdrop-blur-md ${
            activeTab === 'voice' ? 'lg:col-span-5' : 'lg:col-span-12'
          }`}
        >
          <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900/50 px-4 py-3 text-xs font-medium text-neutral-400">
            <span>Conversation Feed</span>
            <span>{messages.length} messages</span>
          </div>

          {/* Messages Scroll Container */}
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-sm ${
                    m.sender === 'user'
                      ? 'rounded-tr-none bg-amber-500 font-medium text-neutral-950 shadow-md shadow-amber-500/10'
                      : 'rounded-tl-none border border-neutral-800 bg-neutral-900 text-neutral-200 shadow-sm'
                  }`}
                >
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold opacity-80">
                    {m.sender === 'user' ? (
                      <User size={13} />
                    ) : (
                      <Bot size={13} />
                    )}
                    <span>{m.sender === 'user' ? 'You' : 'AI Co-Founder'}</span>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {m.text}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-none border border-neutral-800 bg-neutral-900 p-3.5 text-xs text-neutral-400">
                  <div className="h-2 w-2 animate-ping rounded-full bg-amber-400" />
                  <span>AI Co-Founder is thinking...</span>
                </div>
              </div>
            )}
          </div>

          {/* Text Input Form */}
          <form
            onSubmit={handleSubmit}
            className="flex gap-2 border-t border-neutral-800 bg-neutral-900/80 p-3"
          >
            <input
              className="flex-1 rounded-xl border border-neutral-700/60 bg-neutral-800/90 px-4 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything or propose a business decision..."
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="flex items-center justify-center rounded-xl bg-amber-500 px-4 py-2 font-semibold text-neutral-950 transition-colors hover:bg-amber-400 disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
