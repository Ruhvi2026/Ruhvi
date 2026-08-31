'use server';

import { requireAdminClient } from '@/lib/auth/require-admin-client';
import { revalidatePath } from 'next/cache';

interface VariantInput {
  id?: string;
  sku: string;
  size: string | null;
  metal_type: string | null;
  stock_quantity: number;
  reorder_point: number;
  cost_price_override: number | null;
  selling_price_override: number | null;
}

function parseVariantInput(raw: string | null): VariantInput[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((v: any) => ({
        id: v.id || undefined,
        sku: String(v.sku || '').trim(),
        size: v.size ? String(v.size) : null,
        metal_type: v.metal_type ? String(v.metal_type) : null,
        stock_quantity: parseInt(v.stock_quantity, 10) || 0,
        reorder_point: parseInt(v.reorder_point, 10) || 5,
        cost_price_override: v.cost_price_override
          ? parseFloat(v.cost_price_override)
          : null,
        selling_price_override: v.selling_price_override
          ? parseFloat(v.selling_price_override)
          : null,
      }))
      .filter((v: VariantInput) => v.sku);
  } catch {
    return [];
  }
}

function num(formData: FormData, key: string): number | null {
  const v = formData.get(key);
  if (v === null || v === '') return null;
  const n = parseFloat(v as string);
  return Number.isNaN(n) ? null : n;
}

function int(formData: FormData, key: string, fallback = 0): number {
  const v = formData.get(key);
  if (v === null || v === '') return fallback;
  const n = parseInt(v as string, 10);
  return Number.isNaN(n) ? fallback : n;
}

function str(formData: FormData, key: string): string {
  return (formData.get(key) as string) || '';
}

function strOrNull(formData: FormData, key: string): string | null {
  const v = str(formData, key);
  return v ? v : null;
}

export async function createProduct(formData: FormData) {
  try {
    const { supabase, userId } = await requireAdminClient();

    const productPayload: Record<string, any> = {
      name: str(formData, 'name'),
      sku: str(formData, 'sku'),
      slug: str(formData, 'slug'),
      category_id: strOrNull(formData, 'category_id'),
      price: num(formData, 'price') ?? 0,
      mrp: num(formData, 'mrp') ?? 0,
      cost_price: num(formData, 'cost_price') ?? 0,
      base_selling_price: num(formData, 'base_selling_price') ?? 0,
      packaging_cost: num(formData, 'packaging_cost') ?? 0,
      stock_quantity: int(formData, 'stock_quantity', 0),
      status: str(formData, 'status') || 'draft',
      description: str(formData, 'description'),
      collection: strOrNull(formData, 'collection'),
      sku_prefix: strOrNull(formData, 'sku_prefix'),
      base_metal: strOrNull(formData, 'base_metal'),
      plating_type: strOrNull(formData, 'plating_type'),
      plating_thickness_microns: num(formData, 'plating_thickness_microns'),
      metal_weight_grams: num(formData, 'metal_weight_grams'),
      durability_claim: strOrNull(formData, 'durability_claim'),
      care_instructions: strOrNull(formData, 'care_instructions'),
      stone_type: strOrNull(formData, 'stone_type'),
      stone_weight_carats: num(formData, 'stone_weight_carats'),
      stone_count: int(formData, 'stone_count', 0) || null,
      design_pattern: strOrNull(formData, 'design_pattern'),
      finish_type: strOrNull(formData, 'finish_type'),
      color: strOrNull(formData, 'color'),
      weight_grams: num(formData, 'weight_grams'),
      length_cm: num(formData, 'length_cm'),
      width_cm: num(formData, 'width_cm'),
      height_cm: num(formData, 'height_cm'),
      meta_title: strOrNull(formData, 'meta_title'),
      meta_description: strOrNull(formData, 'meta_description'),
      image_alt_text: strOrNull(formData, 'image_alt_text'),
      warranty_info: strOrNull(formData, 'warranty_info'),
      return_window_days: int(formData, 'return_window_days', 7),
      gift_wrap_available: str(formData, 'gift_wrap_available') === 'true',
      is_new_arrival: str(formData, 'is_new_arrival') === 'true',
      is_best_seller: str(formData, 'is_best_seller') === 'true',
      gst_rate: num(formData, 'gst_rate') ?? 3,
      low_stock_threshold: int(formData, 'low_stock_threshold', 5),
    };

    // SEO keywords (text[] column)
    const seoKeywords = str(formData, 'seo_keywords')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    if (seoKeywords.length > 0) productPayload.seo_keywords = seoKeywords;

    const seo_metadata = formData.get('seo_metadata')
      ? JSON.parse(formData.get('seo_metadata') as string)
      : {};
    const ai_content = formData.get('ai_content')
      ? JSON.parse(formData.get('ai_content') as string)
      : {};
    productPayload.seo_metadata = seo_metadata;
    productPayload.ai_content = ai_content;

    const { data: product, error } = await supabase
      .from('products')
      .insert([productPayload])
      .select()
      .single();

    if (error) throw error;

    // Variants
    const variants = parseVariantInput(
      formData.get('variants') as string | null
    );
    if (variants.length > 0) {
      const rows = variants.map((v) => ({
        product_id: product.id,
        sku: v.sku,
        size: v.size,
        metal_type: v.metal_type,
        stock_quantity: v.stock_quantity,
        reorder_point: v.reorder_point,
        cost_price_override: v.cost_price_override,
        selling_price_override: v.selling_price_override,
      }));
      const { data: insertedVariants, error: variantError } = await supabase
        .from('product_variants')
        .insert(rows)
        .select();

      if (variantError) throw variantError;

      // Log initial stock-in movements for each variant
      if (insertedVariants && insertedVariants.length > 0 && userId) {
        const movements = insertedVariants
          .filter((v: any) => v.stock_quantity > 0)
          .map((v: any) => ({
            variant_id: v.id,
            movement_type: 'stock_in',
            quantity: v.stock_quantity,
            reason: 'Initial stock',
            created_by: userId,
          }));
        if (movements.length > 0) {
          await supabase.from('inventory_movements').insert(movements);
        }
      }
    }

    // Images
    const imageUrls = str(formData, 'image_urls');
    if (imageUrls) {
      const urls = imageUrls
        .split('\n')
        .map((u) => u.trim())
        .filter(Boolean);
      const imagesToInsert = urls.map((url, idx) => ({
        product_id: product.id,
        url,
        sort_order: idx,
      }));
      if (imagesToInsert.length > 0) {
        const { error: imgError } = await supabase
          .from('product_images')
          .insert(imagesToInsert);
        if (imgError) console.error('Image insert error:', imgError);
      }
    }

    revalidatePath('/operations/products');
    return { success: true, id: product.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateProduct(id: string, formData: FormData) {
  try {
    const { supabase, userId } = await requireAdminClient();

    const productPayload: Record<string, any> = {
      name: str(formData, 'name'),
      sku: str(formData, 'sku'),
      slug: str(formData, 'slug'),
      category_id: strOrNull(formData, 'category_id'),
      price: num(formData, 'price') ?? 0,
      mrp: num(formData, 'mrp') ?? 0,
      cost_price: num(formData, 'cost_price') ?? 0,
      base_selling_price: num(formData, 'base_selling_price') ?? 0,
      packaging_cost: num(formData, 'packaging_cost') ?? 0,
      stock_quantity: int(formData, 'stock_quantity', 0),
      status: str(formData, 'status') || 'draft',
      description: str(formData, 'description'),
      collection: strOrNull(formData, 'collection'),
      sku_prefix: strOrNull(formData, 'sku_prefix'),
      base_metal: strOrNull(formData, 'base_metal'),
      plating_type: strOrNull(formData, 'plating_type'),
      plating_thickness_microns: num(formData, 'plating_thickness_microns'),
      metal_weight_grams: num(formData, 'metal_weight_grams'),
      durability_claim: strOrNull(formData, 'durability_claim'),
      care_instructions: strOrNull(formData, 'care_instructions'),
      stone_type: strOrNull(formData, 'stone_type'),
      stone_weight_carats: num(formData, 'stone_weight_carats'),
      stone_count: int(formData, 'stone_count', 0) || null,
      design_pattern: strOrNull(formData, 'design_pattern'),
      finish_type: strOrNull(formData, 'finish_type'),
      color: strOrNull(formData, 'color'),
      weight_grams: num(formData, 'weight_grams'),
      length_cm: num(formData, 'length_cm'),
      width_cm: num(formData, 'width_cm'),
      height_cm: num(formData, 'height_cm'),
      meta_title: strOrNull(formData, 'meta_title'),
      meta_description: strOrNull(formData, 'meta_description'),
      image_alt_text: strOrNull(formData, 'image_alt_text'),
      warranty_info: strOrNull(formData, 'warranty_info'),
      return_window_days: int(formData, 'return_window_days', 7),
      gift_wrap_available: str(formData, 'gift_wrap_available') === 'true',
      is_new_arrival: str(formData, 'is_new_arrival') === 'true',
      is_best_seller: str(formData, 'is_best_seller') === 'true',
      gst_rate: num(formData, 'gst_rate') ?? 3,
      low_stock_threshold: int(formData, 'low_stock_threshold', 5),
    };

    const seoKeywords = str(formData, 'seo_keywords')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    if (seoKeywords.length > 0) productPayload.seo_keywords = seoKeywords;
    else productPayload.seo_keywords = [];

    const seo_metadata = formData.get('seo_metadata')
      ? JSON.parse(formData.get('seo_metadata') as string)
      : {};
    const ai_content = formData.get('ai_content')
      ? JSON.parse(formData.get('ai_content') as string)
      : {};
    productPayload.seo_metadata = seo_metadata;
    productPayload.ai_content = ai_content;
    productPayload.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('products')
      .update(productPayload)
      .eq('id', id);

    if (error) throw error;

    // Variants: replace all (delete + reinsert)
    const variants = parseVariantInput(
      formData.get('variants') as string | null
    );
    const { data: existingVariants } = await supabase
      .from('product_variants')
      .select('sku, stock_quantity')
      .eq('product_id', id);
    const prevStockBySku: Record<string, number> = {};
    (existingVariants || []).forEach((v: any) => {
      prevStockBySku[v.sku] = v.stock_quantity;
    });

    await supabase.from('product_variants').delete().eq('product_id', id);
    if (variants.length > 0) {
      const rows = variants.map((v) => ({
        product_id: id,
        sku: v.sku,
        size: v.size,
        metal_type: v.metal_type,
        stock_quantity: v.stock_quantity,
        reorder_point: v.reorder_point,
        cost_price_override: v.cost_price_override,
        selling_price_override: v.selling_price_override,
      }));
      const { data: insertedVariants, error: variantError } = await supabase
        .from('product_variants')
        .insert(rows)
        .select();

      if (variantError) throw variantError;

      // Log accurate stock delta per variant vs. previous state
      if (insertedVariants && insertedVariants.length > 0 && userId) {
        const movements = insertedVariants.flatMap((v: any) => {
          const prev = prevStockBySku[v.sku] ?? 0;
          const delta = v.stock_quantity - prev;
          if (delta === 0) return [];
          return [
            {
              variant_id: v.id,
              movement_type: delta > 0 ? 'stock_in' : 'adjustment',
              quantity: Math.abs(delta),
              reason:
                delta > 0 ? 'Variant stock increased' : 'Variant stock reduced',
              created_by: userId,
            },
          ];
        });
        if (movements.length > 0) {
          await supabase.from('inventory_movements').insert(movements);
        }
      }
    }

    // Images (replace all)
    const imageUrls = str(formData, 'image_urls');
    if (imageUrls !== null) {
      await supabase.from('product_images').delete().eq('product_id', id);
      const urls = imageUrls
        .split('\n')
        .map((u) => u.trim())
        .filter(Boolean);
      const imagesToInsert = urls.map((url, idx) => ({
        product_id: id,
        url,
        sort_order: idx,
      }));
      if (imagesToInsert.length > 0) {
        const { error: imgError } = await supabase
          .from('product_images')
          .insert(imagesToInsert);
        if (imgError) console.error('Image insert error:', imgError);
      }
    }

    revalidatePath('/operations/products');
    revalidatePath(`/operations/products/${id}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteProduct(id: string) {
  try {
    const { supabase } = await requireAdminClient();

    const { error } = await supabase.from('products').delete().eq('id', id);

    if (error) throw error;

    revalidatePath('/operations/products');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
