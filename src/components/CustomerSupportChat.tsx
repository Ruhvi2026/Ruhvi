'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import BotMascot from '@/components/design-system/BotMascot';

const FAQ_PRESETS = [
  {
    q: 'How do I verify BIS Hallmarking?',
    a: 'Bilkul — a wonderful thing to ask! Every Ruhvi piece in 22K gold carries the official 6-digit BIS HUID stamp, and you can verify it right on the government hallmarking portal. It is our family promise of authenticity, always.',
  },
  {
    q: 'What is your Return Policy?',
    a: 'We keep it as simple as a plain band: 7 days to decide, no questions asked. As long as the piece is unworn and still in its original tamper-evident packaging, we will gladly welcome it back.',
  },
  {
    q: 'How long does shipping take?',
    a: 'Your piece travels fully insured via Blue Dart Air Transit and usually reaches you within 3-5 business days, anywhere in India. We will share tracking the moment it leaves the atelier!',
  },
];

const THINKING_STEPS = [
  'Reading your words…',
  'Looking through the atelier…',
  'Weighing the details…',
  'Polishing your answer…',
];

const TYPE_SPEED_MS = 12;

function BotMessage({
  text,
  feedRef,
}: {
  text: string;
  feedRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    let i = 0;
    setDisplayed('');
    const interval = setInterval(() => {
      i += 1;
      setDisplayed(text.slice(0, i));
      if (feedRef.current) {
        feedRef.current.scrollTop = feedRef.current.scrollHeight;
      }
      if (i >= text.length) {
        clearInterval(interval);
      }
    }, TYPE_SPEED_MS);
    return () => clearInterval(interval);
  }, [text, feedRef]);

  const isTypingOut = displayed.length < text.length;

  return (
    <div className="max-w-[80%] rounded-2xl rounded-bl-none border border-white/40 bg-white/70 p-3.5 text-[13px] font-medium leading-relaxed text-stone-800 shadow-sm shadow-gold-500/5 backdrop-blur-sm">
      {displayed}
      {isTypingOut && <span className="typing-caret" aria-hidden />}
    </div>
  );
}

export default function CustomerSupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<
    Array<{ sender: 'bot' | 'user'; text: string }>
  >([
    {
      sender: 'bot',
      text: 'Namaste! I am Gia, Ruhvi\u2019s Golden Concierge. I grew up among goldsmiths in Jaipur, so pieces, hallmarking, and orders are my world. How may I help you today?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);
  const [hasUnread, setHasUnread] = useState(false);
  const [winSize, setWinSize] = useState({ width: 384, height: 520 });
  const feedRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<{
    startX: number;
    startY: number;
    width: number;
    height: number;
  } | null>(null);

  const MIN_W = 280;
  const MIN_H = 360;
  const MAX_W = 560;
  const MAX_H = 720;

  const onResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      width: winSize.width,
      height: winSize.height,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onResizeMove = (e: React.PointerEvent) => {
    const start = resizeRef.current;
    if (!start) return;
    const dx = e.clientX - start.startX;
    const dy = e.clientY - start.startY;
    const maxW = Math.min(window.innerWidth - 48, MAX_W);
    const maxH = Math.min(window.innerHeight - 48, MAX_H);
    setWinSize({
      width: Math.min(Math.max(start.width + dx, MIN_W), maxW),
      height: Math.min(Math.max(start.height + dy, MIN_H), maxH),
    });
  };

  const onResizeEnd = () => {
    resizeRef.current = null;
  };

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages, isTyping, isOpen]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last) return;
    if (!isOpen && last.sender === 'bot') {
      setHasUnread(true);
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isTyping) {
      setThinkingStep(0);
      return;
    }
    const interval = setInterval(() => {
      setThinkingStep((prev) => (prev + 1) % THINKING_STEPS.length);
    }, 900);
    return () => clearInterval(interval);
  }, [isTyping]);

  const handleSend = (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    // Add user message
    const newMessages = [...messages, { sender: 'user' as const, text }];
    setMessages(newMessages);
    if (!textToSend) setInput('');

    // Check for predefined FAQs first
    const matchedFaq = FAQ_PRESETS.find(
      (f) => f.q.toLowerCase() === text.toLowerCase()
    );

    if (matchedFaq) {
      setTimeout(() => {
        setMessages((prev) => [...prev, { sender: 'bot', text: matchedFaq.a }]);
      }, 500);
      return;
    }

    // Call the AI Backend
    const fetchAIResponse = async () => {
      setIsTyping(true);
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: newMessages }),
        });

        const data = await res.json();

        if (res.ok && data.response) {
          setMessages((prev) => [
            ...prev,
            { sender: 'bot', text: data.response },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              sender: 'bot',
              text:
                data.error ||
                data.response ||
                'Ah, my hands slipped while polishing this one — I could not quite finish my reply. Do give me one more moment, or ask again?',
            },
          ]);
        }
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: 'The atelier bell must be ringing — my connection dropped for a moment. Please try again in a few seconds; I will be right here.',
          },
        ]);
      } finally {
        setIsTyping(false);
      }
    };

    fetchAIResponse();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="gold-gradient-bg gold-ring group relative flex items-center justify-center space-x-2 rounded-full border border-gold-300/60 p-2.5 pr-4 text-white shadow-[0_8px_30px_rgb(186,145,81,0.4)] transition-all duration-500 ease-out hover:-translate-y-1 hover:scale-110 hover:shadow-[0_12px_40px_rgb(186,145,81,0.6)]"
        >
          <BotMascot
            size={38}
            state="idle"
            className="transition-transform duration-300 group-hover:scale-110"
          />
          <span className="hidden pr-1 text-xs font-bold uppercase tracking-wider text-gold-50 sm:inline">
            Ask Ruhvi Support
          </span>
          {hasUnread && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 animate-pulse items-center justify-center rounded-full border-2 border-white bg-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-gold-900" />
            </span>
          )}
        </button>
      ) : (
        <div
          className="animate-fade-up relative flex flex-col overflow-hidden rounded-[32px] border border-white/60 bg-white/60 shadow-[0_16px_60px_rgb(186,145,81,0.2)] backdrop-blur-xl"
          style={{ width: winSize.width, height: winSize.height }}
        >
          {/* Header */}
          <div className="gold-gradient-bg flex items-center justify-between border-b border-white/20 px-5 py-4 text-white">
            <div className="flex items-center space-x-3">
              <BotMascot size={42} state="idle" />
              <div>
                <h3 className="font-serif text-sm font-bold">
                  Gia — Golden Concierge
                </h3>
                <p className="flex items-center gap-1 text-[10px] text-gold-50/90">
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  At your service • Ruhvi Atelier
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1 text-gold-50/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages Feed */}
          <div
            ref={feedRef}
            className="flex-1 space-y-4 overflow-y-auto scroll-smooth p-5"
          >
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-up`}
              >
                {m.sender === 'bot' ? (
                  <BotMessage text={m.text} feedRef={feedRef} />
                ) : (
                  <div className="max-w-[80%] rounded-2xl rounded-br-none bg-stone-900 p-3.5 text-[13px] font-medium leading-relaxed text-white shadow-md">
                    {m.text}
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="animate-fade-up flex items-start justify-start space-x-2">
                <BotMascot size={30} state="thinking" showGlow={false} />
                <div className="min-w-[150px] rounded-2xl rounded-bl-none border border-white/40 bg-white/70 px-3.5 py-3 shadow-sm shadow-gold-500/5 backdrop-blur-sm">
                  <div className="mb-2.5 flex items-center space-x-1.5">
                    <div
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold-400"
                      style={{ animationDelay: '0ms' }}
                    ></div>
                    <div
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold-400"
                      style={{ animationDelay: '150ms' }}
                    ></div>
                    <div
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold-400"
                      style={{ animationDelay: '300ms' }}
                    ></div>
                  </div>
                  <div className="h-4 overflow-hidden text-[11px] font-semibold text-gold-700">
                    <div key={thinkingStep} className="animate-fade-up">
                      {THINKING_STEPS[thinkingStep]}
                    </div>
                  </div>
                  <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-black/5">
                    <div className="gold-gradient-bg thinking-progress h-full w-full rounded-full" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick FAQ Chips */}
          <div className="scrollbar-hide flex space-x-2 overflow-x-auto border-t border-white/30 bg-white/40 px-4 py-3 text-[11px] backdrop-blur-md">
            {FAQ_PRESETS.map((f, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(f.q)}
                className="whitespace-nowrap rounded-full border border-white/60 bg-white/80 px-3 py-1.5 font-medium text-stone-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-gold-50 hover:text-gold-900 hover:shadow-md"
              >
                {f.q}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <div className="flex items-center space-x-3 bg-white/60 p-4 pt-2 backdrop-blur-xl">
            <div className="group relative flex-1">
              <input
                type="text"
                placeholder="Message Gia..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                className="w-full rounded-2xl border border-white/60 bg-white/80 px-4 py-3 text-[13px] font-medium text-stone-800 shadow-inner outline-none transition-all placeholder:text-stone-400 focus:border-gold-300 focus:bg-white focus:ring-4 focus:ring-gold-500/10"
              />
            </div>
            <button
              onClick={() => handleSend()}
              className="group flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-900 text-white shadow-md transition-all duration-300 hover:scale-105 hover:bg-stone-800 hover:shadow-lg active:scale-95"
            >
              <Send className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </button>
          </div>

          {/* Resize Handle */}
          <div
            aria-hidden
            onPointerDown={onResizeStart}
            onPointerMove={onResizeMove}
            onPointerUp={onResizeEnd}
            onPointerCancel={onResizeEnd}
            className="absolute bottom-1 right-1 flex h-6 w-6 cursor-nwse-resize touch-none items-center justify-center rounded-bl-lg text-gold-400 transition-colors hover:bg-gold-100/70 hover:text-gold-600"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="h-3.5 w-3.5"
            >
              <path d="M21 15L15 21M21 9L9 21" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
