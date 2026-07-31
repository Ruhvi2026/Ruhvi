'use client';

import React, { useState } from 'react';
import { MessageCircle, X, Send, Sparkles, Phone, ShieldCheck } from 'lucide-react';

const FAQ_PRESETS = [
  { q: 'How do I verify BIS Hallmarking?', a: 'Every Ruhvi 22K gold piece carries the official 6-digit BIS HUID stamp certified by government hallmarking centers.' },
  { q: 'What is your Return Policy?', a: 'We offer a 7-day hassle-free return window for unworn items in original tamper-evident packaging.' },
  { q: 'How long does shipping take?', a: 'Orders are dispatched via Blue Dart Insured Air Transit and typically arrive in 3-5 business days across India.' },
];

export default function CustomerSupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string }>>([
    { sender: 'bot', text: 'Namaste! Welcome to Ruhvi Jewellery Support. How can I assist you today?' }
  ]);
  const [input, setInput] = useState('');

  const handleSend = (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    // Add user message
    const newMessages = [...messages, { sender: 'user' as const, text }];
    setMessages(newMessages);
    if (!textToSend) setInput('');

    // Simulate bot response
    setTimeout(() => {
      let botResponse = "Thank you for reaching out! For detailed queries or live custom orders, our jewellery consultants are available on WhatsApp.";
      
      const matchedFaq = FAQ_PRESETS.find(f => f.q.toLowerCase() === text.toLowerCase());
      if (matchedFaq) {
        botResponse = matchedFaq.a;
      }

      setMessages(prev => [...prev, { sender: 'bot', text: botResponse }]);
    }, 800);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-stone-900 hover:bg-stone-800 text-amber-300 p-4 rounded-full shadow-2xl flex items-center justify-center space-x-2 group transition-transform hover:scale-105 border border-amber-500/30"
        >
          <MessageCircle className="w-6 h-6" />
          <span className="text-xs font-bold uppercase tracking-wider text-white hidden sm:inline pr-2">
            Ask Ruhvi Support
          </span>
        </button>
      ) : (
        <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-80 sm:w-96 overflow-hidden flex flex-col h-[500px]">
          {/* Header */}
          <div className="bg-stone-900 p-4 text-white flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-amber-900/60 border border-amber-400 flex items-center justify-center text-amber-300">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-sm">Ruhvi Support Assistant</h3>
                <p className="text-[10px] text-stone-400">Online • 22K Certified Luxury</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-stone-400 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#FAF6ED]">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed ${
                  m.sender === 'user' 
                    ? 'bg-amber-900 text-white rounded-br-none' 
                    : 'bg-white text-stone-800 border border-stone-200 shadow-sm rounded-bl-none'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Quick FAQ Chips */}
          <div className="p-2 bg-white border-t border-stone-100 flex space-x-2 overflow-x-auto text-[10px]">
            {FAQ_PRESETS.map((f, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(f.q)}
                className="whitespace-nowrap bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold px-2.5 py-1 rounded-full"
              >
                {f.q}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-stone-200 flex items-center space-x-2">
            <input
              type="text"
              placeholder="Type your question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-amber-900"
            />
            <button
              onClick={() => handleSend()}
              className="bg-amber-900 hover:bg-amber-800 text-white p-2 rounded-xl transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
