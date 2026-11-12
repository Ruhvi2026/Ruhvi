'use client';

import React from 'react';
import { Inbox, Send, Star, FileText, PenSquare } from 'lucide-react';
import type { MailboxFolder } from '@/types/mailbox';
import { MailboxAccountSwitcher } from './MailboxAccountSwitcher';

interface MailboxSidebarProps {
  folder: MailboxFolder;
  inboxUnread: number;
  onFolderChange: (folder: MailboxFolder) => void;
  onCompose: () => void;
  activeMailbox: string;
  onMailboxChange: (localPart: string) => void;
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
  activeMailbox = 'shreya.maity',
  onMailboxChange,
}: MailboxSidebarProps) {
  return (
    <div className="flex w-40 flex-shrink-0 flex-col border-r border-white/10 bg-[#13192B]">
      {/* RuhMail branding label */}
      <div className="flex items-center justify-between px-3 pb-1 pt-2.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
          RuhMail
        </span>
        <span className="py-0.2 rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 font-mono text-[9px] text-emerald-300">
          v1.0
        </span>
      </div>

      {/* Account Switcher */}
      <MailboxAccountSwitcher
        activeMailbox={activeMailbox}
        onMailboxChange={onMailboxChange}
      />

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
        <p
          className="truncate text-[10px] font-medium text-slate-500"
          title={activeMailbox}
        >
          {activeMailbox}@ruhvi.in
        </p>
      </div>
    </div>
  );
}
