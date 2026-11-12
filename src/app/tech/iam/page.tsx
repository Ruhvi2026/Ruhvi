'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  Shield,
  Plus,
  Search,
  Filter,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
  Power,
  Mail,
  Phone,
  Briefcase,
} from 'lucide-react';

type StaffMember = {
  id: string;
  legacy_user_id?: string | null;
  employee_code?: string;
  full_name: string | null;
  email: string | null;
  phone?: string | null;
  role: string;
  department?: string | null;
  allowed_portals?: string[];
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

const DEPARTMENTS = [
  'Management',
  'Operations',
  'Orders',
  'Support',
  'Tech',
  'Finance',
  'Marketing',
];

const ROLES = [
  { value: 'staff', label: 'Staff (Standard)' },
  { value: 'manager', label: 'Department Manager' },
  { value: 'admin', label: 'Administrator' },
  { value: 'super_admin', label: 'Super Admin' },
];

export default function IamPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Add Staff Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    workEmail: '',
    phone: '',
    department: 'Support',
    role: 'staff',
    allowedPortals: ['admin', 'chat'],
  });

  const loadStaff = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/admin/staff');
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setStaff(data.staff || []);
    } catch (err: any) {
      console.error('Failed to load staff members', err);
      setLoadError(err?.message || 'Failed to load staff members.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleToggleStatus = async (member: StaffMember) => {
    const nextStatus = !member.is_active;
    const confirmMsg = nextStatus
      ? `Re-activate staff access for ${member.full_name}?`
      : `Deactivate ${member.full_name}? They will immediately lose staff portal access.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin/staff/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextStatus }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update status');
      }

      setStaff((prev) =>
        prev.map((s) =>
          s.id === member.id ? { ...s, is_active: nextStatus } : s
        )
      );
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!formData.firstName.trim() || !formData.workEmail.trim()) {
      setFormError('First Name and Work Email are required.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          work_email: formData.workEmail.trim().toLowerCase(),
          phone: formData.phone.trim(),
          department: formData.department,
          role: formData.role,
          allowed_portals: formData.allowedPortals,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to provision staff member');
      }

      setFormSuccess(data.message || 'Staff member invited successfully!');
      setTimeout(() => {
        setShowAddModal(false);
        setFormData({
          firstName: '',
          lastName: '',
          workEmail: '',
          phone: '',
          department: 'Support',
          role: 'staff',
          allowedPortals: ['admin', 'chat'],
        });
        setFormSuccess(null);
        loadStaff();
      }, 1200);
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  const filteredStaff = staff.filter((member) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (member.full_name ?? '').toLowerCase().includes(q) ||
      (member.email ?? '').toLowerCase().includes(q) ||
      (member.employee_code ?? '').toLowerCase().includes(q) ||
      member.role.toLowerCase().includes(q);

    const matchesDept =
      departmentFilter === 'ALL' ||
      (member.department ?? '').toLowerCase() ===
        departmentFilter.toLowerCase();

    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
            <Users className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            Identity & Access Management (Staff)
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Decoupled staff management. Staff profiles are isolated from
            customer storefront accounts.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-amber-700"
        >
          <Plus className="h-4 w-4" /> Add Staff Member
        </button>
      </div>

      {/* Main Container */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Toolbar */}
        <div className="flex flex-col justify-between gap-4 border-b border-gray-200 bg-gray-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/50 sm:flex-row sm:items-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by code, name, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="ALL">All Departments</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
              <tr>
                <th className="px-6 py-3.5">Staff Member</th>
                <th className="px-6 py-3.5">Department</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Portals</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-sm text-slate-500"
                  >
                    <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-amber-600" />
                    Loading staff directory…
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-sm text-red-500"
                  >
                    Failed to load staff members. {loadError}
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-sm text-slate-500"
                  >
                    No staff members found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((member) => (
                  <tr
                    key={member.id}
                    className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                          {(member.full_name ?? '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900 dark:text-white">
                              {member.full_name ?? 'Unnamed Staff'}
                            </p>
                            {member.employee_code && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {member.employee_code}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                            <span>{member.email ?? '—'}</span>
                            {member.phone && <span>• {member.phone}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                        <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                        {member.department || 'Support'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
                          member.role === 'super_admin'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300'
                            : member.role === 'admin'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                              : member.role === 'manager'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        <Shield className="h-3 w-3" />
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(member.allowed_portals || ['admin', 'chat']).map(
                          (portal) => (
                            <span
                              key={portal}
                              className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            >
                              {portal}
                            </span>
                          )
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                          member.is_active
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            member.is_active ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        {member.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(member)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                          member.is_active
                            ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300'
                        }`}
                        title={
                          member.is_active
                            ? 'Deactivate staff account'
                            : 'Reactivate staff account'
                        }
                      >
                        <Power className="h-3 w-3" />
                        {member.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-600" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Provision New Staff Member
                </h2>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateStaff} className="space-y-4 p-6">
              {formError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Subir"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Last Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sen"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Official Work Email *
                </label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="subir.sen@ruhvi.in"
                    value={formData.workEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, workEmail: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  This work email is decoupled from their private customer
                  purchases.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Phone (Optional)
                </label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="+91..."
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Department
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {saving ? 'Provisioning…' : 'Provision Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
