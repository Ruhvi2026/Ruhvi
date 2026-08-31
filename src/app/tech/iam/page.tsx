'use client';

import React, { useState } from 'react';
import {
  Users,
  Shield,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit2,
  Key,
} from 'lucide-react';

const MOCK_STAFF = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@ruhvi.in',
    role: 'super_admin',
    portals: ['all'],
    status: 'active',
    lastActive: '2 mins ago',
  },
  {
    id: '2',
    name: 'Operations Lead',
    email: 'ops@ruhvi.in',
    role: 'admin',
    portals: ['operations', 'orders'],
    status: 'active',
    lastActive: '1 hr ago',
  },
  {
    id: '3',
    name: 'Support Agent',
    email: 'support@ruhvi.in',
    role: 'staff',
    portals: ['support'],
    status: 'active',
    lastActive: '3 hrs ago',
  },
  {
    id: '4',
    name: 'Marketing Manager',
    email: 'marketing@ruhvi.in',
    role: 'manager',
    portals: ['marketing'],
    status: 'active',
    lastActive: '5 hrs ago',
  },
];

export default function IamPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 font-mono text-2xl font-bold text-slate-100">
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

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        {/* Toolbar */}
        <div className="flex flex-col justify-between gap-4 border-b border-slate-800 bg-slate-950/50 p-4 sm:flex-row sm:items-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-10 pr-4 text-sm text-slate-200 transition-all placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <button className="flex w-fit items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-400 transition-colors hover:text-slate-200">
            <Filter className="h-4 w-4" /> Filter
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80 font-medium text-slate-400">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Allowed Portals</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Last Active</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {MOCK_STAFF.map((staff) => (
                <tr
                  key={staff.id}
                  className="transition-colors hover:bg-slate-800/30"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 font-bold text-indigo-400">
                        {staff.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-200">
                          {staff.name}
                        </p>
                        <p className="text-xs text-slate-500">{staff.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium ${
                        staff.role === 'super_admin'
                          ? 'border-purple-500/20 bg-purple-500/10 text-purple-400'
                          : staff.role === 'admin'
                            ? 'border-indigo-500/20 bg-indigo-500/10 text-indigo-400'
                            : staff.role === 'manager'
                              ? 'border-blue-500/20 bg-blue-500/10 text-blue-400'
                              : 'border-slate-500/20 bg-slate-500/10 text-slate-400'
                      }`}
                    >
                      <Shield className="h-3 w-3" />
                      {staff.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {staff.portals.map((portal) => (
                        <span
                          key={portal}
                          className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300"
                        >
                          {portal}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400">
                    {staff.lastActive}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-indigo-400"
                        title="Edit Permissions"
                      >
                        <Key className="h-4 w-4" />
                      </button>
                      <button
                        className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
