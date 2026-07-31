'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, Lock, Eye, Key } from 'lucide-react';
import { AuditLog } from '@/types/database';

const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    user_id: 'admin-1',
    action: 'SHIPMENT_CREATED',
    entity: 'orders',
    entity_id: 'RHV-2026-8942',
    ip_address: '103.21.124.5',
    details: { courier: 'Blue Dart', awb: 'BLUEDART-12345' },
    created_at: '2026-07-31T11:45:00Z',
  },
  {
    id: 'log-2',
    user_id: 'admin-1',
    action: 'PRICE_UPDATE',
    entity: 'products',
    entity_id: 'prod-1',
    ip_address: '103.21.124.5',
    details: { old_price: 15500, new_price: 12500 },
    created_at: '2026-07-31T10:30:00Z',
  },
  {
    id: 'log-3',
    user_id: 'admin-2',
    action: 'ADMIN_LOGIN_SUCCESS',
    entity: 'auth',
    entity_id: 'admin-2',
    ip_address: '49.207.210.12',
    details: { method: 'email_password' },
    created_at: '2026-07-31T09:15:00Z',
  }
];

export default function AuditLogsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4 border-b border-stone-200 pb-6">
        <Link href="/admin/dashboard" className="p-2 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-stone-700" />
        </Link>
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 flex items-center space-x-2">
            <Shield className="w-6 h-6 text-amber-900" />
            <span>Security & Audit Logs</span>
          </h1>
          <p className="text-xs text-stone-500 mt-1">Immutable security activity records and administrative audit trails</p>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-stone-400 uppercase text-[10px] font-semibold tracking-wider bg-stone-50">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Admin ID</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {MOCK_AUDIT_LOGS.map((log) => (
                <tr key={log.id} className="hover:bg-stone-50 transition-colors">
                  <td className="py-3 px-4 text-xs font-mono text-stone-500">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className="bg-stone-900 text-amber-200 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-stone-800 capitalize">
                    {log.entity} ({log.entity_id})
                  </td>
                  <td className="py-3 px-4 text-xs text-stone-600 font-mono">
                    {log.user_id}
                  </td>
                  <td className="py-3 px-4 text-xs text-stone-500 font-mono">
                    {log.ip_address}
                  </td>
                  <td className="py-3 px-4 text-xs text-stone-500 font-mono">
                    {JSON.stringify(log.details)}
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
