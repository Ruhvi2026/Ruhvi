'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MailboxSidebar } from './MailboxSidebar';
import { MailboxMessageList } from './MailboxMessageList';
import { MailboxThreadView } from './MailboxThreadView';
import { MailboxComposer } from './MailboxComposer';
import { MailboxConvertTaskModal } from './MailboxConvertTaskModal';
import type { EmailMessage, MailboxFolder } from '@/types/mailbox';
import { CheckCircle2 } from 'lucide-react';

export function MailboxPanel() {
  const [folder, setFolder] = useState<MailboxFolder>('inbox');
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [inboxUnread, setInboxUnread] = useState(0);

  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Composer state
  const [isComposing, setIsComposing] = useState(false);
  const [composerPrefill, setComposerPrefill] = useState<{
    to?: string;
    subject?: string;
    body?: string;
  }>({});

  // Convert to task modal state
  const [taskModalMessage, setTaskModalMessage] = useState<EmailMessage | null>(
    null
  );
  const [taskCreatedToast, setTaskCreatedToast] = useState<string | null>(null);

  const fetchMessages = useCallback(
    async (targetFolder: MailboxFolder, query: string = '') => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          folder: targetFolder,
          mailbox: 'shreya.maity',
          search: query,
        });

        const res = await fetch(`/api/mailbox/messages?${params.toString()}`);
        const data = await res.json();

        if (data.success && Array.isArray(data.messages)) {
          setMessages(data.messages);
          if (typeof data.unreadCount === 'number') {
            setInboxUnread(data.unreadCount);
          }
        } else {
          setMessages([]);
        }
      } catch (err) {
        console.error('Failed to load mailbox messages:', err);
        setMessages([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchMessages(folder, searchQuery);
  }, [folder, searchQuery, fetchMessages]);

  const handleFolderChange = (newFolder: MailboxFolder) => {
    setFolder(newFolder);
    setSelectedMessage(null);
    setIsComposing(false);
  };

  const handleSelectMessage = async (msg: EmailMessage) => {
    setSelectedMessage(msg);

    // If unread, mark read optimistically and notify server
    if (!msg.read) {
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, read: true } : m))
      );
      setInboxUnread((prev) => Math.max(0, prev - 1));

      try {
        await fetch(`/api/mailbox/messages/${msg.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ read: true }),
        });
      } catch (e) {
        console.warn('Failed to persist read status:', e);
      }
    }
  };

  const handleToggleStar = async (msg: EmailMessage, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newStarred = !msg.starred;

    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, starred: newStarred } : m))
    );
    if (selectedMessage?.id === msg.id) {
      setSelectedMessage((prev) =>
        prev ? { ...prev, starred: newStarred } : null
      );
    }

    try {
      await fetch(`/api/mailbox/messages/${msg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ starred: newStarred }),
      });
    } catch (err) {
      console.warn('Failed to toggle star:', err);
    }
  };

  const handleOpenCompose = (prefill?: {
    to?: string;
    subject?: string;
    body?: string;
  }) => {
    setComposerPrefill(prefill || {});
    setIsComposing(true);
  };

  const handleTaskCreated = (taskIdText: string) => {
    setTaskCreatedToast(`Task ${taskIdText} created successfully!`);
    setTimeout(() => setTaskCreatedToast(null), 4000);
  };

  return (
    <div className="relative flex flex-1 overflow-hidden bg-[#0D111E]">
      {/* Toast alert */}
      {taskCreatedToast && (
        <div className="animate-in fade-in slide-in-from-top-2 absolute left-1/2 top-3 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-emerald-500/40 bg-[#162725] px-3.5 py-2 text-xs font-semibold text-emerald-300 shadow-xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{taskCreatedToast}</span>
        </div>
      )}

      {/* Convert to Task Modal */}
      {taskModalMessage && (
        <MailboxConvertTaskModal
          message={taskModalMessage}
          onClose={() => setTaskModalMessage(null)}
          onSuccess={handleTaskCreated}
        />
      )}

      {/* Main Mailbox Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <MailboxSidebar
          folder={folder}
          inboxUnread={inboxUnread}
          onFolderChange={handleFolderChange}
          onCompose={() => handleOpenCompose()}
        />

        {/* Dynamic Right Area */}
        <div className="flex flex-1 flex-col overflow-hidden bg-[#0D111E]">
          {isComposing ? (
            <MailboxComposer
              initialTo={composerPrefill.to || ''}
              initialSubject={composerPrefill.subject || ''}
              initialBody={composerPrefill.body || ''}
              onClose={() => setIsComposing(false)}
              onSent={() => {
                setIsComposing(false);
                fetchMessages(folder, searchQuery);
              }}
            />
          ) : selectedMessage ? (
            <MailboxThreadView
              message={selectedMessage}
              onBack={() => setSelectedMessage(null)}
              onReply={(draftBody, replySubject) =>
                handleOpenCompose({
                  to: selectedMessage.from.email,
                  subject: replySubject || `Re: ${selectedMessage.subject}`,
                  body: draftBody || '',
                })
              }
              onConvertToTask={(msg) => setTaskModalMessage(msg)}
              onToggleStar={(msg) => handleToggleStar(msg)}
            />
          ) : (
            <MailboxMessageList
              messages={messages}
              loading={loading}
              folder={folder}
              selectedMessageId={undefined}
              onSelectMessage={handleSelectMessage}
              onToggleStar={handleToggleStar}
              onRefresh={() => fetchMessages(folder, searchQuery)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          )}
        </div>
      </div>
    </div>
  );
}
