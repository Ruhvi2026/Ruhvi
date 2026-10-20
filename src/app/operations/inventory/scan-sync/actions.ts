'use server';

import { requireAdminClient } from '@/lib/auth/require-admin-client';
import { revalidatePath } from 'next/cache';
import {
  InventoryStagingItem,
  StagedSyncResponse,
  StagedSyncResultItem,
} from '@/types/database';

/**
 * Fetch all staged inventory records for the authenticated staff user.
 */
export async function getStagedScans(statusFilter?: string) {
  try {
    const { supabase, userId, role } = await requireAdminClient();

    let query = supabase
      .from('inventory_staging')
      .select('*')
      .order('created_at', { ascending: false });

    // Super admin can view all, otherwise isolate by authenticated user
    if (role !== 'super_admin' && role !== 'SUPER_ADMIN') {
      query = query.eq('owner_id', userId);
    }

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching staged scans:', error);
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: (data || []) as InventoryStagingItem[] };
  } catch (err: any) {
    return { success: false, error: err.message, data: [] };
  }
}

/**
 * Delete a single staged scan item before it is synced to canonical catalog.
 */
export async function deleteStagedScan(stagingId: string) {
  try {
    const { supabase, userId, role } = await requireAdminClient();

    let query = supabase.from('inventory_staging').delete().eq('id', stagingId);

    // Enforce ownership unless super admin
    if (role !== 'super_admin' && role !== 'SUPER_ADMIN') {
      query = query.eq('owner_id', userId);
    }

    const { error } = await query;
    if (error) throw error;

    revalidatePath('/operations/inventory/scan-sync');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Update editable fields of a staged scan before sync.
 */
export async function updateStagedScan(
  stagingId: string,
  updates: {
    sku?: string;
    barcode?: string;
    weight_grams?: number;
    cost_price?: number;
    stock_quantity?: number;
    product_name?: string;
    price?: number;
    mrp?: number;
    collection?: string;
    notes?: string;
  }
) {
  try {
    const { supabase, userId, role } = await requireAdminClient();

    let query = supabase
      .from('inventory_staging')
      .update({
        ...updates,
        status: 'staged', // Reset status to staged if it previously failed
        sync_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', stagingId);

    if (role !== 'super_admin' && role !== 'SUPER_ADMIN') {
      query = query.eq('owner_id', userId);
    }

    const { error } = await query;
    if (error) throw error;

    revalidatePath('/operations/inventory/scan-sync');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Authoritative Server Action: Sync Staged Scans to Canonical Products & Inventory.
 * This runs ONLY when staff clicks "Sync Now" on the Operations Web Portal.
 */
export async function syncStagedInventory(
  selectedIds?: string[]
): Promise<StagedSyncResponse> {
  try {
    const { supabase, userId, role } = await requireAdminClient();

    // 1. Fetch eligible records
    let query = supabase
      .from('inventory_staging')
      .select('*')
      .in('status', ['staged', 'failed']);

    if (role !== 'super_admin' && role !== 'SUPER_ADMIN') {
      query = query.eq('owner_id', userId);
    }

    if (selectedIds && selectedIds.length > 0) {
      query = query.in('id', selectedIds);
    }

    const { data: records, error: fetchError } = await query;
    if (fetchError) {
      throw new Error(`Failed to fetch staged records: ${fetchError.message}`);
    }

    if (!records || records.length === 0) {
      return {
        success: true,
        total_processed: 0,
        synced_count: 0,
        failed_count: 0,
        results: [],
      };
    }

    const results: StagedSyncResultItem[] = [];
    let syncedCount = 0;
    let failedCount = 0;

    // 2. Mark records as syncing
    const recordIds = records.map((r: any) => r.id);
    await supabase
      .from('inventory_staging')
      .update({ status: 'syncing', updated_at: new Date().toISOString() })
      .in('id', recordIds);

    // 3. Process each staged item
    for (const record of records) {
      try {
        const cleanSku = String(record.sku || '')
          .trim()
          .toUpperCase();
        const cleanBarcode = String(record.barcode || '').trim();
        const weightGrams = Number(record.weight_grams);
        const costPrice = Number(record.cost_price);
        const stockQty = parseInt(String(record.stock_quantity), 10);

        // Validation
        if (!cleanSku) throw new Error('Missing SKU');
        if (!cleanBarcode) throw new Error('Missing Barcode');
        if (isNaN(weightGrams) || weightGrams <= 0)
          throw new Error('Weight must be greater than 0g');
        if (isNaN(costPrice) || costPrice < 0)
          throw new Error('Purchase price must be >= 0');
        if (isNaN(stockQty) || stockQty < 1)
          throw new Error('Stock quantity must be at least 1');

        // Check if product already exists by barcode or SKU
        let existingProduct: any = null;

        // Try barcode first
        const { data: byBarcode } = await supabase
          .from('products')
          .select('id, sku, barcode, stock_quantity, cost_price, weight_grams')
          .eq('barcode', cleanBarcode)
          .maybeSingle();

        if (byBarcode) {
          existingProduct = byBarcode;
        } else {
          // Try SKU match
          const { data: bySku } = await supabase
            .from('products')
            .select(
              'id, sku, barcode, stock_quantity, cost_price, weight_grams'
            )
            .eq('sku', cleanSku)
            .maybeSingle();

          if (bySku) existingProduct = bySku;
        }

        if (existingProduct) {
          // --- EXISTING PRODUCT FLOW ---
          const productId = existingProduct.id;

          // If barcode was not previously mapped to this product, register it now
          if (!existingProduct.barcode) {
            await supabase
              .from('products')
              .update({ barcode: cleanBarcode })
              .eq('id', productId);
          }

          // Atomically adjust stock using Postgres RPC
          const { data: newStock, error: rpcError } = await supabase.rpc(
            'adjust_product_stock',
            {
              p_product_id: productId,
              p_user_id: userId,
              p_adjustment: stockQty,
              p_reason: 'restock',
              p_notes: `Mobile Scan Sync: Barcode ${cleanBarcode}, SKU ${cleanSku}`,
            }
          );

          if (rpcError) {
            throw new Error(`Stock adjustment RPC failed: ${rpcError.message}`);
          }

          // Update cost_price or weight_grams if not present
          const updates: Record<string, any> = {};
          if (
            (!existingProduct.cost_price || existingProduct.cost_price === 0) &&
            costPrice > 0
          ) {
            updates.cost_price = costPrice;
          }
          if (!existingProduct.weight_grams && weightGrams > 0) {
            updates.weight_grams = weightGrams;
          }
          if (Object.keys(updates).length > 0) {
            await supabase.from('products').update(updates).eq('id', productId);
          }

          // Mark staging record as synced
          await supabase
            .from('inventory_staging')
            .update({
              status: 'synced',
              synced_product_id: productId,
              synced_at: new Date().toISOString(),
              sync_error: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', record.id);

          syncedCount++;
          results.push({
            client_scan_id: record.client_scan_id,
            staging_id: record.id,
            sku: cleanSku,
            barcode: cleanBarcode,
            status: 'synced',
            action_taken: 'stock_incremented',
            product_id: productId,
            new_stock: newStock,
          });
        } else {
          // --- NEW PRODUCT CREATION FLOW ---
          const productName = (record.product_name || cleanSku).trim();
          const baseSlug = (productName || cleanSku)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
          const uniqueSlug = `${baseSlug}-${Date.now().toString().slice(-6)}`;

          const sellingPrice =
            Number(record.price) > 0 ? Number(record.price) : costPrice;
          const mrp =
            Number(record.mrp) > 0 ? Number(record.mrp) : sellingPrice;

          const newProductPayload = {
            sku: cleanSku,
            barcode: cleanBarcode,
            name: productName,
            slug: uniqueSlug,
            price: sellingPrice,
            mrp: mrp,
            cost_price: costPrice,
            weight_grams: weightGrams,
            stock_quantity: stockQty,
            status: 'active',
            collection: record.collection || null,
            category_id: record.category_id || null,
          };

          const { data: newProduct, error: insertError } = await supabase
            .from('products')
            .insert([newProductPayload])
            .select('id, stock_quantity')
            .single();

          if (insertError) {
            throw new Error(`Failed to create product: ${insertError.message}`);
          }

          // Log initial stock creation audit
          await supabase.from('inventory_adjustments').insert([
            {
              product_id: newProduct.id,
              user_id: userId,
              previous_stock: 0,
              adjusted_by: stockQty,
              new_stock: stockQty,
              reason: 'restock',
              notes: `Initial stock from Mobile Scan Sync: Barcode ${cleanBarcode}`,
            },
          ]);

          // Mark staging record as synced
          await supabase
            .from('inventory_staging')
            .update({
              status: 'synced',
              synced_product_id: newProduct.id,
              synced_at: new Date().toISOString(),
              sync_error: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', record.id);

          syncedCount++;
          results.push({
            client_scan_id: record.client_scan_id,
            staging_id: record.id,
            sku: cleanSku,
            barcode: cleanBarcode,
            status: 'synced',
            action_taken: 'product_created',
            product_id: newProduct.id,
            new_stock: stockQty,
          });
        }
      } catch (itemErr: any) {
        failedCount++;
        const safeError = itemErr.message || 'Unknown sync error';

        // Mark individual record as failed
        await supabase
          .from('inventory_staging')
          .update({
            status: 'failed',
            sync_error: safeError,
            updated_at: new Date().toISOString(),
          })
          .eq('id', record.id);

        results.push({
          client_scan_id: record.client_scan_id,
          staging_id: record.id,
          sku: record.sku,
          barcode: record.barcode,
          status: 'failed',
          error: safeError,
        });
      }
    }

    revalidatePath('/operations/inventory');
    revalidatePath('/operations/inventory/scan-sync');
    revalidatePath('/operations/products');

    return {
      success: true,
      total_processed: records.length,
      synced_count: syncedCount,
      failed_count: failedCount,
      results,
    };
  } catch (err: any) {
    console.error('Fatal syncStagedInventory error:', err);
    return {
      success: false,
      total_processed: 0,
      synced_count: 0,
      failed_count: 0,
      results: [],
    };
  }
}
