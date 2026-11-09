// src/lib/ai/co-founder/file-generator.ts
//
// File Generator & Cloudinary Storage for Co-Founder and AI Workers in RuhChat
// Supports: Markdown (.md), HTML (.html), PDF (.pdf), CSV (.csv), Text (.txt), JSON (.json)

import 'server-only';
import { v2 as cloudinary } from 'cloudinary';
import { jsPDF } from 'jspdf';

function getCloudinary() {
  const cloudName =
    process.env.NEXT_PUBLIC_CHAT_CLOUDINARY_CLOUD_NAME ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey =
    process.env.CHAT_CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY;
  const apiSecret =
    process.env.CHAT_CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  return cloudinary;
}

export type SupportedFileType =
  'markdown' | 'html' | 'pdf' | 'csv' | 'text' | 'json';

export interface CreateFileInput {
  file_name: string;
  file_type: SupportedFileType | string;
  title?: string;
  content: string;
}

export interface GeneratedFileResult {
  success: boolean;
  fileName: string;
  fileType: SupportedFileType | string;
  title: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  contentPreview: string;
  rawContent?: string;
}

function normalizeExtension(
  fileName: string,
  fileType: string
): { cleanFileName: string; normalizedType: SupportedFileType } {
  const raw = (fileName || 'document').trim();
  const lowerType = (fileType || 'markdown').toLowerCase();

  let ext = '.md';
  let normType: SupportedFileType = 'markdown';

  if (lowerType.includes('pdf') || raw.endsWith('.pdf')) {
    ext = '.pdf';
    normType = 'pdf';
  } else if (
    lowerType.includes('html') ||
    raw.endsWith('.html') ||
    raw.endsWith('.htm')
  ) {
    ext = '.html';
    normType = 'html';
  } else if (lowerType.includes('csv') || raw.endsWith('.csv')) {
    ext = '.csv';
    normType = 'csv';
  } else if (lowerType.includes('json') || raw.endsWith('.json')) {
    ext = '.json';
    normType = 'json';
  } else if (lowerType.includes('text') || raw.endsWith('.txt')) {
    ext = '.txt';
    normType = 'text';
  } else {
    ext = '.md';
    normType = 'markdown';
  }

  const baseName = raw.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanFileName = `${baseName || 'Document'}${ext}`;
  return { cleanFileName, normalizedType: normType };
}

function getMimeType(fileType: SupportedFileType): string {
  switch (fileType) {
    case 'pdf':
      return 'application/pdf';
    case 'html':
      return 'text/html; charset=utf-8';
    case 'csv':
      return 'text/csv; charset=utf-8';
    case 'json':
      return 'application/json; charset=utf-8';
    case 'markdown':
      return 'text/markdown; charset=utf-8';
    case 'text':
    default:
      return 'text/plain; charset=utf-8';
  }
}

/**
 * Build a structured PDF document from raw text/markdown/HTML using jsPDF
 */
function buildPdfBuffer(title: string, content: string): Buffer {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const maxLineWidth = pageWidth - margin * 2;

  // Header Banner
  doc.setFillColor(7, 94, 84); // WhatsApp / Ruhvi Deep Teal
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RUHVI JEWELS • OFFICIAL BUSINESS DOCUMENT', margin, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
    margin,
    18
  );

  // Document Title
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const docHeading = title || 'Document Report';
  doc.text(docHeading, margin, 36);

  // Divider Line
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(margin, 40, pageWidth - margin, 40);

  // Clean and format content
  const cleanContent = content
    .replace(/<[^>]*>/g, ' ') // Strip HTML tags for PDF text
    .replace(/```[a-z]*\n?/g, '')
    .trim();

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(55, 65, 81);

  const lines = doc.splitTextToSize(cleanContent, maxLineWidth);
  let y = 48;
  const pageHeight = doc.internal.pageSize.getHeight();

  for (const line of lines) {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, margin, y);
    y += 6;
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(
      `Page ${i} of ${totalPages} • Confidential • Ruhvi.in`,
      margin,
      pageHeight - 8
    );
  }

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

/**
 * Create a file buffer and upload to Cloudinary as raw asset
 */
export async function createAndUploadFile(
  input: CreateFileInput
): Promise<GeneratedFileResult> {
  const { cleanFileName, normalizedType } = normalizeExtension(
    input.file_name,
    input.file_type
  );
  const title = input.title || cleanFileName;
  const mimeType = getMimeType(normalizedType);

  let buffer: Buffer;
  if (normalizedType === 'pdf') {
    buffer = buildPdfBuffer(title, input.content);
  } else {
    buffer = Buffer.from(input.content, 'utf-8');
  }

  const cld = getCloudinary();
  const folder = 'ruhvi/ai_documents';
  const publicId = `${Date.now()}_${cleanFileName.replace(/\.[^/.]+$/, '')}`;

  if (!cld) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'integration_not_configured: Cloudinary credentials missing for file generator'
      );
    }
    // Fallback Data URI in development / test if Cloudinary credentials are not set
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return {
      success: true,
      fileName: cleanFileName,
      fileType: normalizedType,
      title,
      fileUrl: dataUrl,
      fileSize: buffer.length,
      mimeType,
      contentPreview: input.content.slice(0, 400),
      rawContent: input.content,
    };
  }

  try {
    const uploadResult: any = await new Promise((resolve, reject) => {
      const uploadStream = cld.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: 'raw',
          tags: ['ai_generated_document', normalizedType, 'ruhchat'],
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    const fileUrl = uploadResult?.secure_url || uploadResult?.url;
    if (!fileUrl) {
      throw new Error('Cloudinary did not return a secure URL');
    }

    return {
      success: true,
      fileName: cleanFileName,
      fileType: normalizedType,
      title,
      fileUrl,
      fileSize: buffer.length,
      mimeType,
      contentPreview: input.content.slice(0, 400),
      rawContent: input.content,
    };
  } catch (err: any) {
    console.warn(
      '[file-generator] Cloudinary upload failed, using data URI fallback:',
      err
    );
    // Fallback Data URI if Cloudinary is temporarily unreachable
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return {
      success: true,
      fileName: cleanFileName,
      fileType: normalizedType,
      title,
      fileUrl: dataUrl,
      fileSize: buffer.length,
      mimeType,
      contentPreview: input.content.slice(0, 400),
      rawContent: input.content,
    };
  }
}
