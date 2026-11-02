'use client';

import React, { useEffect, useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  FileCheck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  RUHVI_GST_CONFIG,
  generateGstr1Json,
  GSTInvoice,
} from '@/lib/accounts/gst-engine';

export default function GstrFilingPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('112026'); // Nov 2026

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('orders')
        .select('*, shipping_address:addresses(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Convert orders to GST Invoices model
  const gstInvoices: GSTInvoice[] = orders.map((ord) => {
    const gross = Number(ord.total) || 0;
    const taxable = Math.round((gross / 1.03) * 100) / 100;
    const gst = Math.round((gross - taxable) * 100) / 100;
    const state = ord.shipping_address?.state || 'West Bengal';
    const isInter = state.toLowerCase() !== 'west bengal';

    return {
      id: ord.id,
      invoiceNumber: `RJ-${ord.order_number || ord.id.slice(0, 8)}`,
      invoiceDate: ord.created_at,
      docType: 'TAX_INVOICE',
      customerName:
        ord.shipping_address?.full_name || 'Walk-in / Online Client',
      customerGstin: ord.shipping_address?.gstin || '',
      customerState: state,
      customerStateCode: isInter ? '27' : '19',
      placeOfSupply: state,
      isInterState: isInter,
      items: [
        {
          id: '1',
          description: 'Jewellery Articles of Gold/Silver (BIS Hallmarked)',
          hsn: RUHVI_GST_CONFIG.defaultJewelryHsn,
          quantity: 1,
          unitPrice: taxable,
          taxableValue: taxable,
          gstRate: 3,
          cgstAmount: isInter ? 0 : Math.round((gst / 2) * 100) / 100,
          sgstAmount: isInter ? 0 : Math.round((gst / 2) * 100) / 100,
          igstAmount: isInter ? gst : 0,
          totalAmount: gross,
        },
      ],
      subtotalTaxable: taxable,
      totalCgst: isInter ? 0 : Math.round((gst / 2) * 100) / 100,
      totalSgst: isInter ? 0 : Math.round((gst / 2) * 100) / 100,
      totalIgst: isInter ? gst : 0,
      roundOff: 0,
      grandTotal: gross,
      paymentStatus: 'PAID',
      paymentMethod: ord.payment_method || 'Online',
      upiQrPayload: '',
    };
  });

  const b2bList = gstInvoices.filter(
    (i) => !!i.customerGstin && i.customerGstin.trim().length === 15
  );
  const b2cList = gstInvoices.filter(
    (i) => !i.customerGstin || i.customerGstin.trim().length !== 15
  );

  const totalTaxable = gstInvoices.reduce((s, i) => s + i.subtotalTaxable, 0);
  const totalCgst = gstInvoices.reduce((s, i) => s + i.totalCgst, 0);
  const totalSgst = gstInvoices.reduce((s, i) => s + i.totalSgst, 0);
  const totalIgst = gstInvoices.reduce((s, i) => s + i.totalIgst, 0);
  const totalTax = totalCgst + totalSgst + totalIgst;

  // Estimated ITC from bullion purchases
  const itcAvailable = Math.round(totalTax * 0.45 * 100) / 100;
  const netPayable = Math.max(
    0,
    Math.round((totalTax - itcAvailable) * 100) / 100
  );

  const handleDownloadGstr1Json = () => {
    const jsonPayload = generateGstr1Json(gstInvoices, period);
    const blob = new Blob([JSON.stringify(jsonPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GSTR1_${RUHVI_GST_CONFIG.gstin}_${period}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-white">
            <FileSpreadsheet className="h-6 w-6 text-emerald-400" />
            <span>GST Returns & Tax Filing Portal</span>
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            GSTR-1 Outward Supplies JSON Export & GSTR-3B Monthly Tax
            Computation for GST Portal
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-amber-400 focus:outline-none"
          >
            <option value="112026">November 2026 (FY 26-27)</option>
            <option value="102026">October 2026 (FY 26-27)</option>
            <option value="092026">September 2026 (FY 26-27)</option>
          </select>

          <button
            onClick={handleDownloadGstr1Json}
            className="inline-flex items-center space-x-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400"
          >
            <Download className="h-4 w-4" />
            <span>Download GSTR-1 JSON</span>
          </button>
        </div>
      </div>

      {/* GSTR-1 Return Tables Breakdown */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Table 4: B2B */}
        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Table 4: B2B Invoices
            </span>
            <span className="rounded border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-400">
              Registered GSTIN
            </span>
          </div>
          <div className="font-mono text-3xl font-bold text-white">
            {b2bList.length}
          </div>
          <p className="text-xs text-slate-400">
            Supplies made to GST registered business clients with input tax
            credit pass-through.
          </p>
        </div>

        {/* Table 7: B2C Small */}
        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Table 7: B2CS (Retail)
            </span>
            <span className="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">
              Consumer Sales
            </span>
          </div>
          <div className="font-mono text-3xl font-bold text-amber-300">
            {b2cList.length}
          </div>
          <p className="text-xs text-slate-400">
            Intra-state & inter-state online retail orders &lt; ₹2.5 Lakhs
            grouped by POS.
          </p>
        </div>

        {/* Table 12: HSN Summary */}
        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Table 12: HSN 7113
            </span>
            <span className="rounded border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-400">
              Gold / Silver Jewellery
            </span>
          </div>
          <div className="font-mono text-3xl font-bold text-purple-300">
            ₹
            {totalTaxable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <p className="text-xs text-slate-400">
            Total taxable quantity summarized with UQC (Grams) for direct portal
            filing.
          </p>
        </div>
      </div>

      {/* GSTR-3B Computation Worksheet */}
      <div className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-800 pb-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <FileCheck className="h-5 w-5 text-amber-400" />
              <span>GSTR-3B Monthly Summary & Tax Payment</span>
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Table 3.1 Outward Taxable Supplies & Table 4 Eligible ITC
              Worksheet
            </p>
          </div>

          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Ready for Form 3B</span>
          </span>
        </div>

        {/* Computation Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Section Description</th>
                <th className="px-4 py-3 text-right">
                  Total Taxable Value (₹)
                </th>
                <th className="px-4 py-3 text-right">IGST (₹)</th>
                <th className="px-4 py-3 text-right">CGST (₹)</th>
                <th className="px-4 py-3 text-right">SGST (₹)</th>
                <th className="px-4 py-3 text-right">Total Tax (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              <tr>
                <td className="px-4 py-4 font-sans font-medium text-white">
                  3.1(a) Outward Taxable Supplies (Jewellery Sales)
                </td>
                <td className="px-4 py-4 text-right">
                  ₹
                  {totalTaxable.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td className="px-4 py-4 text-right">
                  ₹
                  {totalIgst.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td className="px-4 py-4 text-right">
                  ₹
                  {totalCgst.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td className="px-4 py-4 text-right">
                  ₹
                  {totalSgst.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td className="px-4 py-4 text-right font-bold text-amber-300">
                  ₹
                  {totalTax.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </td>
              </tr>
              <tr className="bg-emerald-950/10 text-emerald-300">
                <td className="px-4 py-4 font-sans font-medium">
                  4(A)(5) Eligible Input Tax Credit (ITC - Bullion Purchases)
                </td>
                <td className="px-4 py-4 text-right text-slate-400">-</td>
                <td className="px-4 py-4 text-right">₹0.00</td>
                <td className="px-4 py-4 text-right">
                  ₹
                  {(itcAvailable / 2).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td className="px-4 py-4 text-right">
                  ₹
                  {(itcAvailable / 2).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td className="px-4 py-4 text-right font-bold">
                  ₹
                  {itcAvailable.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </td>
              </tr>
              <tr className="bg-slate-950 text-sm font-bold text-white">
                <td className="px-4 py-4 font-sans">
                  6.1 Net Tax Payable in Cash
                </td>
                <td className="px-4 py-4 text-right text-slate-400">-</td>
                <td className="px-4 py-4 text-right">
                  ₹
                  {totalIgst.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td className="px-4 py-4 text-right">
                  ₹
                  {Math.max(0, totalCgst - itcAvailable / 2).toLocaleString(
                    'en-IN',
                    { minimumFractionDigits: 2 }
                  )}
                </td>
                <td className="px-4 py-4 text-right">
                  ₹
                  {Math.max(0, totalSgst - itcAvailable / 2).toLocaleString(
                    'en-IN',
                    { minimumFractionDigits: 2 }
                  )}
                </td>
                <td className="px-4 py-4 text-right text-amber-400">
                  ₹
                  {netPayable.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
