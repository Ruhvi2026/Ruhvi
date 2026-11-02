'use client';

import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { RuhviPdfData } from '@/lib/accounts/pdf/InvoicePDF';

// Lazy-load to avoid SSR issues with @react-pdf/renderer
const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then((m) => m.PDFDownloadLink),
  { ssr: false }
);

const RuhviInvoicePDF = dynamic(
  () => import('@/lib/accounts/pdf/InvoicePDF').then((m) => m.RuhviInvoicePDF),
  { ssr: false }
);

interface Props {
  data: RuhviPdfData;
  filename?: string;
  className?: string;
  label?: string;
}

export function PdfDownloadButton({
  data,
  filename,
  className,
  label = 'Download PDF',
}: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const defaultFilename = `${data.docNumber.replace(/[^a-zA-Z0-9-]/g, '_')}_${data.docDate}.pdf`;

  return (
    <PDFDownloadLink
      document={<RuhviInvoicePDF data={data} />}
      fileName={filename ?? defaultFilename}
    >
      {({ loading, error }) => {
        if (error) {
          return <span className="text-xs text-rose-400">PDF Error</span>;
        }
        return (
          <button
            disabled={loading}
            className={
              className ??
              'inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60'
            }
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>{label}</span>
              </>
            )}
          </button>
        );
      }}
    </PDFDownloadLink>
  );
}
