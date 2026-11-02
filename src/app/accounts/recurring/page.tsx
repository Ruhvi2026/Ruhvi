'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Repeat,
  Plus,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  PauseCircle,
  PlayCircle,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Download,
  FileText,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { RUHVI_GST_CONFIG } from '@/lib/accounts/gst-engine';

interface RecurringProfile {
  id: string;
  code: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  planName: string;
  planCategory:
    | 'GOLD_SAVINGS_SCHEME'
    | 'SHOWROOM_RETAINER'
    | 'VAULT_STORAGE'
    | 'VIP_STYLING';
  frequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  amount: number;
  gstRate: number;
  startDate: string;
  nextBillingDate: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  autoSendEmail: boolean;
  totalBilledCycles: number;
}

const INITIAL_RECURRING: RecurringProfile[] = [
  {
    id: 'rec-1',
    code: 'REC-2026-001',
    customerName: 'Ananya Chatterjee',
    customerEmail: 'ananya.c@gmail.com',
    customerPhone: '+91 98301 23456',
    planName: 'Swarna Nidhi 11-Month Gold Scheme',
    planCategory: 'GOLD_SAVINGS_SCHEME',
    frequency: 'MONTHLY',
    amount: 10000,
    gstRate: 3,
    startDate: '2025-11-01',
    nextBillingDate: '2026-04-01',
    status: 'ACTIVE',
    autoSendEmail: true,
    totalBilledCycles: 5,
  },
  {
    id: 'rec-2',
    code: 'REC-2026-002',
    customerName: 'Siddharth & Priyadarshini Singhania',
    customerEmail: 'singhania.holdings@corp.in',
    customerPhone: '+91 98200 99881',
    planName: 'VIP Bespoke Jewellery Concierge & Styling',
    planCategory: 'VIP_STYLING',
    frequency: 'QUARTERLY',
    amount: 75000,
    gstRate: 18,
    startDate: '2026-01-01',
    nextBillingDate: '2026-04-01',
    status: 'ACTIVE',
    autoSendEmail: true,
    totalBilledCycles: 1,
  },
  {
    id: 'rec-3',
    code: 'REC-2026-003',
    customerName: 'Debabrata Mukherjee (Mukherjee Jewellers)',
    customerEmail: 'mukherjee.trade@bowbazar.com',
    customerPhone: '+91 98311 55667',
    planName: 'Safe Deposit & Vault Custody Services',
    planCategory: 'VAULT_STORAGE',
    frequency: 'MONTHLY',
    amount: 15000,
    gstRate: 18,
    startDate: '2025-08-15',
    nextBillingDate: '2026-04-15',
    status: 'ACTIVE',
    autoSendEmail: true,
    totalBilledCycles: 8,
  },
  {
    id: 'rec-4',
    code: 'REC-2026-004',
    customerName: 'Meghna Roy Chowdhury',
    customerEmail: 'meghna.rc@outlook.com',
    customerPhone: '+91 97482 11223',
    planName: 'Dhanteras Bridal Accumulation Plan',
    planCategory: 'GOLD_SAVINGS_SCHEME',
    frequency: 'MONTHLY',
    amount: 25000,
    gstRate: 3,
    startDate: '2025-12-01',
    nextBillingDate: '2026-04-01',
    status: 'PAUSED',
    autoSendEmail: false,
    totalBilledCycles: 4,
  },
];

export default function RecurringInvoicesPage() {
  const [profiles, setProfiles] =
    useState<RecurringProfile[]>(INITIAL_RECURRING);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [showNewModal, setShowNewModal] = useState(false);
  const [isProcessingRun, setIsProcessingRun] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New Schedule Form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPlan, setNewPlan] = useState('Swarna Nidhi 11-Month Gold Scheme');
  const [newCategory, setNewCategory] = useState<
    RecurringProfile['planCategory']
  >('GOLD_SAVINGS_SCHEME');
  const [newFreq, setNewFreq] =
    useState<RecurringProfile['frequency']>('MONTHLY');
  const [newAmount, setNewAmount] = useState<number>(10000);

  const totalMonthlyRecurringRevenue = profiles.reduce((acc, p) => {
    if (p.status !== 'ACTIVE') return acc;
    if (p.frequency === 'MONTHLY') return acc + p.amount;
    if (p.frequency === 'QUARTERLY') return acc + Math.round(p.amount / 3);
    if (p.frequency === 'ANNUAL') return acc + Math.round(p.amount / 12);
    return acc;
  }, 0);

  const handleToggleStatus = (id: string) => {
    setProfiles(
      profiles.map((p) =>
        p.id === id
          ? { ...p, status: p.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' }
          : p
      )
    );
  };

  const handleRunBillingCycle = () => {
    setIsProcessingRun(true);
    setTimeout(() => {
      setIsProcessingRun(false);
      setSuccessMsg(
        'Successfully generated and queued 3 recurring invoices for April 2026 cycle!'
      );
      setTimeout(() => setSuccessMsg(null), 5000);
    }, 1200);
  };

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const newProfile: RecurringProfile = {
      id: `rec-${Date.now()}`,
      code: `REC-2026-${Math.floor(100 + Math.random() * 900)}`,
      customerName: newName,
      customerEmail: newEmail,
      customerPhone: newPhone,
      planName: newPlan,
      planCategory: newCategory,
      frequency: newFreq,
      amount: Number(newAmount),
      gstRate: newCategory === 'GOLD_SAVINGS_SCHEME' ? 3 : 18,
      startDate: new Date().toISOString().split('T')[0],
      nextBillingDate: '2026-04-01',
      status: 'ACTIVE',
      autoSendEmail: true,
      totalBilledCycles: 0,
    };

    setProfiles([newProfile, ...profiles]);
    setShowNewModal(false);
    setNewName('');
    setNewEmail('');
    setNewPhone('');
  };

  const filteredProfiles = profiles.filter((p) => {
    const matchesCat =
      filterCategory === 'ALL' || p.planCategory === filterCategory;
    const matchesSearch =
      p.customerName.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      p.planName.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-400">
              <Repeat className="h-3 w-3" /> Automated Subscriptions & Retainers
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Recurring Invoices & Gold Schemes
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage recurring bullion schemes, Swarna Nidhi plans, vault
            retainers, and automated GST billing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunBillingCycle}
            disabled={isProcessingRun}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-200 transition-all hover:bg-slate-700"
          >
            <Clock
              className={`h-4 w-4 ${isProcessingRun ? 'animate-spin text-amber-400' : 'text-slate-400'}`}
            />
            <span>
              {isProcessingRun
                ? 'Processing Cycle...'
                : 'Run Billing Cycle Now'}
            </span>
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-400"
          >
            <Plus className="h-4 w-4" />
            <span>New Recurring Schedule</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-semibold text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Monthly Recurring (MRR)
            </span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 font-mono text-2xl font-bold text-emerald-400">
            ₹{totalMonthlyRecurringRevenue.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Predictable monthly inflow
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Retainer Profiles
            </span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
              <Repeat className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-white">
            {profiles.filter((p) => p.status === 'ACTIVE').length} Active
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {profiles.length} Total created
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Swarna Nidhi Members
            </span>
            <div className="rounded-lg bg-yellow-500/10 p-2 text-yellow-400">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-white">
            {
              profiles.filter((p) => p.planCategory === 'GOLD_SAVINGS_SCHEME')
                .length
            }{' '}
            Customers
          </p>
          <p className="mt-1 text-xs text-yellow-500">
            11-month gold bonus enrollment
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Next Due Run
            </span>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-white">01 Apr 2026</p>
          <p className="mt-1 text-xs text-slate-500">
            3 Invoices queued for dispatch
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer, plan or profile ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/80 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="GOLD_SAVINGS_SCHEME">
              Swarna Nidhi Gold Scheme (3% GST)
            </option>
            <option value="VIP_STYLING">
              VIP Concierge & Styling (18% GST)
            </option>
            <option value="VAULT_STORAGE">
              Safe Vault & Custody (18% GST)
            </option>
          </select>
        </div>
      </div>

      {/* Profiles Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-4">Profile ID & Customer</th>
                <th className="px-4 py-4">Scheme / Retainer Plan</th>
                <th className="px-4 py-4 text-center">Frequency</th>
                <th className="px-4 py-4 text-right">Cycle Amount</th>
                <th className="px-4 py-4 text-center">GST Rate</th>
                <th className="px-4 py-4">Next Due Date</th>
                <th className="px-4 py-4 text-center">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredProfiles.map((p) => (
                <tr
                  key={p.id}
                  className="transition-colors hover:bg-slate-800/30"
                >
                  <td className="px-5 py-4">
                    <div className="font-mono font-bold text-amber-400">
                      {p.code}
                    </div>
                    <div className="mt-0.5 font-semibold text-white">
                      {p.customerName}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {p.customerPhone}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="font-medium text-slate-200">
                      {p.planName}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500">
                      Billed: {p.totalBilledCycles} cycles completed
                    </div>
                  </td>

                  <td className="px-4 py-4 text-center font-semibold">
                    <span className="rounded-lg bg-slate-800 px-2 py-1 text-[11px] text-slate-300">
                      {p.frequency}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-right font-mono font-bold text-white">
                    ₹{p.amount.toLocaleString('en-IN')}
                  </td>

                  <td className="px-4 py-4 text-center font-mono font-semibold text-amber-400">
                    {p.gstRate}%
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5 text-slate-200">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>{p.nextBillingDate}</span>
                    </div>
                  </td>

                  <td className="px-4 py-4 text-center">
                    {p.status === 'ACTIVE' ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-semibold text-slate-400">
                        <PauseCircle className="h-3 w-3" /> Paused
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => handleToggleStatus(p.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-[11px] font-semibold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
                    >
                      {p.status === 'ACTIVE' ? (
                        <>
                          <PauseCircle className="h-3 w-3 text-amber-400" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <PlayCircle className="h-3 w-3 text-emerald-400" />
                          <span>Resume</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Recurring Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="flex items-center gap-2 text-base font-bold text-white">
                <Repeat className="h-5 w-5 text-amber-400" />
                <span>Create Recurring Invoicing Schedule</span>
              </h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-lg text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <form
              onSubmit={handleCreateProfile}
              className="space-y-4 pt-4 text-xs"
            >
              <div>
                <label className="mb-1 block font-semibold text-slate-300">
                  Customer / Party Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Smt. Priyadarshini Singhania"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-slate-300">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98301 23456"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-300">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="client@domain.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-300">
                  Category & GST Treatment
                </label>
                <select
                  value={newCategory}
                  onChange={(e: any) => setNewCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                >
                  <option value="GOLD_SAVINGS_SCHEME">
                    Swarna Nidhi 11-Month Gold Scheme (3% GST HSN 7113)
                  </option>
                  <option value="VIP_STYLING">
                    VIP Bespoke Concierge & Styling (18% GST SAC 9983)
                  </option>
                  <option value="VAULT_STORAGE">
                    Safe Vault & Custody Storage (18% GST SAC 9967)
                  </option>
                  <option value="SHOWROOM_RETAINER">
                    Showroom Franchise Retainer (18% GST)
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-slate-300">
                    Billing Frequency
                  </label>
                  <select
                    value={newFreq}
                    onChange={(e: any) => setNewFreq(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="ANNUAL">Annual</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-slate-300">
                    Installment Amount (₹)
                  </label>
                  <input
                    type="number"
                    required
                    value={newAmount}
                    onChange={(e) => setNewAmount(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 px-5 py-2 font-bold text-slate-950 hover:bg-amber-400"
                >
                  Activate Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
