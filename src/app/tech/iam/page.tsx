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
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-900 dark:text-white">
            <Users className="h-6 w-6 text-tech-primary" />
            Identity & Access Management
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-500 dark:text-tech-textSecondary">
            Manage staff roles, portal access, and security policies.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-tech-primary px-4 py-2 font-medium text-slate-900 transition-colors hover:bg-tech-primary/90 dark:text-white">
          <Plus className="h-4 w-4" /> Add Staff Member
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-tech-border dark:bg-tech-card">
        {/* Toolbar */}
        <div className="flex flex-col justify-between gap-4 border-b border-gray-200 bg-gray-50 p-4 dark:border-tech-border dark:bg-gray-50 dark:bg-white/5 sm:flex-row sm:items-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 transition-all placeholder:text-slate-600 focus:border-tech-primary focus:outline-none focus:ring-1 focus:ring-tech-primary dark:border-gray-200 dark:border-white/10 dark:bg-gray-50 dark:bg-white/5 dark:text-slate-200 dark:text-slate-400 dark:text-slate-500 dark:text-slate-900 dark:placeholder:text-slate-500"
            />
          </div>
          <button className="flex w-fit items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-600 transition-colors hover:text-slate-900 dark:border-transparent dark:bg-gray-50 dark:bg-white/5 dark:text-slate-200 dark:text-slate-400 dark:text-slate-600 dark:hover:text-slate-900">
            <Filter className="h-4 w-4" /> Filter
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 font-medium text-slate-500 dark:bg-gray-50 dark:bg-white/5 dark:text-slate-400 dark:text-slate-500 dark:text-slate-600">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Allowed Portals</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Last Updated</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-600"
                  >
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-tech-primary" />
                    Loading staff members…
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-sm text-tech-alert"
                  >
                    Failed to load staff members. {loadError}
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-sm text-slate-600 dark:text-slate-400"
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
                    className="transition-colors hover:bg-slate-50 dark:bg-white/5 dark:hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-tech-primary/20 font-bold text-tech-primary">
                          {(member.full_name ?? '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-200 dark:text-slate-900">
                            {member.full_name ?? 'Unnamed user'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-500">
                            {member.email ?? '—'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium ${
                          member.role === 'super_admin'
                            ? 'border-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-400'
                            : member.role === 'admin'
                              ? 'border-tech-primary/20 bg-tech-primary/10 text-tech-primary'
                              : member.role === 'manager'
                                ? 'border-tech-cyan/20 bg-tech-cyan/10 text-tech-cyan'
                                : 'border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-400 dark:text-slate-600'
                        }`}
                      >
                        <Shield className="h-3 w-3" />
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-500">
                      —
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-500">
                      —
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-400 dark:text-slate-600">
                      {formatDate(member.updated_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="rounded p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-tech-primary dark:bg-white/5 dark:text-slate-400 dark:text-slate-500 dark:text-slate-600 dark:hover:bg-gray-50 dark:hover:text-tech-primary"
                          title="Edit Permissions"
                        >
                          <Key className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:bg-white/5 dark:text-slate-200 dark:text-slate-400 dark:text-slate-500 dark:text-slate-600 dark:hover:bg-gray-50 dark:hover:text-slate-900"
                          title="Edit User"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button className="rounded p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:text-slate-400 dark:text-slate-500 dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-900">
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
