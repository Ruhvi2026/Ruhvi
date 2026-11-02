// src/components/co-founder/ConversationSidebar.tsx
//
// ChatGPT-style Multi-Conversation Sidebar for AI Co-Founder.
// Supports New Chat, thread switching, auto-title display, rename, and safe delete.

'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  MessageSquare,
  Trash2,
  Edit2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import { CoFounderConversation } from '@/lib/ai/co-founder/conversations/types';

interface ConversationSidebarProps {
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export function ConversationSidebar({
  activeId,
  onSelectConversation,
  onNewChat,
  isOpen,
  onToggleOpen,
}: ConversationSidebarProps) {
  const [conversations, setConversations] = useState<CoFounderConversation[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        '/api/admin/co-founder/conversations?type=cofounder'
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.conversations)) {
        setConversations(data.conversations);
      }
    } catch (err) {
      console.error('[ConversationSidebar] Failed to load threads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [activeId]);

  const handleStartRename = (
    conv: CoFounderConversation,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditingTitle(conv.title);
  };

  const handleSaveRename = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editingTitle.trim()) return;

    try {
      const res = await fetch(`/api/admin/co-founder/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingTitle.trim() }),
      });
      if (res.ok) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, title: editingTitle.trim() } : c
          )
        );
      }
    } catch (err) {
      console.error('[ConversationSidebar] Rename failed:', err);
    } finally {
      setEditingId(null);
    }
  };

  const handleConfirmDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/co-founder/conversations/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeId === id) {
          onNewChat();
        }
      }
    } catch (err) {
      console.error('[ConversationSidebar] Delete failed:', err);
    } finally {
      setDeleteModalId(null);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={onToggleOpen}
        title="Open Conversation History"
        className="fixed left-3 top-20 z-40 flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-white shadow-md transition hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
      >
        <ChevronRight size={18} />
      </button>
    );
  }

  return (
    <>
      <aside className="relative flex h-full w-64 shrink-0 flex-col border-r border-neutral-200 bg-neutral-50/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
        {/* Header with New Chat & Collapse */}
        <div className="flex items-center justify-between border-b border-neutral-200 p-3 dark:border-neutral-800">
          <button
            type="button"
            onClick={onNewChat}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700"
          >
            <Plus size={15} />
            <span>New Chat</span>
          </button>
          <button
            type="button"
            onClick={onToggleOpen}
            className="ml-2 flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800"
            title="Collapse sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading && conversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-neutral-400">
              Loading conversations...
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-neutral-400">
              No conversations yet. Start a new chat!
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conv) => {
                const isActive = conv.id === activeId;
                const isEditing = conv.id === editingId;

                return (
                  <div
                    key={conv.id}
                    onClick={() => onSelectConversation(conv.id)}
                    className={`group relative flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-xs transition ${
                      isActive
                        ? 'bg-violet-500/15 font-semibold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300'
                        : 'text-neutral-700 hover:bg-neutral-200/60 dark:text-neutral-300 dark:hover:bg-neutral-800/60'
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <MessageSquare
                        size={14}
                        className="shrink-0 opacity-70"
                      />
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                          className="w-full rounded bg-white px-1.5 py-0.5 text-xs text-neutral-900 ring-1 ring-violet-500 dark:bg-neutral-800 dark:text-neutral-100"
                        />
                      ) : (
                        <span className="truncate">{conv.title}</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={(e) => handleSaveRename(conv.id, e)}
                            className="rounded p-0.5 text-emerald-600 hover:bg-emerald-50"
                          >
                            <Check size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(null);
                            }}
                            className="rounded p-0.5 text-neutral-500 hover:bg-neutral-200"
                          >
                            <X size={13} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={(e) => handleStartRename(conv, e)}
                            title="Rename"
                            className="rounded p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteModalId(conv.id);
                            }}
                            title="Delete"
                            className="rounded p-1 text-neutral-400 hover:text-red-600 dark:hover:text-red-400"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* Delete Confirmation Modal */}
      {deleteModalId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              Delete Conversation?
            </h3>
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              This will remove this conversation thread. Your global business
              memory and decisions will remain completely safe.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteModalId(null)}
                className="rounded-xl border border-neutral-300 px-3 py-1.5 text-xs font-semibold hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDelete(deleteModalId)}
                className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
              >
                Delete Thread
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
