'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useUnreadChatCount } from '@/hooks/useUnreadChatCount';
import { useSessionUserId } from '@/hooks/useSessionUserId';
import type {
  ChatConversation,
  ChatMessage,
  ChatUserProfile,
  ChatAttachment,
} from '@/types/chat';
import AutoLinkText from '@/components/chat/AutoLinkText';
import { VoiceNotePlayer } from '@/components/chat/VoiceNotePlayer';
import { VoiceNoteRecorder } from '@/components/chat/VoiceNoteRecorder';
import { SpeechToTextButton } from '@/components/chat/SpeechToTextButton';
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
  ClipboardList,
  Sparkles,
  ExternalLink,
  Bot,
  Mic,
  Mail,
  Bell,
} from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import { MailboxPanel } from '@/components/chat/MailboxPanel';
import { NotificationPanel } from '@/components/chat/NotificationPanel';

import { AIWorkerPersona, AI_WORKER_PERSONAS } from '@/lib/chat/ai-workers';
export type { AIWorkerPersona };
export { AI_WORKER_PERSONAS };

function extractImageUrls(text: string): {
  cleanText: string;
  imageUrls: string[];
} {
  const imageUrls: string[] = [];
  const mdRegex = /!\[([^\]]*)\]\((https?:\/\/[^\s\)]+)\)/g;
  let match;
  while ((match = mdRegex.exec(text)) !== null) {
    imageUrls.push(match[2]);
  }
  const cleanText = text.replace(mdRegex, '').trim();

  const rawUrlRegex =
    /(https:\/\/res\.cloudinary\.com\/[^\s<>"'\)]+\.(?:png|jpg|jpeg|webp))/gi;
  while ((match = rawUrlRegex.exec(text)) !== null) {
    if (!imageUrls.includes(match[1])) {
      imageUrls.push(match[1]);
    }
  }

  return { cleanText, imageUrls };
}

function hasDraftNotice(text: string): boolean {
  const keywords = [
    'ড্রাফট',
    'draft',
    'পাবলিশ করার জন্য',
    'review and publish',
    'marketing portal',
    'operations portal',
    'support portal',
    'পোর্টালে লগইন করে',
  ];
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

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
  const { user, profile } = useAuth();
  const supabaseUserId = useSessionUserId();
  const unreadTotal = useUnreadChatCount(supabaseUserId ?? undefined);
  const supabase = createClient();
  const pathname = usePathname();
  const portalPrefix = pathname ? `/${pathname.split('/')[1]}` : '/admin';

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [userRole, setUserRole] = useState<string>('staff');
  const [userDept, setUserDept] = useState<string>('orders');
  const [selectedAiDept, setSelectedAiDept] = useState<string | null>(null);
  const [aiMessages, setAiMessages] = useState<Record<string, ChatMessage[]>>(
    {}
  );
  const [aiThinking, setAiThinking] = useState(false);

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [activeConv, setActiveConv] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isRecordingVoiceNote, setIsRecordingVoiceNote] = useState(false);
  const [uploadingVoiceNote, setUploadingVoiceNote] = useState(false);

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

  // Department & AI Worker resolution
  const effectiveDept = useMemo(() => {
    if (
      userDept &&
      ['marketing', 'operations', 'orders', 'support', 'tech'].includes(
        userDept.toLowerCase()
      )
    ) {
      return userDept.toLowerCase();
    }
    if (pathname.includes('/marketing')) return 'marketing';
    if (pathname.includes('/operations')) return 'operations';
    if (pathname.includes('/portal-orders')) return 'orders';
    if (pathname.includes('/support')) return 'support';
    if (pathname.includes('/tech')) return 'tech';
    return 'orders';
  }, [userDept, pathname]);

  const currentAiDept = selectedAiDept || effectiveDept;
  const currentAIWorker =
    AI_WORKER_PERSONAS[currentAiDept] || AI_WORKER_PERSONAS['orders'];
  const isAiActive = !!activeConv?.id.startsWith('ai_');

  const activeMessages = useMemo(() => {
    if (isAiActive) {
      return aiMessages[currentAiDept] || [];
    }
    return messages;
  }, [isAiActive, aiMessages, currentAiDept, messages]);

  const displayedMessages = useMemo(() => {
    if (!inChatSearchQuery.trim()) return activeMessages;
    const q = inChatSearchQuery.trim().toLowerCase();
    return activeMessages.filter((m) =>
      (m.text_content || '').toLowerCase().includes(q)
    );
  }, [activeMessages, inChatSearchQuery]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isChatScrolledUp, setIsChatScrolledUp] = useState(false);
  const [activeMode, setActiveMode] = useState<'chat' | 'mailbox'>('chat');
  const [activeTab, setActiveTab] = useState<
    'all' | 'broadcast' | 'groups' | 'notifications'
  >('all');
  const { unreadCount: notifUnreadCount } = useNotifications();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = ['super_admin', 'admin'].includes(userRole);

  // Fetch current user's role, department & staff list
  useEffect(() => {
    if (!supabaseUserId) return;
    supabase
      .from('users')
      .select('role, department')
      .eq('id', supabaseUserId)
      .maybeSingle()
      .then(({ data }: { data: any }) => {
        if (data?.role) setUserRole(data.role);
        if (data?.department) setUserDept(data.department);
      });

    fetch('/api/internal-chat/staff')
      .then((r) => r.json())
      .then((d) => {
        if (d.staff) setStaffList(d.staff);
      })
      .catch(() => {});
  }, [supabaseUserId, supabase]);

  // Open AI Worker Chat Handler
  const handleOpenAIWorkerChat = useCallback(
    (persona: AIWorkerPersona) => {
      const dept = persona.department;
      setSelectedAiDept(dept);

      let initialList: ChatMessage[] = [];
      try {
        if (typeof window !== 'undefined' && user?.uid) {
          const saved = localStorage.getItem(`ruhchat_ai_${user.uid}_${dept}`);
          if (saved) {
            initialList = JSON.parse(saved);
          }
        }
      } catch {}

      if (initialList.length === 0) {
        initialList = [
          {
            id: `welcome_${dept}`,
            conversation_id: `ai_${dept}`,
            sender_id: `ai_${dept}`,
            message_type: 'text',
            text_content: persona.welcomeMessage,
            reply_to_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
            is_edited: false,
            system_action: null,
          },
        ];
      }

      setAiMessages((prev) => ({
        ...prev,
        [dept]: prev[dept]?.length ? prev[dept] : initialList,
      }));

      const aiConvObj: ChatConversation = {
        id: `ai_${dept}`,
        type: 'direct',
        group_name: persona.name,
        group_topic: `${persona.roleTitle} (Draft Only)`,
        created_by: 'system_ai',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        archived_at: null,
        deleted_at: null,
        group_avatar_url: null,
        other_user: {
          id: `ai_${dept}`,
          full_name: persona.name,
          email: `${dept}-ai@ruhvi.in`,
          role: 'ai_worker',
          department: dept,
        },
      };

      setActiveConv(aiConvObj);
    },
    [user?.uid]
  );

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

  useEffect(() => {
    const handleOpenChat = async (e: any) => {
      const convId = e.detail?.conversationId;
      setIsOpen(true);
      setIsMinimized(false);
      if (convId) {
        try {
          const res = await fetch('/api/internal-chat/conversations');
          if (res.ok) {
            const data = await res.json();
            const list = data.conversations || [];
            setConversations(list);
            const target = list.find((c: any) => c.id === convId);
            if (target) {
              setActiveConv(target);
            } else {
              setActiveConv({
                id: convId,
                type: 'group',
                group_name: 'Task Group',
              } as any);
            }
          }
        } catch (err) {
          console.error('Failed to open task chat:', err);
        }
      }
    };

    window.addEventListener('open-staff-chat', handleOpenChat);
    return () => window.removeEventListener('open-staff-chat', handleOpenChat);
  }, []);

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
    if (convId.startsWith('ai_')) {
      return;
    }
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
    if (activeConv && !activeConv.id.startsWith('ai_')) {
      loadMessages(activeConv.id);
    }
  }, [activeConv, loadMessages]);

  // Real-time subscription to active conversation messages and read status
  useEffect(() => {
    if (
      !activeConv ||
      activeConv.id.startsWith('ai_') ||
      !isOpen ||
      isMinimized
    )
      return;

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

  const scrollToBottom = useCallback((smooth = true) => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
      setIsChatScrolledUp(false);
    }
  }, []);

  // Scroll to bottom only if user hasn't scrolled up to read history
  useEffect(() => {
    if (displayedMessages.length > 0 && !isChatScrolledUp) {
      scrollToBottom(true);
    }
  }, [displayedMessages, isChatScrolledUp, scrollToBottom]);

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

  // AI Message Handler (Calls isolated Department AI endpoint)
  const handleSendAiMessage = async (text: string) => {
    if (!text.trim() || aiThinking) return;
    const dept = currentAIWorker.department;
    const userMsg: ChatMessage = {
      id: `ai_user_${Date.now()}`,
      conversation_id: `ai_${dept}`,
      sender_id: user?.uid || 'user',
      message_type: 'text',
      text_content: text,
      reply_to_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      is_edited: false,
      system_action: null,
    };

    const currentList = aiMessages[dept] || [];
    const updatedWithUser = [...currentList, userMsg];
    setAiMessages((prev) => ({ ...prev, [dept]: updatedWithUser }));
    setAiThinking(true);
    setTimeout(() => scrollToBottom(true), 50);

    try {
      const conversationPayload = updatedWithUser.map((m) => ({
        role: m.sender_id === (user?.uid || 'user') ? 'user' : 'assistant',
        content: m.text_content || '',
      }));

      const res = await fetch('/api/internal-chat/ai-worker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: dept,
          messages: conversationPayload,
        }),
      });

      const data = await res.json();
      const aiReply =
        data.response ||
        'আমি এই মুহূর্তে উত্তর দিতে পারছি না। অনুগ্রহ করে ডিপার্টমেন্ট পোর্টাল চেক করুন।';

      const assistantMsg: ChatMessage = {
        id: `ai_reply_${Date.now()}`,
        conversation_id: `ai_${dept}`,
        sender_id: `ai_${dept}`,
        message_type: 'text',
        text_content: aiReply,
        reply_to_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        is_edited: false,
        system_action: null,
      };

      const finalHistory = [...updatedWithUser, assistantMsg];
      setAiMessages((prev) => ({ ...prev, [dept]: finalHistory }));

      try {
        if (typeof window !== 'undefined' && user?.uid) {
          localStorage.setItem(
            `ruhchat_ai_${user.uid}_${dept}`,
            JSON.stringify(finalHistory.slice(-40))
          );
        }
      } catch {}
    } catch (err) {
      console.error('[AI Chat Error]', err);
      const errorMsg: ChatMessage = {
        id: `ai_err_${Date.now()}`,
        conversation_id: `ai_${dept}`,
        sender_id: `ai_${dept}`,
        message_type: 'text',
        text_content:
          'আমি দুঃখিত, সংযোগের সমস্যার কারণে আপনার অনুরোধটি প্রসেস করা সম্ভব হয়নি। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।',
        reply_to_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        is_edited: false,
        system_action: null,
      };
      setAiMessages((prev) => ({
        ...prev,
        [dept]: [...updatedWithUser, errorMsg],
      }));
    } finally {
      setAiThinking(false);
      setTimeout(() => scrollToBottom(true), 50);
    }
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

    // If chatting with Department AI Co-Worker, route to AI handler
    if (activeConv.id.startsWith('ai_')) {
      await handleSendAiMessage(text);
      return;
    }

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

  const handleSendVoiceNote = async (blob: Blob, duration: number) => {
    if (!activeConv) return;
    setUploadingVoiceNote(true);
    try {
      const formData = new FormData();
      formData.append('file', blob, 'voice_note.webm');
      formData.append('conversation_id', activeConv.id);
      formData.append('duration_seconds', duration.toString());

      const res = await fetch('/api/internal-chat/voice-notes/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();

        if (isAiActive) {
          // 1. Transcribe audio for AI Worker / Co-Founder
          let transcriptText = 'Voice Note';
          try {
            const trForm = new FormData();
            trForm.append('audio', blob, 'voice_note.webm');
            const trRes = await fetch('/api/chat/transcribe', {
              method: 'POST',
              body: trForm,
            });
            if (trRes.ok) {
              const trData = await trRes.json();
              if (trData.transcript?.trim()) {
                transcriptText = trData.transcript.trim();
              }
            }
          } catch (trErr) {
            console.warn(
              '[FloatingMessenger] AI voice note transcribe warning:',
              trErr
            );
          }

          // 2. Append user voice note to active AI thread
          const userMsg: ChatMessage = {
            id: `user_voice_${Date.now()}`,
            conversation_id: activeConv.id,
            sender_id: user?.uid || 'me',
            message_type: 'voice_note',
            text_content: transcriptText,
            reply_to_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
            is_edited: false,
            system_action: null,
            attachments: [
              {
                id: data.publicId || `vn_${Date.now()}`,
                message_id: `user_voice_${Date.now()}`,
                cloudinary_public_id: data.publicId || '',
                cloudinary_url: data.url,
                resource_type: 'video',
                file_name: 'Voice Note.webm',
                file_size: data.fileSizeBytes || 0,
                mime_type: data.mimeType || 'audio/webm',
                duration: data.durationSeconds || duration,
                width: null,
                height: null,
                created_at: new Date().toISOString(),
              },
            ],
            voice_note: {
              id: data.voiceNoteId || `vn_${Date.now()}`,
              conversationId: activeConv.id,
              senderId: user?.uid || 'me',
              cloudinaryPublicId: data.publicId || '',
              cloudinaryUrl: data.url,
              durationSeconds: data.durationSeconds || duration,
              fileSizeBytes: data.fileSizeBytes || 0,
              mimeType: data.mimeType || 'audio/webm',
              uploadedAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 45 * 86400000).toISOString(),
              status: 'active',
            },
          };

          const currentList = aiMessages[currentAiDept] || [];
          const updatedList = [...currentList, userMsg];
          setAiMessages((prev) => ({ ...prev, [currentAiDept]: updatedList }));
          if (typeof window !== 'undefined' && user?.uid) {
            localStorage.setItem(
              `ruhchat_ai_${user.uid}_${currentAiDept}`,
              JSON.stringify(updatedList)
            );
          }
          setIsRecordingVoiceNote(false);

          // 3. Request AI worker response
          setAiThinking(true);
          try {
            const aiRes = await fetch('/api/internal-chat/ai-worker', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                department: currentAiDept,
                messages: updatedList.map((m) => ({
                  role:
                    m.sender_id === user?.uid || m.sender_id === 'me'
                      ? 'user'
                      : 'model',
                  text_content: m.text_content,
                  audioUrl:
                    m.attachments?.[0]?.cloudinary_url ||
                    m.voice_note?.cloudinaryUrl,
                })),
              }),
            });

            if (aiRes.ok) {
              const aiData = await aiRes.json();
              const botMsg: ChatMessage = {
                id: `ai_${Date.now()}`,
                conversation_id: activeConv.id,
                sender_id: `ai_${currentAiDept}`,
                message_type: 'text',
                text_content:
                  aiData.response || 'I have analyzed your voice note.',
                reply_to_id: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                deleted_at: null,
                is_edited: false,
                system_action: null,
              };
              const finalWithBot = [...updatedList, botMsg];
              setAiMessages((prev) => ({
                ...prev,
                [currentAiDept]: finalWithBot,
              }));
              if (typeof window !== 'undefined' && user?.uid) {
                localStorage.setItem(
                  `ruhchat_ai_${user.uid}_${currentAiDept}`,
                  JSON.stringify(finalWithBot)
                );
              }
            }
          } finally {
            setAiThinking(false);
          }
        } else {
          // Standard staff-to-staff or admin-to-staff message
          await fetch(
            `/api/internal-chat/conversations/${activeConv.id}/messages`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text_content: 'Voice Note',
                message_type: 'voice_note',
                voice_note_id: data.voiceNoteId || null,
                attachments: [
                  {
                    cloudinary_public_id: data.publicId,
                    cloudinary_url: data.url,
                    resource_type: 'video',
                    file_name: 'Voice Note.webm',
                    file_size: data.fileSizeBytes,
                    mime_type: data.mimeType || 'audio/webm',
                    duration: data.durationSeconds || duration,
                  },
                ],
              }),
            }
          );
          loadMessages(activeConv.id);
          setIsRecordingVoiceNote(false);
        }
      }
    } catch (err) {
      console.error('FloatingMessenger: Voice note send failed', err);
    } finally {
      setUploadingVoiceNote(false);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (activeTab === 'broadcast' && c.type !== 'broadcast') return false;
    if (activeTab === 'groups' && c.type !== 'group') return false;
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
          <picture>
            <source srcSet="/ruhchat-icon.webp" type="image/webp" />
            <img
              src="/ruhchat-icon.png"
              alt="RuhChat"
              className="h-6 w-6 rounded-lg object-cover shadow-sm"
            />
          </picture>
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
        <picture className="h-full w-full">
          <source srcSet="/ruhchat-icon.webp" type="image/webp" />
          <img
            src="/ruhchat-icon.png"
            alt="RuhChat"
            className="h-full w-full rounded-xl object-cover shadow-inner"
          />
        </picture>
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
            <picture>
              <source srcSet="/ruhchat-icon.webp" type="image/webp" />
              <img
                src="/ruhchat-icon.png"
                alt="RuhChat"
                className="h-6 w-6 rounded-lg object-cover shadow"
              />
            </picture>
          )}

          <div className="min-w-0">
            <h3 className="flex items-center gap-1.5 truncate text-xs font-bold text-white">
              {activeConv ? (
                <>
                  {isAiActive ? (
                    <span className="flex items-center gap-1.5">
                      <span className="text-sm">
                        {currentAIWorker.avatarEmoji}
                      </span>
                      <span>{currentAIWorker.name}</span>
                      <span className="py-0.2 rounded bg-violet-500/20 px-1 text-[9px] font-semibold text-violet-300">
                        AI Co-Worker
                      </span>
                    </span>
                  ) : (
                    <>
                      {activeConv.type === 'broadcast' && (
                        <Radio className="h-3.5 w-3.5 flex-shrink-0 text-orange-400" />
                      )}
                      {getConvTitle(activeConv)}
                    </>
                  )}
                </>
              ) : (
                'RuhChat'
              )}
            </h3>
            <p className="truncate text-[10px] text-slate-400">
              {activeConv
                ? isAiActive
                  ? activeConv.group_topic ||
                    `${currentAIWorker.roleTitle} (Draft Only)`
                  : activeConv.type === 'broadcast'
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

          {/* Mailbox Toggle */}
          <button
            type="button"
            onClick={() => {
              setActiveMode((prev) =>
                prev === 'mailbox' ? 'chat' : 'mailbox'
              );
            }}
            className={`relative rounded-lg p-1.5 transition ${
              activeMode === 'mailbox'
                ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40'
                : 'text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
            title={
              activeMode === 'mailbox'
                ? 'Switch to Chat'
                : 'Open RuhChat Mailbox Suite'
            }
          >
            <Mail className="h-3.5 w-3.5" />
          </button>

          <Link
            href={`${portalPrefix}/task-manager`}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-emerald-400"
            title={`Open Task Manager (${portalPrefix}/task-manager)`}
          >
            <ClipboardList className="h-3.5 w-3.5" />
          </Link>

          <Link
            href={`${portalPrefix}/chat`}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            title={`Open in Full Screen (${portalPrefix}/chat)`}
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
      {activeMode === 'mailbox' ? (
        <MailboxPanel />
      ) : !activeConv ? (
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

          {/* Sub-Search Tab Selector: All | Broadcast | Groups | 🔔 Notifications */}
          <div className="no-scrollbar flex flex-shrink-0 items-center gap-1 overflow-x-auto border-b border-white/5 bg-[#101524] px-3 py-1.5">
            {(['all', 'broadcast', 'groups', 'notifications'] as const).map(
              (tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold capitalize transition ${
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {tab === 'notifications' && (
                      <Bell className="h-3 w-3 text-amber-400" />
                    )}
                    <span>
                      {tab === 'notifications' ? 'Notifications' : tab}
                    </span>
                    {tab === 'notifications' && notifUnreadCount > 0 && (
                      <span className="flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-slate-950">
                        {notifUnreadCount > 9 ? '9+' : notifUnreadCount}
                      </span>
                    )}
                  </button>
                );
              }
            )}
          </div>

          {activeTab === 'notifications' ? (
            <NotificationPanel />
          ) : (
            <>
              {/* Pinned Department AI Co-Worker Card */}
              <div className="border-b border-white/5 bg-[#101526] p-2.5">
                <div className="mb-1.5 flex items-center justify-between px-1">
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-violet-400">
                    <Sparkles className="h-3 w-3" /> Department AI Co-Worker
                  </span>
                  {isAdmin && (
                    <span className="text-[10px] font-medium text-slate-400">
                      Founder/Admin Mode
                    </span>
                  )}
                </div>

                {/* Admin AI Worker & Co-Founder Switcher */}
                {isAdmin && (
                  <div className="no-scrollbar mb-2 flex gap-1 overflow-x-auto pb-1 text-[10px]">
                    {Object.keys(AI_WORKER_PERSONAS).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setSelectedAiDept(d)}
                        className={`whitespace-nowrap rounded-lg px-2 py-0.5 font-medium capitalize transition ${
                          (selectedAiDept || effectiveDept) === d
                            ? 'bg-violet-600 text-white shadow'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {d === 'co_founder' ? '👑 Co-Founder' : d}
                      </button>
                    ))}
                  </div>
                )}

                <div
                  onClick={() => handleOpenAIWorkerChat(currentAIWorker)}
                  className="group flex cursor-pointer select-none items-center gap-3 rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-950/60 via-purple-900/30 to-indigo-950/50 p-2.5 transition-all hover:border-violet-400/60 hover:from-violet-900/70 hover:to-indigo-900/60 hover:shadow-lg hover:shadow-violet-900/20"
                >
                  <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-lg shadow-md ring-1 ring-violet-400/40 transition group-hover:scale-105">
                    <span>{currentAIWorker.avatarEmoji}</span>
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex h-3 w-3 rounded-full border border-violet-900 bg-emerald-500"></span>
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="flex items-center gap-1.5 truncate text-xs font-bold text-white group-hover:text-violet-200">
                        {currentAIWorker.name}
                        <span className="py-0.2 rounded bg-violet-500/20 px-1 text-[9px] font-semibold text-violet-300">
                          Active
                        </span>
                      </h4>
                      <span className="text-[10px] font-medium text-emerald-400">
                        Online
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-slate-300">
                      {currentAIWorker.roleTitle}
                    </p>
                  </div>
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
                    const isAlertChannel =
                      (c.group_name || '').includes('Alerts') ||
                      (c.group_name || '').includes('🚨');
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
                        ) : isAlertChannel ? (
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-amber-600 to-rose-600 text-white shadow ring-1 ring-amber-400/40">
                            <AlertCircle className="h-5 w-5" />
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
            </>
          )}
        </div>
      ) : (
        // VIEW B: ACTIVE CHAT ROOM
        <div className="relative flex flex-1 flex-col overflow-hidden bg-[#0D111E]">
          {/* Messages Feed */}
          <div
            ref={chatContainerRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              const isAtBottom =
                el.scrollHeight - el.scrollTop - el.clientHeight < 60;
              setIsChatScrolledUp(!isAtBottom);
            }}
            className="flex-1 space-y-2.5 overflow-y-auto p-3"
          >
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

                const { cleanText, imageUrls } =
                  isAiActive && !isMe
                    ? extractImageUrls(m.text_content || '')
                    : { cleanText: m.text_content || '', imageUrls: [] };

                const showDraftAlert =
                  isAiActive && !isMe && hasDraftNotice(m.text_content || '');

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    {!isMe && (
                      <span className="mb-0.5 ml-1 flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                        {isAiActive ? (
                          <>
                            <Bot className="h-3 w-3 text-violet-400" />
                            <span className="font-bold text-violet-300">
                              {currentAIWorker.name}
                            </span>
                          </>
                        ) : m.sender && activeConv.type !== 'direct' ? (
                          m.sender.department ? (
                            `${m.sender.full_name || m.sender.email} (${m.sender.department})`
                          ) : (
                            m.sender.full_name || m.sender.email
                          )
                        ) : null}
                      </span>
                    )}

                    <div
                      className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs shadow-sm ${
                        isMe
                          ? 'rounded-br-none bg-emerald-600 text-white'
                          : isAiActive
                            ? 'rounded-bl-none border border-violet-500/20 bg-[#161B2E] text-slate-100 shadow-md shadow-violet-950/20'
                            : 'rounded-bl-none border border-white/5 bg-[#182136] text-slate-200'
                      }`}
                    >
                      {/* Attachments & Voice Notes */}
                      {attachments.length > 0 &&
                        attachments.map((att: ChatAttachment) => (
                          <div key={att.id} className="mb-1.5">
                            {att.mime_type?.startsWith('audio/') ||
                            att.file_name?.includes('Voice Note') ||
                            m.message_type === 'voice_note' ? (
                              <VoiceNotePlayer
                                src={att.cloudinary_url}
                                duration={
                                  att.duration ||
                                  m.voice_note?.durationSeconds ||
                                  0
                                }
                                isUser={isMe}
                                status={
                                  m.voice_note?.status ||
                                  (att.cloudinary_url ? 'active' : 'expired')
                                }
                              />
                            ) : att.resource_type === 'image' ? (
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

                      {/* Standalone Voice Note with empty attachments (expired/deleted asset guard) */}
                      {attachments.length === 0 &&
                        m.message_type === 'voice_note' && (
                          <div className="mb-1.5">
                            <VoiceNotePlayer
                              src={m.voice_note?.cloudinaryUrl || ''}
                              duration={m.voice_note?.durationSeconds || 0}
                              isUser={isMe}
                              status={m.voice_note?.status || 'expired'}
                            />
                          </div>
                        )}

                      {/* Text content with clickable phone, email, and URLs */}
                      {cleanText &&
                        !(
                          m.message_type === 'voice_note' &&
                          cleanText === 'Voice Note'
                        ) && (
                          <AutoLinkText
                            text={cleanText}
                            className="whitespace-pre-wrap break-words leading-relaxed"
                            linkClassName={
                              isMe
                                ? 'text-white underline font-semibold'
                                : 'text-violet-300 hover:text-white underline'
                            }
                          />
                        )}

                      {/* AI Generated Images Preview Cards */}
                      {imageUrls.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {imageUrls.map((imgUrl, idx) => (
                            <div
                              key={idx}
                              className="overflow-hidden rounded-xl border border-violet-500/40 bg-black/60 p-1.5 shadow-lg"
                            >
                              <a
                                href={imgUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <img
                                  src={imgUrl}
                                  alt="Generated Promo Asset"
                                  className="max-h-60 w-full rounded-lg object-contain transition hover:scale-[1.01]"
                                />
                              </a>
                              <div className="mt-1.5 flex items-center justify-between px-1">
                                <span className="flex items-center gap-1 text-[10px] font-semibold text-violet-300">
                                  <Sparkles className="h-3 w-3 text-violet-400" />{' '}
                                  AI Generated Asset
                                </span>
                                <a
                                  href={imgUrl}
                                  download="ruhvi-promo-asset.png"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded bg-violet-600/80 px-2.5 py-0.5 text-[10px] font-bold text-white shadow hover:bg-violet-500"
                                >
                                  <Download className="h-3 w-3" /> Download
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Draft Only Warning & Portal Deep Link Badge */}
                      {showDraftAlert && (
                        <div className="mt-2.5 flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-200">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">📝</span>
                            <div>
                              <p className="text-[11px] font-bold text-white">
                                Draft Saved in System
                              </p>
                              <p className="text-[10px] text-amber-300/80">
                                Review in portal to publish live
                              </p>
                            </div>
                          </div>
                          <Link
                            href={portalPrefix}
                            target="_blank"
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-500/25 px-2 py-0.5 text-[10px] font-bold text-amber-100 transition hover:bg-amber-500/40 hover:text-white"
                          >
                            <span>Open Portal</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </Link>
                        </div>
                      )}

                      {/* Clickable Entity References (#Order, #Ticket, #Product) */}
                      {entityRefs.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {entityRefs.map((ref: any) => {
                            let href = '#';
                            if (ref.entity_type === 'order')
                              href = `/portal-orders?search=${encodeURIComponent(ref.entity_id)}`;
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

            {/* AI Thinking Animation Indicator */}
            {isAiActive && aiThinking && (
              <div className="flex items-start gap-2 pt-1">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl border border-violet-500/40 bg-violet-600/30 text-xs shadow">
                  {currentAIWorker.avatarEmoji}
                </div>
                <div className="flex items-center gap-2.5 rounded-2xl rounded-bl-none border border-violet-500/30 bg-[#161B2E] px-3.5 py-2 text-xs text-violet-300 shadow">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />
                  <span className="animate-pulse text-[11px] font-medium">
                    {currentAIWorker.name} is checking department data &
                    drafting response...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Jump to latest messages button */}
          {isChatScrolledUp && (
            <button
              type="button"
              onClick={() => scrollToBottom(true)}
              className="absolute bottom-16 right-4 z-20 flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white shadow-lg backdrop-blur transition hover:bg-emerald-500 active:scale-95"
            >
              <span>↓ Latest</span>
            </button>
          )}

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
          ) : isRecordingVoiceNote ? (
            <div className="border-t border-white/10 bg-[#13192B] p-2">
              <VoiceNoteRecorder
                onSend={handleSendVoiceNote}
                onCancel={() => setIsRecordingVoiceNote(false)}
                isUploading={uploadingVoiceNote}
              />
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

              {/* Voice Note Record Trigger Button */}
              <button
                type="button"
                onClick={() => setIsRecordingVoiceNote(true)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-rose-400"
                title="Record WhatsApp-style Voice Note"
              >
                <Mic className="h-4 w-4" />
              </button>

              {/* Speech to Text Dictation Button */}
              <SpeechToTextButton
                onTranscript={(transcript) => {
                  setInputText((prev) =>
                    prev ? `${prev} ${transcript}` : transcript
                  );
                }}
                disabled={sendingMsg}
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
                placeholder={
                  isAiActive
                    ? `Ask ${currentAIWorker.name}… (e.g. check status, restock, ideas, draft notes)`
                    : 'Message… (@ for staff/dept, # to reference)'
                }
                className={`flex-1 rounded-xl border bg-[#0D111E] px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none ${
                  isAiActive
                    ? 'border-violet-500/30 focus:border-violet-400'
                    : 'border-white/10 focus:border-emerald-500'
                }`}
              />

              <button
                type="submit"
                disabled={
                  sendingMsg ||
                  aiThinking ||
                  (!inputText.trim() && pendingEntityRefs.length === 0)
                }
                className={`rounded-xl p-1.5 text-white transition disabled:opacity-40 ${
                  isAiActive
                    ? 'bg-violet-600 shadow-md shadow-violet-900/30 hover:bg-violet-500'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
                title="Send message"
              >
                {sendingMsg || (isAiActive && aiThinking) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>
          )}

          {/* AI Isolated Session Security Badge */}
          {isAiActive && (
            <div className="flex select-none items-center justify-center gap-1.5 border-t border-white/5 bg-[#0F1424] py-1 text-[10px] text-slate-400">
              <Lock className="h-2.5 w-2.5 text-violet-400" />
              <span>
                Isolated Department Session • Strict Draft Only • Financial Data
                Excluded
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
