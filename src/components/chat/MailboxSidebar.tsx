'use client';

import React from 'react';
import { Inbox, Send, Star, FileText, PenSquare, Sparkles } from 'lucide-react';
import type { MailboxFolder } from '@/types/mailbox';

interface MailboxSidebarProps {
  folder: MailboxFolder;
  inboxUnread: number;
  onFolderChange: (folder: MailboxFolder) => void;
  onCompose: () => void;
  activeMailbox?: string;
}

const FOLDER_ITEMS: Array<{
  id: MailboxFolder;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'sent', label: 'Sent', icon: Send },
  { id: 'starred', label: 'Starred', icon: Star },
  { id: 'drafts', label: 'Drafts', icon: FileText },
];

export function MailboxSidebar({
  folder,
  inboxUnread,
  onFolderChange,
  onCompose,
  activeMailbox = 'shreya.maity@ruhvi.in',
}: MailboxSidebarProps) {
  return (
    <div className="flex w-32 flex-shrink-0 flex-col border-r border-white/10 bg-[#13192B]">
      {/* Compose CTA */}
      <div className="border-b border-white/5 p-2">
        <button
          onClick={onCompose}
          className="group flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-2 py-2 text-xs font-bold text-white shadow-md shadow-emerald-950/40 transition hover:from-emerald-500 hover:to-teal-400 active:scale-[0.98]"
        >
          <PenSquare className="h-3.5 w-3.5" />
          <span>Compose</span>
        </button>
      </div>

      {/* Folder Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {FOLDER_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = folder === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onFolderChange(item.id)}
              className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium transition ${
                isActive
                  ? 'bg-emerald-500/15 font-semibold text-emerald-400 ring-1 ring-emerald-500/30'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Icon
                  className={`h-3.5 w-3.5 flex-shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.id === 'inbox' && inboxUnread > 0 && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold text-slate-950 shadow">
                  {inboxUnread > 99 ? '99+' : inboxUnread}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Active Mailbox Footer */}
      <div className="border-t border-white/5 bg-[#101524] p-2">
        <div className="mb-0.5 flex items-center gap-1 text-[10px] text-slate-500">
          <Sparkles className="h-2.5 w-2.5 text-emerald-400" />
          <span className="text-[9px] font-semibold uppercase tracking-wider">
            Account
          </span>
        </div>
        <p
          className="truncate text-[10px] font-medium text-slate-300"
          title={activeMailbox}
        >
          {activeMailbox}
        </p>
      </div>
    </div>
  );
}
