'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

type ExportType = 'inventory' | 'orders';

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else if (ch === '\r') {
      // ignore
    } else {
      field += ch;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

function findColumns(rows: string[][]): {
  dataRowIndex: number;
  skuIndex: number;
  priceIndex: number;
  stockIndex: number;
} {
  for (let i = 0; i < rows.length; i++) {
    const norm = rows[i].map((c) => c.trim().toLowerCase());
    const skuIndex = norm.findIndex((c) => c.includes('sku'));
    if (skuIndex < 0) continue;
    const priceIndex = norm.findIndex((c) => /price|selling price/i.test(c));
    const stockIndex = norm.findIndex((c) => /stock|quantity/i.test(c));
    return { dataRowIndex: i, skuIndex, priceIndex, stockIndex };
  }
  return { dataRowIndex: -1, skuIndex: 0, priceIndex: 1, stockIndex: 2 };
}

export default function BulkManagementPage() {
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState<ExportType | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleExport = (type: ExportType) => {
    setExporting(type);
    setSuccessMessage(null);
    setErrorMessage(null);
    window.location.href = `/api/admin/export?type=${type}&format=csv`;
    setTimeout(() => {
      setExporting(null);
      setSuccessMessage(
        type === 'inventory'
          ? 'Products CSV export started — downloading your full product catalog.'
          : 'Orders CSV export started — downloading all orders.'
      );
    }, 1000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text.replace(/^\uFEFF/, ''));
      if (rows.length === 0) {
        throw new Error('The CSV file is empty.');
      }

      const { dataRowIndex, skuIndex, priceIndex, stockIndex } =
        findColumns(rows);
      const dataRows = dataRowIndex >= 0 ? rows.slice(dataRowIndex + 1) : rows;

      const payload = dataRows
        .map((r) => ({
          sku: (r[skuIndex] || '').trim(),
          price: Number((r[priceIndex] || '').trim()),
          stock: Number((r[stockIndex] || '').trim()),
        }))
        .filter((r) => r.sku);

      if (payload.length === 0) {
        throw new Error('No rows with a SKU were found in the CSV.');
      }

      const res = await fetch('/api/admin/bulk/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: payload }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Bulk import failed.');

      const total = payload.length;
      const summary: string[] = [
        `Imported ${total} row${total === 1 ? '' : 's'}: ${result.updated} product${
          result.updated === 1 ? '' : 's'
        } updated.`,
      ];
      if (result.notFound > 0) {
        summary.push(
          `${result.notFound} SKU${result.notFound === 1 ? '' : 's'} not found.`
        );
      }
      if (result.invalid > 0) {
        summary.push(
          `${result.invalid} row${result.invalid === 1 ? '' : 's'} skipped (invalid price or stock).`
        );
      }
      if (result.skipped?.length > 0) {
        summary.push(
          `Skipped: ${result.skipped.slice(0, 5).join(', ')}${
            result.skipped.length > 5 ? '…' : ''
          }`
        );
      }
      setSuccessMessage(summary.join(' '));
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          'Failed to process CSV. Please check the file format and try again.'
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center space-x-4 border-b border-stone-200 pb-6">
        <Link
          href="/admin/dashboard"
          className="rounded-lg bg-stone-100 p-2 transition-colors hover:bg-stone-200"
        >
          <ArrowLeft className="h-5 w-5 text-stone-700" />
        </Link>
        <div>
          <h1 className="font-serif text-2xl font-bold text-stone-900 sm:text-3xl">
            Bulk CSV Import & Export
          </h1>
          <p className="mt-1 text-xs text-stone-500">
            Export store data or update prices and stock levels in bulk
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Export Section */}
        <div className="space-y-6 rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          <div className="flex items-center space-x-3 text-amber-900">
            <Download className="h-6 w-6" />
            <h2 className="font-serif text-xl font-bold text-stone-900">
              Export Store Data
            </h2>
          </div>

          <p className="text-sm leading-relaxed text-stone-600">
            Download your full database of products or orders as clean CSV
            spreadsheets for accounting or inventory auditing.
          </p>

          <div className="space-y-3 pt-2">
            <button
              onClick={() => handleExport('inventory')}
              disabled={exporting !== null}
              className="flex w-full items-center justify-between rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm font-bold text-stone-800 transition-all hover:border-amber-900/40 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-stone-500" />
                <span>
                  {exporting === 'inventory'
                    ? 'Preparing CSV...'
                    : 'Export Products (CSV)'}
                </span>
              </div>
              <Download className="h-4 w-4 text-stone-400" />
            </button>

            <button
              onClick={() => handleExport('orders')}
              disabled={exporting !== null}
              className="flex w-full items-center justify-between rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm font-bold text-stone-800 transition-all hover:border-amber-900/40 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-stone-500" />
                <span>
                  {exporting === 'orders'
                    ? 'Preparing CSV...'
                    : 'Export Orders (CSV)'}
                </span>
              </div>
              <Download className="h-4 w-4 text-stone-400" />
            </button>
          </div>
        </div>

        {/* Bulk Update / Import Section */}
        <div className="space-y-6 rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          <div className="flex items-center space-x-3 text-indigo-700">
            <Upload className="h-6 w-6" />
            <h2 className="font-serif text-xl font-bold text-stone-900">
              Bulk Price & Stock Update
            </h2>
          </div>

          <p className="text-sm leading-relaxed text-stone-600">
            Upload an updated CSV file with columns{' '}
            <code className="rounded bg-stone-100 px-1 py-0.5 font-mono text-xs">
              SKU, Price, Stock
            </code>{' '}
            to update hundreds of items instantly.
          </p>

          <div className="pt-2">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50/50 p-8 text-center transition-colors hover:border-indigo-500">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
              {uploading ? (
                <div className="flex items-center space-x-2 text-sm font-bold text-indigo-600">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>Processing CSV...</span>
                </div>
              ) : (
                <>
                  <Upload className="mb-3 h-8 w-8 text-stone-400" />
                  <span className="mb-1 text-sm font-bold text-stone-800">
                    Click to Upload CSV
                  </span>
                  <span className="text-xs text-stone-400">
                    Supports .csv files up to 10MB
                  </span>
                </>
              )}
            </label>
          </div>

          {successMessage && (
            <div className="flex items-start space-x-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-start space-x-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
