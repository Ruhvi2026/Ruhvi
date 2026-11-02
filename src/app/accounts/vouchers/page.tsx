'use client';

import React, { useState } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Printer,
  Share2,
  ExternalLink,
  CheckCircle2,
  ShieldCheck,
  Calendar,
  CreditCard,
  Building,
  ArrowRight,
  Filter,
} from 'lucide-react';
import {
  RUHVI_GST_CONFIG,
  numberToIndianWords,
} from '@/lib/accounts/gst-engine';

interface ReceiptVoucher {
  id: string;
  voucherNumber: string;
  voucherDate: string;
  customerName: string;
  customerPhone: string;
  customerGstin?: string;
  invoiceRef?: string;
  amountReceived: number;
  paymentMode: 'UPI' | 'NEFT_RTGS' | 'CREDIT_CARD' | 'NET_BANKING' | 'CASH';
  referenceTransactionId: string;
  bankAccount: string;
  remarks: string;
  isAdvance: boolean;
}

const INITIAL_VOUCHERS: ReceiptVoucher[] = [
  {
    id: 'v-1',
    voucherNumber: 'RV-2026-0182',
    voucherDate: '2026-03-30',
    customerName: 'Smt. Arundhati Sengupta',
    customerPhone: '+91 98302 99182',
    customerGstin: '',
    invoiceRef: 'INV-2026-0089',
    amountReceived: 124500,
    paymentMode: 'UPI',
    referenceTransactionId: 'UPI-HDFC-902348123',
    bankAccount: 'HDFC Current A/c 50200089123456',
    remarks: 'Full settlement for 22K Royal Bengal Choker',
    isAdvance: false,
  },
  {
    id: 'v-2',
    voucherNumber: 'RV-2026-0183',
    voucherDate: '2026-03-31',
    customerName: 'Vikram & Radhika Mehta',
    customerPhone: '+91 98200 44556',
    customerGstin: '27AABCM8901D1Z4',
    invoiceRef: 'INV-2026-0091',
    amountReceived: 450000,
    paymentMode: 'NEFT_RTGS',
    referenceTransactionId: 'RTGS-ICIC-20260331-098',
    bankAccount: 'HDFC Current A/c 50200089123456',
    remarks: '50% advance for Bridal Jadau Polki Necklace set',
    isAdvance: true,
  },
  {
    id: 'v-3',
    voucherNumber: 'RV-2026-0184',
    voucherDate: '2026-03-31',
    customerName: 'Tanvi Agarwal',
    customerPhone: '+91 91670 12345',
    customerGstin: '',
    invoiceRef: 'INV-2026-0094',
    amountReceived: 38200,
    paymentMode: 'CREDIT_CARD',
    referenceTransactionId: 'RAZORPAY_pay_Oq1829012',
    bankAccount: 'HDFC Razorpay Escrow',
    remarks: 'Online e-commerce store purchase',
    isAdvance: false,
  },
  {
    id: 'v-4',
    voucherNumber: 'RV-2026-0185',
    voucherDate: '2026-04-01',
    customerName: 'Subhashish Ghoshal',
    customerPhone: '+91 98310 99887',
    customerGstin: '',
    invoiceRef: '',
    amountReceived: 10000,
    paymentMode: 'UPI',
    referenceTransactionId: 'UPI-GPAY-77889911',
    bankAccount: 'HDFC Current A/c 50200089123456',
    remarks: 'Swarna Nidhi 11-Month installment cycle 4',
    isAdvance: true,
  },
];

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<ReceiptVoucher[]>(INITIAL_VOUCHERS);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<string>('ALL');
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedVoucherForPrint, setSelectedVoucherForPrint] =
    useState<ReceiptVoucher | null>(null);

  // Form State
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newAmount, setNewAmount] = useState<number>(50000);
  const [newPaymentMode, setNewPaymentMode] =
    useState<ReceiptVoucher['paymentMode']>('UPI');
  const [newRefId, setNewRefId] = useState('');
  const [newRemarks, setNewRemarks] = useState('');
  const [newIsAdvance, setNewIsAdvance] = useState(false);

  const totalReceipts = vouchers.reduce((acc, v) => acc + v.amountReceived, 0);

  const handleShareWhatsApp = (voucher: ReceiptVoucher) => {
    const rawPhone = voucher.customerPhone.replace(/[^0-9]/g, '');
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const msg = `✨ *RUHVI JEWELS - OFFICIAL RECEIPT VOUCHER* ✨%0A%0ADear *${encodeURIComponent(
      voucher.customerName
    )}*,%0A%0AWe gratefully acknowledge receipt of *₹${voucher.amountReceived.toLocaleString(
      'en-IN'
    )}* under Rule 52 (GST Act).%0A%0A📄 *Voucher No:* ${voucher.voucherNumber}%0A📅 *Date:* ${
      voucher.voucherDate
    }%0A💳 *Payment Mode:* ${voucher.paymentMode}%0A🔖 *Ref/UTR:* ${
      voucher.referenceTransactionId
    }%0A${voucher.invoiceRef ? `📌 *Invoice Ref:* ${voucher.invoiceRef}%0A` : ''}%0A*Ruhvi Jewels Kolkata*%0AGSTIN: ${
      RUHVI_GST_CONFIG.gstin
    }%0A_Thank you for choosing Ruhvi Jewels!_`;

    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  const handleCreateVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    const newV: ReceiptVoucher = {
      id: `v-${Date.now()}`,
      voucherNumber: `RV-2026-${String(Math.floor(200 + Math.random() * 800)).padStart(4, '0')}`,
      voucherDate: new Date().toISOString().split('T')[0],
      customerName: newCustName,
      customerPhone: newCustPhone,
      amountReceived: Number(newAmount),
      paymentMode: newPaymentMode,
      referenceTransactionId:
        newRefId || `TXN-${Date.now().toString().slice(-6)}`,
      bankAccount: 'HDFC Current A/c 50200089123456',
      remarks: newRemarks || 'Official payment receipt',
      isAdvance: newIsAdvance,
    };

    setVouchers([newV, ...vouchers]);
    setShowNewModal(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewRefId('');
    setNewRemarks('');
  };

  const filteredVouchers = vouchers.filter((v) => {
    const matchesMode = filterMode === 'ALL' || v.paymentMode === filterMode;
    const matchesSearch =
      v.customerName.toLowerCase().includes(search.toLowerCase()) ||
      v.voucherNumber.toLowerCase().includes(search.toLowerCase()) ||
      v.referenceTransactionId.toLowerCase().includes(search.toLowerCase());
    return matchesMode && matchesSearch;
  });

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-400">
              <Receipt className="h-3 w-3" /> Rule 52 Statutory Receipts
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Payment Receipt Vouchers
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Generate GST-compliant receipt vouchers for customer advances, sales
            settlements, and instant WhatsApp dispatch.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-200 transition-all hover:bg-slate-700"
          >
            <Printer className="h-4 w-4" />
            <span>Print Ledger</span>
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-400"
          >
            <Plus className="h-4 w-4" />
            <span>Create Receipt Voucher</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Collections
            </span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 font-mono text-2xl font-bold text-emerald-400">
            ₹{totalReceipts.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Across {vouchers.length} issued vouchers
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              UPI / QR Collections
            </span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-white">
            ₹
            {vouchers
              .filter((v) => v.paymentMode === 'UPI')
              .reduce((acc, v) => acc + v.amountReceived, 0)
              .toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Direct to HDFC Current Account
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Customer Advance Held
            </span>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
              <Building className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-blue-400">
            ₹
            {vouchers
              .filter((v) => v.isAdvance)
              .reduce((acc, v) => acc + v.amountReceived, 0)
              .toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Against bridal custom orders
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              GST Rule 52 Compliance
            </span>
            <div className="rounded-lg bg-purple-500/10 p-2 text-purple-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-purple-400">100%</p>
          <p className="mt-1 text-xs text-slate-500">
            Auto-reconciled with Daybook
          </p>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name, voucher # or UTR..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/80 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
          >
            <option value="ALL">All Payment Modes</option>
            <option value="UPI">UPI / QR</option>
            <option value="NEFT_RTGS">NEFT / RTGS</option>
            <option value="CREDIT_CARD">Credit / Debit Card</option>
            <option value="NET_BANKING">Net Banking</option>
            <option value="CASH">Cash in Hand</option>
          </select>
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-4">Voucher No & Date</th>
                <th className="px-4 py-4">Customer Details</th>
                <th className="px-4 py-4">Payment Channel & Ref</th>
                <th className="px-4 py-4">Invoice / Purpose</th>
                <th className="px-4 py-4 text-right">Amount Received</th>
                <th className="px-4 py-4 text-center">Type</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredVouchers.map((v) => (
                <tr
                  key={v.id}
                  className="transition-colors hover:bg-slate-800/30"
                >
                  <td className="px-5 py-4">
                    <div className="font-mono font-bold text-amber-400">
                      {v.voucherNumber}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                      <Calendar className="h-3 w-3" />
                      <span>{v.voucherDate}</span>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="font-semibold text-white">
                      {v.customerName}
                    </div>
                    <div className="font-mono text-[11px] text-slate-400">
                      {v.customerPhone}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <span className="rounded-lg bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
                      {v.paymentMode}
                    </span>
                    <div className="mt-0.5 font-mono text-[11px] text-slate-400">
                      {v.referenceTransactionId}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    {v.invoiceRef ? (
                      <span className="font-mono font-semibold text-amber-300">
                        {v.invoiceRef}
                      </span>
                    ) : (
                      <span className="text-slate-500">Unlinked / Advance</span>
                    )}
                    <div className="mt-0.5 max-w-[200px] truncate text-[11px] text-slate-400">
                      {v.remarks}
                    </div>
                  </td>

                  <td className="px-4 py-4 text-right font-mono text-base font-bold text-emerald-400">
                    ₹{v.amountReceived.toLocaleString('en-IN')}
                  </td>

                  <td className="px-4 py-4 text-center">
                    {v.isAdvance ? (
                      <span className="inline-flex rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                        Advance Receipt
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                        Settlement
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleShareWhatsApp(v)}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-600/40 bg-emerald-600/10 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-400 transition-colors hover:bg-emerald-600 hover:text-white"
                        title="Share on WhatsApp"
                      >
                        <Share2 className="h-3 w-3" />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        onClick={() => setSelectedVoucherForPrint(v)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
                        title="View / Print Printable Voucher"
                      >
                        <Printer className="h-3 w-3" />
                        <span>Print</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Voucher Modal */}
      {selectedVoucherForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-white p-8 text-slate-900 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-300 pb-5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700">
                  GST RULE 52 PAYMENT RECEIPT VOUCHER
                </span>
                <h2 className="text-xl font-bold tracking-tight text-slate-950">
                  {RUHVI_GST_CONFIG.legalName}
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  {RUHVI_GST_CONFIG.address}
                </p>
                <p className="mt-0.5 font-mono text-xs font-bold text-slate-800">
                  GSTIN: {RUHVI_GST_CONFIG.gstin} | PAN: {RUHVI_GST_CONFIG.pan}
                </p>
              </div>
              <div className="text-right">
                <div className="font-mono text-base font-bold text-slate-950">
                  {selectedVoucherForPrint.voucherNumber}
                </div>
                <div className="text-xs text-slate-600">
                  Date: {selectedVoucherForPrint.voucherDate}
                </div>
                <div className="mt-2 inline-block rounded border border-slate-400 px-2 py-0.5 text-[11px] font-bold uppercase text-slate-800">
                  {selectedVoucherForPrint.isAdvance
                    ? 'Advance Receipt'
                    : 'Official Receipt'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b border-slate-200 py-5 text-xs">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Received From:
                </div>
                <div className="mt-1 text-sm font-bold text-slate-950">
                  {selectedVoucherForPrint.customerName}
                </div>
                <div className="mt-0.5 font-mono text-slate-600">
                  Contact: {selectedVoucherForPrint.customerPhone}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Payment Details:
                </div>
                <div className="mt-1 font-semibold text-slate-900">
                  Mode: {selectedVoucherForPrint.paymentMode}
                </div>
                <div className="font-mono text-[11px] text-slate-600">
                  UTR/Ref: {selectedVoucherForPrint.referenceTransactionId}
                </div>
                <div className="text-[11px] text-slate-600">
                  Deposit A/c: {selectedVoucherForPrint.bankAccount}
                </div>
              </div>
            </div>

            <div className="space-y-2 border-b border-slate-200 py-5">
              <div className="flex items-center justify-between text-sm font-bold text-slate-900">
                <span>Total Amount Received:</span>
                <span className="font-mono text-xl text-emerald-700">
                  ₹
                  {selectedVoucherForPrint.amountReceived.toLocaleString(
                    'en-IN'
                  )}
                </span>
              </div>
              <div className="text-xs italic text-slate-600">
                Amount in Words:{' '}
                {numberToIndianWords(selectedVoucherForPrint.amountReceived)}
              </div>
              {selectedVoucherForPrint.remarks && (
                <div className="mt-2 text-xs text-slate-500">
                  <span className="font-semibold">Notes / Purpose:</span>{' '}
                  {selectedVoucherForPrint.remarks}
                </div>
              )}
            </div>

            <div className="flex items-end justify-between pt-8">
              <div className="max-w-xs text-[10px] text-slate-500">
                This is a computer-generated tax receipt voucher issued under
                Rule 52 of the Central Goods and Services Tax Rules, 2017.
              </div>

              <div className="text-center">
                <div className="mb-1 h-10 w-36 border-b border-dashed border-slate-400"></div>
                <div className="text-[11px] font-bold text-slate-900">
                  Authorized Signatory
                </div>
                <div className="text-[10px] text-slate-500">
                  For Ruhvi Jewels
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                onClick={() => setSelectedVoucherForPrint(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="rounded-xl bg-slate-950 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                Print Voucher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Voucher Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="flex items-center gap-2 text-base font-bold text-white">
                <Receipt className="h-5 w-5 text-amber-400" />
                <span>Issue GST Payment Receipt Voucher</span>
              </h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-lg text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <form
              onSubmit={handleCreateVoucher}
              className="space-y-4 pt-4 text-xs"
            >
              <div>
                <label className="mb-1 block font-semibold text-slate-300">
                  Customer / Party Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Smt. Arundhati Sengupta"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-slate-300">
                    Phone (for WhatsApp)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98301 23456"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-slate-300">
                    Amount Received (₹)
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-slate-300">
                    Payment Channel
                  </label>
                  <select
                    value={newPaymentMode}
                    onChange={(e: any) => setNewPaymentMode(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                  >
                    <option value="UPI">UPI / QR Code</option>
                    <option value="NEFT_RTGS">NEFT / RTGS Transfer</option>
                    <option value="CREDIT_CARD">Credit / Debit Card</option>
                    <option value="NET_BANKING">Net Banking</option>
                    <option value="CASH">Cash in Hand</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-slate-300">
                    Transaction Ref / UTR
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UPI-HDFC-902348"
                    value={newRefId}
                    onChange={(e) => setNewRefId(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-300">
                  Remarks / Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. 50% advance for custom bridal choker"
                  value={newRemarks}
                  onChange={(e) => setNewRemarks(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="advanceCheck"
                  checked={newIsAdvance}
                  onChange={(e) => setNewIsAdvance(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-400"
                />
                <label htmlFor="advanceCheck" className="text-slate-300">
                  Mark as Advance Receipt Voucher (Tax payable on advance under
                  Rule 52)
                </label>
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
                  Save & Issue Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
