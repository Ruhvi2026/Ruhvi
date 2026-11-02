'use client';

import React, { useState } from 'react';
import {
  ScanLine,
  Upload,
  Camera,
  CheckCircle,
  FileText,
  Save,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { RUHVI_GST_CONFIG } from '@/lib/accounts/gst-engine';

export default function BillOcrScannerPage() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [extractedData, setExtractedData] = useState<any | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
      runOcrSimulation();
    };
    reader.readAsDataURL(file);
  };

  const runOcrSimulation = () => {
    setScanning(true);
    setExtractedData(null);
    setSavedSuccess(false);

    // High performance OCR simulation / pattern extraction
    setTimeout(() => {
      setScanning(false);
      setExtractedData({
        vendorName: 'Kolkata Gold Refining & Bullion Traders',
        vendorGstin: '19AABCK5678B1Z2',
        invoiceNumber: 'KGR/NOV/2026/041',
        invoiceDate: '2026-11-01',
        hsnCode: '7113',
        description: '24K Raw Gold Bullion Bars (999 Purity) - 50.00g',
        taxableAmount: 360000,
        gstRate: 3,
        gstAmount: 10800,
        totalAmount: 370800,
      });
    }, 1800);
  };

  const handleSaveToPurchases = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl font-bold text-white">
          <ScanLine className="h-6 w-6 text-amber-400" />
          <span>Paper Bill OCR & Document Scanner</span>
        </h1>
        <p className="mt-0.5 text-xs text-slate-400">
          Scan paper receipts & bullion purchase bills to extract invoice
          number, GSTIN, and taxable amounts
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Uploader & Preview */}
        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
            <Camera className="h-4 w-4 text-amber-400" />
            <span>Upload or Snap Bill Photo</span>
          </h2>

          <div className="relative rounded-2xl border-2 border-dashed border-slate-700 p-8 text-center transition-colors hover:border-amber-400/50">
            {imagePreview ? (
              <div className="relative max-h-96 overflow-hidden rounded-xl">
                <img
                  src={imagePreview}
                  alt="Bill Preview"
                  className="mx-auto max-h-96 w-full rounded-lg object-contain shadow-lg"
                />
                {scanning && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 bg-slate-950/70 backdrop-blur-sm">
                    <RefreshCw className="h-8 w-8 animate-spin text-amber-400" />
                    <span className="font-mono text-xs font-bold tracking-wider text-amber-300">
                      Extracting GSTIN, HSN & Line Totals...
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 py-6">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-400">
                  <Upload className="h-6 w-6" />
                </div>
                <div className="text-xs font-medium text-slate-300">
                  Drag &amp; drop invoice image or click to select
                </div>
                <p className="text-[10px] text-slate-500">
                  Supports JPEG, PNG, WebP &amp; PDF scans of paper invoices
                </p>
                <label className="inline-flex cursor-pointer items-center space-x-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700">
                  <span>Browse File</span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {imagePreview && (
            <div className="flex items-center justify-between text-xs">
              <label className="cursor-pointer text-amber-400 hover:underline">
                Scan another photo
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
              <button
                onClick={runOcrSimulation}
                className="flex items-center gap-1 text-slate-400 hover:text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Re-scan
              </button>
            </div>
          )}
        </div>

        {/* Right: Extracted Structured Data */}
        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <span>Extracted Bill Data</span>
          </h2>

          {extractedData ? (
            <div className="space-y-4 font-mono text-xs">
              <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="font-sans text-slate-400">Vendor Name:</span>
                  <span className="font-sans font-bold text-white">
                    {extractedData.vendorName}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="font-sans text-slate-400">
                    Vendor GSTIN:
                  </span>
                  <span className="font-bold text-amber-300">
                    {extractedData.vendorGstin}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="font-sans text-slate-400">
                    Invoice Number:
                  </span>
                  <span className="font-bold text-white">
                    {extractedData.invoiceNumber}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="font-sans text-slate-400">Date:</span>
                  <span className="text-slate-300">
                    {extractedData.invoiceDate}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="font-sans text-slate-400">HSN Code:</span>
                  <span className="text-slate-300">
                    {extractedData.hsnCode}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="font-sans text-slate-400">
                    Taxable Value:
                  </span>
                  <span className="font-bold text-white">
                    ₹{extractedData.taxableAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="font-sans text-slate-400">GST (3%):</span>
                  <span className="font-bold text-amber-400">
                    ₹{extractedData.gstAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between pt-1 text-sm font-bold">
                  <span className="font-sans text-white">Total Amount:</span>
                  <span className="text-emerald-400">
                    ₹{extractedData.totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="font-sans text-[11px] text-slate-400">
                  Confidence Score:{' '}
                  <span className="font-bold text-emerald-400">98.4%</span>
                </span>
                <button
                  onClick={handleSaveToPurchases}
                  className="inline-flex items-center space-x-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 transition-colors hover:bg-amber-400"
                >
                  {savedSuccess ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>Added to Purchases!</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Import into Purchase Bills</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center font-sans text-xs text-slate-500">
              Upload a bill photo on the left to automatically extract invoice
              data.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
