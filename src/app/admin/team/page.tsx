'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Users,
  Shield,
  Layout,
  Building2,
  Plus,
  Edit2,
  ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';

type Tab = 'employees' | 'departments' | 'roles';

export default function TeamManagementPage() {
  const [activeTab, setActiveTab] = useState<Tab>('employees');
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('users')
        .select(
          `
          id, full_name, email, account_status, role_id, department_id,
          roles ( name, display_name ),
          departments ( name )
        `
        )
        .in('role', ['super_admin', 'admin', 'manager', 'staff'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmployees(data || []);
    } catch (err: any) {
      toast.error('Failed to load employees: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Team & Access</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage employees, roles, and portal access permissions.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500">
          <Plus className="h-4 w-4" />
          Add Employee
        </button>
      </div>

      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('employees')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'employees'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Users className="h-4 w-4" />
          Employees
        </button>
        <button
          onClick={() => setActiveTab('departments')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'departments'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Building2 className="h-4 w-4" />
          Departments
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'roles'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Shield className="h-4 w-4" />
          Roles & Permissions
        </button>
      </div>

      <div className="rounded-xl border border-white/5 bg-[#1a1f2e] shadow-xl">
        {activeTab === 'employees' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-black/20 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Employee</th>
                  <th className="px-6 py-4 font-medium">Department</th>
                  <th className="px-6 py-4 font-medium">Role</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-slate-500"
                    >
                      Loading employees...
                    </td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-slate-500"
                    >
                      No internal employees found.
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr
                      key={emp.id}
                      className="transition-colors hover:bg-white/5"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 font-bold text-white">
                            {emp.full_name?.charAt(0) || emp.email?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-white">
                              {emp.full_name || 'N/A'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {emp.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full bg-slate-800 px-2 py-1 text-xs font-medium text-slate-300">
                          {emp.departments?.name || 'Unassigned'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full bg-indigo-500/10 px-2 py-1 text-xs font-medium text-indigo-400">
                          {emp.roles?.display_name || 'Legacy Role'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {emp.account_status === 'active' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                            {emp.account_status}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          className="rounded p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                          title="Edit Access"
                        >
                          <ShieldAlert className="h-4 w-4" />
                        </button>
                        <button
                          className="ml-2 rounded p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                          title="Edit Profile"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'departments' && (
          <div className="p-8 text-center text-slate-500">
            Departments configuration interface will be built here.
          </div>
        )}

        {activeTab === 'roles' && (
          <div className="p-8 text-center text-slate-500">
            Roles & Permissions configuration interface will be built here.
          </div>
        )}
      </div>
    </div>
  );
}
