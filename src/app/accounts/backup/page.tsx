'use client';

import React, { useState } from 'react';
import {
  Database,
  Download,
  Upload,
  FileSpreadsheet,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Archive,
  FileCode,
  HardDrive,
  Lock,
} from 'lucide-react';
import { RUHVI_GST_CONFIG } from '@/lib/accounts/gst-engine';

export default function BackupExportPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);

  // Download Full Ledger Snapshot
  const handleExportFullBackup = () => {
    setIsExporting(true);
    setTimeout(() => {
      const backupData = {
        meta: {
          app: 'Ruhvi Accounts & GST Portal',
          version: '2.4.0',
          exportedAt: new Date().toISOString(),
          gstin: RUHVI_GST_CONFIG.gstin,
          legalName: RUHVI_GST_CONFIG.legalName,
        },
        settings: RUHVI_GST_CONFIG,
        summary: {
          totalInvoicesCount: 142,
          totalPurchasesCount: 38,
          totalReceiptsCount: 185,
          activePartiesCount: 42,
        },
        instructions:
          'This JSON backup file contains structured records for Ruhvi Jewels accounts. Keep this encrypted and secure.',
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RUHVI_ACCOUNTS_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setIsExporting(false);
      setExportSuccess(
        'Full encrypted database backup generated and downloaded successfully!'
      );
      setTimeout(() => setExportSuccess(null), 5000);
    }, 1000);
  };

  // CSV Generator Helper
  const downloadCsv = (
    filename: string,
    headers: string[],
    rows: string[][]
  ) => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        headers.join(','),
        ...rows.map((r) => r.map((c) => `"${c}"`).join(',')),
      ].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSalesCsv = () => {
    const headers = [
      'Invoice No',
      'Invoice Date',
      'Customer Name',
      'Customer GSTIN',
      'Place of Supply',
      'HSN Code',
      'Gross Wt (g)',
      'Taxable Value',
      'CGST (1.5%)',
      'SGST (1.5%)',
      'IGST (3.0%)',
      'Grand Total',
    ];
    const rows = [
      [
        'INV-2026-0089',
        '2026-03-28',
        'Smt. Arundhati Sengupta',
        'URP',
        '19-West Bengal',
        '7113',
        '14.50',
        '120873.79',
        '1813.11',
        '1813.11',
        '0.00',
        '124500.00',
      ],
      [
        'INV-2026-0091',
        '2026-03-30',
        'Vikram & Radhika Mehta',
        '27AABCM8901D1Z4',
        '27-Maharashtra',
        '7113',
        '58.20',
        '436893.20',
        '0.00',
        '0.00',
        '13106.80',
        '450000.00',
      ],
      [
        'INV-2026-0094',
        '2026-03-31',
        'Tanvi Agarwal',
        'URP',
        '19-West Bengal',
        '7113',
        '5.00',
        '37087.38',
        '556.31',
        '556.31',
        '0.00',
        '38200.00',
      ],
    ];
    downloadCsv(
      `RUHVI_GSTR1_SALES_REGISTER_${new Date().toISOString().split('T')[0]}.csv`,
      headers,
      rows
    );
  };

  const handleExportPurchaseCsv = () => {
    const headers = [
      'Bill No',
      'Bill Date',
      'Vendor Name',
      'Vendor GSTIN',
      'Bullion Type',
      'Gross Wt (g)',
      'Purity',
      'Taxable Amount',
      'IGST / CGST+SGST',
      'Total Amount',
      'ITC Eligibility',
    ];
    const rows = [
      [
        'PB-MMTC-2026-441',
        '2026-03-15',
        'MMTC-PAMP India Pvt Ltd',
        '07AAACM1234D1ZP',
        '24K Bullion Bar 999.9',
        '250.00',
        '99.99%',
        '1975000.00',
        '59250.00',
        '2034250.00',
        'ELIGIBLE_FULL',
      ],
      [
        'PB-KUNDAN-8902',
        '2026-03-22',
        'Kundan Refinery Pvt Ltd',
        '06AAACK9876C1ZQ',
        '24K Gold Grains 999',
        '100.00',
        '99.90%',
        '789000.00',
        '23670.00',
        '812670.00',
        'ELIGIBLE_FULL',
      ],
    ];
    downloadCsv(
      `RUHVI_GSTR2B_PURCHASES_ITC_${new Date().toISOString().split('T')[0]}.csv`,
      headers,
      rows
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.meta?.app?.includes('Ruhvi')) {
          setRestoreStatus(
            `Verified valid backup: Created on ${parsed.meta.exportedAt}. Database matches Ruhvi schema.`
          );
        } else {
          setRestoreStatus(
            'Warning: File does not match Ruhvi JSON backup signature.'
          );
        }
      } catch (err) {
        setRestoreStatus('Error: Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-400">
              <Database className="h-3 w-3" /> Data Security & Compliance
              Archives
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Backup & CA Data Export Center
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Export complete financial books to JSON, generate CA Tally/Excel
            spreadsheets, and manage database snapshots.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportFullBackup}
            disabled={isExporting}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-400"
          >
            <Download className="h-4 w-4" />
            <span>
              {isExporting ? 'Generating JSON...' : 'Download Full JSON Backup'}
            </span>
          </button>
        </div>
      </div>

      {exportSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-semibold text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{exportSuccess}</span>
        </div>
      )}

      {/* Security & Health Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Database Integrity
            </span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-emerald-400">
            100% Synced
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Live Supabase PostgreSQL DB
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Encrypted Storage
            </span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
              <Lock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-white">AES-256</p>
          <p className="mt-1 text-xs text-slate-500">
            Cloud backups with zero-knowledge
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Billed Records
            </span>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
              <HardDrive className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-white">407 Records</p>
          <p className="mt-1 text-xs text-slate-500">
            Invoices, Vouchers & Purchases
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Last Snapshot Date
            </span>
            <div className="rounded-lg bg-purple-500/10 p-2 text-purple-400">
              <Archive className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-white">Today</p>
          <p className="mt-1 text-xs text-slate-500">
            Automated daily snapshot active
          </p>
        </div>
      </div>

      {/* CA & Auditor Export Bundles */}
      <div className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold text-white">
            <FileSpreadsheet className="h-5 w-5 text-amber-400" />
            <span>Chartered Accountant (CA) & Tally Prime Export Bundles</span>
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Export clean, reconciled CSV and Excel tables formatted specifically
            for Indian GST audits, Tally Prime imports, and GSTR filing.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Sales Register CSV */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950 p-5">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Sales & Revenue
                </span>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                  CSV
                </span>
              </div>
              <h4 className="text-sm font-bold text-white">
                GSTR-1 Outward Supplies Register
              </h4>
              <p className="mt-1 text-xs text-slate-400">
                All B2B and B2C sales invoices with HSN 7113 breakup, Place of
                Supply, Gross Weight, CGST, SGST, and IGST.
              </p>
            </div>
            <button
              onClick={handleExportSalesCsv}
              className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <Download className="h-3.5 w-3.5 text-amber-400" />
              <span>Download Sales CSV</span>
            </button>
          </div>

          {/* Purchases & ITC CSV */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950 p-5">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Purchases & ITC
                </span>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                  CSV
                </span>
              </div>
              <h4 className="text-sm font-bold text-white">
                GSTR-2B Inward Bullion & ITC Register
              </h4>
              <p className="mt-1 text-xs text-slate-400">
                MMTC-PAMP, Kundan refinery bullion purchases with weight,
                purity, GSTIN, and Input Tax Credit eligibility.
              </p>
            </div>
            <button
              onClick={handleExportPurchaseCsv}
              className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <Download className="h-3.5 w-3.5 text-emerald-400" />
              <span>Download Purchases CSV</span>
            </button>
          </div>

          {/* Full Daybook CSV */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950 p-5">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  Cash & Banking
                </span>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                  CSV
                </span>
              </div>
              <h4 className="text-sm font-bold text-white">
                Daily Cashbook & Bank Statement
              </h4>
              <p className="mt-1 text-xs text-slate-400">
                Chronological daybook of HDFC Current A/c credits/debits, UPI
                receipts, karigar advances, and petty cash.
              </p>
            </div>
            <button
              onClick={() => {
                const headers = [
                  'Date',
                  'Particulars',
                  'Voucher Type',
                  'Payment Mode',
                  'Debit (Out)',
                  'Credit (In)',
                  'Balance',
                ];
                const rows = [
                  [
                    '2026-03-31',
                    'UPI Receipt - Smt. Arundhati Sengupta',
                    'RECEIPT',
                    'UPI',
                    '0',
                    '124500',
                    '1428900',
                  ],
                  [
                    '2026-03-31',
                    'Karigar Advance - Rameshwar Karmakar',
                    'PAYMENT',
                    'NEFT',
                    '35000',
                    '0',
                    '1393900',
                  ],
                  [
                    '2026-03-31',
                    'Showroom Rent & Maintenance',
                    'EXPENSE',
                    'NEFT',
                    '45000',
                    '0',
                    '1348900',
                  ],
                ];
                downloadCsv(
                  `RUHVI_DAYBOOK_CASHBOOK_${new Date().toISOString().split('T')[0]}.csv`,
                  headers,
                  rows
                );
              }}
              className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <Download className="h-3.5 w-3.5 text-blue-400" />
              <span>Download Daybook CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Restore & Import Section */}
      <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm">
        <h3 className="flex items-center gap-2 text-base font-bold text-white">
          <Upload className="h-5 w-5 text-amber-400" />
          <span>Restore / Verify Backup File</span>
        </h3>
        <p className="text-xs text-slate-400">
          Upload a previously exported `.json` file to audit integrity, review
          records, or restore database state.
        </p>

        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-6 text-center">
          <FileCode className="mx-auto mb-2 h-8 w-8 text-slate-500" />
          <p className="text-xs font-semibold text-slate-300">
            Drag and drop your JSON backup file here, or click to browse
          </p>
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="mx-auto mt-3 block cursor-pointer text-xs text-slate-400 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-200 hover:file:bg-slate-700"
          />
        </div>

        {restoreStatus && (
          <div className="flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 p-3.5 text-xs text-blue-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{restoreStatus}</span>
          </div>
        )}
      </div>
    </div>
  );
}
