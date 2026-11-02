'use client';

import React, { useState } from 'react';
import {
  Users,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Phone,
  Mail,
  Building,
} from 'lucide-react';

interface PartyLedger {
  id: string;
  name: string;
  type: 'CUSTOMER' | 'VENDOR';
  phone: string;
  city: string;
  gstin?: string;
  totalInvoiced: number;
  totalPaid: number;
  balanceOutstanding: number;
  status: 'SETTLED' | 'PENDING' | 'OVERDUE';
}

export default function PartyLedgerPage() {
  const [parties, setParties] = useState<PartyLedger[]>([
    {
      id: 'p-1',
      name: 'MMTC-PAMP India Private Limited',
      type: 'VENDOR',
      phone: '+91 124 478 2000',
      city: 'Gurugram, Haryana',
      gstin: '06AAACM1234A1Z1',
      totalInvoiced: 463500,
      totalPaid: 463500,
      balanceOutstanding: 0,
      status: 'SETTLED',
    },
    {
      id: 'p-2',
      name: 'Kolkata Gold Refining & Bullion Traders',
      type: 'VENDOR',
      phone: '+91 33 2244 5566',
      city: 'Bowbazar, Kolkata',
      gstin: '19AABCK5678B1Z2',
      totalInvoiced: 329600,
      totalPaid: 250000,
      balanceOutstanding: 79600,
      status: 'PENDING',
    },
    {
      id: 'p-3',
      name: 'Smt. Debolina Mukherjee (Custom Bridal Order)',
      type: 'CUSTOMER',
      phone: '+91 98301 22334',
      city: 'Kolkata, West Bengal',
      totalInvoiced: 185000,
      totalPaid: 150000,
      balanceOutstanding: 35000,
      status: 'PENDING',
    },
    {
      id: 'p-4',
      name: 'Priyanka Sharma (Diamond Solitaire Set)',
      type: 'CUSTOMER',
      phone: '+91 98112 33445',
      city: 'Mumbai, Maharashtra',
      totalInvoiced: 94500,
      totalPaid: 94500,
      balanceOutstanding: 0,
      status: 'SETTLED',
    },
  ]);

  const [filterType, setFilterType] = useState<'ALL' | 'CUSTOMER' | 'VENDOR'>(
    'ALL'
  );
  const [search, setSearch] = useState('');

  const filteredParties = parties.filter((p) => {
    if (filterType !== 'ALL' && p.type !== filterType) return false;
    if (!search.trim()) return true;
    return (
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search)
    );
  });

  const totalReceivable = parties
    .filter((p) => p.type === 'CUSTOMER')
    .reduce((s, p) => s + p.balanceOutstanding, 0);

  const totalPayable = parties
    .filter((p) => p.type === 'VENDOR')
    .reduce((s, p) => s + p.balanceOutstanding, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl font-bold text-white">
          <Users className="h-6 w-6 text-amber-400" />
          <span>Party Outstanding & Accounts Ledger</span>
        </h1>
        <p className="mt-0.5 text-xs text-slate-400">
          Track customer receivables (Dena) & supplier payables (Paona) with
          balance aging
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase">
              Customer Receivables (Debtors)
            </span>
            <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-emerald-400">
            ₹{totalReceivable.toLocaleString('en-IN')}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Pending payments from retail/B2B clients
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase">
              Vendor Payables (Creditors)
            </span>
            <ArrowUpRight className="h-4 w-4 text-rose-400" />
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-rose-400">
            ₹{totalPayable.toLocaleString('en-IN')}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Pending bullion & jobwork supplier settlements
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 sm:flex-row">
        <div className="w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search party name or phone..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
          />
        </div>

        <div className="flex w-full items-center space-x-2 sm:w-auto">
          {(['ALL', 'CUSTOMER', 'VENDOR'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                filterType === t
                  ? 'bg-amber-500 font-bold text-slate-950'
                  : 'border border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              {t === 'ALL'
                ? 'All Parties'
                : t === 'CUSTOMER'
                  ? 'Customers Only'
                  : 'Vendors Only'}
            </button>
          ))}
        </div>
      </div>

      {/* Parties Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold uppercase text-slate-400">
              <tr>
                <th className="px-6 py-4">Party Name</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4 text-right">Invoiced (₹)</th>
                <th className="px-6 py-4 text-right">Paid (₹)</th>
                <th className="px-6 py-4 text-right">Balance Due (₹)</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {filteredParties.map((p) => (
                <tr
                  key={p.id}
                  className="transition-colors hover:bg-slate-800/40"
                >
                  <td className="px-6 py-4 font-sans font-medium text-white">
                    <div>{p.name}</div>
                    <div className="font-mono text-[11px] text-slate-500">
                      {p.phone} {p.gstin ? `• ${p.gstin}` : ''}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-sans">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                        p.type === 'CUSTOMER'
                          ? 'border border-blue-500/20 bg-blue-500/10 text-blue-400'
                          : 'border border-purple-500/20 bg-purple-500/10 text-purple-400'
                      }`}
                    >
                      {p.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-sans text-slate-400">
                    {p.city}
                  </td>
                  <td className="px-6 py-4 text-right">
                    ₹{p.totalInvoiced.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-right text-emerald-400">
                    ₹{p.totalPaid.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-amber-300">
                    ₹{p.balanceOutstanding.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-center font-sans">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        p.status === 'SETTLED'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      {p.status}
                    </span>
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
