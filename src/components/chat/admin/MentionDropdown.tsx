'use client';

import React from 'react';
import type { ChatUserProfile } from '@/types/chat';
import { UserAvatar } from './UserAvatar';

export const DEPARTMENTS: ChatUserProfile[] = [
  {
    id: 'dept_all',
    full_name: 'All Staff (@all)',
    email: 'all@ruhvi.in',
    role: 'all',
  },
  {
    id: 'dept_ops',
    full_name: 'Operations Team (@operations)',
    email: 'operations@ruhvi.in',
    role: 'operations',
  },
  {
    id: 'dept_tech',
    full_name: 'Tech & IT Team (@tech)',
    email: 'tech@ruhvi.in',
    role: 'tech',
  },
  {
    id: 'dept_support',
    full_name: 'Customer Support (@support)',
    email: 'support@ruhvi.in',
    role: 'support',
  },
  {
    id: 'dept_marketing',
    full_name: 'Marketing Team (@marketing)',
    email: 'marketing@ruhvi.in',
    role: 'marketing',
  },
  {
    id: 'dept_management',
    full_name: 'Management (@management)',
    email: 'management@ruhvi.in',
    role: 'admin',
  },
];

export function MentionDropdown({
  query,
  staffList,
  onSelect,
}: {
  query: string;
  staffList: ChatUserProfile[];
  onSelect: (user: ChatUserProfile) => void;
}) {
  const combinedList = [...DEPARTMENTS, ...staffList];
  const filtered = combinedList
    .filter(
      (u) =>
        (u.full_name || '').toLowerCase().includes(query.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(query.toLowerCase()) ||
        (u.role || '').toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 8);

  if (filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 z-50 mb-1 overflow-hidden rounded-xl border border-white/10 bg-[#1a1e2e] shadow-2xl">
      {filtered.map((u) => (
        <button
          key={u.id}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(u);
          }}
          className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/5"
        >
          <UserAvatar user={u} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {u.full_name || u.email}
            </p>
            {u.full_name && (
              <p className="truncate text-[10px] text-slate-400">{u.email}</p>
            )}
          </div>
          <span className="flex-shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px] capitalize text-slate-400">
            {u.role}
          </span>
        </button>
      ))}
    </div>
  );
}
