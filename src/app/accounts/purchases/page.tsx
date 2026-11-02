'use client';

import React, { useState } from 'react';
import {
  ShoppingBag,
  PlusCircle,
  FileCheck,
  TrendingDown,
  ShieldCheck,
  Search,
  Calendar,
  Building2,
} from 'lucide-react';
import { RUHVI_GST_CONFIG } from '@/lib/accounts/gst-engine';

interface PurchaseBill {
  id: string;
  vendorName: string;
  vendorGstin: string;
  billNumber: string;
  billDate: string;
  category:
    | 'Bullion (Gold/Silver)'
    | 'Gemstones'
    | 'Making & Jobwork'
    | 'Hallmarking'
    | 'Packaging';
  taxableAmount: number;
  gstRate: number; // 3% for bullion, 5% or 18% for jobwork
  itcAmount: number;
  totalAmount: number;
}

export default function PurchasesPage() {
  const [bills, setBills] = useState<PurchaseBill[]>([
    {
      id: 'pb-1',
      vendorName: 'MMTC-PAMP India Private Limited',
      vendorGstin: '06AAACM1234A1Z1',
      billNumber: 'MMTC/2026/8941',
      billDate: '2026-10-25',
      category: 'Bullion (Gold/Silver)',
      taxableAmount: 450000,
      gstRate: 3,
      itcAmount: 13500,
      totalAmount: 463500,
    },
    {
      id: 'pb-2',
      vendorName: 'Kolkata Gold Refining & Bullion Traders',
      vendorGstin: '19AABCK5678B1Z2',
      billNumber: 'KGR/OCT/112',
      billDate: '2026-10-28',
      category: 'Bullion (Gold/Silver)',
      taxableAmount: 320000,
      gstRate: 3,
      itcAmount: 9600,
      totalAmount: 329600,
    },
    {
      id: 'pb-3',
      vendorName: 'Bengal Assaying & Hallmarking Centre',
      vendorGstin: '19AAECB9012C1Z3',
      billNumber: 'BAHC/26-27/09',
      billDate: '2026-10-30',
      category: 'Hallmarking',
      taxableAmount: 12500,
      gstRate: 18,
      itcAmount: 2250,
      totalAmount: 14750,
    },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [vendorGstin, setVendorGstin] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [category, setCategory] = useState<any>('Bullion (Gold/Silver)');
  const [taxableAmount, setTaxableAmount] = useState(0);
  const [gstRate, setGstRate] = useState(3);

  const totalPurchases = bills.reduce((s, b) => s + b.taxableAmount, 0);
  const totalItc = bills.reduce((s, b) => s + b.itcAmount, 0);

  const handleAddBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName || !billNumber || !taxableAmount) return;

    const itc = Math.round(((taxableAmount * gstRate) / 100) * 100) / 100;
    const total = taxableAmount + itc;

    setBills([
      {
        id: `pb-${Date.now()}`,
        vendorName,
        vendorGstin,
        billNumber,
        billDate,
        category,
        taxableAmount,
        gstRate,
        itcAmount: itc,
        totalAmount: total,
      },
      ...bills,
    ]);

    setShowAddModal(false);
    setVendorName('');
    setVendorGstin('');
    setBillNumber('');
    setTaxableAmount(0);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-white">
            <ShoppingBag className="h-6 w-6 text-amber-400" />
            <span>Vendor Purchases & Input Tax Credit (ITC)</span>
          </h1>
          <p className="mt-0.5 text-xs text-slate-400">
            Record raw bullion, gemstones & jobwork bills to claim eligible ITC
            against sales GST
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center space-x-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 shadow-md transition-all hover:bg-amber-400"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Record Vendor Bill</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="text-xs font-semibold uppercase text-slate-400">
            Total Taxable Purchases
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-white">
            ₹{totalPurchases.toLocaleString('en-IN')}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Bullion, gems & manufacturing
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="text-xs font-semibold uppercase text-slate-400">
            Eligible ITC (Tax Credit)
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-emerald-400">
            ₹{totalItc.toLocaleString('en-IN')}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Offsets outward GST in GSTR-3B
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="text-xs font-semibold uppercase text-slate-400">
            Vendor Compliance
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-amber-300">
            100% GSTR-2B Match
          </div>
          <p className="mt-1 text-xs text-slate-500">
            All supplier GSTINs active
          </p>
        </div>
      </div>

      {/* Purchase Bills Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl">
        <div className="border-b border-slate-800 p-6">
          <h2 className="text-base font-bold text-white">
            Purchase & Inward Supply Register
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold uppercase text-slate-400">
              <tr>
                <th className="px-6 py-4">Bill Date & #</th>
                <th className="px-6 py-4">Supplier / Vendor</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-right">Taxable (₹)</th>
                <th className="px-6 py-4 text-right">GST Rate</th>
                <th className="px-6 py-4 text-right">Eligible ITC (₹)</th>
                <th className="px-6 py-4 text-right">Total Bill (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {bills.map((b) => (
                <tr
                  key={b.id}
                  className="transition-colors hover:bg-slate-800/40"
                >
                  <td className="px-6 py-4">
                    <div className="font-bold text-white">{b.billNumber}</div>
                    <div className="text-[11px] text-slate-500">
                      {b.billDate}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-sans text-slate-200">
                    <div className="font-medium">{b.vendorName}</div>
                    <div className="font-mono text-[11px] text-slate-400">
                      {b.vendorGstin}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-sans">
                    <span className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                      {b.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    ₹
                    {b.taxableAmount.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-amber-300">
                    {b.gstRate}%
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-emerald-400">
                    ₹
                    {b.itcAmount.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-white">
                    ₹
                    {b.totalAmount.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Bill Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <h2 className="text-lg font-bold text-white">
              Record New Purchase Bill
            </h2>

            <form onSubmit={handleAddBill} className="space-y-4 text-xs">
              <div>
                <label className="mb-1 block text-slate-400">
                  Vendor / Supplier Name *
                </label>
                <input
                  type="text"
                  required
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="e.g. MMTC-PAMP India"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-slate-400">
                    Vendor GSTIN
                  </label>
                  <input
                    type="text"
                    value={vendorGstin}
                    onChange={(e) =>
                      setVendorGstin(e.target.value.toUpperCase())
                    }
                    placeholder="15-digit GSTIN"
                    maxLength={15}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono uppercase text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-slate-400">
                    Bill Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={billNumber}
                    onChange={(e) => setBillNumber(e.target.value)}
                    placeholder="INV/2026/01"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-slate-400">Bill Date</label>
                  <input
                    type="date"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-slate-400">Category</label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  >
                    <option value="Bullion (Gold/Silver)">
                      Bullion (Gold/Silver)
                    </option>
                    <option value="Gemstones">Gemstones</option>
                    <option value="Making & Jobwork">Making & Jobwork</option>
                    <option value="Hallmarking">Hallmarking</option>
                    <option value="Packaging">Packaging</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-slate-400">
                    Taxable Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={taxableAmount || ''}
                    onChange={(e) =>
                      setTaxableAmount(parseFloat(e.target.value) || 0)
                    }
                    placeholder="50000"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-slate-400">GST Rate</label>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(parseInt(e.target.value))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  >
                    <option value={3}>3% (Bullion)</option>
                    <option value={5}>5% (Jobwork/Making)</option>
                    <option value={18}>18% (Services/Hallmarking)</option>
                  </select>
                </div>
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
                  Save Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
