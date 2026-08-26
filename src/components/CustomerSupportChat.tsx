'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Paperclip, Ticket, ExternalLink } from 'lucide-react';
import BotMascot from '@/components/design-system/BotMascot';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

const THINKING_STEPS = [
  'Reading your words…',
  'Looking through the atelier…',
  'Checking your account…',
  'Polishing your answer…',
];

const TYPE_SPEED_MS = 10;

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
    <div className="max-w-[85%] rounded-2xl rounded-bl-none border border-white/40 bg-white/70 p-3.5 text-[13px] font-medium leading-relaxed text-[#292524] shadow-sm shadow-gold-500/5 backdrop-blur-sm">
      {displayed}
      {isTypingOut && <span className="typing-caret" aria-hidden />}
    </div>
  );
}

interface ChatMessage {
  sender: 'bot' | 'user';
  text: string;
  ticketInfo?: {
    ticket_number: string;
    ticket_id: string;
  };
}

export default function CustomerSupportChat() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'bot',
      text: 'Namaste! I am Gia, Ruhvi\u2019s Golden Concierge. I grew up among goldsmiths in Jaipur, so pieces, materials, and orders are my world. How may I help you today?\n\nI can help with order tracking, returns, warranty questions, payment issues, and more. Just tell me what\u2019s on your mind!',
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);
  const [hasUnread, setHasUnread] = useState(false);
  const [winSize, setWinSize] = useState({ width: 400, height: 560 });

  // Floating, draggable mascot state
  const [position, setPosition] = useState({ x: -1000, y: -1000 });
  const [isDragging, setIsDragging] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [isNearCloseZone, setIsNearCloseZone] = useState(false);
  const dragStart = useRef({
    pointerX: 0,
    pointerY: 0,
    posX: 0,
    posY: 0,
    hasMoved: false,
  });

  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => ({
        x: Math.max(10, Math.min(window.innerWidth - 85, prev.x)),
        y: Math.max(10, Math.min(window.innerHeight - 95, prev.y)),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const el = e.currentTarget;
    try {
      el.setPointerCapture(e.pointerId);
    } catch (err) {}

    const rect = el.getBoundingClientRect();
    dragStart.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      posX: position.x === -1000 ? rect.left : position.x,
      posY: position.y === -1000 ? rect.top : position.y,
      hasMoved: false,
    };
    setIsDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;

    const dx = e.clientX - dragStart.current.pointerX;
    const dy = e.clientY - dragStart.current.pointerY;

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragStart.current.hasMoved = true;
    }

    const newX = Math.max(
      10,
      Math.min(window.innerWidth - 85, dragStart.current.posX + dx)
    );
    const newY = Math.max(
      10,
      Math.min(window.innerHeight - 95, dragStart.current.posY + dy)
    );

    setPosition({ x: newX, y: newY });

    // Close zone is bottom center (roughly 60px from bottom, centered)
    const closeX = window.innerWidth / 2;
    const closeY = window.innerHeight - 60;
    const mascotCenterX = newX + 35; // size is 70, center is +35
    const mascotCenterY = newY + 35;

    const distance = Math.sqrt(
      Math.pow(mascotCenterX - closeX, 2) + Math.pow(mascotCenterY - closeY, 2)
    );
    setIsNearCloseZone(distance < 75);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}

    if (!dragStart.current.hasMoved) {
      // Toggle support chat
      setIsOpen(!isOpen);
      setHasUnread(false);
    } else if (isNearCloseZone) {
      setIsClosed(true);
    }
    setIsNearCloseZone(false);
  };
  const feedRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<{
    startX: number;
    startY: number;
    width: number;
    height: number;
  } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const MIN_W = 320;
  const MIN_H = 400;
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
    const onMove = (m: PointerEvent) => {
      if (!resizeRef.current) return;
      const dx = resizeRef.current.startX - m.clientX;
      const dy = resizeRef.current.startY - m.clientY;
      setWinSize({
        width: Math.min(MAX_W, Math.max(MIN_W, resizeRef.current.width + dx)),
        height: Math.min(MAX_H, Math.max(MIN_H, resizeRef.current.height + dy)),
      });
    };
    const onUp = () => {
      resizeRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    setInput('');
    const userMsg: ChatMessage = { sender: 'user', text };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setIsTyping(true);
    setThinkingStep(0);

    // Animate thinking steps
    const stepInterval = setInterval(() => {
      setThinkingStep((p) => (p + 1) % THINKING_STEPS.length);
    }, 1500);

    try {
      // Call the AI-first support chat API
      const apiMessages = newMsgs.map((m) => ({
        sender: m.sender === 'bot' ? 'bot' : 'user',
        text: m.text,
      }));

      const res = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      const data = await res.json();

      clearInterval(stepInterval);
      setIsTyping(false);

      if (data.response) {
        const botMsg: ChatMessage = { sender: 'bot', text: data.response };

        // If ticket was created, attach info
        if (
          data.action === 'create_ticket' &&
          data.ticket_data?.ticket_number
        ) {
          botMsg.ticketInfo = {
            ticket_number: data.ticket_data.ticket_number,
            ticket_id: data.ticket_data.ticket_id,
          };
        }

        setMessages((prev) => [...prev, botMsg]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: "I'm having trouble right now — please try again in a moment, or our team is always available on WhatsApp.",
          },
        ]);
      }

      if (!isOpen) setHasUnread(true);
    } catch (err) {
      clearInterval(stepInterval);
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: "I'm sorry, I couldn't connect. Please try again shortly.",
        },
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-5 z-[100] flex flex-col overflow-hidden rounded-2xl border border-white/30 shadow-2xl shadow-black/30 backdrop-blur-md"
          style={{
            width: `${winSize.width}px`,
            maxWidth: 'calc(100vw - 40px)',
            height: `${winSize.height}px`,
            maxHeight: 'calc(100dvh - 140px)',
            background:
              'linear-gradient(145deg, #FDFAF3 0%, #F5F0E6 60%, #EDE6D5 100%)',
          }}
        >
          {/* Resize Handle */}
          <div
            className="absolute -left-0.5 -top-0.5 z-10 h-5 w-5 cursor-nw-resize"
            onPointerDown={onResizeStart}
          />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-charcoal-100/60 bg-gradient-to-r from-charcoal-900 to-charcoal-800 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="relative h-8 w-8 overflow-hidden rounded-full border border-gold-400/40 bg-gold-100">
                <BotMascot size={32} />
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-charcoal-900 bg-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-cream-50">Gia</p>
                <p className="text-[10px] text-gold-300/70">
                  AI Support Concierge
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1 text-cream-200/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={feedRef}
            role="log"
            aria-live="polite"
            aria-label="Chat messages"
            className="flex-1 space-y-3 overflow-y-auto px-4 py-3"
          >
            {messages.map((m, i) =>
              m.sender === 'bot' ? (
                <div key={i}>
                  <BotMessage text={m.text} feedRef={feedRef} />
                  {/* Ticket Created Card */}
                  {m.ticketInfo && (
                    <div className="mt-2 max-w-[85%] rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                        <Ticket className="h-3.5 w-3.5" />
                        Ticket Created
                      </div>
                      <p className="mt-1 text-xs text-emerald-600">
                        Ticket{' '}
                        <span className="font-mono font-bold">
                          {m.ticketInfo.ticket_number}
                        </span>{' '}
                        has been created.
                      </p>
                      <Link
                        href={
                          user
                            ? '/account/support'
                            : `/support-status?ticket=${m.ticketInfo.ticket_number}`
                        }
                        className="mt-2 inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-[10px] font-semibold text-white transition-colors hover:bg-emerald-500"
                      >
                        {user ? 'View Tickets' : 'Check Status'}{' '}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-none bg-charcoal-900 px-4 py-2.5 text-[13px] font-medium text-cream-50 shadow-sm">
                    {m.text}
                  </div>
                </div>
              )
            )}

            {/* Thinking Indicator */}
            {isTyping && (
              <div
                className="max-w-[85%] rounded-2xl rounded-bl-none border border-gold-200/40 bg-white/60 p-4 shadow-sm backdrop-blur-sm"
                role="status"
                aria-live="polite"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex h-6 items-center gap-2">
                    {/* Gemini-like glowing wave bars */}
                    <div className="flex h-4 items-end gap-1">
                      <div
                        className="animate-gemini-line-1 w-1 rounded-full bg-gradient-to-t from-[#4285F4] via-[#9B72CB] to-[#D96570]"
                        style={{ height: '30%' }}
                      />
                      <div
                        className="animate-gemini-line-2 w-1 rounded-full bg-gradient-to-t from-[#4285F4] via-[#9B72CB] to-[#D96570]"
                        style={{ height: '30%' }}
                      />
                      <div
                        className="animate-gemini-line-3 w-1 rounded-full bg-gradient-to-t from-[#4285F4] via-[#9B72CB] to-[#D96570]"
                        style={{ height: '30%' }}
                      />
                      <div
                        className="animate-gemini-line-4 w-1 rounded-full bg-gradient-to-t from-[#4285F4] via-[#9B72CB] to-[#D96570]"
                        style={{ height: '30%' }}
                      />
                    </div>
                    <span className="animate-pulse bg-gradient-to-r from-[#4285F4] via-[#9B72CB] to-[#D96570] bg-clip-text text-[10px] font-bold uppercase tracking-wider text-transparent">
                      Gia is thinking
                    </span>
                  </div>
                  <span
                    className="text-[11px] font-medium text-[#78716c]/80"
                    aria-hidden="true"
                  >
                    {THINKING_STEPS[thinkingStep]}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          {messages.length <= 1 && (
            <div className="border-t border-charcoal-100/40 px-3 py-2">
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Where is my order?',
                  'Return/exchange a piece',
                  'My product arrived damaged',
                  'Payment issue',
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setInput(q);
                      setTimeout(() => {
                        const fakeMsg: ChatMessage = {
                          sender: 'user',
                          text: q,
                        };
                        setMessages((prev) => [...prev, fakeMsg]);
                        setInput('');
                        // Trigger the API call
                        setIsTyping(true);
                        setThinkingStep(0);
                        const stepInterval = setInterval(() => {
                          setThinkingStep(
                            (p) => (p + 1) % THINKING_STEPS.length
                          );
                        }, 1500);

                        fetch('/api/support/chat', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            messages: [
                              { sender: 'bot', text: messages[0].text },
                              { sender: 'user', text: q },
                            ],
                          }),
                        })
                          .then((r) => r.json())
                          .then((data) => {
                            clearInterval(stepInterval);
                            setIsTyping(false);
                            if (data.response) {
                              const botMsg: ChatMessage = {
                                sender: 'bot',
                                text: data.response,
                              };
                              if (
                                data.action === 'create_ticket' &&
                                data.ticket_data?.ticket_number
                              ) {
                                botMsg.ticketInfo = {
                                  ticket_number: data.ticket_data.ticket_number,
                                  ticket_id: data.ticket_data.ticket_id,
                                };
                              }
                              setMessages((prev) => [...prev, botMsg]);
                            }
                          })
                          .catch(() => {
                            clearInterval(stepInterval);
                            setIsTyping(false);
                            setMessages((prev) => [
                              ...prev,
                              {
                                sender: 'bot',
                                text: "I'm having trouble — please try again.",
                              },
                            ]);
                          });
                      }, 50);
                    }}
                    className="rounded-full border border-charcoal-200/60 bg-white/50 px-3 py-1.5 text-[11px] font-medium text-[#525252] transition-all hover:border-gold-300 hover:bg-gold-50 hover:text-[#252525]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-charcoal-100/60 bg-white/30 px-3 py-2.5">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your issue or ask a question…"
                aria-label="Message"
                rows={1}
                className="flex-1 resize-none rounded-xl border border-charcoal-200/60 bg-white/70 px-3 py-2 text-[13px] text-charcoal-800 placeholder-stone-400/60 transition-all focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-300"
                style={{ maxHeight: '80px' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                aria-label="Send message"
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-charcoal-900 text-cream-50 shadow-sm transition-all hover:bg-charcoal-800 disabled:opacity-30"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-1.5 flex items-center justify-between px-1">
              <Link
                href="/account/support"
                className="text-[10px] text-stone-400/80 transition-colors hover:text-charcoal-600"
              >
                View my support tickets →
              </Link>
              <p className="text-[10px] text-stone-400/50">
                Powered by Ruhvi AI
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Draggable Floating Mascot */}
      {!isClosed && (
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className={`fixed z-[100] cursor-grab touch-none select-none transition-transform duration-100 active:cursor-grabbing ${
            isDragging ? 'scale-105' : 'hover:scale-110 active:scale-95'
          }`}
          style={{
            left: position.x === -1000 ? 'auto' : `${position.x}px`,
            top: position.y === -1000 ? 'auto' : `${position.y}px`,
            bottom: position.x === -1000 ? '20px' : 'auto',
            right: position.x === -1000 ? '20px' : 'auto',
          }}
          aria-label={isOpen ? 'Close support chat' : 'Open support chat'}
        >
          <div className="relative">
            <BotMascot
              size={70}
              showGlow={true}
              state={isTyping ? 'thinking' : 'idle'}
            />
            {hasUnread && !isOpen && (
              <span className="absolute right-1 top-1 h-4 w-4 animate-pulse rounded-full border-2 border-charcoal-900 bg-emerald-400" />
            )}
          </div>
        </div>
      )}

      {/* Drop Target Zone to Close/Hide Mascot */}
      {isDragging && !isClosed && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-[99] flex -translate-x-1/2 flex-col items-center gap-1.5">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-full border-2 transition-all duration-300 ${
              isNearCloseZone
                ? 'scale-125 border-rose-500 bg-rose-500/20 shadow-lg shadow-rose-500/30'
                : 'scale-100 border-gold-400/40 bg-stone-900/40 backdrop-blur-md'
            }`}
          >
            <X
              className={`h-6 w-6 transition-colors duration-300 ${isNearCloseZone ? 'text-rose-500' : 'text-cream-100'}`}
            />
          </div>
          <span
            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
              isNearCloseZone
                ? 'bg-rose-500/10 text-rose-500'
                : 'bg-stone-900/20 text-stone-400 backdrop-blur-sm'
            }`}
          >
            {isNearCloseZone ? 'Drop to Hide Gia' : 'Drag here to hide'}
          </span>
        </div>
      )}
    </>
  );
}
