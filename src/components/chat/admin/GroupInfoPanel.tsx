'use client';

import React, { useState } from 'react';
import type { ChatConversation, ChatUserProfile } from '@/types/chat';
import { X, Users, UserPlus, Check, LogOut } from 'lucide-react';
import Link from 'next/link';
import { UserAvatar } from './UserAvatar';

export function GroupInfoPanel({
  conv,
  staffList,
  currentUserId,
  onClose,
  onAddMembers,
  onLeave,
}: {
  conv: ChatConversation;
  staffList: ChatUserProfile[];
  currentUserId: string;
  onClose: () => void;
  onAddMembers: (userIds: string[]) => void;
  onLeave: () => void;
}) {
  const [addMode, setAddMode] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const memberIds = new Set((conv.members || []).map((m) => m.user_id));
  const nonMembers = staffList.filter(
    (u) => !memberIds.has(u.id) && u.id !== currentUserId
  );
  const filteredNon = nonMembers.filter(
    (u) =>
      !search ||
      (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex w-72 flex-col border-l border-white/5 bg-[#131726]">
      <div className="flex h-14 items-center justify-between border-b border-white/5 px-4">
        <h3 className="text-sm font-bold text-white">Group Info</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        {/* Group avatar + name */}
        <div className="flex flex-col items-center gap-2 py-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-600">
            <Users className="h-8 w-8 text-white" />
          </div>
          <p className="text-base font-bold text-white">{conv.group_name}</p>
          {conv.group_topic && (
            <p className="text-center text-xs text-slate-400">
              {conv.group_topic}
            </p>
          )}
          <p className="text-[11px] text-slate-500">
            {(conv.members || []).length} members
          </p>
        </div>

        {/* Linked Task Details */}
        {conv.linked_task && (
          <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
                Linked Task
              </p>
              <Link
                href={`/admin/task-manager/${conv.linked_task.id}`}
                className="text-[10px] font-medium text-indigo-300 hover:text-indigo-200 hover:underline"
              >
                View
              </Link>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-300">
                {conv.linked_task.task_id_text}
              </span>
              <span className="text-sm font-bold text-white">
                {conv.linked_task.title}
              </span>
              <div className="mt-1 flex items-center gap-2">
                {conv.linked_task.priority && (
                  <span className="rounded border border-white/20 bg-black/20 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
                    {conv.linked_task.priority.name}
                  </span>
                )}
                {conv.linked_task.status && (
                  <span className="rounded border border-white/20 bg-black/20 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
                    {conv.linked_task.status.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Members list */}
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Members
          </p>
          <div className="space-y-1">
            {(conv.members || [])
              .filter((m) => !m.left_at)
              .map((m) => {
                const u = m.user as ChatUserProfile | undefined;
                return (
                  <div
                    key={m.user_id}
                    className="flex items-center gap-2.5 rounded-lg px-2 py-2"
                  >
                    <UserAvatar user={u || null} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-white">
                        {u?.department
                          ? `${u?.full_name || u?.email || 'Staff'} (${u.department})`
                          : u?.full_name || u?.email || 'Staff'}
                      </p>
                      <p className="text-[10px] capitalize text-slate-400">
                        {u?.role}
                        {m.is_admin ? ' � admin' : ''}
                      </p>
                    </div>
                    {m.user_id === currentUserId && (
                      <span className="text-[10px] text-emerald-400">You</span>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Add members */}
        {!addMode ? (
          <button
            onClick={() => setAddMode(true)}
            className="flex w-full items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <UserPlus className="h-4 w-4" />
            Add Members
          </button>
        ) : (
          <div className="space-y-2">
            <input
              autoFocus
              type="text"
              placeholder="Search staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <div className="max-h-40 space-y-0.5 overflow-y-auto">
              {filteredNon.map((u) => (
                <button
                  key={u.id}
                  onClick={() =>
                    setSelected((prev) =>
                      prev.includes(u.id)
                        ? prev.filter((x) => x !== u.id)
                        : [...prev, u.id]
                    )
                  }
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${selected.includes(u.id) ? 'bg-emerald-500/10' : 'hover:bg-white/5'}`}
                >
                  <UserAvatar user={u} size="sm" />
                  <span className="flex-1 truncate text-xs text-white">
                    {u.full_name || u.email}
                  </span>
                  {selected.includes(u.id) && (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  )}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setAddMode(false);
                  setSelected([]);
                }}
                className="flex-1 rounded-lg border border-white/10 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                disabled={selected.length === 0}
                onClick={() => {
                  onAddMembers(selected);
                  setAddMode(false);
                  setSelected([]);
                }}
                className="flex-1 rounded-lg bg-emerald-600 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                Add {selected.length > 0 ? `(${selected.length})` : ''}
              </button>
            </div>
          </div>
        )}

        {/* Leave group */}
        <button
          onClick={onLeave}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-400 transition-colors hover:bg-rose-500/10"
        >
          <LogOut className="h-4 w-4" />
          Leave Group
        </button>
      </div>
    </div>
  );
}
