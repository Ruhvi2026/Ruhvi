'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';
import { Send, Bot, User } from 'lucide-react';

export default function AdminAiChatPage() {
  // We need to map the messages to the format expected by /api/chat
  // The current /api/chat expects { messages: [{ sender: 'user', text: '...' }] }
  // useChat defaults to [{ role: 'user', content: '...' }]

  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat',
    // We need to map the inputs/outputs to match the existing /api/chat route
    // The Vercel AI SDK expects streaming or specific JSON responses.
    // Since /api/chat returns { response: '...' }, we might need to use `input` and `append` manually
  });

  return (
    <div className="flex h-screen flex-col bg-gray-900 text-white">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${m.role === 'user' ? 'bg-emerald-600' : 'bg-gray-700'}`}
            >
              <div className="mb-1 flex items-center gap-2">
                {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                <span className="text-xs font-bold">
                  {m.role === 'user' ? 'You' : 'GIA'}
                </span>
              </div>
              <p className="text-sm">{m.content}</p>
            </div>
          </div>
        ))}
      </div>
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 border-t border-gray-700 p-4"
      >
        <input
          className="flex-1 rounded-lg bg-gray-800 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          value={input}
          onChange={handleInputChange}
          placeholder="Ask GIA anything..."
        />
        <button
          type="submit"
          className="rounded-lg bg-emerald-600 p-2 hover:bg-emerald-500"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
