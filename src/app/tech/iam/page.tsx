'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  Shield,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit2,
  Key,
  Loader2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type StaffMember = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  created_at: string | null;
  updated_at: string | null;
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function IamPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadStaff = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, email, role, created_at, updated_at')
          .in('role', ['admin', 'manager', 'staff'])
          .order('created_at', { ascending: true });

        if (error) throw error;
        setStaff(data ?? []);
      } catch (err: any) {
        console.error('Failed to load staff members', err);
        setLoadError(err?.message || 'Failed to load staff members.');
      } finally {
        setLoading(false);
      }
    };

    loadStaff();
  }, []);

  const filteredStaff = staff.filter((member) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (member.full_name ?? '').toLowerCase().includes(q) ||
      (member.email ?? '').toLowerCase().includes(q) ||
      member.role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <Users className="h-6 w-6 text-indigo-400" />
            Identity & Access Management
          </h1>
          <p className="mt-1 text-slate-400">
            Manage staff roles, portal access, and security policies.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 font-medium text-white transition-colors hover:bg-indigo-600">
          <Plus className="h-4 w-4" /> Add Staff Member
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/5 bg-[#131726]">
        {/* Toolbar */}
        <div className="flex flex-col justify-between gap-4 border-b border-white/5 bg-white/5 p-4 sm:flex-row sm:items-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-sm text-slate-200 transition-all placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <button className="flex w-fit items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-slate-400 transition-colors hover:text-slate-200">
            <Filter className="h-4 w-4" /> Filter
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 font-medium text-slate-400">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Allowed Portals</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Last Updated</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-sm text-slate-400"
                  >
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-indigo-400" />
                    Loading staff members…
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-sm text-rose-400"
                  >
                    Failed to load staff members. {loadError}
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-sm text-slate-400"
                  >
                    {staff.length === 0
                      ? 'No staff members found.'
                      : 'No staff members match your search.'}
                  </td>
                </tr>
              ) : (
                filteredStaff.map((member) => (
                  <tr
                    key={member.id}
                    className="transition-colors hover:bg-white/5"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 font-bold text-indigo-400">
                          {(member.full_name ?? '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-200">
                            {member.full_name ?? 'Unnamed user'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {member.email ?? '—'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium ${
                          member.role === 'super_admin'
                            ? 'border-purple-500/20 bg-purple-500/10 text-purple-400'
                            : member.role === 'admin'
                              ? 'border-indigo-500/20 bg-indigo-500/10 text-indigo-400'
                              : member.role === 'manager'
                                ? 'border-blue-500/20 bg-blue-500/10 text-blue-400'
                                : 'border-slate-500/20 bg-slate-500/10 text-slate-400'
                        }`}
                      >
                        <Shield className="h-3 w-3" />
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">—</td>
                    <td className="px-6 py-4 text-xs text-slate-500">—</td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {formatDate(member.updated_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="rounded p-1.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-indigo-400"
                          title="Edit Permissions"
                        >
                          <Key className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded p-1.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
                          title="Edit User"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
