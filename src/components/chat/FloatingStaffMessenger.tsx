'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useUnreadChatCount } from '@/hooks/useUnreadChatCount';
import type {
  ChatConversation,
  ChatMessage,
  ChatUserProfile,
  ChatAttachment,
} from '@/types/chat';
import AutoLinkText from '@/components/chat/AutoLinkText';
import {
  MessageCircle,
  X,
  Minus,
  Maximize2,
  ArrowLeft,
  Search,
  Send,
  Paperclip,
  Loader2,
  Lock,
  Radio,
  Users,
  CheckCheck,
  FileText,
  Download,
  AlertCircle,
  Hash,
} from 'lucide-react';

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0)
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString('en-IN', { weekday: 'short' });
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function getInitials(name: string | null, email: string | null) {
  const n = name || email || '?';
  const parts = n.split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return n.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  'bg-emerald-600',
  'bg-violet-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-sky-600',
  'bg-pink-600',
  'bg-teal-600',
  'bg-orange-600',
];

function avatarColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++)
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const DEPARTMENTS: ChatUserProfile[] = [
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
    id: 'dept_orders',
    full_name: 'Orders & Logistics (@orders)',
    email: 'orders@ruhvi.in',
    role: 'orders',
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

export default function FloatingStaffMessenger() {
  const { user } = useAuth();
  const unreadTotal = useUnreadChatCount(user?.uid);
  const supabase = createClient();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [userRole, setUserRole] = useState<string>('staff');

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [activeConv, setActiveConv] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Mentions & Entity references
  const [staffList, setStaffList] = useState<ChatUserProfile[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [pendingMentions, setPendingMentions] = useState<string[]>([]);
  const [showEntityPicker, setShowEntityPicker] = useState(false);
  const [entityType, setEntityType] = useState<
    'order' | 'support_ticket' | 'product'
  >('order');
  const [entityId, setEntityId] = useState('');
  const [pendingEntityRefs, setPendingEntityRefs] = useState<any[]>([]);

  // In-Chat Search State
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [inChatSearchQuery, setInChatSearchQuery] = useState('');

  const displayedMessages = useMemo(() => {
    if (!inChatSearchQuery.trim()) return messages;
    const q = inChatSearchQuery.trim().toLowerCase();
    return messages.filter((m) =>
      (m.text_content || '').toLowerCase().includes(q)
    );
  }, [messages, inChatSearchQuery]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = ['super_admin', 'admin'].includes(userRole);

  // Fetch current user's role & staff list
  useEffect(() => {
    if (!user?.uid) return;
    supabase
      .from('users')
      .select('role')
      .eq('id', user.uid)
      .maybeSingle()
      .then(({ data }: { data: any }) => {
        if (data?.role) setUserRole(data.role);
      });

    fetch('/api/internal-chat/staff')
      .then((r) => r.json())
      .then((d) => {
        if (d.staff) setStaffList(d.staff);
      })
      .catch(() => {});
  }, [user?.uid, supabase]);

  // Global event listener to toggle widget from header
  useEffect(() => {
    const handleToggle = () => {
      setIsOpen((prev) => {
        if (!prev) {
          setIsMinimized(false);
          return true;
        } else if (isMinimized) {
          setIsMinimized(false);
          return true;
        } else {
          return false;
        }
      });
    };

    window.addEventListener('toggle-staff-messenger', handleToggle);
    return () =>
      window.removeEventListener('toggle-staff-messenger', handleToggle);
  }, [isMinimized]);

  // Load conversations when opened
  const loadConversations = useCallback(async () => {
    if (!user?.uid) return;
    setLoadingConvs(true);
    try {
      const res = await fetch('/api/internal-chat/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('FloatingMessenger: Failed to load conversations', err);
    } finally {
      setLoadingConvs(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      loadConversations();
    }
  }, [isOpen, isMinimized, loadConversations]);

  // Load messages when an active conversation is selected
  const loadMessages = useCallback(async (convId: string) => {
    setLoadingMsgs(true);
    try {
      const res = await fetch(
        `/api/internal-chat/conversations/${convId}/messages?limit=60`
      );
      if (res.ok) {
        const data = await res.json();
        setMessages((data.messages || []).reverse());
        // Mark conversation as read
        fetch('/api/internal-chat/reads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversation_id: convId }),
        }).catch(() => {});
      }
    } catch (err) {
      console.error('FloatingMessenger: Failed to load messages', err);
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  useEffect(() => {
    if (activeConv) {
      loadMessages(activeConv.id);
    }
  }, [activeConv, loadMessages]);

  // Real-time subscription to active conversation messages
  // Real-time subscription to active conversation messages and read status
  useEffect(() => {
    if (!activeConv || !isOpen || isMinimized) return;

    const channel = supabase
      .channel(`floating_chat_${activeConv.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${activeConv.id}`,
        },
        async () => {
          loadMessages(activeConv.id);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${activeConv.id}`,
        },
        async () => {
          loadMessages(activeConv.id);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_message_reads',
        },
        async () => {
          loadMessages(activeConv.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConv, isOpen, isMinimized, supabase, loadMessages]);

  // Scroll to bottom
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle typing to detect @mention
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);
    const match = val.match(/@([\w.]*)$/);
    setMentionQuery(match ? match[1] : null);
  };

  const insertMention = (u: ChatUserProfile) => {
    const name =
      u.full_name?.replace(/\s+/g, '') || u.email?.split('@')[0] || 'staff';
    const newText = inputText.replace(/@[\w.]*$/, `@${name} `);
    setInputText(newText);
    if (!u.id.startsWith('dept_')) {
      setPendingMentions((prev) =>
        prev.includes(u.id) ? prev : [...prev, u.id]
      );
    }
    setMentionQuery(null);
    textInputRef.current?.focus();
  };

  // Add entity reference
  const handleAddEntityRef = () => {
    if (!entityId.trim()) return;
    const prefixMap = {
      order: 'Order',
      support_ticket: 'Ticket',
      product: 'Product',
    };
    const newRef = {
      entity_type: entityType,
      entity_id: entityId.trim(),
      display_label: `${prefixMap[entityType]} #${entityId.trim()}`,
    };
    setPendingEntityRefs((prev) => [...prev, newRef]);
    setEntityId('');
    setShowEntityPicker(false);
  };

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (
      (!inputText.trim() && pendingEntityRefs.length === 0) ||
      !activeConv ||
      sendingMsg
    )
      return;

    const text = inputText.trim();
    setInputText('');
    setSendingMsg(true);

    try {
      const res = await fetch(
        `/api/internal-chat/conversations/${activeConv.id}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text_content: text || undefined,
            message_type: 'text',
            mentions: pendingMentions.length > 0 ? pendingMentions : undefined,
            entity_refs:
              pendingEntityRefs.length > 0 ? pendingEntityRefs : undefined,
          }),
        }
      );

      if (res.ok) {
        setPendingMentions([]);
        setPendingEntityRefs([]);
        loadMessages(activeConv.id);
      }
    } catch (err) {
      console.error('FloatingMessenger: Failed to send message', err);
    } finally {
      setSendingMsg(false);
    }
  };

  // Upload attachment
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConv) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversation_id', activeConv.id);

      const res = await fetch('/api/internal-chat/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        // Send attachment message
        await fetch(
          `/api/internal-chat/conversations/${activeConv.id}/messages`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text_content: file.name,
              message_type: 'attachment',
              attachments: [
                {
                  id: data.attachment.id,
                  cloudinary_public_id: data.attachment.cloudinary_public_id,
                  cloudinary_url: data.attachment.cloudinary_url,
                  resource_type: data.attachment.resource_type,
                  file_name: data.attachment.file_name,
                  file_size: data.attachment.file_size,
                  mime_type: data.attachment.mime_type,
                },
              ],
            }),
          }
        );
        loadMessages(activeConv.id);
      }
    } catch (err) {
      console.error('FloatingMessenger: Upload failed', err);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (
      c.group_name ||
      c.other_user?.full_name ||
      c.other_user?.email ||
      ''
    ).toLowerCase();
    return name.includes(q);
  });

  const getConvTitle = (c: ChatConversation) => {
    if (c.type === 'broadcast')
      return c.group_name || '📢 Official Staff Broadcast';
    if (c.type === 'group') return c.group_name || 'Group Chat';
    const name =
      c.other_user?.full_name || c.other_user?.email || 'Direct Chat';
    return c.other_user?.department
      ? `${name} (${c.other_user.department})`
      : name;
  };

  const mentionList = [...DEPARTMENTS, ...staffList]
    .filter((u) => {
      if (!mentionQuery) return false;
      const q = mentionQuery.toLowerCase();
      return (
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.role || '').toLowerCase().includes(q)
      );
    })
    .slice(0, 6);

  // ─── 1. Minimized State: Sleek Floating Pill at Bottom-Right ─────────────────
  if (isOpen && isMinimized) {
    return (
      <div
        onClick={() => setIsMinimized(false)}
        className="group fixed bottom-5 right-5 z-50 flex transform cursor-pointer select-none items-center gap-2.5 rounded-full border border-emerald-400/40 bg-gradient-to-r from-emerald-700 to-teal-800 px-3.5 py-2.5 text-white shadow-2xl ring-1 ring-emerald-500/30 transition-all hover:scale-105 hover:from-emerald-600 hover:to-teal-700"
        title="Open RuhChat"
      >
        <div className="relative flex items-center">
          <img
            src="/ruhchat-icon.png"
            alt="RuhChat"
            className="h-6 w-6 rounded-lg object-cover shadow-sm"
          />
          {unreadTotal > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 animate-pulse items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-md">
              {unreadTotal > 9 ? '9+' : unreadTotal}
            </span>
          )}
        </div>
        <span className="text-xs font-bold tracking-wide">
          {activeConv ? getConvTitle(activeConv) : 'RuhChat'}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
          }}
          className="ml-1 rounded-full p-0.5 text-white/80 transition hover:bg-black/20 hover:text-white"
          title="Close RuhChat"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  // ─── 2. Completely Closed: Render Bottom-Right Floating Quick Launch Bubble ────
  if (!isOpen) {
    return (
      <div
        onClick={() => {
          setIsOpen(true);
          setIsMinimized(false);
        }}
        className="group fixed bottom-5 right-5 z-50 flex h-12 w-12 transform cursor-pointer items-center justify-center rounded-2xl border border-emerald-400/30 bg-gradient-to-tr from-emerald-800 via-teal-800 to-emerald-700 p-1.5 text-white shadow-2xl transition-all hover:scale-110 hover:from-emerald-700 hover:to-teal-600"
        title="RuhChat - Staff Messenger (Click to open)"
      >
        <img
          src="/ruhchat-icon.png"
          alt="RuhChat"
          className="h-full w-full rounded-xl object-cover shadow-inner"
        />
        {unreadTotal > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 animate-pulse items-center justify-center rounded-full border border-white/20 bg-rose-500 text-[11px] font-bold text-white shadow-md">
            {unreadTotal > 9 ? '9+' : unreadTotal}
          </span>
        )}
      </div>
    );
  }

  // ─── 3. Open Floating Dialog (Anchored Right Bottom) ─────────────────────────
  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-5 fixed bottom-5 right-5 z-50 flex h-[580px] max-h-[calc(100vh-80px)] w-[420px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111625] text-slate-100 shadow-2xl duration-200"
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      {/* ── Header ── */}
      <div className="h-13 flex flex-shrink-0 select-none items-center justify-between border-b border-white/10 bg-[#161D31] px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          {activeConv ? (
            <button
              onClick={() => setActiveConv(null)}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
              title="Back to conversations"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <img
              src="/ruhchat-icon.png"
              alt="RuhChat"
              className="h-6 w-6 rounded-lg object-cover shadow"
            />
          )}

          <div className="min-w-0">
            <h3 className="flex items-center gap-1.5 truncate text-xs font-bold text-white">
              {activeConv ? (
                <>
                  {activeConv.type === 'broadcast' && (
                    <Radio className="h-3.5 w-3.5 flex-shrink-0 text-orange-400" />
                  )}
                  {getConvTitle(activeConv)}
                </>
              ) : (
                'RuhChat'
              )}
            </h3>
            <p className="truncate text-[10px] text-slate-400">
              {activeConv
                ? activeConv.type === 'broadcast'
                  ? 'Official Announcements'
                  : activeConv.type === 'group'
                    ? 'Group Chat'
                    : 'Direct Message'
                : 'Internal Staff Messenger'}
            </p>
          </div>
        </div>

        {/* Window Action Buttons */}
        <div className="flex items-center gap-1">
          {activeConv && (
            <button
              onClick={() => {
                setShowInChatSearch((prev) => !prev);
                if (showInChatSearch) setInChatSearchQuery('');
              }}
              className={`rounded-lg p-1.5 transition ${
                showInChatSearch
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
              title="Search in this chat"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          )}

          <Link
            href="/admin/chat"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            title="Open in Full Screen (/admin/chat)"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Link>

          <button
            onClick={() => setIsMinimized(true)}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            title="Minimize to floating pill"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            title="Close RuhChat"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* In-Chat Search Bar when active conversation */}
      {activeConv && showInChatSearch && (
        <div className="flex flex-shrink-0 items-center gap-2 border-b border-white/10 bg-[#161D31] px-3 py-1.5">
          <Search className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
          <input
            autoFocus
            type="text"
            placeholder="Search in this chat or broadcast..."
            value={inChatSearchQuery}
            onChange={(e) => setInChatSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
          />
          {inChatSearchQuery && (
            <span className="text-[10px] font-medium text-emerald-400">
              {displayedMessages.length} found
            </span>
          )}
          <button
            onClick={() => {
              setShowInChatSearch(false);
              setInChatSearchQuery('');
            }}
            className="p-0.5 text-slate-400 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Body Content ── */}
      {!activeConv ? (
        // VIEW A: CONVERSATION LIST
        <div className="flex flex-1 flex-col overflow-hidden bg-[#0D111E]">
          {/* Search bar */}
          <div className="border-b border-white/5 bg-[#13192B] p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff, group, or broadcast..."
                className="w-full rounded-xl border border-white/10 bg-[#0D111E] py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 divide-y divide-white/5 overflow-y-auto">
            {loadingConvs ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center px-4 text-center">
                <MessageCircle className="mb-2 h-8 w-8 text-slate-600" />
                <p className="text-xs text-slate-400">
                  No conversations found.
                </p>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const title = getConvTitle(c);
                const isBroadcast = c.type === 'broadcast';
                const unread = c.unread_count || 0;

                return (
                  <div
                    key={c.id}
                    onClick={() => setActiveConv(c)}
                    className="flex cursor-pointer select-none items-center gap-3 p-3 transition hover:bg-white/5"
                  >
                    {/* Avatar */}
                    {isBroadcast ? (
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-amber-600 to-orange-500 text-white shadow">
                        <Radio className="h-5 w-5" />
                      </div>
                    ) : c.type === 'group' ? (
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white shadow">
                        <Users className="h-5 w-5" />
                      </div>
                    ) : (
                      <div
                        className={`h-10 w-10 rounded-full ${avatarColor(
                          c.other_user?.id || c.id
                        )} flex flex-shrink-0 items-center justify-center text-xs font-bold text-white shadow`}
                      >
                        {getInitials(
                          c.other_user?.full_name || null,
                          c.other_user?.email || null
                        )}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex items-center justify-between">
                        <h4 className="flex items-center gap-1.5 truncate text-xs font-semibold text-white">
                          {title}
                        </h4>
                        {c.last_message && (
                          <span className="flex-shrink-0 text-[10px] text-slate-500">
                            {formatTime(c.last_message.created_at)}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[11px] text-slate-400">
                        {c.last_message?.text_content ||
                          (c.last_message?.attachments?.length
                            ? '📎 Attachment'
                            : 'No messages yet')}
                      </p>
                    </div>

                    {unread > 0 && (
                      <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        // VIEW B: ACTIVE CHAT ROOM
        <div className="relative flex flex-1 flex-col overflow-hidden bg-[#0D111E]">
          {/* Messages Feed */}
          <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
            {loadingMsgs ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
              </div>
            ) : displayedMessages.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center text-center text-xs text-slate-500">
                {inChatSearchQuery ? (
                  <>
                    <Search className="mb-1.5 h-6 w-6 text-slate-600" />
                    <span>No messages match "{inChatSearchQuery}"</span>
                  </>
                ) : (
                  'Start the conversation 👋'
                )}
              </div>
            ) : (
              displayedMessages.map((m: ChatMessage) => {
                const isMe = m.sender_id === user?.uid;
                const attachments =
                  (m as any).chat_attachments || m.attachments || [];
                const entityRefs =
                  (m as any).chat_entity_references || m.entity_refs || [];

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    {!isMe && m.sender && activeConv.type !== 'direct' && (
                      <span className="mb-0.5 ml-1 text-[10px] font-semibold text-emerald-400">
                        {m.sender.department
                          ? `${m.sender.full_name || m.sender.email} (${m.sender.department})`
                          : m.sender.full_name || m.sender.email}
                      </span>
                    )}

                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs shadow-sm ${
                        isMe
                          ? 'rounded-br-none bg-emerald-600 text-white'
                          : 'rounded-bl-none border border-white/5 bg-[#182136] text-slate-200'
                      }`}
                    >
                      {/* Attachments */}
                      {attachments.length > 0 &&
                        attachments.map((att: ChatAttachment) => (
                          <div key={att.id} className="mb-1.5">
                            {att.resource_type === 'image' ? (
                              <a
                                href={att.cloudinary_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <img
                                  src={att.cloudinary_url}
                                  alt={att.file_name}
                                  className="max-h-44 rounded-lg object-cover"
                                />
                              </a>
                            ) : (
                              <a
                                href={att.cloudinary_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 rounded-lg bg-black/20 p-2 text-white hover:bg-black/30"
                              >
                                <FileText className="h-4 w-4 text-emerald-300" />
                                <span className="max-w-[160px] truncate">
                                  {att.file_name}
                                </span>
                                <Download className="h-3.5 w-3.5 text-slate-400" />
                              </a>
                            )}
                          </div>
                        ))}

                      {/* Text content with clickable phone, email, and URLs */}
                      {m.text_content && (
                        <AutoLinkText
                          text={m.text_content}
                          className="whitespace-pre-wrap break-words leading-relaxed"
                          linkClassName={
                            isMe ? 'text-white underline font-semibold' : ''
                          }
                        />
                      )}

                      {/* Clickable Entity References (#Order, #Ticket, #Product) */}
                      {entityRefs.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {entityRefs.map((ref: any) => {
                            let href = '#';
                            if (ref.entity_type === 'order')
                              href = `/admin/orders?search=${encodeURIComponent(ref.entity_id)}`;
                            else if (ref.entity_type === 'support_ticket')
                              href = `/support/tickets/${ref.entity_id}`;
                            else if (ref.entity_type === 'product')
                              href = `/admin/products?search=${encodeURIComponent(ref.entity_id)}`;

                            return (
                              <a
                                key={ref.id}
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded bg-black/30 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300 transition hover:bg-black/40"
                                title={`View ${ref.entity_type}: ${ref.entity_id}`}
                              >
                                <Hash className="h-2.5 w-2.5" />
                                {ref.display_label || ref.entity_id}
                              </a>
                            );
                          })}
                        </div>
                      )}

                      <div className="mt-1 flex items-center justify-end gap-1 text-[9px] text-slate-400">
                        <span>{formatTime(m.created_at)}</span>
                        {isMe && (
                          <CheckCheck className="inline h-3 w-3 text-emerald-300" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Pending Entity Reference Badges */}
          {pendingEntityRefs.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-t border-white/5 bg-[#13192B] px-3 py-1.5">
              {pendingEntityRefs.map((ref, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] text-emerald-300"
                >
                  <Hash className="h-3 w-3" />
                  {ref.display_label}
                  <button
                    type="button"
                    onClick={() =>
                      setPendingEntityRefs((prev) =>
                        prev.filter((_, i) => i !== idx)
                      )
                    }
                    className="ml-1 text-slate-400 hover:text-white"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* @Mention Autocomplete Dropdown */}
          {mentionQuery !== null && mentionList.length > 0 && (
            <div className="absolute bottom-14 left-2 right-2 z-50 max-h-48 divide-y divide-white/5 overflow-hidden overflow-y-auto rounded-xl border border-white/10 bg-[#1A2136] shadow-2xl">
              {mentionList.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertMention(u);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white transition hover:bg-white/5"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold">
                    {u.id.startsWith('dept_')
                      ? '🏢'
                      : getInitials(u.full_name, u.email)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {u.full_name || u.email}
                    </p>
                    <p className="text-[10px] capitalize text-slate-400">
                      {u.role}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* # Entity Reference Quick Picker Modal */}
          {showEntityPicker && (
            <div className="absolute bottom-14 left-2 right-2 z-50 rounded-xl border border-white/10 bg-[#1A2136] p-3 shadow-2xl">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs font-bold text-white">
                  <Hash className="h-3.5 w-3.5 text-emerald-400" /> Reference
                  Item
                </span>
                <button
                  type="button"
                  onClick={() => setShowEntityPicker(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mb-2 flex gap-1">
                {(['order', 'support_ticket', 'product'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setEntityType(t)}
                    className={`flex-1 rounded py-1 text-[10px] font-medium transition ${
                      entityType === t
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {t === 'support_ticket'
                      ? 'Ticket'
                      : t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>

              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={entityId}
                  onChange={(e) => setEntityId(e.target.value)}
                  placeholder={
                    entityType === 'order'
                      ? 'Order ID (e.g. RUH12345)'
                      : entityType === 'support_ticket'
                        ? 'Ticket ID'
                        : 'Product ID or Slug'
                  }
                  className="flex-1 rounded-lg border border-white/10 bg-[#0D111E] px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddEntityRef();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddEntityRef}
                  disabled={!entityId.trim()}
                  className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Composer / Read-only Banner */}
          {activeConv.type === 'broadcast' &&
          !activeConv.allow_replies &&
          !isAdmin ? (
            <div className="border-t border-white/10 bg-[#13192B] p-3 text-center">
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-300">
                <Lock className="h-3.5 w-3.5 text-amber-400" />
                <span>
                  Broadcast channel is read-only. Only admins can post.
                </span>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSendMessage}
              className="flex items-center gap-2 border-t border-white/10 bg-[#13192B] p-2.5"
            >
              {/* Attachment Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-emerald-400 disabled:opacity-50"
                title="Attach image or file"
              >
                {uploadingFile ? (
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileUpload}
              />

              {/* # Reference Button */}
              <button
                type="button"
                onClick={() => setShowEntityPicker((prev) => !prev)}
                className={`rounded-lg p-1.5 transition ${
                  showEntityPicker
                    ? 'bg-white/10 text-emerald-400'
                    : 'text-slate-400 hover:bg-white/5 hover:text-emerald-400'
                }`}
                title="Reference Order / Ticket / Product (#)"
              >
                <Hash className="h-4 w-4" />
              </button>

              <input
                ref={textInputRef}
                type="text"
                value={inputText}
                onChange={handleInputChange}
                placeholder="Message… (@ for staff/dept, # to reference)"
                className="flex-1 rounded-xl border border-white/10 bg-[#0D111E] px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />

              <button
                type="submit"
                disabled={
                  sendingMsg ||
                  (!inputText.trim() && pendingEntityRefs.length === 0)
                }
                className="rounded-xl bg-emerald-600 p-1.5 text-white transition hover:bg-emerald-500 disabled:opacity-40"
                title="Send message"
              >
                {sendingMsg ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
