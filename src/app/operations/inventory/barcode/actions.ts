'use server';

import { requireAdminClient } from '@/lib/auth/require-admin-client';
import { revalidatePath } from 'next/cache';

export interface LinkBarcodeParams {
  sku: string;
  barcode?: string;
}

export interface LinkBarcodeResult {
  success: boolean;
  error?: string;
  barcode?: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    barcode: string;
    price: number;
    mrp?: number;
    stock_quantity: number;
    weight_grams?: number;
    collection?: string;
  };
}

/**
 * Generates an ultra-compact 6-digit numeric barcode (e.g. 260725).
 * Code 128 subset C automatically pairs digits, creating a very short/narrow barcode
 * that fits perfectly on miniature jewellery tags and labels.
 */
export function generateCompactNumericBarcode(sku: string): string {
  const digits = sku.replace(/\D/g, '');
  let numPart = '';
  if (digits.length >= 4) {
    numPart = digits.slice(-4);
  } else if (digits.length > 0) {
    numPart = digits.padStart(4, '0');
  } else {
    let hash = 0;
    for (let i = 0; i < sku.length; i++) {
      hash = (hash * 31 + sku.charCodeAt(i)) % 10000;
    }
    numPart = Math.abs(hash).toString().padStart(4, '0');
  }
  return `26${numPart}`;
}

/**
 * Automatically generates or assigns a barcode to a product by SKU,
 * saving the mapping directly into canonical products in Supabase.
 */
export async function linkBarcodeToProductSku({
  sku,
  barcode,
}: LinkBarcodeParams): Promise<LinkBarcodeResult> {
  try {
    const { supabase } = await requireAdminClient();

    const cleanSku = (sku || '').trim();
    if (!cleanSku) {
      return { success: false, error: 'Please enter a valid product SKU.' };
    }

    // 1. Fetch canonical product by SKU (case-insensitive)
    const { data: product, error: fetchErr } = await supabase
      .from('products')
      .select(
        'id, name, sku, barcode, price, mrp, stock_quantity, weight_grams, collection'
      )
      .ilike('sku', cleanSku)
      .maybeSingle();

    if (fetchErr) {
      console.error('Error querying product by SKU:', fetchErr);
      return { success: false, error: fetchErr.message };
    }

    if (!product) {
      return {
        success: false,
        error: `No product found matching SKU "${cleanSku}". Please check the SKU in your catalog.`,
      };
    }

    // 2. Generate or sanitize barcode (Default: 6-digit compact numeric)
    let targetBarcode = (barcode || '').trim().toUpperCase();
    if (!targetBarcode) {
      targetBarcode = generateCompactNumericBarcode(cleanSku);
    }

    // 3. Ensure uniqueness of barcode across catalog
    let { data: existingProductWithBarcode } = await supabase
      .from('products')
      .select('id, sku, name')
      .eq('barcode', targetBarcode)
      .maybeSingle();

    // If auto-generated barcode has collision, increment until unique
    if (
      !barcode &&
      existingProductWithBarcode &&
      existingProductWithBarcode.id !== product.id
    ) {
      const baseNum = parseInt(targetBarcode, 10) || 260000;
      for (let attempt = 1; attempt <= 100; attempt++) {
        const candidate = (baseNum + attempt).toString();
        const { data: col } = await supabase
          .from('products')
          .select('id')
          .eq('barcode', candidate)
          .maybeSingle();
        if (!col) {
          targetBarcode = candidate;
          existingProductWithBarcode = null;
          break;
        }
      }
    }

    if (
      existingProductWithBarcode &&
      existingProductWithBarcode.id !== product.id
    ) {
      return {
        success: false,
        error: `Barcode "${targetBarcode}" is already assigned to another product (${existingProductWithBarcode.sku} — "${existingProductWithBarcode.name}"). Please specify a unique barcode.`,
      };
    }

    // 4. Update the product record in database
    const { error: updateErr } = await supabase
      .from('products')
      .update({
        barcode: targetBarcode,
        updated_at: new Date().toISOString(),
      })
      .eq('id', product.id);

    if (updateErr) {
      console.error('Error updating product barcode:', updateErr);
      return { success: false, error: updateErr.message };
    }

    revalidatePath('/operations/inventory/barcode');
    revalidatePath('/operations/products');

    return {
      success: true,
      barcode: targetBarcode,
      product: {
        ...product,
        barcode: targetBarcode,
      },
    };
  } catch (err: any) {
    console.error('linkBarcodeToProductSku unexpected error:', err);
    return {
      success: false,
      error: err?.message || 'Failed to generate and link barcode to SKU.',
    };
  }
}

/**
 * Batch generate default compact 6-digit barcodes for all products that currently lack one.
 */
export async function batchGenerateMissingBarcodes(): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  try {
    const { supabase } = await requireAdminClient();

    // 1. Fetch all products without barcodes
    const { data: unassignedProducts, error: fetchErr } = await supabase
      .from('products')
      .select('id, sku')
      .is('barcode', null);

    if (fetchErr) throw fetchErr;
    if (!unassignedProducts || unassignedProducts.length === 0) {
      return { success: true, count: 0 };
    }

    let updatedCount = 0;
    for (const item of unassignedProducts) {
      if (!item.sku) continue;
      let genBarcode = generateCompactNumericBarcode(item.sku);

      // Check collision
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('barcode', genBarcode)
        .maybeSingle();

      if (existing && existing.id !== item.id) {
        const baseNum = parseInt(genBarcode, 10) || 260000;
        for (let att = 1; att <= 100; att++) {
          const candidate = (baseNum + att).toString();
          const { data: col } = await supabase
            .from('products')
            .select('id')
            .eq('barcode', candidate)
            .maybeSingle();
          if (!col) {
            genBarcode = candidate;
            break;
          }
        }
      }

      const { error: updErr } = await supabase
        .from('products')
        .update({
          barcode: genBarcode,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      if (!updErr) updatedCount++;
    }

    revalidatePath('/operations/inventory/barcode');
    revalidatePath('/operations/products');

    return { success: true, count: updatedCount };
  } catch (err: any) {
    console.error('batchGenerateMissingBarcodes error:', err);
    return {
      success: false,
      count: 0,
      error: err?.message || 'Batch generation failed.',
    };
  }
}
