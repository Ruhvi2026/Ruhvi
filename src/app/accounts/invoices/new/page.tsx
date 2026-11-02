'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Printer,
  FileText,
  Calculator,
  ShieldCheck,
  Save,
  CheckCircle,
  Globe,
} from 'lucide-react';
import {
  RUHVI_GST_CONFIG,
  INDIAN_STATES,
  WORLD_CURRENCIES,
  calculateItemGst,
  numberToIndianWords,
} from '@/lib/accounts/gst-engine';

interface NewItemRow {
  id: string;
  description: string;
  hsn: string;
  purity: string;
  grossWeight: number;
  netWeight: number;
  ratePerGram: number;
  makingCharges: number;
  hallmarkCharges: number;
  discount: number;
}

export default function NewInvoiceMakerPage() {
  const [docType, setDocType] = useState<
    'TAX_INVOICE' | 'PROFORMA' | 'DELIVERY_CHALLAN' | 'CREDIT_NOTE'
  >('TAX_INVOICE');
  const [currencyCode, setCurrencyCode] = useState('INR');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [selectedStateCode, setSelectedStateCode] = useState('19'); // Default 19 West Bengal
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const selectedCurrency =
    WORLD_CURRENCIES.find((c) => c.code === currencyCode) ||
    WORLD_CURRENCIES[0];
  const symbol = selectedCurrency.symbol;

  const [items, setItems] = useState<NewItemRow[]>([
    {
      id: 'item-1',
      description: '22K Solid Gold Heritage Necklace (BIS Hallmarked)',
      hsn: RUHVI_GST_CONFIG.defaultJewelryHsn,
      purity: '22K',
      grossWeight: 14.5,
      netWeight: 14.2,
      ratePerGram: 7200,
      makingCharges: 8500,
      hallmarkCharges: 45,
      discount: 0,
    },
  ]);

  const isInterState = selectedStateCode !== '19';

  // Add Item
  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: `item-${Date.now()}`,
        description: 'Fine Jewellery Article',
        hsn: RUHVI_GST_CONFIG.defaultJewelryHsn,
        purity: '22K',
        grossWeight: 5.0,
        netWeight: 5.0,
        ratePerGram: 7200,
        makingCharges: 3000,
        hallmarkCharges: 45,
        discount: 0,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((i) => i.id !== id));
    }
  };

  const handleUpdateItem = (id: string, field: keyof NewItemRow, val: any) => {
    setItems(items.map((i) => (i.id === id ? { ...i, [field]: val } : i)));
  };

  // Compute Totals
  const computedItems = items.map((it) => {
    const rawUnitPrice = it.netWeight * it.ratePerGram;
    const gstCalc = calculateItemGst(
      {
        quantity: 1,
        unitPrice: rawUnitPrice,
        makingCharges: it.makingCharges,
        hallmarkingCharges: it.hallmarkCharges,
        discount: it.discount,
        gstRate: RUHVI_GST_CONFIG.defaultJewelryGstRate,
      },
      isInterState
    );
    return { ...it, ...gstCalc };
  });

  const subtotalTaxable = computedItems.reduce((s, i) => s + i.taxableValue, 0);
  const totalCgst = computedItems.reduce((s, i) => s + i.cgstAmount, 0);
  const totalSgst = computedItems.reduce((s, i) => s + i.sgstAmount, 0);
  const totalIgst = computedItems.reduce((s, i) => s + i.igstAmount, 0);
  const totalGst = totalCgst + totalSgst + totalIgst;
  const rawGrandTotal = subtotalTaxable + totalGst;
  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = Math.round((grandTotal - rawGrandTotal) * 100) / 100;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Link
            href="/accounts/invoices"
            className="mb-2 inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Invoices</span>
          </Link>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-white">
            <FileText className="h-6 w-6 text-amber-400" />
            <span>GST Invoice & Bill Generator</span>
          </h1>
          <p className="mt-0.5 text-xs text-slate-400">
            Create customized B2B / B2C Jewellery Invoices, Proformas,
            Multi-Currency Exports, and Delivery Challans
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center space-x-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-400"
          >
            <Printer className="h-4 w-4" />
            <span>Print / Save Bill</span>
          </button>
        </div>
      </div>

      {/* Invoice Meta Settings */}
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:grid-cols-2 md:grid-cols-5">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-slate-400">
            Document Type
          </label>
          <select
            value={docType}
            onChange={(e: any) => setDocType(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
          >
            <option value="TAX_INVOICE">Tax Invoice (Rule 46)</option>
            <option value="PROFORMA">Proforma Invoice</option>
            <option value="DELIVERY_CHALLAN">Delivery Challan</option>
            <option value="CREDIT_NOTE">Credit Note</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-slate-400">
            Billing Currency
          </label>
          <select
            value={currencyCode}
            onChange={(e) => setCurrencyCode(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
          >
            {WORLD_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} ({c.symbol}) - {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-slate-400">
            Invoice Date
          </label>
          <input
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-slate-400">
            Place of Supply (State)
          </label>
          <select
            value={selectedStateCode}
            onChange={(e) => setSelectedStateCode(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
          >
            {Object.entries(INDIAN_STATES).map(([code, name]) => (
              <option key={code} value={code}>
                {code} - {name}{' '}
                {code === '19' ? '(Intra-State)' : '(Inter-State)'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-slate-400">
            Applicable GST
          </label>
          <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-xs font-bold text-amber-300">
            {currencyCode !== 'INR'
              ? 'Zero-Rated Export / LUT'
              : isInterState
                ? 'IGST 3% (Inter-State)'
                : 'CGST 1.5% + SGST 1.5%'}
          </div>
        </div>
      </div>

      {/* Buyer & Customer Details Form */}
      <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
          <span>Buyer Information</span>
          <span className="font-sans text-[10px] font-normal text-slate-500">
            (Bill To / Ship To)
          </span>
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Customer / Firm Name *
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Smt. Arundhati Sengupta"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Phone Number
            </label>
            <input
              type="text"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="+91 98301 23456"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">
              GSTIN / UIN (B2B)
            </label>
            <input
              type="text"
              value={customerGstin}
              onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
              placeholder="e.g. 19AAACR1234D1Z5"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-white focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Email Address
            </label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="client@domain.com"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-400">
            Billing & Shipping Address
          </label>
          <input
            type="text"
            value={customerAddress}
            onChange={(e) => setCustomerAddress(e.target.value)}
            placeholder="Flat / House No, Street, City, State, Pincode"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Jewellery Item Rows */}
      <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">
            Jewellery Articles ({items.length})
          </h2>
          <button
            onClick={handleAddItem}
            className="inline-flex items-center space-x-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300 transition-all hover:bg-amber-500/20"
          >
            <Plus className="h-4 w-4" />
            <span>Add Item</span>
          </button>
        </div>

        <div className="space-y-4">
          {items.map((it, idx) => {
            const rowCalc = computedItems[idx];
            return (
              <div
                key={it.id}
                className="relative rounded-xl border border-slate-800 bg-slate-950/70 p-4 transition-all hover:border-slate-700"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-amber-400">
                    #{idx + 1}
                  </span>
                  {items.length > 1 && (
                    <button
                      onClick={() => handleRemoveItem(it.id)}
                      className="text-slate-500 transition-colors hover:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs text-slate-400">
                      Product Description *
                    </label>
                    <input
                      type="text"
                      value={it.description}
                      onChange={(e) =>
                        handleUpdateItem(it.id, 'description', e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-slate-400">
                      HSN Code
                    </label>
                    <input
                      type="text"
                      value={it.hsn}
                      onChange={(e) =>
                        handleUpdateItem(it.id, 'hsn', e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-xs text-white focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-slate-400">
                      Gold Purity
                    </label>
                    <select
                      value={it.purity}
                      onChange={(e) =>
                        handleUpdateItem(it.id, 'purity', e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                    >
                      <option value="22K">22K (916)</option>
                      <option value="18K">18K (750)</option>
                      <option value="14K">14K (585)</option>
                      <option value="925">925 Silver</option>
                      <option value="999">24K (999)</option>
                    </select>
                  </div>
                </div>

                {/* Weights and Making Charges */}
                <div className="mt-3 grid grid-cols-2 gap-3 font-mono text-xs sm:grid-cols-3 md:grid-cols-7">
                  <div>
                    <label className="mb-1 block font-sans text-[10px] text-slate-400">
                      Gross Wt (g)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={it.grossWeight}
                      onChange={(e) =>
                        handleUpdateItem(
                          it.id,
                          'grossWeight',
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-sans text-[10px] text-slate-400">
                      Net Wt (g)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={it.netWeight}
                      onChange={(e) =>
                        handleUpdateItem(
                          it.id,
                          'netWeight',
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-sans text-[10px] text-slate-400">
                      Rate/g ({symbol})
                    </label>
                    <input
                      type="number"
                      value={it.ratePerGram}
                      onChange={(e) =>
                        handleUpdateItem(
                          it.id,
                          'ratePerGram',
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-sans text-[10px] text-slate-400">
                      Making ({symbol})
                    </label>
                    <input
                      type="number"
                      value={it.makingCharges}
                      onChange={(e) =>
                        handleUpdateItem(
                          it.id,
                          'makingCharges',
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-sans text-[10px] text-slate-400">
                      Hallmark ({symbol})
                    </label>
                    <input
                      type="number"
                      value={it.hallmarkCharges}
                      onChange={(e) =>
                        handleUpdateItem(
                          it.id,
                          'hallmarkCharges',
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-sans text-[10px] text-slate-400">
                      Taxable ({symbol})
                    </label>
                    <div className="rounded bg-slate-800/80 px-2 py-1 font-bold text-slate-300">
                      {symbol}
                      {rowCalc.taxableValue.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block font-sans text-[10px] text-slate-400">
                      Total + 3% GST
                    </label>
                    <div className="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-1 font-bold text-amber-300">
                      {symbol}
                      {rowCalc.totalAmount.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Totals Summary Card */}
      <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-xs font-semibold uppercase text-slate-400">
              Total Amount in Words:
            </div>
            <div className="mt-0.5 font-serif text-sm font-bold italic text-amber-300">
              {numberToIndianWords(grandTotal)}{' '}
              {currencyCode !== 'INR' ? `(${currencyCode})` : ''}
            </div>
          </div>

          <div className="w-full space-y-2 font-mono text-xs sm:w-80">
            <div className="flex justify-between text-slate-300">
              <span>Subtotal Taxable:</span>
              <span className="font-bold">
                {symbol}
                {subtotalTaxable.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>

            {!isInterState ? (
              <>
                <div className="flex justify-between text-slate-300">
                  <span>CGST (1.5%):</span>
                  <span>
                    {symbol}
                    {totalCgst.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>SGST (1.5%):</span>
                  <span>
                    {symbol}
                    {totalSgst.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-slate-300">
                <span>IGST (3.0%):</span>
                <span>
                  {symbol}
                  {totalIgst.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}

            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Round Off:</span>
              <span>
                {roundOff >= 0
                  ? `+${symbol}${roundOff}`
                  : `-${symbol}${Math.abs(roundOff)}`}
              </span>
            </div>

            <div className="flex justify-between border-t border-slate-700 pt-2 text-base font-bold text-white">
              <span>GRAND TOTAL ({currencyCode}):</span>
              <span className="text-amber-400">
                {symbol}
                {grandTotal.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 border-t border-slate-800/80 pt-4 text-xs sm:flex-row sm:items-center">
          <div className="flex items-center space-x-2 text-slate-400">
            <ShieldCheck className="h-4 w-4 text-amber-400" />
            <span>
              Invoice conforms to Rule 46 (CGST) and BIS Hallmarking Laser
              Inscription.
            </span>
          </div>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center space-x-2 rounded-xl bg-amber-500 px-6 py-2.5 font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-400"
          >
            <Printer className="h-4 w-4" />
            <span>Generate & Print Bill</span>
          </button>
        </div>
      </div>
    </div>
  );
}
