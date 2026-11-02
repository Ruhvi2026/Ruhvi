'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Printer,
  Download,
  Share2,
  CheckCircle,
  Landmark,
  ShieldCheck,
  QrCode as QrIcon,
} from 'lucide-react';
import QRCode from 'qrcode';
import { createClient } from '@/lib/supabase/client';
import {
  RUHVI_GST_CONFIG,
  numberToIndianWords,
  generateUpiPayload,
} from '@/lib/accounts/gst-engine';
import { PdfDownloadButton } from '@/components/accounts/PdfDownloadButton';
import type { RuhviPdfData } from '@/lib/accounts/pdf/InvoicePDF';

export default function InvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  useEffect(() => {
    fetchOrderDetails();
  }, [resolvedParams.id]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('orders')
        .select(
          `
          *,
          shipping_address:addresses(*),
          order_items(*)
        `
        )
        .eq('id', resolvedParams.id)
        .single();

      if (error) throw error;
      setOrder(data);

      // Generate UPI QR code
      const grossTotal = Number(data.total) || 0;
      const invNum = `RJ-${data.order_number || data.id.slice(0, 8)}`;
      const upiLink = generateUpiPayload(grossTotal, invNum);
      const qrUrl = await QRCode.toDataURL(upiLink, { margin: 1, width: 140 });
      setQrCodeDataUrl(qrUrl);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center font-mono text-sm text-slate-400">
        Preparing official GST Tax Invoice...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-12 text-center text-slate-400">
        Order not found.{' '}
        <Link href="/accounts/invoices" className="text-amber-400 underline">
          Return to list
        </Link>
      </div>
    );
  }

  const grossTotal = Number(order.total) || 0;
  const taxableTotal = Math.round((grossTotal / 1.03) * 100) / 100;
  const totalGst = Math.round((grossTotal - taxableTotal) * 100) / 100;

  const state = order.shipping_address?.state || 'West Bengal';
  const isInterState = state.toLowerCase() !== 'west bengal';
  const cgst = isInterState ? 0 : Math.round((totalGst / 2) * 100) / 100;
  const sgst = isInterState ? 0 : Math.round((totalGst / 2) * 100) / 100;
  const igst = isInterState ? totalGst : 0;

  const invoiceNumber = `RJ-2026-${order.order_number || order.id.slice(0, 6).toUpperCase()}`;
  const invoiceDate = new Date(order.created_at).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const items = order.order_items?.length
    ? order.order_items
    : [
        {
          id: 'item-1',
          sku: 'RJ-JW-GOLD-01',
          quantity: 1,
          price_at_purchase: grossTotal,
        },
      ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Top Action Toolbar (Hidden in Print) */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 p-4 print:hidden">
        <Link
          href="/accounts/invoices"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Invoices</span>
        </Link>

        <div className="flex items-center space-x-3">
          <PdfDownloadButton
            data={{
              docType: 'TAX_INVOICE',
              docNumber: invoiceNumber,
              docDate: invoiceDate,
              customerName:
                order.shipping_address?.full_name || 'Valued Customer',
              customerAddress: [
                order.shipping_address?.address_line1,
                order.shipping_address?.city,
                order.shipping_address?.state,
                order.shipping_address?.pincode,
              ]
                .filter(Boolean)
                .join(', '),
              customerPhone: order.shipping_address?.phone,
              customerGstin: order.shipping_address?.gstin || '',
              placeOfSupply: `${order.shipping_address?.state || 'West Bengal'}`,
              isInterState,
              currencySymbol: '₹',
              currencyCode: 'INR',
              items: items.map((it: any, idx: number) => ({
                sl: idx + 1,
                description:
                  it.name || it.sku || `Jewellery Article ${idx + 1}`,
                hsn: RUHVI_GST_CONFIG.defaultJewelryHsn,
                purity: '22K',
                grossWeight: 14.5,
                netWeight: 14.2,
                ratePerGram: 7200,
                makingCharges: 0,
                taxableValue:
                  Math.round((Number(it.price_at_purchase) / 1.03) * 100) / 100,
                gstRate: RUHVI_GST_CONFIG.defaultJewelryGstRate,
                totalAmount: Number(it.price_at_purchase) || 0,
              })),
              subtotalTaxable: taxableTotal,
              totalCgst: cgst,
              totalSgst: sgst,
              totalIgst: igst,
              grandTotal: grossTotal,
              amountInWords: numberToIndianWords(grossTotal),
            }}
          />
          <button
            onClick={() => window.print()}
            className="inline-flex items-center space-x-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-400"
          >
            <Printer className="h-4 w-4" />
            <span>Print Invoice</span>
          </button>
        </div>
      </div>

      {/* Printable Invoice Sheet (A4 Styled) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-8 font-sans text-slate-900 shadow-2xl sm:p-12 print:rounded-none print:border-none print:p-0 print:shadow-none">
        {/* Invoice Title */}
        <div className="mb-6 border-b border-slate-200 pb-4 text-center">
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-900">
            TAX INVOICE (RULE 46 - GST)
          </span>
          <p className="mt-1 text-[11px] text-slate-500">
            Original for Recipient • Duplicate for Supplier
          </p>
        </div>

        {/* Header: Company & Invoice Meta */}
        <div className="flex flex-col justify-between gap-6 border-b border-slate-200 pb-6 sm:flex-row">
          <div>
            <h1 className="text-2xl font-black tracking-wider text-amber-900">
              {RUHVI_GST_CONFIG.legalName.toUpperCase()}
            </h1>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-600">
              {RUHVI_GST_CONFIG.address}
            </p>
            <div className="mt-2 space-y-0.5 font-mono text-xs text-slate-700">
              <div>
                <span className="font-bold text-slate-900">GSTIN:</span>{' '}
                <span className="font-semibold text-amber-900">
                  {RUHVI_GST_CONFIG.gstin}
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-900">PAN:</span>{' '}
                {RUHVI_GST_CONFIG.pan} |{' '}
                <span className="font-bold text-slate-900">State:</span>{' '}
                {RUHVI_GST_CONFIG.state} (Code: {RUHVI_GST_CONFIG.stateCode})
              </div>
              <div>
                <span className="font-bold text-slate-900">Email:</span>{' '}
                {RUHVI_GST_CONFIG.email} |{' '}
                <span className="font-bold text-slate-900">Phone:</span>{' '}
                {RUHVI_GST_CONFIG.phone}
              </div>
            </div>
          </div>

          <div className="space-y-1 rounded-xl bg-slate-50 p-4 font-mono text-xs sm:bg-transparent sm:p-0 sm:text-right">
            <div className="text-sm font-bold text-slate-900">
              Invoice No:{' '}
              <span className="text-amber-800">{invoiceNumber}</span>
            </div>
            <div>
              <span className="text-slate-500">Invoice Date:</span>{' '}
              {invoiceDate}
            </div>
            <div>
              <span className="text-slate-500">Place of Supply:</span>{' '}
              <span className="font-semibold text-slate-800">{state}</span>
            </div>
            <div>
              <span className="text-slate-500">Tax Type:</span>{' '}
              <span className="font-semibold text-emerald-800">
                {isInterState
                  ? 'IGST (Inter-State)'
                  : 'CGST + SGST (Intra-State)'}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Reverse Charge:</span> NO
            </div>
          </div>
        </div>

        {/* Bill To & Ship To Grid */}
        <div className="grid grid-cols-1 gap-6 border-b border-slate-200 py-6 text-xs sm:grid-cols-2">
          <div>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              BILL TO (BUYER DETAILS)
            </h2>
            <div className="text-sm font-bold text-slate-900">
              {order.shipping_address?.full_name || 'Walk-in / Retail Client'}
            </div>
            <p className="mt-1 leading-relaxed text-slate-600">
              {order.shipping_address?.address_line1 ||
                'Customer Delivery Address'}
              {order.shipping_address?.city
                ? `, ${order.shipping_address.city}`
                : ''}
              {order.shipping_address?.state
                ? `, ${order.shipping_address.state}`
                : ''}
              {order.shipping_address?.postal_code
                ? ` - ${order.shipping_address.postal_code}`
                : ''}
            </p>
            <div className="mt-2 text-slate-700">
              <span className="font-semibold">Phone:</span>{' '}
              {order.shipping_address?.phone || 'N/A'}
            </div>
            <div className="text-slate-700">
              <span className="font-semibold">Buyer GSTIN:</span>{' '}
              <span className="font-mono text-slate-900">
                {order.shipping_address?.gstin || 'URP (Unregistered Person)'}
              </span>
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              DISPATCH & DELIVERY (SHIP TO)
            </h2>
            <div className="text-sm font-bold text-slate-900">
              {order.shipping_address?.full_name || 'Same as Bill To'}
            </div>
            <p className="mt-1 leading-relaxed text-slate-600">
              {order.shipping_address?.address_line1 || 'Destination Address'}
              {order.shipping_address?.city
                ? `, ${order.shipping_address.city}`
                : ''}
              {order.shipping_address?.state
                ? `, ${order.shipping_address.state}`
                : ''}
              {order.shipping_address?.postal_code
                ? ` - ${order.shipping_address.postal_code}`
                : ''}
            </p>
            <div className="mt-2 text-slate-700">
              <span className="font-semibold">State of Destination:</span>{' '}
              {state}
            </div>
          </div>
        </div>

        {/* Itemized Table */}
        <div className="py-6">
          <table className="w-full border border-slate-300 text-left text-xs">
            <thead className="border-b border-slate-300 bg-slate-100 text-[11px] font-bold uppercase text-slate-700">
              <tr>
                <th className="w-8 p-3">#</th>
                <th className="p-3">Description of Goods (Jewellery)</th>
                <th className="p-3 text-center">HSN</th>
                <th className="p-3 text-center">Purity</th>
                <th className="p-3 text-right">Qty</th>
                <th className="p-3 text-right">Taxable Val (₹)</th>
                <th className="p-3 text-right">GST Rate</th>
                <th className="p-3 text-right">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((it: any, index: number) => {
                const lineGross =
                  Number(it.price_at_purchase * (it.quantity || 1)) ||
                  grossTotal;
                const lineTaxable = Math.round((lineGross / 1.03) * 100) / 100;
                return (
                  <tr key={it.id || index}>
                    <td className="p-3 font-mono text-slate-500">
                      {index + 1}
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">
                        {it.sku || 'Fine Jewellery Article'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        BIS Hallmarked • 100% Certified Genuine Gold/Silver
                      </div>
                    </td>
                    <td className="p-3 text-center font-mono font-semibold">
                      {RUHVI_GST_CONFIG.defaultJewelryHsn}
                    </td>
                    <td className="p-3 text-center font-semibold text-amber-900">
                      22K / 916
                    </td>
                    <td className="p-3 text-right font-mono">
                      {it.quantity || 1}
                    </td>
                    <td className="p-3 text-right font-mono">
                      ₹
                      {lineTaxable.toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="p-3 text-right font-mono font-semibold">
                      3%
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      ₹
                      {lineGross.toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Calculation & Tax Breakup Grid */}
        <div className="grid grid-cols-1 gap-6 border-b border-slate-200 pb-6 pt-2 text-xs sm:grid-cols-2">
          <div className="space-y-4">
            <div>
              <span className="font-bold text-slate-700">
                Amount Chargeable in Words:
              </span>
              <p className="mt-0.5 font-serif text-sm font-bold italic text-amber-900">
                {numberToIndianWords(grossTotal)}
              </p>
            </div>

            {/* Bank details for payment */}
            <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <Landmark className="h-4 w-4 text-amber-800" />
                <span>Ruhvi Jewels Bank Details for RTGS/NEFT:</span>
              </div>
              <div>
                <span className="text-slate-600">Bank:</span>{' '}
                {RUHVI_GST_CONFIG.bankName}
              </div>
              <div>
                <span className="text-slate-600">Account No:</span>{' '}
                <span className="font-mono font-bold">
                  {RUHVI_GST_CONFIG.accountNumber}
                </span>
              </div>
              <div>
                <span className="text-slate-600">IFSC Code:</span>{' '}
                <span className="font-mono font-bold">
                  {RUHVI_GST_CONFIG.ifscCode}
                </span>
              </div>
              <div>
                <span className="text-slate-600">Branch:</span>{' '}
                {RUHVI_GST_CONFIG.branch}
              </div>
            </div>
          </div>

          <div className="space-y-2 font-mono text-xs">
            <div className="flex justify-between py-1 text-slate-700">
              <span>Subtotal (Taxable Value):</span>
              <span className="font-bold">
                ₹
                {taxableTotal.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>

            {!isInterState ? (
              <>
                <div className="flex justify-between py-1 text-slate-700">
                  <span>CGST (1.5%):</span>
                  <span>
                    ₹
                    {cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between py-1 text-slate-700">
                  <span>SGST (1.5%):</span>
                  <span>
                    ₹
                    {sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex justify-between py-1 text-slate-700">
                <span>IGST (3.0%):</span>
                <span>
                  ₹{igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="flex justify-between py-1 text-slate-700">
              <span>Total Tax (GST):</span>
              <span className="font-bold text-amber-900">
                ₹
                {totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-between border-t-2 border-slate-900 py-2 text-sm font-bold text-slate-900">
              <span>GRAND TOTAL:</span>
              <span className="text-base text-amber-900">
                ₹
                {grossTotal.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Footer: UPI QR, Terms & Signatory */}
        <div className="grid grid-cols-1 gap-6 pt-6 text-xs sm:grid-cols-3">
          {/* UPI QR Code */}
          <div className="flex flex-col items-center space-y-2 sm:items-start">
            <span className="flex items-center gap-1 font-bold text-slate-700">
              <QrIcon className="h-4 w-4 text-amber-800" />
              <span>Instant UPI Payment:</span>
            </span>
            {qrCodeDataUrl && (
              <img
                src={qrCodeDataUrl}
                alt="UPI QR Code"
                className="h-28 w-28 rounded-lg border border-slate-300 p-1"
              />
            )}
            <span className="font-mono text-[10px] text-slate-500">
              Scan with GPay / PhonePe / Paytm
            </span>
          </div>

          {/* Terms & Conditions */}
          <div className="space-y-1 text-[10px] leading-relaxed text-slate-600">
            <span className="block text-xs font-bold text-slate-800">
              Terms & Conditions:
            </span>
            <p>1. Weight & purity certified as per BIS Hallmark standards.</p>
            <p>
              2. Goods once sold can be exchanged as per Ruhvi Lifetime Exchange
              Policy.
            </p>
            <p>3. Subject to Kolkata Jurisdiction.</p>
            <p>4. This is a computer-generated GST invoice.</p>
          </div>

          {/* Signature */}
          <div className="flex flex-col items-center justify-between pt-6 text-center sm:items-end sm:pt-0 sm:text-right">
            <div className="text-[11px] font-bold text-slate-800">
              For {RUHVI_GST_CONFIG.legalName}
            </div>
            <div className="mt-12 w-44 border-t border-slate-400 pt-2 text-[10px] text-slate-600">
              Authorized Signatory
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
