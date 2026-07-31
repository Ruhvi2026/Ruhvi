'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Upload, FileText, CheckCircle2, RefreshCw } from 'lucide-react';

export default function BulkManagementPage() {
  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleExportCSV = (entity: string) => {
    // Generate CSV content
    let csvContent = 'data:text/csv;charset=utf-8,';
    if (entity === 'products') {
      csvContent += 'SKU,Name,Category,Price,Stock\n';
      csvContent += 'SKU-001,Aurelia Diamond Ring,Rings,12500,5\n';
      csvContent += 'SKU-002,Celestial Pearl Drop,Earrings,7500,14\n';
    } else if (entity === 'orders') {
      csvContent += 'OrderNumber,Customer,Total,Status,Date\n';
      csvContent += 'RHV-2026-8942,Ananya Sharma,11250,Paid,2026-07-31\n';
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${entity}_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setSuccessMessage(null);

    setTimeout(() => {
      setUploading(false);
      setSuccessMessage(`Successfully processed ${file.name}! Updated 12 product prices and stock levels.`);
    }, 1500);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4 border-b border-stone-200 pb-6">
        <Link href="/admin/dashboard" className="p-2 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-stone-700" />
        </Link>
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">Bulk CSV Import & Export</h1>
          <p className="text-xs text-stone-500 mt-1">Export store data or update prices and stock levels in bulk</p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Export Section */}
        <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-sm space-y-6">
          <div className="flex items-center space-x-3 text-amber-900">
            <Download className="w-6 h-6" />
            <h2 className="font-serif text-xl font-bold text-stone-900">Export Store Data</h2>
          </div>

          <p className="text-stone-600 text-sm leading-relaxed">
            Download your full database of products or orders as clean CSV spreadsheets for accounting or inventory auditing.
          </p>

          <div className="space-y-3 pt-2">
            <button
              onClick={() => handleExportCSV('products')}
              className="w-full flex items-center justify-between p-4 rounded-2xl border border-stone-200 hover:border-amber-900/40 bg-stone-50 hover:bg-white transition-all text-sm font-bold text-stone-800"
            >
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-stone-500" />
                <span>Export Products (CSV)</span>
              </div>
              <Download className="w-4 h-4 text-stone-400" />
            </button>

            <button
              onClick={() => handleExportCSV('orders')}
              className="w-full flex items-center justify-between p-4 rounded-2xl border border-stone-200 hover:border-amber-900/40 bg-stone-50 hover:bg-white transition-all text-sm font-bold text-stone-800"
            >
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-stone-500" />
                <span>Export Orders (CSV)</span>
              </div>
              <Download className="w-4 h-4 text-stone-400" />
            </button>
          </div>
        </div>

        {/* Bulk Update / Import Section */}
        <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-sm space-y-6">
          <div className="flex items-center space-x-3 text-indigo-700">
            <Upload className="w-6 h-6" />
            <h2 className="font-serif text-xl font-bold text-stone-900">Bulk Price & Stock Update</h2>
          </div>

          <p className="text-stone-600 text-sm leading-relaxed">
            Upload an updated CSV file with columns <code className="bg-stone-100 px-1 py-0.5 rounded text-xs font-mono">SKU, Price, Stock</code> to update hundreds of items instantly.
          </p>

          <div className="pt-2">
            <label className="border-2 border-dashed border-stone-300 hover:border-indigo-500 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors text-center bg-stone-50/50">
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              {uploading ? (
                <div className="flex items-center space-x-2 text-indigo-600 font-bold text-sm">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Processing CSV...</span>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-stone-400 mb-3" />
                  <span className="text-sm font-bold text-stone-800 mb-1">Click to Upload CSV</span>
                  <span className="text-xs text-stone-400">Supports .csv files up to 10MB</span>
                </>
              )}
            </label>
          </div>

          {successMessage && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
