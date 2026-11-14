'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import type {
  ChatConversation,
  ChatMessage,
  ChatUserProfile,
  ChatAttachment,
  ChatReaction,
} from '@/types/chat';
import {
  MessageCircle,
  Search,
  Plus,
  Send,
  Paperclip,
  X,
  ChevronLeft,
  Users,
  MoreVertical,
  Check,
  CheckCheck,
  FileText,
  Download,
  Hash,
  AlertCircle,
  Loader2,
  UserPlus,
  LogOut,
  Info,
  ArrowLeft,
  Reply,
  Shield,
  Pin,
  Smile,
  Lock,
  ClipboardList,
  Mic,
  Bot,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import AutoLinkText from '@/components/chat/AutoLinkText';
import { VoiceNotePlayer } from '@/components/chat/VoiceNotePlayer';
import { VoiceNoteRecorder } from '@/components/chat/VoiceNoteRecorder';
import { SpeechToTextButton } from '@/components/chat/SpeechToTextButton';
import {
  AIWorkerPersona,
  AI_WORKER_PERSONAS,
  listAIWorkers,
} from '@/lib/chat/ai-workers';

import {
  formatTime,
  formatDateDivider,
  getInitials,
  avatarColor,
  sameDay,
  UserAvatar,
  AttachmentPreview,
  MessageBubble,
  MentionDropdown,
  EntityRefPicker,
  ConversationItem,
  NewConversationModal,
  GroupInfoPanel,
  DEPARTMENTS,
} from '@/components/chat/admin';
export default function InternalChatPage() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [text, setText] = useState('');
  const [staffList, setStaffList] = useState<ChatUserProfile[]>([]);
  const [showNewConv, setShowNewConv] = useState(false);
  const [searchConv, setSearchConv] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<any[]>([]);
  const [pendingEntityRefs, setPendingEntityRefs] = useState<any[]>([]);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [error, setError] = useState<string | null>(null);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showEntityPicker, setShowEntityPicker] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);

  // Voice Note states
  const [isRecordingVoiceNote, setIsRecordingVoiceNote] = useState(false);
  const [uploadingVoiceNote, setUploadingVoiceNote] = useState(false);

  // AI Co-Founder & Specialist Worker State
  const [activeAiWorker, setActiveAiWorker] = useState<AIWorkerPersona | null>(
    null
  );
  const [aiMessages, setAiMessages] = useState<Record<string, ChatMessage[]>>(
    {}
  );
  const [sendingAi, setSendingAi] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'conversations' | 'ai'>(
    'conversations'
  );

  // In-Chat Search State (WhatsApp style)
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [inChatSearchQuery, setInChatSearchQuery] = useState('');

  // Global message search state for sidebar
  const [sidebarMatchedMessages, setSidebarMatchedMessages] = useState<any[]>(
    []
  );
  const [searchingSidebarMessages, setSearchingSidebarMessages] =
    useState(false);

  const handleSidebarSearch = async (val: string) => {
    setSearchConv(val);
    if (!val.trim() || val.trim().length < 2) {
      setSidebarMatchedMessages([]);
      return;
    }
    setSearchingSidebarMessages(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(
          `
          id,
          conversation_id,
          text_content,
          created_at,
          sender:sender_id (
            id,
            full_name,
            email
          ),
          conversation:conversation_id (
            id,
            type,
            group_name
          )
        `
        )
        .ilike('text_content', `%${val.trim()}%`)
        .order('created_at', { ascending: false })
        .limit(15);

      if (!error && data) {
        setSidebarMatchedMessages(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearchingSidebarMessages(false);
    }
  };

  // @mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [pendingMentions, setPendingMentions] = useState<string[]>([]); // user_ids

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const activeConv = useMemo<ChatConversation | null>(() => {
    if (activeAiWorker) {
      return {
        id: `ai_${activeAiWorker.department}`,
        type: 'direct',
        group_name: activeAiWorker.name,
        group_topic: `${activeAiWorker.roleTitle} (AI Specialist)`,
        created_by: 'system_ai',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        archived_at: null,
        deleted_at: null,
        group_avatar_url: null,
        other_user: {
          id: `ai_${activeAiWorker.department}`,
          full_name: activeAiWorker.name,
          email: `${activeAiWorker.department}-ai@ruhvi.in`,
          role:
            activeAiWorker.department === 'co_founder'
              ? 'ai_co_founder'
              : 'ai_worker',
          department: activeAiWorker.department,
        },
      };
    }
    return conversations.find((c) => c.id === activeConvId) || null;
  }, [activeAiWorker, conversations, activeConvId]);

  // ── Fetch conversations ──
  const fetchConversations = useCallback(async () => {
    setLoadingConvs(true);
    try {
      const res = await fetch('/api/internal-chat/conversations');
      if (!res.ok) throw new Error('Failed to load conversations');
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  const fetchMessages = useCallback(async (convId: string) => {
    setLoadingMsgs(true);
    try {
      const res = await fetch(
        `/api/internal-chat/conversations/${convId}/messages?limit=60`
      );
      if (!res.ok) throw new Error('Failed to load messages');
      const data = await res.json();
      setMessages((data.messages || []).reverse());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  const fetchStaff = useCallback(async () => {
    const res = await fetch('/api/internal-chat/staff');
    if (res.ok) {
      const data = await res.json();
      setStaffList(data.staff || []);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    fetchStaff();
  }, [fetchConversations, fetchStaff]);

  // ── Mark read ──
  const markRead = useCallback(async (convId: string) => {
    try {
      await fetch(`/api/internal-chat/conversations/${convId}/read`, {
        method: 'POST',
      });
      // Update local unread count
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c))
      );
    } catch {
      /* silent */
    }
  }, []);

  // ── Select AI Worker ──
  const selectAIWorker = useCallback(
    (persona: AIWorkerPersona) => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      setActiveConvId(null);
      setActiveAiWorker(persona);
      setReplyTo(null);
      setShowGroupInfo(false);
      setMobileView('chat');

      const dept = persona.department;
      let initialList: ChatMessage[] = [];
      try {
        if (typeof window !== 'undefined' && user?.uid) {
          const saved = localStorage.getItem(`ruhchat_ai_${user.uid}_${dept}`);
          if (saved) initialList = JSON.parse(saved);
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
    },
    [supabase, user?.uid]
  );

  // ── Select conversation ──
  const selectConversation = useCallback(
    (convId: string) => {
      setActiveAiWorker(null);
      setActiveConvId(convId);
      setMessages([]);
      setReplyTo(null);
      fetchMessages(convId);
      markRead(convId);
      setMobileView('chat');
      setShowGroupInfo(false);

      if (channelRef.current) supabase.removeChannel(channelRef.current);

      const channel = supabase
        .channel(`chat_conv_${convId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `conversation_id=eq.${convId}`,
          },
          async (payload: { new: Record<string, unknown> }) => {
            const newMsg = payload.new as unknown as ChatMessage;
            const { data: sender } = await supabase
              .from('users')
              .select('id, full_name, email, role')
              .eq('id', newMsg.sender_id as string)
              .maybeSingle();
            setMessages((prev) => [
              ...prev,
              {
                ...newMsg,
                sender: sender || undefined,
                attachments: [],
                mentions: [],
                entity_refs: [],
                reactions: [],
              },
            ]);
            fetchConversations();
            // Auto-mark read if this conv is active
            if (newMsg.sender_id !== user?.uid) markRead(convId);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'chat_messages',
            filter: `conversation_id=eq.${convId}`,
          },
          () => fetchMessages(convId)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'chat_message_reactions' },
          () => fetchMessages(convId)
        )
        .subscribe();

      channelRef.current = channel;
    },
    [supabase, fetchMessages, fetchConversations, markRead, user]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── @mention detection ──
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    // Detect @mention: find the last @ that isn't followed by a space yet
    const match = val.match(/@([\w.]*)$/);
    setMentionQuery(match ? match[1] : null);
    // Auto-resize
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 130) + 'px';
  };

  const insertMention = (u: ChatUserProfile) => {
    const name =
      u.full_name?.replace(/\s+/g, '') || u.email?.split('@')[0] || 'user';
    const newText = text.replace(/@[\w.]*$/, `@${name} `);
    setText(newText);
    setPendingMentions((prev) =>
      prev.includes(u.id) ? prev : [...prev, u.id]
    );
    setMentionQuery(null);
    textareaRef.current?.focus();
  };

  // ── Send message ──
  const sendMessage = useCallback(async () => {
    if (!activeConvId && !activeAiWorker) return;
    const trimmed = text.trim();
    if (!trimmed && pendingAttachments.length === 0) return;

    if (activeAiWorker) {
      const dept = activeAiWorker.department;
      const userMsg: ChatMessage = {
        id: `user_${Date.now()}`,
        conversation_id: `ai_${dept}`,
        sender_id: user?.uid || 'me',
        message_type: 'text',
        text_content: trimmed,
        reply_to_id: replyTo?.id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        is_edited: false,
        system_action: null,
      };

      const currentList = aiMessages[dept] || [];
      const updatedList = [...currentList, userMsg];
      setAiMessages((prev) => ({ ...prev, [dept]: updatedList }));
      if (typeof window !== 'undefined' && user?.uid) {
        localStorage.setItem(
          `ruhchat_ai_${user.uid}_${dept}`,
          JSON.stringify(updatedList)
        );
      }
      setText('');
      setReplyTo(null);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      setSendingAi(true);
      setSendingMsg(true);

      try {
        const aiRes = await fetch('/api/internal-chat/ai-worker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            department: dept,
            messages: updatedList.map((m) => ({
              role:
                m.sender_id === user?.uid || m.sender_id === 'me'
                  ? 'user'
                  : 'model',
              text_content: m.text_content,
            })),
          }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const botMsg: ChatMessage = {
            id: `ai_${Date.now()}`,
            conversation_id: `ai_${dept}`,
            sender_id: `ai_${dept}`,
            message_type: 'text',
            text_content: aiData.response || 'Understood.',
            reply_to_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
            is_edited: false,
            system_action: null,
          };
          const finalWithBot = [...updatedList, botMsg];
          setAiMessages((prev) => ({ ...prev, [dept]: finalWithBot }));
          if (typeof window !== 'undefined' && user?.uid) {
            localStorage.setItem(
              `ruhchat_ai_${user.uid}_${dept}`,
              JSON.stringify(finalWithBot)
            );
          }
        }
      } catch (err: any) {
        console.error('[AdminChat] AI worker request error:', err);
      } finally {
        setSendingAi(false);
        setSendingMsg(false);
      }
      return;
    }

    setSendingMsg(true);
    try {
      const payload: any = {
        message_type: pendingAttachments.length > 0 ? 'attachment' : 'text',
        text_content: trimmed || undefined,
        reply_to_id: replyTo?.id || undefined,
        attachments:
          pendingAttachments.length > 0 ? pendingAttachments : undefined,
        mentions: pendingMentions.length > 0 ? pendingMentions : undefined,
        entity_refs:
          pendingEntityRefs.length > 0 ? pendingEntityRefs : undefined,
      };
      const res = await fetch(
        `/api/internal-chat/conversations/${activeConvId}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Send failed');
      }
      setText('');
      setPendingAttachments([]);
      setPendingMentions([]);
      setPendingEntityRefs([]);
      setReplyTo(null);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSendingMsg(false);
    }
  }, [
    activeConvId,
    activeAiWorker,
    text,
    pendingAttachments,
    pendingMentions,
    pendingEntityRefs,
    replyTo,
    aiMessages,
    user?.uid,
  ]);

  // ── Send Voice Note ──
  const handleSendVoiceNote = useCallback(
    async (blob: Blob, duration: number) => {
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

          if (activeAiWorker) {
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
              console.warn('[AdminChat] AI voice transcribe error:', trErr);
            }

            const dept = activeAiWorker.department;
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
                expiresAt:
                  data.expiresAt ||
                  new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'active',
              },
            };

            const currentList = aiMessages[dept] || [];
            const updatedList = [...currentList, userMsg];
            setAiMessages((prev) => ({ ...prev, [dept]: updatedList }));
            if (typeof window !== 'undefined' && user?.uid) {
              localStorage.setItem(
                `ruhchat_ai_${user.uid}_${dept}`,
                JSON.stringify(updatedList)
              );
            }
            setIsRecordingVoiceNote(false);

            setSendingAi(true);
            try {
              const aiRes = await fetch('/api/internal-chat/ai-worker', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  department: dept,
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
                  sender_id: `ai_${dept}`,
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
                setAiMessages((prev) => ({ ...prev, [dept]: finalWithBot }));
                if (typeof window !== 'undefined' && user?.uid) {
                  localStorage.setItem(
                    `ruhchat_ai_${user.uid}_${dept}`,
                    JSON.stringify(finalWithBot)
                  );
                }
              }
            } finally {
              setSendingAi(false);
            }
          } else {
            // Standard staff message
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
            fetchMessages(activeConv.id);
            setIsRecordingVoiceNote(false);
          }
        }
      } catch (err) {
        console.error('[AdminChat] Voice note upload failed:', err);
      } finally {
        setUploadingVoiceNote(false);
      }
    },
    [activeConv, activeAiWorker, user?.uid, aiMessages, fetchMessages]
  );

  // ── Reactions & Pins ──
  const handleReact = useCallback(
    async (msgId: string, emoji: string) => {
      if (!activeConvId) return;
      try {
        const res = await fetch(
          `/api/internal-chat/conversations/${activeConvId}/messages/${msgId}/react`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emoji }),
          }
        );
        if (res.ok) fetchMessages(activeConvId);
      } catch (e) {
        console.error(e);
      }
    },
    [activeConvId, fetchMessages]
  );

  const handlePin = useCallback(
    async (msgId: string, action: 'pin' | 'unpin') => {
      if (!activeConvId) return;
      try {
        const res = await fetch(
          `/api/internal-chat/conversations/${activeConvId}/messages/${msgId}/pin`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action }),
          }
        );
        if (!res.ok) {
          const err = await res.json();
          setError(err.error || 'Failed to pin');
        } else {
          fetchMessages(activeConvId);
        }
      } catch (e) {
        console.error(e);
      }
    },
    [activeConvId, fetchMessages]
  );

  // ── File upload ──
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      setUploadingFile(true);
      try {
        for (const file of files) {
          if (file.size > 20 * 1024 * 1024) {
            setError(`${file.name} exceeds 20 MB limit`);
            continue;
          }
          const fd = new FormData();
          fd.append('file', file);
          const res = await fetch('/api/internal-chat/upload', {
            method: 'POST',
            body: fd,
          });
          if (!res.ok) {
            const err = await res.json();
            setError(err.error || 'Upload failed');
            continue;
          }
          const data = await res.json();
          setPendingAttachments((prev) => [...prev, data]);
        }
      } finally {
        setUploadingFile(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    []
  );

  // ── Direct chat ──
  const startDirectChat = useCallback(
    async (targetUserId: string) => {
      setShowNewConv(false);
      const res = await fetch('/api/internal-chat/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: targetUserId }),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchConversations();
        selectConversation(data.conversation_id);
      }
    },
    [fetchConversations, selectConversation]
  );

  // ── Create group ──
  const createGroup = useCallback(
    async (memberIds: string[], name: string, topic?: string) => {
      setShowNewConv(false);
      const res = await fetch('/api/internal-chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_name: name,
          group_topic: topic,
          member_ids: memberIds,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchConversations();
        selectConversation(data.conversation.id);
      }
    },
    [fetchConversations, selectConversation]
  );

  // ── Add members to group ──
  const addMembersToGroup = useCallback(
    async (userIds: string[]) => {
      if (!activeConvId) return;
      await fetch(`/api/internal-chat/conversations/${activeConvId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_ids: userIds }),
      });
      await fetchConversations();
    },
    [activeConvId, fetchConversations]
  );

  // ── Leave group ──
  const leaveGroup = useCallback(async () => {
    if (!activeConvId || !user?.uid) return;
    await fetch(`/api/internal-chat/conversations/${activeConvId}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.uid }),
    });
    setActiveConvId(null);
    setShowGroupInfo(false);
    await fetchConversations();
  }, [activeConvId, user, fetchConversations]);

  // ── Key handler ──
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      setMentionQuery(null);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && mentionQuery === null) {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return;
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Filtered conversations ──
  const filteredConvs = useMemo(() => {
    if (!searchConv) return conversations;
    const q = searchConv.toLowerCase();
    return conversations.filter((c) => {
      const name =
        c.type === 'group'
          ? (c.group_name || '').toLowerCase()
          : (
              c.other_user?.full_name ||
              c.other_user?.email ||
              ''
            ).toLowerCase();
      return name.includes(q);
    });
  }, [conversations, searchConv]);

  const totalUnread = useMemo(
    () => conversations.reduce((s, c) => s + (c.unread_count || 0), 0),
    [conversations]
  );

  const convTitle = activeAiWorker
    ? activeAiWorker.name
    : activeConv?.type === 'group'
      ? activeConv.group_name || 'Group Chat'
      : activeConv?.other_user?.department
        ? `${activeConv.other_user?.full_name || activeConv.other_user?.email || 'Chat'} (${activeConv.other_user.department})`
        : activeConv?.other_user?.full_name ||
          activeConv?.other_user?.email ||
          'Chat';

  const convSubtitle = activeAiWorker
    ? activeAiWorker.roleTitle
    : activeConv?.type === 'group'
      ? `${(activeConv.members || []).filter((m) => !m.left_at).length} members`
      : activeConv?.other_user?.role
        ? `${activeConv.other_user.role}`
        : '';

  const isAdmin =
    user?.role === 'super_admin' ||
    (activeConv?.members?.find((m) => m.user_id === user?.uid)?.is_admin ??
      false);

  const activeChatMessages = useMemo(() => {
    if (activeAiWorker) {
      return aiMessages[activeAiWorker.department] || [];
    }
    return messages;
  }, [activeAiWorker, aiMessages, messages]);

  const displayedMessages = useMemo(() => {
    if (!inChatSearchQuery.trim()) return activeChatMessages;
    const q = inChatSearchQuery.trim().toLowerCase();
    return activeChatMessages.filter((m) =>
      (m.text_content || '').toLowerCase().includes(q)
    );
  }, [activeChatMessages, inChatSearchQuery]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden rounded-xl border border-white/5 bg-[#0d0f1a]">
      {/* ── Left: Conversation list ── */}
      <div
        className={`flex flex-col border-r border-white/5 bg-[#131726] ${mobileView === 'chat' ? 'hidden lg:flex' : 'flex'} w-full flex-shrink-0 lg:w-[300px]`}
      >
        <div className="flex h-14 items-center justify-between border-b border-white/5 px-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Staff Chat</h2>
            {totalUnread > 0 && (
              <span className="flex h-5 items-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white">
                {totalUnread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Link
              href="/admin/task-manager"
              className="flex h-8 items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20"
              title="Open Task Manager"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              <span>Tasks</span>
            </Link>
            {user?.role === 'super_admin' && (
              <Link
                href="/admin/chat/manage"
                className="flex h-8 items-center justify-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2 text-[10px] font-bold uppercase tracking-wider text-violet-300 transition-colors hover:bg-violet-500/20"
                title="Manage All Chats"
              >
                <Shield className="h-3.5 w-3.5" />
                All
              </Link>
            )}
            <button
              onClick={() => setShowNewConv(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white transition-colors hover:bg-emerald-500"
              title="New conversation"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="border-b border-white/5 px-3 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search chats, messages, broadcasts..."
              value={searchConv}
              onChange={(e) => handleSidebarSearch(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-8 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            {searchConv && (
              <button
                onClick={() => handleSidebarSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs: Staff Chats vs AI Co-Founder & Workers */}
        <div className="flex border-b border-white/5 bg-black/20 p-1.5 text-xs font-semibold">
          <button
            onClick={() => setSidebarTab('conversations')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 transition ${
              sidebarTab === 'conversations'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Staff</span>
            {totalUnread > 0 && (
              <span className="ml-1 rounded-full bg-emerald-500 px-1 text-[9px] text-white">
                {totalUnread}
              </span>
            )}
          </button>
          <button
            onClick={() => setSidebarTab('ai')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 transition ${
              sidebarTab === 'ai'
                ? 'bg-violet-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-violet-300" />
            <span>AI Workers ({listAIWorkers().length})</span>
          </button>
        </div>

        <div className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
          {sidebarTab === 'ai' ? (
            <div className="space-y-1">
              {listAIWorkers().map((persona) => {
                const isActive =
                  activeAiWorker?.department === persona.department;
                return (
                  <button
                    key={persona.id}
                    onClick={() => selectAIWorker(persona)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                      isActive
                        ? 'bg-violet-600/20 text-white ring-1 ring-violet-500/40'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <div className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-700 to-indigo-600 text-base shadow">
                      <span>{persona.avatarEmoji}</span>
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full border border-violet-900 bg-emerald-500"></span>
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="truncate text-xs font-bold text-white">
                          {persona.name}
                        </p>
                        <span className="rounded bg-violet-500/20 px-1 py-0.5 text-[8px] font-semibold text-violet-300">
                          {persona.department === 'co_founder'
                            ? 'Executive'
                            : 'Specialist'}
                        </span>
                      </div>
                      <p className="truncate text-[10px] text-slate-400">
                        {persona.roleTitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : loadingConvs ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <MessageCircle className="h-10 w-10 text-slate-600" />
              <p className="text-sm text-slate-500">No conversations yet</p>
              <button
                onClick={() => setShowNewConv(true)}
                className="rounded-lg bg-emerald-600/20 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-600/30"
              >
                Start a conversation
              </button>
            </div>
          ) : (
            filteredConvs.map((conv) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                isActive={conv.id === activeConvId}
                currentUserId={user?.uid || ''}
                onClick={() => selectConversation(conv.id)}
              />
            ))
          )}

          {searchConv.trim().length >= 2 && (
            <div className="mt-2 rounded-xl border-t border-white/5 bg-white/[0.02] p-3">
              <div className="mb-2 flex items-center gap-1.5">
                <Search className="h-3 w-3 text-emerald-400" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Messages Matching "{searchConv}" (
                  {sidebarMatchedMessages.length})
                </p>
                {searchingSidebarMessages && (
                  <Loader2 className="ml-auto h-3 w-3 animate-spin text-emerald-400" />
                )}
              </div>
              {sidebarMatchedMessages.length === 0 &&
              !searchingSidebarMessages ? (
                <p className="text-xs italic text-slate-500">
                  No message text found
                </p>
              ) : (
                <div className="max-h-48 space-y-1.5 overflow-y-auto">
                  {sidebarMatchedMessages.map((m) => {
                    const isBcast = m.conversation?.type === 'broadcast';
                    const title = isBcast
                      ? '📢 Official Staff Broadcast'
                      : m.conversation?.group_name ||
                        m.sender?.full_name ||
                        m.sender?.email ||
                        'Chat';
                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          selectConversation(m.conversation_id);
                          setShowInChatSearch(true);
                          setInChatSearchQuery(searchConv);
                        }}
                        className="w-full rounded-lg bg-white/5 p-2 text-left transition-colors hover:bg-white/10"
                      >
                        <p className="truncate text-[11px] font-semibold text-white">
                          {title}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-slate-400">
                          {m.text_content}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Center: Chat area ── */}
      <div
        className={`flex flex-1 flex-col overflow-hidden ${mobileView === 'list' ? 'hidden lg:flex' : 'flex'}`}
      >
        {!activeConv ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
              <MessageCircle className="h-10 w-10 text-emerald-400" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-white">Ruhvi Staff Chat</h3>
              <p className="mt-1 text-sm text-slate-400">
                Select a conversation or start a new one
              </p>
            </div>
            <button
              onClick={() => setShowNewConv(true)}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
            >
              <Plus className="h-4 w-4" /> New Conversation
            </button>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-white/5 bg-[#131726] px-4">
              <button
                onClick={() => setMobileView('list')}
                className="text-slate-400 hover:text-white lg:hidden"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              {activeAiWorker ? (
                <div className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-700 to-indigo-600 text-base shadow">
                  <span>{activeAiWorker.avatarEmoji}</span>
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full border border-violet-900 bg-emerald-500"></span>
                  </span>
                </div>
              ) : activeConv?.type === 'group' ? (
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-violet-600">
                  <Users className="h-5 w-5 text-white" />
                </div>
              ) : (
                <UserAvatar user={activeConv?.other_user || null} />
              )}
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-sm font-bold text-white">
                  <span>{convTitle}</span>
                  {activeAiWorker && (
                    <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-violet-300">
                      {activeAiWorker.department === 'co_founder'
                        ? 'Executive Co-Founder'
                        : 'AI Specialist'}
                    </span>
                  )}
                </p>
                <p className="truncate text-[11px] capitalize text-slate-400">
                  {convSubtitle}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setShowInChatSearch((v) => !v);
                    if (showInChatSearch) setInChatSearchQuery('');
                  }}
                  className={`rounded-lg p-2 transition-colors ${showInChatSearch ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                  title="Search in this conversation"
                >
                  <Search className="h-4 w-4" />
                </button>
                {activeConv?.type === 'group' && (
                  <button
                    onClick={() => setShowGroupInfo((v) => !v)}
                    className={`rounded-lg p-2 transition-colors ${showGroupInfo ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                    title="Group info"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* In-Chat Search Bar */}
            {showInChatSearch && (
              <div className="flex items-center gap-2 border-b border-white/5 bg-[#171b2c] px-4 py-2">
                <Search className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search in this conversation or broadcast..."
                  value={inChatSearchQuery}
                  onChange={(e) => setInChatSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                />
                {inChatSearchQuery && (
                  <span className="text-[11px] font-medium text-emerald-400">
                    {displayedMessages.length} found
                  </span>
                )}
                <button
                  onClick={() => {
                    setShowInChatSearch(false);
                    setInChatSearchQuery('');
                  }}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Pinned Messages Banner */}
            {messages.filter((m) => m.pinned_at && !m.deleted_at).length >
              0 && (
              <div className="flex flex-col gap-1 border-b border-white/5 bg-emerald-500/5 px-4 py-2">
                {messages
                  .filter((m) => m.pinned_at && !m.deleted_at)
                  .map((pinned) => (
                    <div
                      key={`pin-${pinned.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg bg-emerald-500/10 px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Pin className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-semibold text-emerald-400">
                            {pinned.sender?.full_name || pinned.sender?.email}
                          </p>
                          <p className="truncate text-xs text-slate-300">
                            {pinned.text_content || '[attachment]'}
                          </p>
                        </div>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => handlePin(pinned.id, 'unpin')}
                          className="flex-shrink-0 text-slate-400 hover:text-rose-400"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto bg-[#0d0f1a] px-4 py-4">
              {loadingMsgs ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
                </div>
              ) : displayedMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-sm text-slate-500">
                  {inChatSearchQuery ? (
                    <>
                      <Search className="mb-2 h-8 w-8 text-slate-600" />
                      <p>No messages match "{inChatSearchQuery}"</p>
                    </>
                  ) : (
                    'Start the conversation 👋'
                  )}
                </div>
              ) : (
                <div className="space-y-0.5">
                  {displayedMessages.map((msg, idx) => {
                    const isOwn =
                      msg.sender_id === user?.uid ||
                      msg.sender_id === 'me' ||
                      (msg.sender_id?.startsWith('user_') ?? false);
                    const prev = idx > 0 ? messages[idx - 1] : null;
                    const showSenderInfo =
                      !prev ||
                      prev.sender_id !== msg.sender_id ||
                      new Date(msg.created_at).getTime() -
                        new Date(prev.created_at).getTime() >
                        3 * 60 * 1000;
                    const showDivider =
                      !prev || !sameDay(prev.created_at, msg.created_at);

                    return (
                      <React.Fragment key={msg.id}>
                        {showDivider && (
                          <div className="flex items-center gap-3 py-3">
                            <div className="h-px flex-1 bg-white/5" />
                            <span className="px-2 text-[10px] text-slate-500">
                              {formatDateDivider(msg.created_at)}
                            </span>
                            <div className="h-px flex-1 bg-white/5" />
                          </div>
                        )}
                        <div
                          className={
                            showSenderInfo && idx > 0 && !showDivider
                              ? 'mt-3'
                              : 'mt-0.5'
                          }
                        >
                          <MessageBubble
                            msg={msg}
                            isOwn={isOwn}
                            showSenderInfo={showSenderInfo}
                            isAdmin={isAdmin}
                            currentUserId={user?.uid || ''}
                            onReply={setReplyTo}
                            onReact={handleReact}
                            onPin={handlePin}
                          />
                        </div>
                      </React.Fragment>
                    );
                  })}
                  {sendingAi && (
                    <div className="flex items-center gap-2 py-3 text-xs text-slate-400">
                      <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                      <span>
                        {activeAiWorker?.name || 'AI Specialist'} is
                        analyzing...
                      </span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Pending attachments */}
            {pendingAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2 border-t border-white/5 bg-[#131726] px-4 py-2">
                {pendingAttachments.map((att, i) => (
                  <div key={i} className="relative">
                    {att.resource_type === 'image' ? (
                      <img
                        src={att.cloudinary_url}
                        alt={att.file_name}
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                        <FileText className="h-6 w-6 text-slate-400" />
                      </div>
                    )}
                    <button
                      onClick={() =>
                        setPendingAttachments((prev) =>
                          prev.filter((_, j) => j !== i)
                        )
                      }
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white shadow"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Pending entity refs */}
            {pendingEntityRefs.length > 0 && (
              <div className="flex flex-wrap gap-1.5 border-t border-white/5 bg-[#131726] px-4 py-2">
                {pendingEntityRefs.map((ref, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300"
                  >
                    <Hash className="h-3 w-3" />
                    {ref.display_label}
                    <button
                      onClick={() =>
                        setPendingEntityRefs((prev) =>
                          prev.filter((_, j) => j !== i)
                        )
                      }
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Reply banner */}
            {replyTo && (
              <div className="flex items-center gap-3 border-t border-white/5 bg-[#131726] px-4 py-2">
                <Reply className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold text-emerald-400">
                    Replying to{' '}
                    {replyTo.sender?.full_name ||
                      replyTo.sender?.email ||
                      'someone'}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {replyTo.text_content || '[attachment]'}
                  </p>
                </div>
                <button
                  onClick={() => setReplyTo(null)}
                  className="flex-shrink-0 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Error bar */}
            {error && (
              <div className="flex items-center gap-2 border-t border-rose-500/20 bg-rose-500/5 px-4 py-2 text-xs text-rose-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1">{error}</span>
                <button onClick={() => setError(null)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Composer */}
            {activeConv?.type === 'broadcast' &&
            !activeConv?.allow_replies &&
            !isAdmin ? (
              <div className="flex-shrink-0 border-t border-white/5 bg-[#131726] px-4 py-4 text-center">
                <div className="inline-flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
                  <Lock className="h-4 w-4 text-amber-400" />
                  <span>
                    Broadcast channel is read-only. Only administrators can post
                    announcements.
                  </span>
                </div>
              </div>
            ) : isRecordingVoiceNote ? (
              <div className="flex-shrink-0 border-t border-white/5 bg-[#131726] p-2">
                <VoiceNoteRecorder
                  onSend={handleSendVoiceNote}
                  onCancel={() => setIsRecordingVoiceNote(false)}
                  isUploading={uploadingVoiceNote}
                />
              </div>
            ) : (
              <div className="flex-shrink-0 border-t border-white/5 bg-[#131726] px-3 py-3">
                <div className="relative">
                  {/* @mention dropdown */}
                  {mentionQuery !== null && (
                    <MentionDropdown
                      query={mentionQuery}
                      staffList={staffList}
                      onSelect={insertMention}
                    />
                  )}
                  {/* Entity picker */}
                  {showEntityPicker && (
                    <EntityRefPicker
                      onAdd={(ref) => {
                        setPendingEntityRefs((prev) => [...prev, ref]);
                        setShowEntityPicker(false);
                      }}
                      onClose={() => setShowEntityPicker(false)}
                    />
                  )}

                  <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-[#0d0f1a] px-3 py-2.5">
                    {/* Attach file */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile}
                      className="mb-0.5 flex-shrink-0 text-slate-400 transition-colors hover:text-emerald-400 disabled:opacity-50"
                      title="Attach file (max 20 MB)"
                    >
                      {uploadingFile ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Paperclip className="h-5 w-5" />
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,video/mp4,video/webm"
                      onChange={handleFileSelect}
                    />

                    {/* Entity ref picker trigger */}
                    <button
                      onClick={() => setShowEntityPicker((v) => !v)}
                      className={`mb-0.5 flex-shrink-0 transition-colors ${showEntityPicker ? 'text-emerald-400' : 'text-slate-400 hover:text-emerald-400'}`}
                      title="Reference order / ticket / product"
                    >
                      <Hash className="h-5 w-5" />
                    </button>

                    {/* Voice Note Recording Trigger Button */}
                    <button
                      type="button"
                      onClick={() => setIsRecordingVoiceNote(true)}
                      className="mb-0.5 flex-shrink-0 text-slate-400 transition-colors hover:text-rose-400"
                      title="Record Voice Note (Bengali, Hindi, English)"
                    >
                      <Mic className="h-5 w-5" />
                    </button>

                    {/* Speech to Text Dictation Button */}
                    <SpeechToTextButton
                      onTranscript={(trans) =>
                        setText((prev) => (prev ? `${prev} ${trans}` : trans))
                      }
                      disabled={sendingMsg}
                    />

                    {/* Textarea */}
                    <textarea
                      ref={textareaRef}
                      value={text}
                      onChange={handleTextChange}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        activeAiWorker
                          ? `Message ${activeAiWorker.name}… (Voice note or text)`
                          : 'Message… (Enter to send · Shift+Enter for newline · @ to mention)'
                      }
                      rows={1}
                      className="flex-1 resize-none bg-transparent text-sm leading-relaxed text-white placeholder-slate-500 focus:outline-none"
                      style={{ maxHeight: '130px' }}
                    />

                    {/* Send */}
                    <button
                      onClick={sendMessage}
                      disabled={
                        sendingMsg ||
                        (!text.trim() && pendingAttachments.length === 0)
                      }
                      className="mb-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {sendingMsg ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Right: Group Info Panel ── */}
      {showGroupInfo && activeConv?.type === 'group' && (
        <GroupInfoPanel
          conv={activeConv}
          staffList={staffList}
          currentUserId={user?.uid || ''}
          onClose={() => setShowGroupInfo(false)}
          onAddMembers={addMembersToGroup}
          onLeave={leaveGroup}
        />
      )}

      {/* New Conversation Modal */}
      {showNewConv && (
        <NewConversationModal
          staffList={staffList}
          onClose={() => setShowNewConv(false)}
          onStartDirect={startDirectChat}
          onCreateGroup={createGroup}
        />
      )}
    </div>
  );
}
