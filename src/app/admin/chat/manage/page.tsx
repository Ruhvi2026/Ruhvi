'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  MessageCircle,
  Search,
  Users,
  Shield,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowLeft,
  Hash,
  Clock,
  MessageSquare,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInitials(name: string | null, email: string | null) {
  const n = name || email || '?';
  const parts = n.split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return n.slice(0, 2).toUpperCase();
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  admin: 'bg-red-500/20 text-red-300 border-red-500/30',
  manager: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  staff: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

// ─── Components ───────────────────────────────────────────────────────────────

function MemberAvatarStack({ members }: { members: any[] }) {
  const visible = members.slice(0, 4);
  const rest = members.length - visible.length;
  return (
    <div className="flex -space-x-2">
      {visible.map((m: any, i: number) => {
        const u = m.users || m.user || {};
        const initials = getInitials(u.full_name, u.email);
        const colors = [
          'bg-emerald-600',
          'bg-violet-600',
          'bg-amber-600',
          'bg-sky-600',
        ];
        return (
          <div
            key={m.user_id || i}
            className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#131726] ${colors[i % colors.length]} flex-shrink-0 text-[9px] font-bold text-white`}
            title={u.full_name || u.email}
          >
            {initials}
          </div>
        );
      })}
      {rest > 0 && (
        <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#131726] bg-slate-700 text-[9px] font-bold text-slate-300">
          +{rest}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminAllChatsPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [typeFilter, setTypeFilter] = useState<'' | 'direct' | 'group'>('');
  const [error, setError] = useState<string | null>(null);

  const limit = 20;
  const totalPages = Math.ceil(total / limit);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set('q', search);
      if (typeFilter) params.set('type', typeFilter);
      const res = await fetch(
        `/api/internal-chat/admin/conversations?${params}`
      );
      if (res.status === 401) {
        setError('Access denied — super admin only');
        return;
      }
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setConversations(data.conversations || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-white/5 bg-[#131726] px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/chat"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-violet-400" />
                <h1 className="text-lg font-bold text-white">
                  All Staff Chats
                </h1>
                <span className="rounded-full border border-violet-500/30 bg-violet-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-300">
                  Super Admin
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                {total} conversation{total !== 1 ? 's' : ''} across all staff
              </p>
            </div>
          </div>
          <button
            onClick={fetchAll}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap gap-3">
          <form
            onSubmit={handleSearch}
            className="relative min-w-[220px] flex-1"
          >
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search group names..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </form>
          <div className="flex overflow-hidden rounded-lg border border-white/10">
            {(['', 'direct', 'group'] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTypeFilter(t);
                  setPage(1);
                }}
                className={`px-3 py-2 text-xs font-medium transition-colors ${typeFilter === t ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
              >
                {t === '' ? 'All' : t === 'direct' ? 'Direct' : 'Groups'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {error ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <Shield className="mx-auto mb-3 h-10 w-10 text-rose-400" />
              <p className="text-sm text-rose-400">{error}</p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <MessageCircle className="h-12 w-12 text-slate-600" />
            <p className="text-slate-400">No conversations found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 border-b border-white/5 bg-[#131726]">
              <tr>
                {[
                  'Conversation',
                  'Type',
                  'Members',
                  'Messages',
                  'Last Activity',
                  'Actions',
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {conversations.map((conv: any) => {
                const isGroup = conv.type === 'group';
                const displayName = isGroup
                  ? conv.group_name || 'Unnamed Group'
                  : (() => {
                      const members = conv.members || [];
                      const names = members.map((m: any) => {
                        const u = m.users || m.user || {};
                        return u.full_name || u.email || 'Staff';
                      });
                      return names.slice(0, 2).join(' ↔ ') || 'Direct Message';
                    })();

                return (
                  <tr
                    key={conv.id}
                    className="transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${isGroup ? 'bg-violet-600' : 'bg-emerald-700'}`}
                        >
                          {isGroup ? (
                            <Users className="h-4 w-4 text-white" />
                          ) : (
                            <MessageSquare className="h-4 w-4 text-white" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="max-w-[200px] truncate font-medium text-white">
                            {displayName}
                          </p>
                          {conv.group_topic && (
                            <p className="max-w-[200px] truncate text-[11px] text-slate-400">
                              {conv.group_topic}
                            </p>
                          )}
                          <p className="mt-0.5 font-mono text-[10px] text-slate-600">
                            {conv.id.slice(0, 8)}…
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${isGroup ? 'border-violet-500/20 bg-violet-500/10 text-violet-300' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'}`}
                      >
                        {conv.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <MemberAvatarStack members={conv.members || []} />
                        <span className="text-xs text-slate-500">
                          {(conv.members || []).length}
                        </span>
                      </div>
                      {/* Role chips */}
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {(conv.members || []).slice(0, 3).map((m: any) => {
                          const u = m.users || m.user || {};
                          const role = u.role || 'staff';
                          return (
                            <span
                              key={m.user_id}
                              className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-medium ${ROLE_COLORS[role] || ROLE_COLORS.staff}`}
                            >
                              {u.full_name?.split(' ')[0] ||
                                u.email?.split('@')[0] ||
                                'Staff'}{' '}
                              · {role}
                            </span>
                          );
                        })}
                        {(conv.members || []).length > 3 && (
                          <span className="text-[10px] text-slate-500">
                            +{(conv.members || []).length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Hash className="h-3.5 w-3.5 text-slate-500" />
                        <span className="font-mono text-sm text-slate-300">
                          {conv.message_count ?? 0}
                        </span>
                      </div>
                      {conv.last_message && (
                        <p className="mt-1 max-w-[160px] truncate text-[10px] text-slate-500">
                          {conv.last_message.text_content || '[attachment]'}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 flex-shrink-0 text-slate-500" />
                        <span className="whitespace-nowrap text-xs text-slate-400">
                          {formatTime(conv.updated_at)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        Created {formatTime(conv.created_at)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href="/admin/chat"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300 transition-colors hover:bg-violet-500/20"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-white/5 bg-[#131726] px-6 py-3">
          <p className="text-xs text-slate-500">
            Showing {Math.min((page - 1) * limit + 1, total)}–
            {Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-slate-400">
              {page} / {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
