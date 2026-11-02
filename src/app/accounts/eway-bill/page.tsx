'use client';

import React, { useEffect, useState } from 'react';
import {
  Truck,
  Download,
  ShieldCheck,
  Search,
  FileCheck,
  AlertTriangle,
  QrCode,
  ExternalLink,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  RUHVI_GST_CONFIG,
  generateEwayBillJson,
  GSTInvoice,
} from '@/lib/accounts/gst-engine';

export default function EwayBillPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [transporterName, setTransporterName] = useState(
    'Shiprocket Logistics'
  );
  const [transporterId, setTransporterId] = useState('19AABCS1234F1Z9');
  const [awbNumber, setAwbNumber] = useState('SR-892341209');
  const [distanceKm, setDistanceKm] = useState(25);

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

  const handleDownloadEwayJson = (order: any) => {
    const gross = Number(order.total) || 0;
    const taxable = Math.round((gross / 1.03) * 100) / 100;
    const state = order.shipping_address?.state || 'West Bengal';
    const isInter = state.toLowerCase() !== 'west bengal';

    const dummyInv: GSTInvoice = {
      id: order.id,
      invoiceNumber: `RJ-${order.order_number || order.id.slice(0, 8)}`,
      invoiceDate: order.created_at,
      docType: 'TAX_INVOICE',
      customerName: order.shipping_address?.full_name || 'Retail Client',
      customerGstin: order.shipping_address?.gstin || 'URP',
      customerAddress:
        order.shipping_address?.address_line1 || 'Customer Address',
      customerCity: order.shipping_address?.city || 'Kolkata',
      customerState: state,
      customerStateCode: isInter ? '27' : '19',
      placeOfSupply: state,
      isInterState: isInter,
      items: [
        {
          id: '1',
          description: 'Gold/Silver Jewellery Articles (BIS Hallmarked)',
          hsn: RUHVI_GST_CONFIG.defaultJewelryHsn,
          quantity: 1,
          unitPrice: taxable,
          taxableValue: taxable,
          gstRate: 3,
          cgstAmount: isInter ? 0 : Math.round((gross - taxable) / 2),
          sgstAmount: isInter ? 0 : Math.round((gross - taxable) / 2),
          igstAmount: isInter ? Math.round(gross - taxable) : 0,
          totalAmount: gross,
        },
      ],
      subtotalTaxable: taxable,
      totalCgst: isInter ? 0 : Math.round((gross - taxable) / 2),
      totalSgst: isInter ? 0 : Math.round((gross - taxable) / 2),
      totalIgst: isInter ? Math.round(gross - taxable) : 0,
      roundOff: 0,
      grandTotal: gross,
      paymentStatus: 'PAID',
      paymentMethod: order.payment_method || 'Online',
      upiQrPayload: '',
    };

    const payload = generateEwayBillJson(dummyInv, {
      transporterId,
      transporterName,
      transDocNo: awbNumber,
      distanceKm,
    });

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EWAY_${dummyInv.invoiceNumber}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setSelectedOrder(null);
  };

  const filtered = orders.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const num = (o.order_number || o.id).toLowerCase();
    const name = (o.shipping_address?.full_name || '').toLowerCase();
    return num.includes(q) || name.includes(q);
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-white">
            <Truck className="h-6 w-6 text-amber-400" />
            <span>E-Way Bill & E-Invoice Management</span>
          </h1>
          <p className="mt-0.5 text-xs text-slate-400">
            NIC Portal Schema Compliant • Generate JSON for high-value shipments
            (&gt; ₹50,000)
          </p>
        </div>

        <a
          href="https://ewaybillgst.gov.in"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white"
        >
          <span>Official E-Way Bill Portal</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Info Notice */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-300">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
        <div>
          <div className="font-bold text-white">
            Rule 138 GST Compliance Rule:
          </div>
          <p className="mt-0.5 leading-relaxed text-slate-300">
            Every consignment of precious metals or fine jewelry having
            consignment value greater than ₹50,000 moving across state
            boundaries must carry an active E-Way Bill Part A and Part B.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 p-4">
          <h2 className="text-sm font-bold text-white">
            Consignments & Orders
          </h2>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order or client..."
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold uppercase text-slate-400">
              <tr>
                <th className="px-6 py-4">Order / Invoice</th>
                <th className="px-6 py-4">Consignee (Buyer)</th>
                <th className="px-6 py-4">Destination</th>
                <th className="px-6 py-4 text-right">Invoice Value</th>
                <th className="px-6 py-4 text-center">E-Way Bill Status</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {filtered.map((ord) => {
                const total = Number(ord.total) || 0;
                const requiresEway = total >= 50000;
                const state = ord.shipping_address?.state || 'West Bengal';

                return (
                  <tr
                    key={ord.id}
                    className="transition-colors hover:bg-slate-800/40"
                  >
                    <td className="px-6 py-4 font-bold text-white">
                      RJ-{ord.order_number || ord.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 font-sans text-slate-200">
                      <div>
                        {ord.shipping_address?.full_name || 'Retail Client'}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {ord.shipping_address?.phone || 'No phone'}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-sans">{state}</td>
                    <td className="px-6 py-4 text-right font-bold text-amber-300">
                      ₹
                      {total.toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-6 py-4 text-center font-sans">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                          requiresEway
                            ? 'border border-amber-500/20 bg-amber-500/10 text-amber-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {requiresEway
                          ? 'Required (> ₹50k)'
                          : 'Optional (< ₹50k)'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedOrder(ord)}
                        className="inline-flex items-center space-x-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-400"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Export NIC JSON</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dispatch Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-6 text-xs">
            <h2 className="flex items-center gap-2 text-base font-bold text-white">
              <Truck className="h-5 w-5 text-amber-400" />
              <span>Transporter Details for E-Way Bill</span>
            </h2>

            <div className="space-y-3 font-sans">
              <div>
                <label className="mb-1 block text-slate-400">
                  Transporter Name
                </label>
                <input
                  type="text"
                  value={transporterName}
                  onChange={(e) => setTransporterName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-slate-400">
                  Transporter GSTIN / ID
                </label>
                <input
                  type="text"
                  value={transporterId}
                  onChange={(e) =>
                    setTransporterId(e.target.value.toUpperCase())
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-slate-400">
                    Courier AWB / Doc No
                  </label>
                  <input
                    type="text"
                    value={awbNumber}
                    onChange={(e) => setAwbNumber(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-slate-400">
                    Approx Distance (KM)
                  </label>
                  <input
                    type="number"
                    value={distanceKm}
                    onChange={(e) =>
                      setDistanceKm(parseInt(e.target.value) || 10)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDownloadEwayJson(selectedOrder)}
                className="rounded-xl bg-amber-500 px-5 py-2 font-bold text-slate-950 hover:bg-amber-400"
              >
                Download E-Way JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
