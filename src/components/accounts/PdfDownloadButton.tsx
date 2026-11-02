'use client';

import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import {
  generateRuhviPdf,
  type RuhviPdfData,
} from '@/lib/accounts/pdf/InvoicePDF';

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
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = () => {
    setIsGenerating(true);
    try {
      generateRuhviPdf(data, filename);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isGenerating}
      className={
        className ??
        'inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60'
      }
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Generating...</span>
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
