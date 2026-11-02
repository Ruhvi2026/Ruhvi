'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  Plus,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  Printer,
  Share2,
  ArrowRight,
  TrendingUp,
  FileCheck,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  DollarSign,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import {
  RUHVI_GST_CONFIG,
  numberToIndianWords,
  calculateItemGst,
  INDIAN_STATES,
} from '@/lib/accounts/gst-engine';
import { PdfDownloadButton } from '@/components/accounts/PdfDownloadButton';
import type { RuhviPdfData } from '@/lib/accounts/pdf/InvoicePDF';

interface QuotationItem {
  id: string;
  description: string;
  hsn: string;
  purity: string;
  grossWeight: number;
  netWeight: number;
  ratePerGram: number;
  makingCharges: number;
  hallmarkCharges: number;
  gemstoneCost: number;
}

interface Quotation {
  id: string;
  quotationNumber: string;
  date: string;
  validUntil: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerCity: string;
  items: QuotationItem[];
  notes: string;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'CONVERTED' | 'EXPIRED';
  convertedInvoiceRef?: string;
}

const INITIAL_QUOTATIONS: Quotation[] = [
  {
    id: 'qt-1',
    quotationNumber: 'QT-2026-0041',
    date: '2026-03-28',
    validUntil: '2026-04-04',
    customerName: 'Smt. Sharmila Roy',
    customerPhone: '+91 98302 11223',
    customerEmail: 'sharmila.roy@gmail.com',
    customerCity: 'Kolkata, WB',
    status: 'ACCEPTED',
    notes:
      'Bespoke Bridal Peacock Meenakari Choker. 20% advance received. Gold rate locked at ₹7,250/g.',
    items: [
      {
        id: 'qi-1',
        description:
          '22K Solid Gold Royal Bengal Peacock Meenakari Choker (BIS Hallmarked)',
        hsn: '7113',
        purity: '22K',
        grossWeight: 42.5,
        netWeight: 41.2,
        ratePerGram: 7250,
        makingCharges: 32000,
        hallmarkCharges: 45,
        gemstoneCost: 24000,
      },
    ],
  },
  {
    id: 'qt-2',
    quotationNumber: 'QT-2026-0042',
    date: '2026-03-30',
    validUntil: '2026-04-06',
    customerName: 'Vikramjit & Radhika Singha',
    customerPhone: '+91 98200 88991',
    customerEmail: 'vikram.singha@corp.in',
    customerCity: 'Mumbai, MH',
    status: 'SENT',
    notes:
      '18K Cushion Cut Solitaire Diamond Ring. Delivery by Akshaya Tritiya.',
    items: [
      {
        id: 'qi-2',
        description:
          '18K Rose Gold Cushion Solitaire Diamond Ring (VVS1 / E Color)',
        hsn: '7113',
        purity: '18K',
        grossWeight: 6.2,
        netWeight: 5.8,
        ratePerGram: 5930,
        makingCharges: 14500,
        hallmarkCharges: 45,
        gemstoneCost: 165000,
      },
    ],
  },
  {
    id: 'qt-3',
    quotationNumber: 'QT-2026-0039',
    date: '2026-03-20',
    validUntil: '2026-03-27',
    customerName: 'Kallol & Madhumita Banerjee',
    customerPhone: '+91 98311 44556',
    customerEmail: 'kallol.b@yahoo.com',
    customerCity: 'Salt Lake, Kolkata',
    status: 'CONVERTED',
    convertedInvoiceRef: 'INV-2026-0088',
    notes: '22K Temple Craft Jhumka Pair. Fully confirmed & invoiced.',
    items: [
      {
        id: 'qi-3',
        description: '22K Temple Craft Jhumka Pair with Basra Seed Pearls',
        hsn: '7113',
        purity: '22K',
        grossWeight: 26.5,
        netWeight: 25.8,
        ratePerGram: 7200,
        makingCharges: 16800,
        hallmarkCharges: 90,
        gemstoneCost: 12500,
      },
    ],
  },
  {
    id: 'qt-4',
    quotationNumber: 'QT-2026-0038',
    date: '2026-03-12',
    validUntil: '2026-03-19',
    customerName: 'Dipankar Chatterjee',
    customerPhone: '+91 97481 22334',
    customerEmail: 'dipankar@outlook.com',
    customerCity: 'Durgapur, WB',
    status: 'EXPIRED',
    notes: 'Gold rate expired. Revised quotation requested by client.',
    items: [
      {
        id: 'qi-4',
        description: '22K Solid Gold Men Cuban Link Kada (916 BIS)',
        hsn: '7113',
        purity: '22K',
        grossWeight: 35.0,
        netWeight: 35.0,
        ratePerGram: 7150,
        makingCharges: 18000,
        hallmarkCharges: 45,
        gemstoneCost: 0,
      },
    ],
  },
];

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>(INITIAL_QUOTATIONS);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [showNewModal, setShowNewModal] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // New Quotation Form
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custCity, setCustCity] = useState('Kolkata, WB');
  const [validDays, setValidDays] = useState(7);
  const [notes, setNotes] = useState(
    'Gold bullion rate locked upon confirmation. BIS Hallmark Certified.'
  );
  const [newItems, setNewItems] = useState<QuotationItem[]>([
    {
      id: 'item-1',
      description: '22K Solid Gold Heritage Necklace (BIS Hallmarked)',
      hsn: '7113',
      purity: '22K',
      grossWeight: 25.0,
      netWeight: 24.5,
      ratePerGram: 7250,
      makingCharges: 18500,
      hallmarkCharges: 45,
      gemstoneCost: 0,
    },
  ]);

  // Helper to compute quotation totals
  const computeQuoteTotals = (items: QuotationItem[]) => {
    let subtotalTaxable = 0;
    items.forEach((it) => {
      const metalBase = it.netWeight * it.ratePerGram;
      const taxable =
        metalBase + it.makingCharges + it.hallmarkCharges + it.gemstoneCost;
      subtotalTaxable += taxable;
    });
    const gst = Math.round(subtotalTaxable * 0.03 * 100) / 100;
    const grandTotal = Math.round(subtotalTaxable + gst);
    return { subtotalTaxable, gst, grandTotal };
  };

  // Convert Quotation into Tax Invoice
  const handleConvertToInvoice = (qt: Quotation) => {
    const invRef = `INV-2026-${Math.floor(100 + Math.random() * 900)}`;
    setQuotations(
      quotations.map((q) =>
        q.id === qt.id
          ? { ...q, status: 'CONVERTED', convertedInvoiceRef: invRef }
          : q
      )
    );
    setSuccessToast(
      `Quotation ${qt.quotationNumber} successfully converted into Tax Invoice #${invRef}!`
    );
    setTimeout(() => setSuccessToast(null), 5000);
  };

  // WhatsApp Share
  const handleShareWhatsApp = (qt: Quotation) => {
    const rawPhone = qt.customerPhone.replace(/[^0-9]/g, '');
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const { grandTotal } = computeQuoteTotals(qt.items);
    const msg = `✨ *RUHVI JEWELS - BESPOKE QUOTATION / ESTIMATE* ✨%0A%0ADear *${encodeURIComponent(
      qt.customerName
    )}*,%0A%0AWe are pleased to present your personalized jewellery estimate for *${encodeURIComponent(
      qt.items[0]?.description || 'Fine Jewellery Article'
    )}*.%0A%0A📄 *Quotation No:* ${qt.quotationNumber}%0A📅 *Issue Date:* ${
      qt.date
    }%0A⏳ *Offer Valid Until:* ${qt.validUntil}%0A💰 *Estimated Grand Total (Incl. 3% GST):* ₹${grandTotal.toLocaleString(
      'en-IN'
    )}%0A%0A🔍 *Purity:* ${qt.items[0]?.purity} (BIS Hallmarked)%0A⚖️ *Net Weight:* ${
      qt.items[0]?.netWeight
    } g%0A%0A_Note: Due to precious bullion market fluctuations, this price estimate remains valid until ${
      qt.validUntil
    }._%0A%0A*Ruhvi Jewels Kolkata*%0AVisit us: https://ruhvi.in`;

    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  // Add Item in Modal
  const handleAddItem = () => {
    setNewItems([
      ...newItems,
      {
        id: `qi-${Date.now()}`,
        description: 'Fine Jewellery Article',
        hsn: '7113',
        purity: '22K',
        grossWeight: 10.0,
        netWeight: 9.8,
        ratePerGram: 7250,
        makingCharges: 7500,
        hallmarkCharges: 45,
        gemstoneCost: 0,
      },
    ]);
  };

  // Create Quotation
  const handleCreateQuotation = (e: React.FormEvent) => {
    e.preventDefault();
    const issueDate = new Date().toISOString().split('T')[0];
    const validDate = new Date(Date.now() + validDays * 86400000)
      .toISOString()
      .split('T')[0];

    const newQ: Quotation = {
      id: `qt-${Date.now()}`,
      quotationNumber: `QT-2026-${String(Math.floor(50 + Math.random() * 950)).padStart(4, '0')}`,
      date: issueDate,
      validUntil: validDate,
      customerName: custName,
      customerPhone: custPhone,
      customerEmail: custEmail,
      customerCity: custCity,
      items: newItems,
      notes,
      status: 'SENT',
    };

    setQuotations([newQ, ...quotations]);
    setShowNewModal(false);
    setCustName('');
    setCustPhone('');
    setCustEmail('');
    setSuccessToast(
      `Quotation ${newQ.quotationNumber} created and ready for dispatch!`
    );
    setTimeout(() => setSuccessToast(null), 5000);
  };

  // Build PDF data helper
  const getPdfDataForQuotation = (qt: Quotation): RuhviPdfData => {
    const { subtotalTaxable, gst, grandTotal } = computeQuoteTotals(qt.items);
    return {
      docType: 'QUOTATION',
      docNumber: qt.quotationNumber,
      docDate: qt.date,
      validUntil: qt.validUntil,
      customerName: qt.customerName,
      customerAddress: qt.customerCity,
      customerPhone: qt.customerPhone,
      placeOfSupply: 'West Bengal',
      isInterState: false,
      currencySymbol: '₹',
      currencyCode: 'INR',
      items: qt.items.map((it, idx) => {
        const taxable =
          it.netWeight * it.ratePerGram +
          it.makingCharges +
          it.hallmarkCharges +
          it.gemstoneCost;
        return {
          sl: idx + 1,
          description: it.description,
          hsn: it.hsn,
          purity: it.purity,
          grossWeight: it.grossWeight,
          netWeight: it.netWeight,
          ratePerGram: it.ratePerGram,
          makingCharges: it.makingCharges,
          taxableValue: taxable,
          gstRate: 3,
          totalAmount: Math.round(taxable * 1.03),
        };
      }),
      subtotalTaxable,
      totalCgst: Math.round(gst / 2),
      totalSgst: Math.round(gst / 2),
      totalIgst: 0,
      grandTotal,
      amountInWords: numberToIndianWords(grandTotal),
      notes: qt.notes,
    };
  };

  const filteredQuotes = quotations.filter((q) => {
    const matchesStatus = filterStatus === 'ALL' || q.status === filterStatus;
    const matchesSearch =
      q.customerName.toLowerCase().includes(search.toLowerCase()) ||
      q.quotationNumber.toLowerCase().includes(search.toLowerCase()) ||
      q.customerPhone.includes(search) ||
      q.items.some((i) =>
        i.description.toLowerCase().includes(search.toLowerCase())
      );
    return matchesStatus && matchesSearch;
  });

  const totalPipelineValue = quotations
    .filter((q) => q.status === 'SENT' || q.status === 'ACCEPTED')
    .reduce((acc, q) => acc + computeQuoteTotals(q.items).grandTotal, 0);

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-400">
              <ClipboardList className="h-3 w-3" /> Bespoke Bridal & Custom
              Orders
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Quotations & Price Estimates
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Draft formal jewelry estimates with gold bullion lock periods,
            direct PDF downloads, and 1-click conversion to Tax Invoices.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-400"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Quotation</span>
          </button>
        </div>
      </div>

      {successToast && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-semibold text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Pipeline Value
            </span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 font-mono text-2xl font-bold text-amber-400">
            ₹{totalPipelineValue.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Across open bridal quotes
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Quotations
            </span>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
              <ClipboardList className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-white">
            {quotations.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {quotations.filter((q) => q.status === 'CONVERTED').length}{' '}
            Converted to Invoices
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Accepted by Client
            </span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-emerald-400">
            {quotations.filter((q) => q.status === 'ACCEPTED').length} Ready to
            Bill
          </p>
          <p className="mt-1 text-xs text-slate-500">Deposit received</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Conversion Rate
            </span>
            <div className="rounded-lg bg-purple-500/10 p-2 text-purple-400">
              <FileCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-purple-400">75%</p>
          <p className="mt-1 text-xs text-slate-500">
            Quote to Tax Invoice ratio
          </p>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by quote #, client name, phone or design..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/80 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="SENT">Sent to Client</option>
            <option value="ACCEPTED">Accepted (Ready to Bill)</option>
            <option value="CONVERTED">Converted to Invoice</option>
            <option value="EXPIRED">Expired Rates</option>
          </select>
        </div>
      </div>

      {/* Quotations Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-4">Quote No & Dates</th>
                <th className="px-4 py-4">Customer Details</th>
                <th className="px-4 py-4">Article & Purity</th>
                <th className="px-4 py-4 text-right">Net Weight</th>
                <th className="px-4 py-4 text-right">Estimated Total</th>
                <th className="px-4 py-4 text-center">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredQuotes.map((qt) => {
                const { grandTotal } = computeQuoteTotals(qt.items);
                const pdfData = getPdfDataForQuotation(qt);

                return (
                  <tr
                    key={qt.id}
                    className="transition-colors hover:bg-slate-800/30"
                  >
                    <td className="px-5 py-4">
                      <div className="font-mono font-bold text-amber-400">
                        {qt.quotationNumber}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-400">
                        Issued: {qt.date}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-amber-500">
                        <Clock className="h-3 w-3" />
                        <span>Valid until: {qt.validUntil}</span>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-semibold text-white">
                        {qt.customerName}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400">
                        {qt.customerPhone}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {qt.customerCity}
                      </div>
                    </td>

                    <td className="max-w-xs px-4 py-4">
                      <div className="truncate font-medium text-slate-200">
                        {qt.items[0]?.description}
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-amber-300/80">
                        {qt.items[0]?.purity} • Rate: ₹
                        {qt.items[0]?.ratePerGram}/g
                      </div>
                    </td>

                    <td className="px-4 py-4 text-right font-mono font-bold text-white">
                      {qt.items[0]?.netWeight.toFixed(2)} g
                    </td>

                    <td className="px-4 py-4 text-right font-mono text-base font-bold text-amber-400">
                      ₹{grandTotal.toLocaleString('en-IN')}
                    </td>

                    <td className="px-4 py-4 text-center">
                      {qt.status === 'CONVERTED' ? (
                        <div>
                          <span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                            ✓ Invoiced
                          </span>
                          <div className="mt-0.5 font-mono text-[10px] text-slate-500">
                            {qt.convertedInvoiceRef}
                          </div>
                        </div>
                      ) : qt.status === 'ACCEPTED' ? (
                        <span className="inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400">
                          Accepted
                        </span>
                      ) : qt.status === 'SENT' ? (
                        <span className="inline-flex rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-400">
                          Sent
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-semibold text-slate-400">
                          Expired
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {qt.status === 'ACCEPTED' && (
                          <button
                            onClick={() => handleConvertToInvoice(qt)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-emerald-500"
                            title="Convert into GST Tax Invoice"
                          >
                            <span>Convert to Invoice</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        )}

                        <button
                          onClick={() => handleShareWhatsApp(qt)}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-600/40 bg-emerald-600/10 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-400 transition-colors hover:bg-emerald-600 hover:text-white"
                          title="Share on WhatsApp"
                        >
                          <Share2 className="h-3 w-3" />
                          <span>WhatsApp</span>
                        </button>

                        <PdfDownloadButton
                          data={pdfData}
                          filename={`Quotation_${qt.quotationNumber}.pdf`}
                          label="PDF"
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Quotation Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="flex items-center gap-2 text-base font-bold text-white">
                <ClipboardList className="h-5 w-5 text-amber-400" />
                <span>Create Bespoke Jewellery Quotation</span>
              </h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-lg text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <form
              onSubmit={handleCreateQuotation}
              className="space-y-4 pt-4 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-slate-300">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Smt. Sharmila Roy"
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-300">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98301 23456"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-slate-300">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="client@domain.com"
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-300">
                    Offer Validity Period
                  </label>
                  <select
                    value={validDays}
                    onChange={(e) => setValidDays(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                  >
                    <option value={3}>3 Days (Fast Bullion Fluctuation)</option>
                    <option value={7}>7 Days (Standard Consultation)</option>
                    <option value={14}>14 Days (Bridal Booking Window)</option>
                    <option value={30}>30 Days (Fixed Rate Guarantee)</option>
                  </select>
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-3 border-t border-slate-800 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-amber-400">
                    Jewellery Design Items
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-300 hover:bg-slate-700"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Item</span>
                  </button>
                </div>

                {newItems.map((it, idx) => (
                  <div
                    key={it.id}
                    className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-400">
                        Article #{idx + 1}
                      </span>
                      {newItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setNewItems(newItems.filter((i) => i.id !== it.id))
                          }
                          className="text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      required
                      placeholder="e.g. 22K Peacock Meenakari Choker"
                      value={it.description}
                      onChange={(e) =>
                        setNewItems(
                          newItems.map((i) =>
                            i.id === it.id
                              ? { ...i, description: e.target.value }
                              : i
                          )
                        )
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-white"
                    />

                    <div className="grid grid-cols-4 gap-2 font-mono text-[11px]">
                      <div>
                        <label className="mb-0.5 block text-[10px] text-slate-400">
                          Purity
                        </label>
                        <select
                          value={it.purity}
                          onChange={(e) =>
                            setNewItems(
                              newItems.map((i) =>
                                i.id === it.id
                                  ? { ...i, purity: e.target.value }
                                  : i
                              )
                            )
                          }
                          className="w-full rounded border border-slate-700 bg-slate-900 px-1.5 py-1 text-white"
                        >
                          <option value="22K">22K (916)</option>
                          <option value="18K">18K (750)</option>
                          <option value="14K">14K (585)</option>
                          <option value="925">925 Silver</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-0.5 block text-[10px] text-slate-400">
                          Net Wt (g)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={it.netWeight}
                          onChange={(e) =>
                            setNewItems(
                              newItems.map((i) =>
                                i.id === it.id
                                  ? {
                                      ...i,
                                      netWeight: Number(e.target.value),
                                      grossWeight: Number(e.target.value),
                                    }
                                  : i
                              )
                            )
                          }
                          className="w-full rounded border border-slate-700 bg-slate-900 px-1.5 py-1 text-white"
                        />
                      </div>

                      <div>
                        <label className="mb-0.5 block text-[10px] text-slate-400">
                          Rate/g (₹)
                        </label>
                        <input
                          type="number"
                          value={it.ratePerGram}
                          onChange={(e) =>
                            setNewItems(
                              newItems.map((i) =>
                                i.id === it.id
                                  ? {
                                      ...i,
                                      ratePerGram: Number(e.target.value),
                                    }
                                  : i
                              )
                            )
                          }
                          className="w-full rounded border border-slate-700 bg-slate-900 px-1.5 py-1 text-white"
                        />
                      </div>

                      <div>
                        <label className="mb-0.5 block text-[10px] text-slate-400">
                          Making (₹)
                        </label>
                        <input
                          type="number"
                          value={it.makingCharges}
                          onChange={(e) =>
                            setNewItems(
                              newItems.map((i) =>
                                i.id === it.id
                                  ? {
                                      ...i,
                                      makingCharges: Number(e.target.value),
                                    }
                                  : i
                              )
                            )
                          }
                          className="w-full rounded border border-slate-700 bg-slate-900 px-1.5 py-1 text-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-300">
                  Special Consultation Terms / Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                />
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
                  Save & Issue Quotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
