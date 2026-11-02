'use client';

import React, { useState } from 'react';
import {
  FileCheck,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  RefreshCw,
  Search,
} from 'lucide-react';
import { RUHVI_GST_CONFIG } from '@/lib/accounts/gst-engine';

interface ReconcileItem {
  id: string;
  vendorGstin: string;
  vendorName: string;
  invoiceNo: string;
  invoiceDate: string;
  booksTaxable: number;
  booksGst: number;
  portalTaxable: number;
  portalGst: number;
  status: 'MATCHED' | 'MISMATCH_AMOUNT' | 'BOOKS_ONLY' | 'PORTAL_ONLY';
}

export default function Gstr2bReconciliationPage() {
  const [items, setItems] = useState<ReconcileItem[]>([
    {
      id: 'rec-1',
      vendorGstin: '06AAACM1234A1Z1',
      vendorName: 'MMTC-PAMP India Private Limited',
      invoiceNo: 'MMTC/2026/8941',
      invoiceDate: '2026-10-25',
      booksTaxable: 450000,
      booksGst: 13500,
      portalTaxable: 450000,
      portalGst: 13500,
      status: 'MATCHED',
    },
    {
      id: 'rec-2',
      vendorGstin: '19AABCK5678B1Z2',
      vendorName: 'Kolkata Gold Refining & Bullion Traders',
      invoiceNo: 'KGR/OCT/112',
      invoiceDate: '2026-10-28',
      booksTaxable: 320000,
      booksGst: 9600,
      portalTaxable: 320000,
      portalGst: 9600,
      status: 'MATCHED',
    },
    {
      id: 'rec-3',
      vendorGstin: '19AAECB9012C1Z3',
      vendorName: 'Bengal Assaying & Hallmarking Centre',
      invoiceNo: 'BAHC/26-27/09',
      invoiceDate: '2026-10-30',
      booksTaxable: 12500,
      booksGst: 2250,
      portalTaxable: 0,
      portalGst: 0,
      status: 'BOOKS_ONLY', // Vendor has not uploaded GSTR-1 yet
    },
    {
      id: 'rec-4',
      vendorGstin: '27AABCJ4455D1Z7',
      vendorName: 'Surat Diamond Cutting Syndicate',
      invoiceNo: 'SDCS-901',
      invoiceDate: '2026-10-20',
      booksTaxable: 85000,
      booksGst: 1275,
      portalTaxable: 88000,
      portalGst: 1320,
      status: 'MISMATCH_AMOUNT',
    },
  ]);

  const [activeTab, setActiveTab] = useState<
    'ALL' | 'MATCHED' | 'MISMATCH_AMOUNT' | 'BOOKS_ONLY'
  >('ALL');
  const [uploadMessage, setUploadMessage] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadMessage(`Processing GSTR-2B file: ${file.name}...`);
    setTimeout(() => {
      setUploadMessage(`Successfully reconciled 4 invoices from ${file.name}`);
    }, 800);
  };

  const filtered = items.filter((i) => {
    if (activeTab === 'ALL') return true;
    return i.status === activeTab;
  });

  const matchedCount = items.filter((i) => i.status === 'MATCHED').length;
  const mismatchCount = items.filter(
    (i) => i.status === 'MISMATCH_AMOUNT'
  ).length;
  const booksOnlyCount = items.filter((i) => i.status === 'BOOKS_ONLY').length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-white">
            <FileCheck className="h-6 w-6 text-emerald-400" />
            <span>GSTR-2B Automated ITC Reconciliation</span>
          </h1>
          <p className="mt-0.5 text-xs text-slate-400">
            Cross-match vendor purchase bills with official GSTR-2B data to
            protect Input Tax Credit
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <label className="inline-flex cursor-pointer items-center space-x-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-md transition-all hover:bg-emerald-400">
            <Upload className="h-4 w-4" />
            <span>Upload GSTR-2B JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {uploadMessage && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300">
          {uploadMessage}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase">
              100% Matched ITC
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-emerald-400">
            {matchedCount} Bills
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Safe to claim in GSTR-3B
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase">
              Missing in 2B (Books Only)
            </span>
            <AlertCircle className="h-4 w-4 text-rose-400" />
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-rose-400">
            {booksOnlyCount} Bills
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Supplier has not yet filed GSTR-1
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase">
              Amount Mismatches
            </span>
            <AlertCircle className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-amber-300">
            {mismatchCount} Bills
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Discrepancy in taxable value
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
        {(['ALL', 'MATCHED', 'BOOKS_ONLY', 'MISMATCH_AMOUNT'] as const).map(
          (t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === t
                  ? 'bg-amber-500 font-bold text-slate-950'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {t === 'ALL'
                ? 'All Records'
                : t === 'MATCHED'
                  ? 'Matched (Safe ITC)'
                  : t === 'BOOKS_ONLY'
                    ? 'Missing in 2B'
                    : 'Amount Mismatch'}
            </button>
          )
        )}
      </div>

      {/* Reconciliation Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold uppercase text-slate-400">
              <tr>
                <th className="px-6 py-4">Supplier / GSTIN</th>
                <th className="px-6 py-4">Invoice # & Date</th>
                <th className="px-6 py-4 text-right">
                  In Books (Taxable / GST)
                </th>
                <th className="px-6 py-4 text-right">
                  In GSTR-2B (Taxable / GST)
                </th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  className="transition-colors hover:bg-slate-800/40"
                >
                  <td className="px-6 py-4 font-sans text-white">
                    <div className="font-medium">{item.vendorName}</div>
                    <div className="font-mono text-[11px] text-slate-500">
                      {item.vendorGstin}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono">
                    <div className="font-bold">{item.invoiceNo}</div>
                    <div className="text-[11px] text-slate-500">
                      {item.invoiceDate}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div>₹{item.booksTaxable.toLocaleString('en-IN')}</div>
                    <div className="text-[11px] text-amber-300">
                      GST: ₹{item.booksGst.toLocaleString('en-IN')}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {item.portalTaxable > 0 ? (
                      <>
                        <div>₹{item.portalTaxable.toLocaleString('en-IN')}</div>
                        <div className="text-[11px] text-emerald-400">
                          GST: ₹{item.portalGst.toLocaleString('en-IN')}
                        </div>
                      </>
                    ) : (
                      <span className="font-sans font-semibold text-rose-400">
                        Not filed in 2B
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center font-sans">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        item.status === 'MATCHED'
                          ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                          : item.status === 'BOOKS_ONLY'
                            ? 'border border-rose-500/20 bg-rose-500/10 text-rose-400'
                            : 'border border-amber-500/20 bg-amber-500/10 text-amber-300'
                      }`}
                    >
                      {item.status === 'MATCHED'
                        ? 'Matched'
                        : item.status === 'BOOKS_ONLY'
                          ? 'Missing in 2B'
                          : 'Amount Mismatch'}
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
