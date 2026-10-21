'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  Printer,
  QrCode,
  FileText,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Search,
  Eye,
  Info,
  HelpCircle,
  Copy,
  Layers,
  Sparkles,
  Zap,
  RefreshCw,
  Check,
  Link2,
} from 'lucide-react';
import {
  BarcodeSvg,
  generateBarcodeSvgHtml,
} from '@/components/inventory/BarcodeSvg';
import toast from 'react-hot-toast';
import {
  linkBarcodeToProductSku,
  batchGenerateMissingBarcodes,
} from './actions';

// ============================================================================
// Layout Preset Types & Definitions
// ============================================================================

export interface A4Preset {
  id: string;
  name: string;
  cols: number;
  rows: number;
  stickerWidth: number; // mm
  stickerHeight: number; // mm
  marginTop: number; // mm
  marginBottom: number; // mm
  marginLeft: number; // mm
  marginRight: number; // mm
  horizontalGap: number; // mm
  verticalGap: number; // mm
}

const A4_PRESETS: A4Preset[] = [
  {
    id: '1_per_page',
    name: '1 per page (Full Sheet / 1×1)',
    cols: 1,
    rows: 1,
    stickerWidth: 190,
    stickerHeight: 270,
    marginTop: 13.5,
    marginBottom: 13.5,
    marginLeft: 10,
    marginRight: 10,
    horizontalGap: 0,
    verticalGap: 0,
  },
  {
    id: '2_per_page',
    name: '2 per page (Large Half-Sheet / 1×2)',
    cols: 1,
    rows: 2,
    stickerWidth: 190,
    stickerHeight: 133,
    marginTop: 13,
    marginBottom: 13,
    marginLeft: 10,
    marginRight: 10,
    horizontalGap: 0,
    verticalGap: 5,
  },
  {
    id: '4_per_page',
    name: '4 per page (Quarter Sheet / 2×2)',
    cols: 2,
    rows: 2,
    stickerWidth: 95,
    stickerHeight: 133,
    marginTop: 13,
    marginBottom: 13,
    marginLeft: 7.5,
    marginRight: 7.5,
    horizontalGap: 5,
    verticalGap: 5,
  },
  {
    id: '6_per_page',
    name: '6 per page (Medium Box / 2×3)',
    cols: 2,
    rows: 3,
    stickerWidth: 95,
    stickerHeight: 88,
    marginTop: 12,
    marginBottom: 12,
    marginLeft: 7.5,
    marginRight: 7.5,
    horizontalGap: 5,
    verticalGap: 4.5,
  },
  {
    id: '8_per_page',
    name: '8 per page (Product Tag / 2×4)',
    cols: 2,
    rows: 4,
    stickerWidth: 95,
    stickerHeight: 65,
    marginTop: 12,
    marginBottom: 12,
    marginLeft: 7.5,
    marginRight: 7.5,
    horizontalGap: 5,
    verticalGap: 4,
  },
  {
    id: '12_per_page',
    name: '12 per page (Standard / 3×4)',
    cols: 3,
    rows: 4,
    stickerWidth: 63.5,
    stickerHeight: 65,
    marginTop: 12,
    marginBottom: 12,
    marginLeft: 6.5,
    marginRight: 6.5,
    horizontalGap: 3.5,
    verticalGap: 4,
  },
  {
    id: '16_per_page',
    name: '16 per page (Compact Shelf / 2×8)',
    cols: 2,
    rows: 8,
    stickerWidth: 95,
    stickerHeight: 32,
    marginTop: 11,
    marginBottom: 11,
    marginLeft: 7.5,
    marginRight: 7.5,
    horizontalGap: 5,
    verticalGap: 2.5,
  },
  {
    id: '24_per_page',
    name: '24 per page (Standard Avery 70×37 / 3×8)',
    cols: 3,
    rows: 8,
    stickerWidth: 64,
    stickerHeight: 33.8,
    marginTop: 11.5,
    marginBottom: 11.5,
    marginLeft: 6,
    marginRight: 6,
    horizontalGap: 3,
    verticalGap: 0.5,
  },
  {
    id: '32_per_page',
    name: '32 per page (Small Label / 4×8)',
    cols: 4,
    rows: 8,
    stickerWidth: 48.5,
    stickerHeight: 33.8,
    marginTop: 11.5,
    marginBottom: 11.5,
    marginLeft: 5,
    marginRight: 5,
    horizontalGap: 2,
    verticalGap: 0.5,
  },
  {
    id: '48_per_page',
    name: '48 per page (Jewellery Mini Tag / 4×12)',
    cols: 4,
    rows: 12,
    stickerWidth: 48.5,
    stickerHeight: 21.2,
    marginTop: 10,
    marginBottom: 10,
    marginLeft: 5,
    marginRight: 5,
    horizontalGap: 2,
    verticalGap: 1.5,
  },
];

export interface ThermalPreset {
  id: string;
  name: string;
  rollWidthMm: number;
  labelWidthMm: number;
  labelHeightMm: number;
  gapMm: number;
}

const THERMAL_PRESETS: ThermalPreset[] = [
  {
    id: 'jewellery_dumbbell',
    name: 'Jewellery Dumbbell / Rat-Tail Tag (38×25mm)',
    rollWidthMm: 50.8, // 2 inch
    labelWidthMm: 38,
    labelHeightMm: 25,
    gapMm: 3,
  },
  {
    id: 'jewellery_tag_narrow',
    name: 'Narrow Jewellery Tag (50×15mm)',
    rollWidthMm: 50.8,
    labelWidthMm: 50,
    labelHeightMm: 15,
    gapMm: 3,
  },
  {
    id: 'standard_2x1',
    name: 'Standard Barcode Roll (50×25mm / 2"×1")',
    rollWidthMm: 50.8,
    labelWidthMm: 50,
    labelHeightMm: 25,
    gapMm: 3,
  },
  {
    id: 'retail_medium',
    name: 'Medium Product Tag (50×30mm)',
    rollWidthMm: 50.8,
    labelWidthMm: 50,
    labelHeightMm: 30,
    gapMm: 3,
  },
  {
    id: 'compact_mini',
    name: 'Compact Jewellery Tag (32×19mm)',
    rollWidthMm: 38.1, // 1.5 inch
    labelWidthMm: 32,
    labelHeightMm: 19,
    gapMm: 2,
  },
  {
    id: 'large_3x2',
    name: 'Large Retail Label (75×50mm / 3"×2")',
    rollWidthMm: 76.2, // 3 inch
    labelWidthMm: 75,
    labelHeightMm: 50,
    gapMm: 3,
  },
];

// Wrap in Suspense for Next.js searchParams
export default function BarcodePrintingPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-400">
          Loading Barcode Printing System...
        </div>
      }
    >
      <BarcodePrintingContent />
    </Suspense>
  );
}

function BarcodePrintingContent() {
  const searchParams = useSearchParams();
  const initialSku = searchParams.get('sku') || '';

  // Product Selection State
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productSearch, setProductSearch] = useState(initialSku);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  // Barcode Generation & Sync State
  const [activeSelectorTab, setActiveSelectorTab] = useState<
    'search' | 'direct_sku'
  >('search');
  const [directSkuInput, setDirectSkuInput] = useState('');
  const [customBarcodeInput, setCustomBarcodeInput] = useState('');
  const [isLinkingBarcode, setIsLinkingBarcode] = useState(false);
  const [isEditingBarcode, setIsEditingBarcode] = useState(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);

  // Generate & Link Barcode to SKU
  const handleGenerateAndLinkBarcode = async (
    sku: string,
    customBarcode?: string
  ) => {
    const clean = (sku || '').trim();
    if (!clean) {
      toast.error('Please specify an SKU first.');
      return;
    }

    setIsLinkingBarcode(true);
    try {
      const res = await linkBarcodeToProductSku({
        sku: clean,
        barcode: customBarcode?.trim() || undefined,
      });

      if (!res.success || !res.product) {
        throw new Error(res.error || 'Failed to generate barcode.');
      }

      // Update selected product state
      setSelectedProduct(res.product);

      // Update in products list
      setProducts((prev) =>
        prev.map((p) =>
          p.id === res.product!.id ? { ...p, barcode: res.barcode } : p
        )
      );

      toast.success(
        `Barcode "${res.barcode}" generated & linked to SKU "${res.product.sku}"!`
      );
      setCustomBarcodeInput('');
      setIsEditingBarcode(false);
      setDirectSkuInput('');
    } catch (err: any) {
      toast.error(err.message || 'Error linking barcode.');
    } finally {
      setIsLinkingBarcode(false);
    }
  };

  // Batch generate missing barcodes
  const handleBatchGenerate = async () => {
    if (
      !confirm(
        'This will automatically assign standard barcodes (RHV-[SKU]) to all products without one. Proceed?'
      )
    ) {
      return;
    }
    setIsBatchGenerating(true);
    try {
      const res = await batchGenerateMissingBarcodes();
      if (!res.success) throw new Error(res.error);
      toast.success(`Generated barcodes for ${res.count} products!`);

      // Refresh products from database
      const supabase = createClient();
      const { data } = await supabase
        .from('products')
        .select(
          'id, name, sku, barcode, price, mrp, stock_quantity, weight_grams, collection'
        )
        .order('name', { ascending: true })
        .limit(200);
      if (data) setProducts(data);
    } catch (err: any) {
      toast.error(err.message || 'Batch generation failed.');
    } finally {
      setIsBatchGenerating(false);
    }
  };

  // Printing Mode State: 'a4' | 'thermal'
  const [printMode, setPrintMode] = useState<'a4' | 'thermal'>('a4');

  // Copies State
  const [copies, setCopies] = useState<number>(24);

  // Label Content Options
  const [showSku, setShowSku] = useState(true);
  const [showName, setShowName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showBarcodeText, setShowBarcodeText] = useState(false);

  // A4 Layout Configuration
  const [selectedA4PresetId, setSelectedA4PresetId] =
    useState<string>('24_per_page');
  const [a4Cols, setA4Cols] = useState<number>(3);
  const [a4Rows, setA4Rows] = useState<number>(8);
  const [a4Width, setA4Width] = useState<number>(64);
  const [a4Height, setA4Height] = useState<number>(33.8);
  const [a4MarginTop, setA4MarginTop] = useState<number>(11.5);
  const [a4MarginBottom, setA4MarginBottom] = useState<number>(11.5);
  const [a4MarginLeft, setA4MarginLeft] = useState<number>(6);
  const [a4MarginRight, setA4MarginRight] = useState<number>(6);
  const [a4HGap, setA4HGap] = useState<number>(3);
  const [a4VGap, setA4VGap] = useState<number>(0.5);

  // Thermal Roll Configuration
  const [selectedThermalPresetId, setSelectedThermalPresetId] =
    useState<string>('standard_2x1');
  const [rollWidthPreset, setRollWidthPreset] = useState<
    '1' | '2' | '3' | 'custom'
  >('2');
  const [thermalRollWidth, setThermalRollWidth] = useState<number>(50.8);
  const [thermalLabelWidth, setThermalLabelWidth] = useState<number>(50);
  const [thermalLabelHeight, setThermalLabelHeight] = useState<number>(25);
  const [thermalGap, setThermalGap] = useState<number>(3);

  // Preview Pagination State
  const [previewPage, setPreviewPage] = useState<number>(1);
  const [isPrinting, setIsPrinting] = useState(false);

  // Fetch products from database
  useEffect(() => {
    async function loadProducts() {
      setLoadingProducts(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('products')
          .select(
            'id, name, sku, barcode, price, mrp, stock_quantity, weight_grams, collection'
          )
          .order('name', { ascending: true })
          .limit(200);

        if (error) throw error;
        setProducts(data || []);

        // Auto-select if sku matches query param
        if (initialSku && data) {
          const match = data.find(
            (p: any) => p.sku?.toLowerCase() === initialSku.toLowerCase()
          );
          if (match) setSelectedProduct(match);
        }
      } catch (err: any) {
        toast.error('Failed to load products: ' + err.message);
      } finally {
        setLoadingProducts(false);
      }
    }
    loadProducts();
  }, [initialSku]);

  // Handle A4 Preset Selection
  const applyA4Preset = (presetId: string) => {
    setSelectedA4PresetId(presetId);
    if (presetId === 'custom') return;
    const p = A4_PRESETS.find((item) => item.id === presetId);
    if (p) {
      setA4Cols(p.cols);
      setA4Rows(p.rows);
      setA4Width(p.stickerWidth);
      setA4Height(p.stickerHeight);
      setA4MarginTop(p.marginTop);
      setA4MarginBottom(p.marginBottom);
      setA4MarginLeft(p.marginLeft);
      setA4MarginRight(p.marginRight);
      setA4HGap(p.horizontalGap);
      setA4VGap(p.verticalGap);
    }
  };

  // Handle Thermal Preset Selection
  const applyThermalPreset = (presetId: string) => {
    setSelectedThermalPresetId(presetId);
    if (presetId === 'custom') return;
    const p = THERMAL_PRESETS.find((item) => item.id === presetId);
    if (p) {
      setThermalRollWidth(p.rollWidthMm);
      setThermalLabelWidth(p.labelWidthMm);
      setThermalLabelHeight(p.labelHeightMm);
      setThermalGap(p.gapMm);
      if (p.rollWidthMm === 25.4) setRollWidthPreset('1');
      else if (p.rollWidthMm === 50.8) setRollWidthPreset('2');
      else if (p.rollWidthMm === 76.2) setRollWidthPreset('3');
      else setRollWidthPreset('custom');
    }
  };

  // Search filtered products for selector
  const searchedProducts = useMemo(() => {
    if (!productSearch.trim()) return products.slice(0, 20);
    const q = productSearch.toLowerCase();
    return products
      .filter(
        (p) =>
          p.sku?.toLowerCase().includes(q) ||
          p.name?.toLowerCase().includes(q) ||
          p.barcode?.toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [products, productSearch]);

  // Physical Dimensions & Overflow Validation
  const a4Validation = useMemo(() => {
    const totalW =
      a4Cols * a4Width + (a4Cols - 1) * a4HGap + a4MarginLeft + a4MarginRight;
    const totalH =
      a4Rows * a4Height + (a4Rows - 1) * a4VGap + a4MarginTop + a4MarginBottom;

    const widthOverflow = totalW > 210.5; // slight tolerance for floating point
    const heightOverflow = totalH > 297.5;

    return {
      totalWidth: totalW,
      totalHeight: totalH,
      isValid: !widthOverflow && !heightOverflow,
      widthOverflowAmount: Math.max(0, totalW - 210),
      heightOverflowAmount: Math.max(0, totalH - 297),
    };
  }, [
    a4Cols,
    a4Rows,
    a4Width,
    a4Height,
    a4HGap,
    a4VGap,
    a4MarginLeft,
    a4MarginRight,
    a4MarginTop,
    a4MarginBottom,
  ]);

  // Thermal Validation
  const thermalValidation = useMemo(() => {
    const isWOverflow = thermalLabelWidth > thermalRollWidth;
    return {
      isValid: !isWOverflow && thermalLabelWidth > 0 && thermalLabelHeight > 0,
      widthOverflow: isWOverflow,
    };
  }, [thermalLabelWidth, thermalRollWidth, thermalLabelHeight]);

  // Pagination Calculations
  const labelsPerPage = printMode === 'a4' ? a4Cols * a4Rows : 1;
  const safeCopies = Math.max(1, copies || 1);
  const totalPages =
    printMode === 'a4'
      ? Math.ceil(safeCopies / (labelsPerPage || 1))
      : safeCopies;

  // Clamp preview page if settings change
  useEffect(() => {
    if (previewPage > totalPages) setPreviewPage(Math.max(1, totalPages));
  }, [totalPages, previewPage]);

  // Calculate items for current preview page
  const previewPageItems = useMemo(() => {
    if (printMode === 'thermal') {
      return [{ index: previewPage - 1, isReal: true }];
    }
    // A4 Sheet: generate array of grid slots
    const pageStartIndex = (previewPage - 1) * labelsPerPage;
    const slots = [];
    for (let slot = 0; slot < labelsPerPage; slot++) {
      const globalIndex = pageStartIndex + slot;
      slots.push({
        index: globalIndex,
        isReal: globalIndex < safeCopies,
      });
    }
    return slots;
  }, [printMode, previewPage, labelsPerPage, safeCopies]);

  // ============================================================================
  // Physical Print Trigger (Zero-interference isolated printable document)
  // ============================================================================
  const handlePrint = () => {
    if (!selectedProduct) {
      toast.error('Please select a SKU/product first');
      return;
    }
    if (!selectedProduct.barcode) {
      toast.error(
        'Selected product has no registered barcode. Printing aborted.'
      );
      return;
    }
    if (printMode === 'a4' && !a4Validation.isValid) {
      toast.error(
        'Cannot print: The requested dimensions exceed standard A4 sheet boundaries.'
      );
      return;
    }
    if (printMode === 'thermal' && !thermalValidation.isValid) {
      toast.error('Cannot print: Label width exceeds selected roll width.');
      return;
    }

    setIsPrinting(true);

    try {
      // 1. Generate standalone barcode SVG markup
      const barcodeSvgString = generateBarcodeSvgHtml(selectedProduct.barcode, {
        width: printMode === 'a4' && a4Width < 50 ? 1.2 : 1.6,
        height: printMode === 'a4' && a4Height < 25 ? 20 : 32,
        displayValue: showBarcodeText,
        fontSize: 10,
        margin: 1,
      });

      // 2. Build Print Stylesheet & Layout HTML
      const isA4 = printMode === 'a4';
      const pageCss = isA4
        ? `@page { size: 210mm 297mm; margin: 0; }`
        : `@page { size: ${thermalLabelWidth}mm ${thermalLabelHeight}mm; margin: 0; }`;

      let pagesHtml = '';

      if (isA4) {
        // A4 sheet pages
        for (let p = 0; p < totalPages; p++) {
          const pageStart = p * labelsPerPage;
          let stickersHtml = '';

          for (let row = 0; row < a4Rows; row++) {
            for (let col = 0; col < a4Cols; col++) {
              const slotIdx = row * a4Cols + col;
              const globalIdx = pageStart + slotIdx;
              const isFilled = globalIdx < safeCopies;

              if (isFilled) {
                stickersHtml += `
                  <div class="sticker" style="
                    width: ${a4Width}mm;
                    height: ${a4Height}mm;
                    position: absolute;
                    left: ${a4MarginLeft + col * (a4Width + a4HGap)}mm;
                    top: ${a4MarginTop + row * (a4Height + a4VGap)}mm;
                  ">
                    ${showName && selectedProduct.name ? `<div class="prod-name">${escapeHtml(selectedProduct.name)}</div>` : ''}
                    <div class="barcode-box">${barcodeSvgString}</div>
                    ${showSku ? `<div class="sku-text">${escapeHtml(selectedProduct.sku)}</div>` : ''}
                    ${
                      showPrice &&
                      (selectedProduct.price || selectedProduct.mrp)
                        ? `
                      <div class="price-text">₹${(selectedProduct.price || selectedProduct.mrp).toLocaleString('en-IN')}</div>
                    `
                        : ''
                    }
                  </div>
                `;
              }
            }
          }

          pagesHtml += `
            <div class="page a4-page">
              ${stickersHtml}
            </div>
          `;
        }
      } else {
        // Thermal roll individual labels
        for (let i = 0; i < safeCopies; i++) {
          pagesHtml += `
            <div class="page thermal-page" style="width: ${thermalLabelWidth}mm; height: ${thermalLabelHeight}mm;">
              <div class="thermal-content">
                ${showName && selectedProduct.name ? `<div class="prod-name">${escapeHtml(selectedProduct.name)}</div>` : ''}
                <div class="barcode-box">${barcodeSvgString}</div>
                ${showSku ? `<div class="sku-text">${escapeHtml(selectedProduct.sku)}</div>` : ''}
                ${
                  showPrice && (selectedProduct.price || selectedProduct.mrp)
                    ? `
                  <div class="price-text">₹${(selectedProduct.price || selectedProduct.mrp).toLocaleString('en-IN')}</div>
                `
                    : ''
                }
              </div>
            </div>
          `;
        }
      }

      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Print Barcodes — ${escapeHtml(selectedProduct.sku)}</title>
          <style>
            ${pageCss}
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              background: #fff;
              color: #000;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .page {
              position: relative;
              overflow: hidden;
              page-break-after: always;
              break-after: page;
            }
            .page:last-child {
              page-break-after: auto;
              break-after: auto;
            }
            .a4-page {
              width: 210mm;
              height: 297mm;
            }
            .sticker {
              overflow: hidden;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 1.5mm;
              text-align: center;
              background: #fff;
            }
            .thermal-page {
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
            }
            .thermal-content {
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 1.5mm;
              text-align: center;
            }
            .prod-name {
              font-size: 8pt;
              font-weight: 600;
              line-height: 1.1;
              max-width: 100%;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              margin-bottom: 1mm;
            }
            .barcode-box {
              display: flex;
              justify-content: center;
              align-items: center;
              max-width: 100%;
            }
            .barcode-box svg {
              max-width: 100%;
              height: auto;
            }
            .sku-text {
              font-family: monospace;
              font-size: 9pt;
              font-weight: bold;
              letter-spacing: 0.5px;
              margin-top: 1mm;
            }
            .price-text {
              font-size: 8pt;
              font-weight: bold;
              margin-top: 0.5mm;
            }
          </style>
        </head>
        <body>
          ${pagesHtml}
        </body>
        </html>
      `;

      // 3. Inject into invisible print frame
      const frameId = 'ruhvi-barcode-print-frame';
      let frame = document.getElementById(frameId) as HTMLIFrameElement;
      if (frame) frame.remove();

      frame = document.createElement('iframe');
      frame.id = frameId;
      frame.style.position = 'fixed';
      frame.style.right = '0';
      frame.style.bottom = '0';
      frame.style.width = '0';
      frame.style.height = '0';
      frame.style.border = 'none';
      document.body.appendChild(frame);

      const frameDoc = frame.contentWindow?.document || frame.contentDocument;
      if (!frameDoc) throw new Error('Could not access print frame context');

      frameDoc.open();
      frameDoc.write(fullHtml);
      frameDoc.close();

      setTimeout(() => {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
        setIsPrinting(false);
      }, 250);
    } catch (err: any) {
      console.error('Print generation failed:', err);
      toast.error('Print error: ' + (err.message || 'Unknown error'));
      setIsPrinting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/operations/inventory"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Barcode Generator & Printing System
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <Printer className="h-3.5 w-3.5" /> High-Precision Print Engine
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Print physical barcode stickers from canonical SKU data for A4
              adhesive sheets and thermal barcode rolls.
            </p>
          </div>
        </div>

        {/* Primary Action Button */}
        <button
          onClick={handlePrint}
          disabled={!selectedProduct || !selectedProduct.barcode || isPrinting}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPrinting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Preparing Output...
            </>
          ) : (
            <>
              <Printer className="h-4 w-4" />
              Print Barcodes ({copies} {copies === 1 ? 'Copy' : 'Copies'})
            </>
          )}
        </button>
      </div>

      {/* Main Grid: Left Controls (Form) vs Right Live Physical Preview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ==================================================================== */}
        {/* LEFT COLUMN: Controls & Configurations (5 Cols) */}
        {/* ==================================================================== */}
        <div className="space-y-6 lg:col-span-5">
          {/* STEP 1: Product / SKU Selector Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#151520]">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  1
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Select Product / SKU
                </h3>
              </div>
              {selectedProduct && (
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  Change
                </button>
              )}
            </div>

            {/* Selector Mode Tabs */}
            {!selectedProduct && (
              <div className="mb-3 flex rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-white/10 dark:bg-black/40">
                <button
                  type="button"
                  onClick={() => setActiveSelectorTab('search')}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition ${
                    activeSelectorTab === 'search'
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-[#1f1f2e] dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <Search className="h-3.5 w-3.5" />
                  Search Catalogue
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSelectorTab('direct_sku')}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition ${
                    activeSelectorTab === 'direct_sku'
                      ? 'bg-white text-emerald-600 shadow-sm dark:bg-[#1f1f2e] dark:text-emerald-400'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <Zap className="h-3.5 w-3.5" />
                  Enter SKU & Generate
                </button>
              </div>
            )}

            {/* Direct SKU Input & Instant Generate Form */}
            {!selectedProduct && activeSelectorTab === 'direct_sku' && (
              <div className="space-y-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 dark:border-emerald-500/20 dark:bg-emerald-950/20">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                    Product SKU
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. RNG-000725, CHN-000621..."
                    value={directSkuInput}
                    onChange={(e) =>
                      setDirectSkuInput(e.target.value.toUpperCase())
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-mono text-sm uppercase text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none dark:border-white/10 dark:bg-black/30 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                    Custom Barcode{' '}
                    <span className="text-[10px] text-slate-400">
                      (Optional — defaults to RHV-[SKU])
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder={`e.g. RHV-${directSkuInput.trim() || 'SKU'}`}
                    value={customBarcodeInput}
                    onChange={(e) =>
                      setCustomBarcodeInput(e.target.value.toUpperCase())
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 font-mono text-xs uppercase text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none dark:border-white/10 dark:bg-black/30 dark:text-white"
                  />
                </div>

                <button
                  type="button"
                  disabled={!directSkuInput.trim() || isLinkingBarcode}
                  onClick={() =>
                    handleGenerateAndLinkBarcode(
                      directSkuInput,
                      customBarcodeInput
                    )
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLinkingBarcode ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Syncing Barcode to SKU...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Generate & Sync Barcode
                    </>
                  )}
                </button>

                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  ⚡ Generates a Code 128 barcode, links it to this product in
                  the catalog, and prepares label stickers for printing.
                </p>
              </div>
            )}

            {/* Product Search & Dropdown (Search Catalogue Tab) */}
            {!selectedProduct && activeSelectorTab === 'search' && (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by SKU, Barcode, or Product Name..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none dark:border-white/10 dark:bg-black/20 dark:text-white"
                  />
                </div>

                <div className="max-h-48 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/50 dark:divide-white/5 dark:border-white/5 dark:bg-black/10">
                  {loadingProducts ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Loading products catalogue...
                    </div>
                  ) : searchedProducts.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No matching products found.
                    </div>
                  ) : (
                    searchedProducts.map((p) => (
                      <div
                        key={p.id}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs transition hover:bg-slate-100 dark:hover:bg-white/5"
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedProduct(p)}
                          className="flex-1 text-left"
                        >
                          <div className="font-bold text-slate-900 dark:text-white">
                            {p.sku}
                          </div>
                          <div className="max-w-[180px] truncate text-slate-500 dark:text-slate-400">
                            {p.name}
                          </div>
                        </button>
                        <div className="flex items-center gap-2">
                          {p.barcode ? (
                            <button
                              type="button"
                              onClick={() => setSelectedProduct(p)}
                              className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 font-mono text-[10px] text-emerald-600 transition hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                            >
                              <QrCode className="h-3 w-3" /> {p.barcode}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isLinkingBarcode}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGenerateAndLinkBarcode(p.sku);
                              }}
                              className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
                              title="Generate standard barcode and link to this SKU"
                            >
                              <Zap className="h-3 w-3" /> Link Barcode
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Showing {searchedProducts.length} products</span>
                  <button
                    type="button"
                    disabled={isBatchGenerating}
                    onClick={handleBatchGenerate}
                    className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:underline disabled:opacity-50 dark:text-emerald-400"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Auto-link all missing barcodes
                  </button>
                </div>
              </div>
            )}

            {/* Selected Product Details Banner */}
            {selectedProduct && (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/20">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {selectedProduct.name}
                    </h4>
                    <p className="mt-0.5 font-mono text-xs text-slate-600 dark:text-slate-300">
                      SKU:{' '}
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {selectedProduct.sku}
                      </span>
                    </p>
                  </div>
                  {selectedProduct.price && (
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{selectedProduct.price.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                {/* Existing Barcode Display */}
                {selectedProduct.barcode ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <div>
                          <span className="text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-300">
                            Barcode Linked & Active
                          </span>
                          <div className="font-mono text-xs font-bold text-emerald-900 dark:text-emerald-100">
                            {selectedProduct.barcode}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingBarcode(!isEditingBarcode);
                          setCustomBarcodeInput(selectedProduct.barcode);
                        }}
                        className="text-[11px] font-semibold text-emerald-700 underline hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-white"
                      >
                        {isEditingBarcode ? 'Cancel' : 'Change'}
                      </button>
                    </div>

                    {/* Edit/Change Barcode Drawer */}
                    {isEditingBarcode && (
                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="Enter new barcode..."
                          value={customBarcodeInput}
                          onChange={(e) =>
                            setCustomBarcodeInput(e.target.value.toUpperCase())
                          }
                          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs uppercase text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-white/10 dark:bg-black/30 dark:text-white"
                        />
                        <button
                          type="button"
                          disabled={
                            !customBarcodeInput.trim() || isLinkingBarcode
                          }
                          onClick={() =>
                            handleGenerateAndLinkBarcode(
                              selectedProduct.sku,
                              customBarcodeInput
                            )
                          }
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
                        >
                          {isLinkingBarcode ? 'Updating...' : 'Update'}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* NO BARCODE: Instant Generate & Link Card */
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 dark:border-amber-500/20 dark:bg-amber-950/20">
                    <div className="flex items-start gap-2">
                      <Zap className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                          No Barcode Assigned to this SKU
                        </p>
                        <p className="mt-0.5 text-[11px] text-amber-800 dark:text-amber-300">
                          Click below to automatically generate and link an
                          official Code 128 barcode to{' '}
                          <span className="font-mono font-bold">
                            {selectedProduct.sku}
                          </span>
                          :
                        </p>

                        <div className="mt-3 flex gap-2">
                          <input
                            type="text"
                            value={
                              customBarcodeInput ||
                              (selectedProduct.sku.startsWith('RHV-')
                                ? selectedProduct.sku
                                : `RHV-${selectedProduct.sku.toUpperCase()}`)
                            }
                            onChange={(e) =>
                              setCustomBarcodeInput(
                                e.target.value.toUpperCase()
                              )
                            }
                            className="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 font-mono text-xs font-bold uppercase text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-amber-600/40 dark:bg-black/40 dark:text-white"
                          />
                          <button
                            type="button"
                            disabled={isLinkingBarcode}
                            onClick={() =>
                              handleGenerateAndLinkBarcode(
                                selectedProduct.sku,
                                customBarcodeInput ||
                                  (selectedProduct.sku.startsWith('RHV-')
                                    ? selectedProduct.sku
                                    : `RHV-${selectedProduct.sku.toUpperCase()}`)
                              )
                            }
                            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isLinkingBarcode ? (
                              <>
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                Syncing...
                              </>
                            ) : (
                              <>
                                <Zap className="h-3.5 w-3.5" />
                                Generate & Sync
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STEP 2: Printing Mode (A4 vs Thermal Roll) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#151520]">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                2
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Printing Mode & Media
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPrintMode('a4')}
                className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition ${
                  printMode === 'a4'
                    ? 'border-emerald-500 bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-400'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5'
                }`}
              >
                <FileText className="mb-1 h-5 w-5" />
                <span className="text-xs font-semibold">A4 Sticker Sheet</span>
                <span className="mt-0.5 text-[10px] text-slate-400">
                  Multiple labels per sheet
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPrintMode('thermal')}
                className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition ${
                  printMode === 'thermal'
                    ? 'border-emerald-500 bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-400'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5'
                }`}
              >
                <Printer className="mb-1 h-5 w-5" />
                <span className="text-xs font-semibold">
                  Thermal / Roll Printer
                </span>
                <span className="mt-0.5 text-[10px] text-slate-400">
                  Continuous label roll
                </span>
              </button>
            </div>
          </div>

          {/* STEP 3: Layout & Physical Dimensions Configuration */}
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#151520]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  3
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {printMode === 'a4'
                    ? 'A4 Layout & Dimensions'
                    : 'Thermal Roll Dimensions'}
                </h3>
              </div>
              <span className="font-mono text-[11px] text-slate-400">
                All in Millimeters (mm)
              </span>
            </div>

            {/* A4 Presets & Fields */}
            {printMode === 'a4' ? (
              <div className="space-y-3.5">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Standard Layout Preset
                  </label>
                  <select
                    value={selectedA4PresetId}
                    onChange={(e) => applyA4Preset(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-white/10 dark:bg-black/20 dark:text-white"
                  >
                    {A4_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                    <option value="custom">
                      -- Custom Dimensions & Grid --
                    </option>
                  </select>
                </div>

                {/* Grid Rows / Columns */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">
                      Columns
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={a4Cols}
                      onChange={(e) => {
                        setSelectedA4PresetId('custom');
                        setA4Cols(
                          Math.max(1, parseInt(e.target.value, 10) || 1)
                        );
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 dark:border-white/10 dark:bg-black/20 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">
                      Rows
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={16}
                      value={a4Rows}
                      onChange={(e) => {
                        setSelectedA4PresetId('custom');
                        setA4Rows(
                          Math.max(1, parseInt(e.target.value, 10) || 1)
                        );
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 dark:border-white/10 dark:bg-black/20 dark:text-white"
                    />
                  </div>
                </div>

                {/* Sticker Width / Height */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">
                      Sticker Width (mm)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={a4Width}
                      onChange={(e) => {
                        setSelectedA4PresetId('custom');
                        setA4Width(parseFloat(e.target.value) || 0);
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 dark:border-white/10 dark:bg-black/20 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">
                      Sticker Height (mm)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={a4Height}
                      onChange={(e) => {
                        setSelectedA4PresetId('custom');
                        setA4Height(parseFloat(e.target.value) || 0);
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 dark:border-white/10 dark:bg-black/20 dark:text-white"
                    />
                  </div>
                </div>

                {/* Gaps */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">
                      Horizontal Gap (mm)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={a4HGap}
                      onChange={(e) => {
                        setSelectedA4PresetId('custom');
                        setA4HGap(parseFloat(e.target.value) || 0);
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 dark:border-white/10 dark:bg-black/20 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">
                      Vertical Gap (mm)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={a4VGap}
                      onChange={(e) => {
                        setSelectedA4PresetId('custom');
                        setA4VGap(parseFloat(e.target.value) || 0);
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 dark:border-white/10 dark:bg-black/20 dark:text-white"
                    />
                  </div>
                </div>

                {/* Margins */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">
                      Margins Left/Right (mm)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={a4MarginLeft}
                      onChange={(e) => {
                        setSelectedA4PresetId('custom');
                        const val = parseFloat(e.target.value) || 0;
                        setA4MarginLeft(val);
                        setA4MarginRight(val);
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 dark:border-white/10 dark:bg-black/20 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">
                      Margins Top/Bottom (mm)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={a4MarginTop}
                      onChange={(e) => {
                        setSelectedA4PresetId('custom');
                        const val = parseFloat(e.target.value) || 0;
                        setA4MarginTop(val);
                        setA4MarginBottom(val);
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 dark:border-white/10 dark:bg-black/20 dark:text-white"
                    />
                  </div>
                </div>

                {/* A4 Sheet Fit Validation Banner */}
                {!a4Validation.isValid && (
                  <div className="space-y-1 rounded-lg border border-rose-500/30 bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/20 dark:text-rose-300">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                      Dimensions exceed A4 paper limits!
                    </div>
                    {a4Validation.widthOverflowAmount > 0 && (
                      <p>
                        • Required width:{' '}
                        <strong>{a4Validation.totalWidth.toFixed(1)}mm</strong>{' '}
                        (exceeds 210mm by +
                        {a4Validation.widthOverflowAmount.toFixed(1)}mm)
                      </p>
                    )}
                    {a4Validation.heightOverflowAmount > 0 && (
                      <p>
                        • Required height:{' '}
                        <strong>{a4Validation.totalHeight.toFixed(1)}mm</strong>{' '}
                        (exceeds 297mm by +
                        {a4Validation.heightOverflowAmount.toFixed(1)}mm)
                      </p>
                    )}
                    <p className="pt-1 opacity-80">
                      Please reduce columns, rows, sticker sizes, or margins to
                      fit within A4 boundaries.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Thermal Roll Presets & Fields */
              <div className="space-y-3.5">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Common Thermal Label Preset
                  </label>
                  <select
                    value={selectedThermalPresetId}
                    onChange={(e) => applyThermalPreset(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-white/10 dark:bg-black/20 dark:text-white"
                  >
                    {THERMAL_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                    <option value="custom">
                      -- Custom Thermal Dimensions --
                    </option>
                  </select>
                </div>

                {/* Roll Width Presets */}
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">
                    Roll Width
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { key: '1', label: '1" (25.4mm)', mm: 25.4 },
                      { key: '2', label: '2" (50.8mm)', mm: 50.8 },
                      { key: '3', label: '3" (76.2mm)', mm: 76.2 },
                      { key: 'custom', label: 'Custom', mm: thermalRollWidth },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                          setRollWidthPreset(opt.key as any);
                          if (opt.key !== 'custom') setThermalRollWidth(opt.mm);
                        }}
                        className={`rounded-lg border py-1.5 text-xs font-semibold transition ${
                          rollWidthPreset === opt.key
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'border-slate-200 text-slate-600 dark:border-white/10 dark:text-slate-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {rollWidthPreset === 'custom' && (
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">
                      Custom Roll Width (mm)
                    </label>
                    <input
                      type="number"
                      value={thermalRollWidth}
                      onChange={(e) =>
                        setThermalRollWidth(parseFloat(e.target.value) || 0)
                      }
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 dark:border-white/10 dark:bg-black/20 dark:text-white"
                    />
                  </div>
                )}

                {/* Label Width & Height */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">
                      Label Width (mm)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={thermalLabelWidth}
                      onChange={(e) => {
                        setSelectedThermalPresetId('custom');
                        setThermalLabelWidth(parseFloat(e.target.value) || 0);
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 dark:border-white/10 dark:bg-black/20 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">
                      Label Height (mm)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={thermalLabelHeight}
                      onChange={(e) => {
                        setSelectedThermalPresetId('custom');
                        setThermalLabelHeight(parseFloat(e.target.value) || 0);
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 dark:border-white/10 dark:bg-black/20 dark:text-white"
                    />
                  </div>
                </div>

                {/* Thermal Validation */}
                {!thermalValidation.isValid && (
                  <div className="rounded-lg border border-rose-500/30 bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-950/20 dark:text-rose-300">
                    <p className="flex items-center gap-1 font-bold">
                      <AlertTriangle className="h-3.5 w-3.5" /> Label exceeds
                      roll width
                    </p>
                    <p className="mt-0.5">
                      Label width ({thermalLabelWidth}mm) is wider than the
                      selected roll width ({thermalRollWidth}mm).
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STEP 4: Label Content & Copies */}
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#151520]">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                4
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Label Content & Quantity
              </h3>
            </div>

            {/* Copies Input */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                Number of Copies to Print
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={5000}
                  value={copies}
                  onChange={(e) =>
                    setCopies(Math.max(1, parseInt(e.target.value, 10) || 1))
                  }
                  className="w-32 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-bold text-slate-900 dark:border-white/10 dark:bg-black/20 dark:text-white"
                />
                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5">
                  {[1, 10, 24, 48, 50, 100].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setCopies(num)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                        copies === num
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Checkbox Options */}
            <div className="space-y-2 border-t border-slate-100 pt-2 dark:border-white/5">
              <span className="block text-[11px] font-semibold uppercase text-slate-500">
                Content On Each Label
              </span>
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={showSku}
                  onChange={(e) => setShowSku(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                Include SKU Text (Mandatory for retail identification)
              </label>

              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={showName}
                  onChange={(e) => setShowName(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                Include Product Title / Name
              </label>

              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={showPrice}
                  onChange={(e) => setShowPrice(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                Include Selling Price / MRP
              </label>

              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={showBarcodeText}
                  onChange={(e) => setShowBarcodeText(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                Display Numeric/Raw Barcode Value under bars
              </label>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* RIGHT COLUMN: Realistic Live Physical Preview (7 Cols) */}
        {/* ==================================================================== */}
        <div className="space-y-4 lg:col-span-7">
          {/* Preview Header & Pagination Nav */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#151520]">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Physical Print Preview
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {printMode === 'a4'
                    ? `A4 Sheet (${a4Cols} cols × ${a4Rows} rows = ${labelsPerPage} labels/page)`
                    : `Thermal Roll (${thermalLabelWidth}mm × ${thermalLabelHeight}mm per label)`}
                </p>
              </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                  disabled={previewPage <= 1}
                  className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Page {previewPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPreviewPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={previewPage >= totalPages}
                  className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Metric Bar */}
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#151520]">
              <span className="block text-[10px] font-bold uppercase text-slate-400">
                Total Labels
              </span>
              <span className="text-base font-bold text-slate-900 dark:text-white">
                {safeCopies}
              </span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#151520]">
              <span className="block text-[10px] font-bold uppercase text-slate-400">
                Total Pages
              </span>
              <span className="text-base font-bold text-slate-900 dark:text-white">
                {totalPages}
              </span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#151520]">
              <span className="block text-[10px] font-bold uppercase text-slate-400">
                Label Size
              </span>
              <span className="text-base font-bold text-slate-900 dark:text-white">
                {printMode === 'a4'
                  ? `${a4Width}×${a4Height}`
                  : `${thermalLabelWidth}×${thermalLabelHeight}`}{' '}
                mm
              </span>
            </div>
          </div>

          {/* Realistic Canvas Box */}
          <div className="flex min-h-[520px] items-start justify-center overflow-auto rounded-2xl border border-slate-200 bg-slate-200/50 p-6 dark:border-white/10 dark:bg-black/40">
            {printMode === 'a4' ? (
              /* A4 Sheet Canvas Container (Aspect ratio 210 / 297 = 0.707) */
              <div
                className="relative bg-white shadow-2xl transition-all"
                style={{
                  width: '100%',
                  maxWidth: '480px',
                  aspectRatio: '210 / 297',
                  border: '1px solid #d4d4d8',
                  padding: `${(a4MarginTop / 297) * 100}% ${(a4MarginRight / 210) * 100}% ${(a4MarginBottom / 297) * 100}% ${(a4MarginLeft / 210) * 100}%`,
                }}
              >
                {/* CSS Grid for A4 Stickers */}
                <div
                  className="h-full w-full"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${a4Cols}, 1fr)`,
                    gridTemplateRows: `repeat(${a4Rows}, 1fr)`,
                    columnGap: `${(a4HGap / 210) * 100}%`,
                    rowGap: `${(a4VGap / 297) * 100}%`,
                  }}
                >
                  {previewPageItems.map((slot) => (
                    <div
                      key={slot.index}
                      className={`flex flex-col items-center justify-center overflow-hidden rounded border border-dashed p-1 text-center transition ${
                        slot.isReal
                          ? 'border-slate-300 bg-white text-slate-900'
                          : 'border-slate-200 bg-slate-50/50 text-slate-300'
                      }`}
                    >
                      {slot.isReal &&
                      selectedProduct &&
                      selectedProduct.barcode ? (
                        <div className="flex h-full w-full flex-col items-center justify-center overflow-hidden">
                          {showName && selectedProduct.name && (
                            <p className="max-w-full truncate text-[7px] font-bold leading-tight text-slate-800">
                              {selectedProduct.name}
                            </p>
                          )}
                          <div className="flex w-full justify-center py-0.5">
                            <BarcodeSvg
                              value={selectedProduct.barcode}
                              width={a4Width < 50 ? 1 : 1.4}
                              height={a4Height < 25 ? 18 : 28}
                              displayValue={showBarcodeText}
                              fontSize={8}
                              margin={1}
                            />
                          </div>
                          {showSku && (
                            <p className="font-mono text-[8px] font-bold leading-none tracking-wide text-black">
                              {selectedProduct.sku}
                            </p>
                          )}
                          {showPrice &&
                            (selectedProduct.price || selectedProduct.mrp) && (
                              <p className="text-[7px] font-bold leading-tight text-slate-800">
                                ₹
                                {(
                                  selectedProduct.price || selectedProduct.mrp
                                ).toLocaleString('en-IN')}
                              </p>
                            )}
                        </div>
                      ) : (
                        <span className="font-mono text-[8px] text-slate-300">
                          Slot {slot.index + 1}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Thermal Roll Canvas Container */
              <div className="flex w-full flex-col items-center gap-4">
                <div
                  className="relative flex flex-col items-center justify-center rounded border border-slate-300 bg-white p-3 text-center shadow-2xl"
                  style={{
                    width: `${Math.min(360, thermalLabelWidth * 5)}px`,
                    minHeight: `${thermalLabelHeight * 5}px`,
                  }}
                >
                  {selectedProduct && selectedProduct.barcode ? (
                    <div className="flex w-full flex-col items-center justify-center space-y-1">
                      {showName && selectedProduct.name && (
                        <p className="max-w-full truncate text-xs font-bold text-slate-900">
                          {selectedProduct.name}
                        </p>
                      )}
                      <div className="py-1">
                        <BarcodeSvg
                          value={selectedProduct.barcode}
                          width={1.6}
                          height={36}
                          displayValue={showBarcodeText}
                          fontSize={10}
                          margin={2}
                        />
                      </div>
                      {showSku && (
                        <p className="font-mono text-xs font-bold tracking-wider text-black">
                          {selectedProduct.sku}
                        </p>
                      )}
                      {showPrice &&
                        (selectedProduct.price || selectedProduct.mrp) && (
                          <p className="text-xs font-bold text-emerald-700">
                            MRP: ₹
                            {(
                              selectedProduct.price || selectedProduct.mrp
                            ).toLocaleString('en-IN')}
                          </p>
                        )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Select a product to preview
                    </p>
                  )}
                </div>
                <div className="font-mono text-[11px] text-slate-500">
                  Label {previewPage} of {copies} on {thermalRollWidth}mm roll
                </div>
              </div>
            )}
          </div>

          {/* Accuracy Instructions Callout */}
          <div className="rounded-xl border border-blue-500/20 bg-blue-50/50 p-4 text-xs text-blue-900 dark:bg-blue-950/20 dark:text-blue-200">
            <div className="flex items-start gap-2.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <div className="space-y-1">
                <p className="font-bold">
                  Millimeter Print Accuracy Instructions:
                </p>
                <p className="leading-relaxed opacity-90">
                  In your browser print dialog:
                  <br />
                  1. Set <strong>Destination</strong> to your physical printer
                  (or Save as PDF).
                  <br />
                  2. Set <strong>Scale</strong> to <strong>100%</strong> or{' '}
                  <strong>"Actual Size"</strong> (do not choose "Fit to
                  Printable Area").
                  <br />
                  3. Set <strong>Margins</strong> to <strong>"None"</strong> to
                  prevent unexpected paper offset.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
