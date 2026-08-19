'use client';

import React, { useState } from 'react';
import {
  Database,
  Download,
  Users,
  Package,
  ShoppingBag,
  Calendar,
  FileSpreadsheet,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Filter,
  ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ExportOption {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  borderColor: string;
  bgGradient: string;
  fields: string[];
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    id: 'customers',
    title: 'Customer Master Directory',
    description:
      'Export all registered customer profiles, emails, contact numbers, account roles, and wallet balances.',
    icon: Users,
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/20',
    bgGradient: 'from-cyan-500/10 to-transparent',
    fields: [
      'Customer ID',
      'Full Name',
      'Email',
      'Phone',
      'Role',
      'Wallet Balance',
      'Joined Date',
    ],
  },
  {
    id: 'inventory',
    title: 'Catalog & Inventory Master',
    description:
      'Export full product catalog, SKUs, active stock counts, safety thresholds, and retail prices.',
    icon: Package,
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/20',
    bgGradient: 'from-emerald-500/10 to-transparent',
    fields: [
      'Product ID',
      'SKU',
      'Title',
      'Category',
      'Price',
      'Stock Count',
      'Threshold',
      'Status',
    ],
  },
  {
    id: 'orders',
    title: 'Orders & Financial Archive',
    description:
      'Comprehensive historical orders dataset with status, payment gateways, tax breakdown, and shipping details.',
    icon: ShoppingBag,
    color: 'text-purple-400',
    borderColor: 'border-purple-500/20',
    bgGradient: 'from-purple-500/10 to-transparent',
    fields: [
      'Order Number',
      'Customer',
      'Status',
      'Payment Method',
      'Subtotal',
      'Tax',
      'Shipping',
      'Total',
    ],
  },
];

export default function MasterDataPage() {
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'json'>('csv');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loadingExport, setLoadingExport] = useState<string | null>(null);

  const handleExport = async (type: string, title: string) => {
    setLoadingExport(type);
    try {
      const params = new URLSearchParams();
      params.append('type', type);
      params.append('format', selectedFormat);
      if (startDate)
        params.append('startDate', new Date(startDate).toISOString());
      if (endDate) params.append('endDate', new Date(endDate).toISOString());

      const res = await fetch(`/api/admin/export?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate export archive');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-export-${new Date().toISOString().split('T')[0]}.${selectedFormat}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success(
        `Successfully generated ${title} (${selectedFormat.toUpperCase()})`
      );
    } catch (err: any) {
      console.error('Export error:', err);
      toast.error(err.message || 'Export failed');
    } finally {
      setLoadingExport(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-2 text-indigo-400">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Master Data Export Engine
              </h1>
              <p className="mt-0.5 text-xs text-slate-400">
                Generate raw system snapshots for auditing, tax compliance, and
                external business intelligence.
              </p>
            </div>
          </div>
        </div>

        {/* Global Format Selector */}
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#080B14] p-1.5">
          <button
            onClick={() => setSelectedFormat('csv')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              selectedFormat === 'csv'
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            CSV Format
          </button>
          <button
            onClick={() => setSelectedFormat('json')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              selectedFormat === 'json'
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileCode className="h-3.5 w-3.5" />
            JSON Format
          </button>
        </div>
      </div>

      {/* Date Range Filter Bar */}
      <div className="rounded-2xl border border-white/5 bg-[#080B14]/60 p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Filter className="h-4 w-4 text-indigo-400" />
            <span>Export Date Filter (Optional)</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="px-2 py-1 text-[11px] font-medium text-rose-400 hover:underline"
              >
                Clear Dates
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {EXPORT_OPTIONS.map((item) => {
          const Icon = item.icon;
          const isLoading = loadingExport === item.id;

          return (
            <div
              key={item.id}
              className={`rounded-2xl border ${item.borderColor} bg-gradient-to-b ${item.bgGradient} group relative flex flex-col justify-between overflow-hidden to-[#080B14]/80 p-6 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-white/20`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div
                    className={`rounded-xl bg-white/5 p-3 ${item.color} border border-white/5`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="rounded-full border border-white/5 bg-white/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-400">
                    Live Sync
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white transition-colors group-hover:text-indigo-300">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                    {item.description}
                  </p>
                </div>

                <div className="border-t border-white/5 pt-2">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Included Columns
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.fields.map((f) => (
                      <span
                        key={f}
                        className="rounded-md border border-white/5 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 border-t border-white/5 pt-4">
                <button
                  onClick={() => handleExport(item.id, item.title)}
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Generating Archive...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span>Download {selectedFormat.toUpperCase()}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Compliance & Security Banner */}
      <div className="flex items-start gap-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">
        <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-indigo-400" />
        <div className="space-y-1 text-xs text-slate-300">
          <p className="font-semibold text-white">
            Enterprise Data Protection & Export Auditing
          </p>
          <p className="leading-relaxed text-slate-400">
            All data exports are strictly monitored and logged to the central
            security audit trail. Generated CSV and JSON payloads adhere to
            strict privacy safeguards and exclude raw cryptographic secrets.
          </p>
        </div>
      </div>
    </div>
  );
}
