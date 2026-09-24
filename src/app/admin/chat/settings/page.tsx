'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Megaphone,
  Sliders,
  Send,
  Shield,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Radio,
  FileText,
  Clock,
  Sparkles,
  Users,
  Settings,
  Lock,
  MessageCircle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AdminChatSettingsPage() {
  const [activeTab, setActiveTab] = useState<'broadcast' | 'settings'>(
    'broadcast'
  );

  // Broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastPriority, setBroadcastPriority] = useState<
    'normal' | 'high' | 'urgent'
  >('normal');
  const [allowReplies, setAllowReplies] = useState(false);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // Settings state
  const [chatSettings, setChatSettings] = useState({
    allow_staff_direct_messages: true,
    allow_staff_group_creation: true,
    max_attachment_size_mb: 20,
    enable_file_attachments: true,
    broadcast_channel_name: '📢 Official Staff Broadcast',
    auto_archive_resolved_after_days: 30,
  });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/internal-chat/admin/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setChatSettings(data.settings);
        }
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) {
      toast.error('Please enter broadcast message text.');
      return;
    }

    if (
      !confirm(
        `Are you sure you want to send this official broadcast announcement (${allowReplies ? 'Read & Write - Staff Can Reply' : 'Read-Only - No Staff Replies'}) to all staff members?`
      )
    ) {
      return;
    }

    setSendingBroadcast(true);
    try {
      const res = await fetch('/api/internal-chat/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: broadcastTitle,
          message: broadcastMessage,
          priority: broadcastPriority,
          allow_replies: allowReplies,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send broadcast');
      }

      toast.success('Broadcast sent successfully to all staff channels! 📢');
      setBroadcastTitle('');
      setBroadcastMessage('');
      setBroadcastPriority('normal');
      setAllowReplies(false);
    } catch (err: any) {
      toast.error(err.message || 'Error sending broadcast');
    } finally {
      setSendingBroadcast(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch('/api/internal-chat/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatSettings),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update settings');
      }

      toast.success('Chat messenger settings saved successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] p-6 text-slate-100 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin/chat"
            className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-emerald-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Staff Chat
          </Link>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
              <Shield className="h-3.5 w-3.5" />
              Super Admin & Admin Only
            </span>
          </div>
        </div>

        {/* Header Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-[#1F2D48] bg-gradient-to-r from-[#131B2E] to-[#162238] p-6 shadow-xl">
          <div className="relative z-10">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-600/20 text-emerald-400">
                <Megaphone className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Staff Chat & Broadcast Management
              </h1>
            </div>
            <p className="max-w-2xl text-sm text-slate-400">
              Control app-wide messenger settings and dispatch official company
              broadcast announcements directly to all staff devices (Web &
              Android).
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-[#1F293D] pb-3">
          <button
            onClick={() => setActiveTab('broadcast')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === 'broadcast'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Radio className="h-4 w-4" />
            Official Broadcast Channel
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === 'settings'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Sliders className="h-4 w-4" />
            Chat Messenger Settings
          </button>
        </div>

        {/* TAB 1: BROADCAST SENDER */}
        {activeTab === 'broadcast' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Form */}
            <div className="space-y-5 rounded-2xl border border-[#1F2D48] bg-[#101524] p-6 shadow-lg lg:col-span-2">
              <div className="border-b border-[#1F2D48] pb-4">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                  <Megaphone className="h-5 w-5 text-emerald-400" />
                  Dispatch Broadcast Announcement
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  This message will instantly appear in the official{' '}
                  <strong>&apos;📢 Official Staff Broadcast&apos;</strong>{' '}
                  channel on all staff web portals and mobile phones.
                </p>
              </div>

              <form onSubmit={handleSendBroadcast} className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Priority Level
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setBroadcastPriority('normal')}
                      className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition ${
                        broadcastPriority === 'normal'
                          ? 'border-sky-500/40 bg-sky-500/10 text-sky-300 ring-1 ring-sky-500/30'
                          : 'border-[#22304C] bg-[#141C2E] text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-xs font-bold">
                        <span className="h-2 w-2 rounded-full bg-sky-400" />
                        Normal
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Regular news/update
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBroadcastPriority('high')}
                      className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition ${
                        broadcastPriority === 'high'
                          ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/30'
                          : 'border-[#22304C] bg-[#141C2E] text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-xs font-bold">
                        <span className="h-2 w-2 rounded-full bg-amber-400" />
                        Important
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Operational notices
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBroadcastPriority('urgent')}
                      className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition ${
                        broadcastPriority === 'urgent'
                          ? 'border-rose-500/40 bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/30'
                          : 'border-[#22304C] bg-[#141C2E] text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-xs font-bold">
                        <span className="h-2 w-2 rounded-full bg-rose-400" />
                        Urgent
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Critical / SLA alerts
                      </span>
                    </button>
                  </div>
                </div>

                {/* Reply Permission: Read-Only vs Read & Write */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Staff Reply Permission
                  </label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setAllowReplies(false)}
                      className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition ${
                        !allowReplies
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30'
                          : 'border-[#22304C] bg-[#141C2E] text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <Lock
                        className={`mt-0.5 h-4 w-4 flex-shrink-0 ${!allowReplies ? 'text-emerald-400' : 'text-slate-500'}`}
                      />
                      <div>
                        <span className="block text-xs font-bold text-white">
                          🔒 Read-Only (Official Notice)
                        </span>
                        <span className="mt-0.5 block text-[11px] text-slate-400">
                          Staff can only read; replies are disabled to prevent
                          spam.
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAllowReplies(true)}
                      className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition ${
                        allowReplies
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30'
                          : 'border-[#22304C] bg-[#141C2E] text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <MessageCircle
                        className={`mt-0.5 h-4 w-4 flex-shrink-0 ${allowReplies ? 'text-emerald-400' : 'text-slate-500'}`}
                      />
                      <div>
                        <span className="block text-xs font-bold text-white">
                          💬 Read & Write (Open Discussion)
                        </span>
                        <span className="mt-0.5 block text-[11px] text-slate-400">
                          Staff can reply, ask questions, and discuss this
                          broadcast.
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Announcement Subject / Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    placeholder="e.g., Scheduled Maintenance / Monthly Townhall"
                    className="w-full rounded-xl border border-[#22304C] bg-[#141C2E] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Message Content <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    rows={5}
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="Write your announcement details here. You can use Markdown or bullet points..."
                    required
                    className="w-full rounded-xl border border-[#22304C] bg-[#141C2E] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={sendingBroadcast || !broadcastMessage.trim()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 active:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    {sendingBroadcast
                      ? 'Dispatching Broadcast...'
                      : 'Broadcast to All Staff 📢'}
                  </button>
                </div>
              </form>
            </div>

            {/* Live Mobile/Web Preview Card */}
            <div className="flex flex-col justify-between rounded-2xl border border-[#1F2D48] bg-[#101524] p-6 shadow-lg">
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-300">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  Live Preview on Staff App
                </h3>

                <div className="min-h-[220px] rounded-xl bg-[#ECE5DD] p-4 text-slate-900 shadow-inner">
                  <div className="max-w-[90%] rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="mb-1 text-[11px] font-bold text-[#075E54]">
                      📢 Official Broadcast
                    </p>

                    {broadcastPriority === 'urgent' && (
                      <p className="mb-1 text-[11px] font-bold text-rose-600">
                        🚨 [URGENT ANNOUNCEMENT]
                      </p>
                    )}
                    {broadcastPriority === 'high' && (
                      <p className="mb-1 text-[11px] font-bold text-amber-600">
                        ⚡ [IMPORTANT NOTICE]
                      </p>
                    )}

                    {broadcastTitle ? (
                      <p className="mb-1 text-xs font-bold text-slate-900">
                        {broadcastTitle}
                      </p>
                    ) : null}

                    <p className="whitespace-pre-wrap text-xs text-slate-800">
                      {broadcastMessage ||
                        'Your message will appear here in the WhatsApp-style preview...'}
                    </p>

                    <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-slate-500">
                      <span>Just now</span>
                      <CheckCircle2 className="h-3 w-3 text-sky-500" />
                    </div>
                  </div>

                  {/* Reply status in preview */}
                  <div className="mt-3 rounded-lg border border-slate-300 bg-white/80 p-2 text-center backdrop-blur-sm">
                    <p className="text-[10px] font-medium text-slate-600">
                      {allowReplies ? (
                        <span className="font-semibold text-emerald-700">
                          💬 Staff members can reply and discuss
                        </span>
                      ) : (
                        <span className="font-semibold text-amber-800">
                          🔒 Read-only (Staff replies disabled)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-[#1F2D48] pt-4 text-xs text-slate-400">
                {allowReplies ? (
                  <>
                    <MessageCircle className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                    <span>
                      Open Discussion mode: All staff members can view and reply
                      to this broadcast.
                    </span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 flex-shrink-0 text-amber-400" />
                    <span>
                      Read-Only mode: Regular staff members can read this
                      announcement but cannot send messages.
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CHAT SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-6 rounded-2xl border border-[#1F2D48] bg-[#101524] p-6 shadow-lg">
            <div className="border-b border-[#1F2D48] pb-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                <Settings className="h-5 w-5 text-emerald-400" />
                Messenger Configuration
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Configure global behavioral settings for the internal staff
                messaging platform.
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="max-w-2xl space-y-6">
              {/* Allow 1-to-1 DMs */}
              <div className="flex items-center justify-between rounded-xl border border-[#22304C] bg-[#141C2E] p-4">
                <div>
                  <h4 className="text-sm font-semibold text-white">
                    Direct 1-on-1 Staff Messaging
                  </h4>
                  <p className="text-xs text-slate-400">
                    Allow staff members to start private 1-on-1 direct
                    conversations with each other.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={chatSettings.allow_staff_direct_messages}
                  onChange={(e) =>
                    setChatSettings({
                      ...chatSettings,
                      allow_staff_direct_messages: e.target.checked,
                    })
                  }
                  className="h-5 w-5 cursor-pointer accent-emerald-500"
                />
              </div>

              {/* Allow Group Creation */}
              <div className="flex items-center justify-between rounded-xl border border-[#22304C] bg-[#141C2E] p-4">
                <div>
                  <h4 className="text-sm font-semibold text-white">
                    Staff Group Chat Creation
                  </h4>
                  <p className="text-xs text-slate-400">
                    Allow all staff to create custom multi-member groups
                    (otherwise restricted to Admins).
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={chatSettings.allow_staff_group_creation}
                  onChange={(e) =>
                    setChatSettings({
                      ...chatSettings,
                      allow_staff_group_creation: e.target.checked,
                    })
                  }
                  className="h-5 w-5 cursor-pointer accent-emerald-500"
                />
              </div>

              {/* Allow File Attachments */}
              <div className="flex items-center justify-between rounded-xl border border-[#22304C] bg-[#141C2E] p-4">
                <div>
                  <h4 className="text-sm font-semibold text-white">
                    Cloudinary Attachments (Images & Documents)
                  </h4>
                  <p className="text-xs text-slate-400">
                    Enable media, photo, camera capture, and PDF document
                    sharing in chat.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={chatSettings.enable_file_attachments}
                  onChange={(e) =>
                    setChatSettings({
                      ...chatSettings,
                      enable_file_attachments: e.target.checked,
                    })
                  }
                  className="h-5 w-5 cursor-pointer accent-emerald-500"
                />
              </div>

              {/* Max Attachment Size */}
              <div className="space-y-2 rounded-xl border border-[#22304C] bg-[#141C2E] p-4">
                <label className="block text-sm font-semibold text-white">
                  Max File Attachment Size (MB)
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={chatSettings.max_attachment_size_mb}
                  onChange={(e) =>
                    setChatSettings({
                      ...chatSettings,
                      max_attachment_size_mb: parseInt(e.target.value) || 20,
                    })
                  }
                  className="w-full rounded-xl border border-[#22304C] bg-[#0B0F19] px-4 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
                <p className="text-xs text-slate-400">
                  Recommended: 20 MB for high-resolution jewellery photos and
                  inspection documents.
                </p>
              </div>

              {/* Broadcast Channel Name */}
              <div className="space-y-2 rounded-xl border border-[#22304C] bg-[#141C2E] p-4">
                <label className="block text-sm font-semibold text-white">
                  Broadcast Channel Display Name
                </label>
                <input
                  type="text"
                  value={chatSettings.broadcast_channel_name}
                  onChange={(e) =>
                    setChatSettings({
                      ...chatSettings,
                      broadcast_channel_name: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-[#22304C] bg-[#0B0F19] px-4 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 active:bg-emerald-700"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {savingSettings
                    ? 'Saving Settings...'
                    : 'Save Messenger Settings'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
