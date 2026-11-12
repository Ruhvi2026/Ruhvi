'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Inbox, Users, Check } from 'lucide-react';
import type { RuhMailbox } from '@/types/mailbox';

interface MailboxAccountSwitcherProps {
  activeMailbox: string;
  onMailboxChange: (localPart: string) => void;
}

export function MailboxAccountSwitcher({
  activeMailbox,
  onMailboxChange,
}: MailboxAccountSwitcherProps) {
  const [mailboxes, setMailboxes] = useState<RuhMailbox[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/mailbox/accounts')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setMailboxes(d.mailboxes);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const active = mailboxes.find((m) => m.local_part === activeMailbox);

  return (
    <div ref={ref} className="relative border-b border-white/5 px-2 py-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-white/5"
      >
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600/30">
          {active?.mailbox_type === 'shared' ? (
            <Users className="h-3 w-3 text-emerald-400" />
          ) : (
            <Inbox className="h-3 w-3 text-emerald-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-white">
            {active?.display_name || activeMailbox}
          </p>
          <p className="truncate text-[10px] text-slate-400">
            {active?.email || `${activeMailbox}@ruhvi.in`}
          </p>
        </div>
        <ChevronDown
          className={`h-3 w-3 flex-shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && mailboxes.length > 0 && (
        <div className="absolute left-1 right-1 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#1a2235] shadow-2xl backdrop-blur-md">
          {mailboxes.map((mb) => (
            <button
              key={mb.id}
              onClick={() => {
                onMailboxChange(mb.local_part);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-white/5"
            >
              <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600/20">
                {mb.mailbox_type === 'shared' ? (
                  <Users className="h-2.5 w-2.5 text-emerald-400" />
                ) : (
                  <Inbox className="h-2.5 w-2.5 text-emerald-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-white">
                  {mb.display_name}
                </p>
                <p className="truncate text-[10px] text-slate-400">
                  {mb.email}
                </p>
              </div>
              {activeMailbox === mb.local_part && (
                <Check className="h-3 w-3 flex-shrink-0 text-emerald-400" />
              )}
            </button>
          ))}
          {/* All inboxes option */}
          <div className="mt-1 border-t border-white/5 pt-1">
            <button
              onClick={() => {
                onMailboxChange('all');
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-white/5"
            >
              <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-violet-600/20">
                <Inbox className="h-2.5 w-2.5 text-violet-400" />
              </div>
              <p className="text-xs font-medium text-slate-300">All Inboxes</p>
              {activeMailbox === 'all' && (
                <Check className="ml-auto h-3 w-3 flex-shrink-0 text-emerald-400" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
