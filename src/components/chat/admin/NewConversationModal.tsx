'use client';

import React, { useState } from 'react';
import type { ChatUserProfile } from '@/types/chat';
import { X, Check } from 'lucide-react';
import { UserAvatar } from './UserAvatar';

export function NewConversationModal({
  staffList,
  onClose,
  onStartDirect,
  onCreateGroup,
}: {
  staffList: ChatUserProfile[];
  onClose: () => void;
  onStartDirect: (userId: string) => void;
  onCreateGroup: (memberIds: string[], name: string, topic?: string) => void;
}) {
  const [mode, setMode] = useState<'select' | 'group'>('select');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupTopic, setGroupTopic] = useState('');

  const filtered = staffList.filter(
    (u) =>
      !search ||
      (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#131726] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <h3 className="text-sm font-bold text-white">
            {mode === 'group' ? 'Create Group Chat' : 'New Conversation'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 transition-colors hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {mode === 'select' ? (
            <>
              <input
                autoFocus
                type="text"
                placeholder="Search staff by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <div className="max-h-60 space-y-0.5 overflow-y-auto">
                {filtered.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      if (selected.length === 0) {
                        onStartDirect(u.id);
                      } else {
                        toggle(u.id);
                      }
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${selected.includes(u.id) ? 'bg-emerald-500/10 ring-1 ring-emerald-500/20' : 'hover:bg-white/5'}`}
                  >
                    <UserAvatar user={u} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {u.department
                          ? `${u.full_name || u.email} (${u.department})`
                          : u.full_name || u.email}
                      </p>
                      {u.full_name && (
                        <p className="truncate text-[11px] text-slate-400">
                          {u.email}
                        </p>
                      )}
                    </div>
                    {selected.includes(u.id) && (
                      <Check className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                    )}
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="py-6 text-center text-sm text-slate-500">
                    No staff found
                  </p>
                )}
              </div>
              {selected.length > 0 && (
                <button
                  onClick={() => setMode('group')}
                  className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
                >
                  Create Group ({selected.length} selected) ?
                </button>
              )}
              <p className="text-center text-[11px] text-slate-500">
                Tap one person for a direct chat � Select multiple to create a
                group
              </p>
            </>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {selected.map((id) => {
                  const u = staffList.find((s) => s.id === id);
                  return (
                    <span
                      key={id}
                      className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-1 text-xs text-emerald-300"
                    >
                      {u?.full_name || u?.email}
                      <button onClick={() => toggle(id)}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
              <input
                autoFocus
                type="text"
                placeholder="Group name *"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <input
                type="text"
                placeholder="Topic / description (optional)"
                value={groupTopic}
                onChange={(e) => setGroupTopic(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setMode('select')}
                  className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm text-slate-400 transition-colors hover:text-white"
                >
                  ? Back
                </button>
                <button
                  disabled={!groupName.trim() || selected.length === 0}
                  onClick={() => {
                    if (groupName.trim())
                      onCreateGroup(
                        selected,
                        groupName.trim(),
                        groupTopic.trim() || undefined
                      );
                  }}
                  className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Create Group
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
