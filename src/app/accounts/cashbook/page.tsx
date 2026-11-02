'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  PlusCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  Wallet,
  Calendar,
  Filter,
} from 'lucide-react';
import { RUHVI_GST_CONFIG } from '@/lib/accounts/gst-engine';

interface CashEntry {
  id: string;
  date: string;
  type: 'INCOME' | 'EXPENSE';
  account: 'CASH' | 'BANK_HDFC';
  category: string;
  description: string;
  amount: number;
}

export default function CashBookPage() {
  const [entries, setEntries] = useState<CashEntry[]>([
    {
      id: 'ce-1',
      date: '2026-11-01',
      type: 'INCOME',
      account: 'BANK_HDFC',
      category: 'Online Sales',
      description: 'Customer payment received via PhonePe PG',
      amount: 48500,
    },
    {
      id: 'ce-2',
      date: '2026-11-01',
      type: 'EXPENSE',
      account: 'BANK_HDFC',
      category: 'Logistics',
      description: 'Shiprocket wallet recharge for courier shipments',
      amount: 5000,
    },
    {
      id: 'ce-3',
      date: '2026-11-02',
      type: 'INCOME',
      account: 'CASH',
      category: 'Showroom Retail',
      description: 'Cash advance received for custom diamond ring order',
      amount: 25000,
    },
    {
      id: 'ce-4',
      date: '2026-11-02',
      type: 'EXPENSE',
      account: 'CASH',
      category: 'Store Operations',
      description: 'Luxury velvet packaging boxes & tamper bags',
      amount: 3200,
    },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [account, setAccount] = useState<'CASH' | 'BANK_HDFC'>('BANK_HDFC');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);

  const totalInflow = entries
    .filter((e) => e.type === 'INCOME')
    .reduce((s, e) => s + e.amount, 0);
  const totalOutflow = entries
    .filter((e) => e.type === 'EXPENSE')
    .reduce((s, e) => s + e.amount, 0);
  const netBalance = totalInflow - totalOutflow;

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;

    setEntries([
      {
        id: `ce-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        type,
        account,
        category:
          category ||
          (type === 'INCOME' ? 'General Receipt' : 'Operating Expense'),
        description,
        amount,
      },
      ...entries,
    ]);

    setShowAddModal(false);
    setDescription('');
    setCategory('');
    setAmount(0);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-white">
            <BookOpen className="h-6 w-6 text-amber-400" />
            <span>Cash Book & Daybook Register</span>
          </h1>
          <p className="mt-0.5 text-xs text-slate-400">
            Daily liquidity tracking • Cash in Hand vs HDFC Bank Current Account
            ({RUHVI_GST_CONFIG.accountNumber})
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center space-x-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 shadow-md transition-all hover:bg-amber-400"
        >
          <PlusCircle className="h-4 w-4" />
          <span>New Cashbook Entry</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase">
              Total Cash Inflow
            </span>
            <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-emerald-400">
            +₹{totalInflow.toLocaleString('en-IN')}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Receipts & online payments
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase">
              Total Outflow
            </span>
            <ArrowUpRight className="h-4 w-4 text-rose-400" />
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-rose-400">
            -₹{totalOutflow.toLocaleString('en-IN')}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Operational & courier costs
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase">
              Net Closing Liquidity
            </span>
            <Wallet className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-white">
            ₹{netBalance.toLocaleString('en-IN')}
          </div>
          <p className="mt-1 text-xs font-semibold text-emerald-400">
            Healthy Operating Balance
          </p>
        </div>
      </div>

      {/* Entries Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 p-6">
          <h2 className="text-base font-bold text-white">
            Daily Transactions Ledger
          </h2>
          <span className="font-mono text-xs text-slate-400">FY 2026-27</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold uppercase text-slate-400">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Account</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Particulars / Details</th>
                <th className="px-6 py-4 text-center">Type</th>
                <th className="px-6 py-4 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {entries.map((e) => (
                <tr
                  key={e.id}
                  className="transition-colors hover:bg-slate-800/40"
                >
                  <td className="px-6 py-4 text-slate-400">{e.date}</td>
                  <td className="px-6 py-4 font-sans">
                    <span className="inline-flex items-center gap-1.5 rounded bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-200">
                      {e.account === 'BANK_HDFC' ? (
                        <Landmark className="h-3 w-3 text-blue-400" />
                      ) : (
                        <Wallet className="h-3 w-3 text-amber-400" />
                      )}
                      <span>
                        {e.account === 'BANK_HDFC'
                          ? 'HDFC Bank'
                          : 'Cash in Hand'}
                      </span>
                    </span>
                  </td>
                  <td className="px-6 py-4 font-sans text-slate-300">
                    {e.category}
                  </td>
                  <td className="px-6 py-4 font-sans text-white">
                    {e.description}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        e.type === 'INCOME'
                          ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                          : 'border border-rose-500/20 bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {e.type}
                    </span>
                  </td>
                  <td
                    className={`px-6 py-4 text-right font-bold ${
                      e.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {e.type === 'INCOME' ? '+' : '-'}₹
                    {e.amount.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <h2 className="text-lg font-bold text-white">
              Record Cashbook Entry
            </h2>

            <form onSubmit={handleAddEntry} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-slate-400">
                    Entry Type
                  </label>
                  <select
                    value={type}
                    onChange={(e: any) => setType(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  >
                    <option value="INCOME">Income (Cash In)</option>
                    <option value="EXPENSE">Expense (Cash Out)</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-slate-400">Account</label>
                  <select
                    value={account}
                    onChange={(e: any) => setAccount(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  >
                    <option value="BANK_HDFC">HDFC Bank Current</option>
                    <option value="CASH">Cash in Hand</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-slate-400">Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Courier, Store Packing, Tea/Refreshment"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-slate-400">
                  Particulars / Description *
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Details of expense or receipt"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-slate-400">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  value={amount || ''}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  placeholder="2500"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm font-bold text-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 border-t border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 px-5 py-2 font-bold text-slate-950 hover:bg-amber-400"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
