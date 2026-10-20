// src/lib/scanQueue.ts
// Durable offline-first local queue for inventory scanning in ruhvi-mobile
// Persists scans in AsyncStorage immediately before attempting cloud staging.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, getCurrentUserId, getCurrentToken } from './supabase';
import { LocalScanItem, LocalScanStatus, QueueSummary } from '../types/inventory';

const QUEUE_KEY_PREFIX = '@ruhvi_scan_queue_';

/**
 * Platform-independent UUID v4 generator
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get the storage key for the current user's queue
 */
function getStorageKey(userId?: string | null): string {
  const uid = userId || getCurrentUserId() || 'anonymous';
  return `${QUEUE_KEY_PREFIX}${uid}`;
}

/**
 * Fetch all queued scans from local device storage for the active user
 */
export async function getQueuedScans(targetUserId?: string | null): Promise<LocalScanItem[]> {
  try {
    const key = getStorageKey(targetUserId);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('[scanQueue] Failed to read queue from AsyncStorage:', err);
    return [];
  }
}

/**
 * Overwrite queue in local storage
 */
async function writeQueue(items: LocalScanItem[], targetUserId?: string | null): Promise<void> {
  const key = getStorageKey(targetUserId);
  await AsyncStorage.setItem(key, JSON.stringify(items));
}

/**
 * Instant local persistence: Save a scan immediately to AsyncStorage.
 * Sets status to 'saved_locally' and then triggers a background staging attempt.
 */
export async function saveScanLocally(
  data: {
    barcode: string;
    sku: string;
    weight_grams: number;
    cost_price: number;
    stock_quantity: number;
    product_name?: string | null;
    price?: number | null;
    mrp?: number | null;
    collection?: string | null;
    category_id?: string | null;
    notes?: string | null;
    action_type?: 'create_product' | 'update_stock' | 'register_barcode' | 'auto';
  },
  userIdOverride?: string | null
): Promise<LocalScanItem> {
  const userId = userIdOverride || getCurrentUserId();
  if (!userId) {
    throw new Error('User must be logged in to save inventory scans');
  }

  const now = new Date().toISOString();
  const newItem: LocalScanItem = {
    id: generateUUID(),
    owner_id: userId,
    barcode: data.barcode.trim(),
    sku: data.sku.trim().toUpperCase(),
    weight_grams: Number(data.weight_grams),
    cost_price: Number(data.cost_price),
    stock_quantity: parseInt(String(data.stock_quantity || 1), 10),
    product_name: data.product_name ? data.product_name.trim() : null,
    price: data.price && data.price > 0 ? Number(data.price) : null,
    mrp: data.mrp && data.mrp > 0 ? Number(data.mrp) : null,
    collection: data.collection ? data.collection.trim() : null,
    category_id: data.category_id || null,
    notes: data.notes ? data.notes.trim() : null,
    action_type: data.action_type || 'auto',
    status: 'saved_locally',
    sync_error: null,
    created_at: now,
    updated_at: now,
  };

  // 1. Immediately persist locally
  const currentQueue = await getQueuedScans(userId);
  const updatedQueue = [newItem, ...currentQueue];
  await writeQueue(updatedQueue, userId);

  // 2. Trigger non-blocking background upload to Supabase staging
  uploadPendingToStaging(userId).catch((err) => {
    console.warn('[scanQueue] Background staging push postponed (offline):', err?.message || err);
  });

  return newItem;
}

/**
 * Update an existing local queue item
 */
export async function updateQueueItem(
  id: string,
  updates: Partial<LocalScanItem>,
  userIdOverride?: string | null
): Promise<void> {
  const userId = userIdOverride || getCurrentUserId();
  const queue = await getQueuedScans(userId);
  const updated = queue.map((item) => {
    if (item.id === id) {
      return {
        ...item,
        ...updates,
        updated_at: new Date().toISOString(),
      };
    }
    return item;
  });
  await writeQueue(updated, userId);
}

/**
 * Delete a scan from the local queue
 */
export async function deleteQueueItem(id: string, userIdOverride?: string | null): Promise<void> {
  const userId = userIdOverride || getCurrentUserId();
  const queue = await getQueuedScans(userId);
  const filtered = queue.filter((item) => item.id !== id);
  await writeQueue(filtered, userId);
}

/**
 * Clear synced items from local device storage
 */
export async function clearSyncedItems(userIdOverride?: string | null): Promise<void> {
  const userId = userIdOverride || getCurrentUserId();
  const queue = await getQueuedScans(userId);
  const remaining = queue.filter((item) => item.status !== 'synced');
  await writeQueue(remaining, userId);
}

/**
 * Get summary counts for the current user's local queue
 */
export async function getQueueSummary(userIdOverride?: string | null): Promise<QueueSummary> {
  const queue = await getQueuedScans(userIdOverride);
  return {
    total: queue.length,
    savedLocally: queue.filter((i) => i.status === 'saved_locally').length,
    staged: queue.filter((i) => i.status === 'staged').length,
    synced: queue.filter((i) => i.status === 'synced').length,
    failed: queue.filter((i) => i.status === 'failed').length,
  };
}

/**
 * Background Automatic Uploader:
 * Pushes all 'saved_locally' and 'failed' scans to Supabase inventory_staging.
 * Does NOT write to canonical products (website "Sync Now" retains that authority).
 */
export async function uploadPendingToStaging(userIdOverride?: string | null): Promise<number> {
  const userId = userIdOverride || getCurrentUserId();
  if (!userId) return 0;

  const queue = await getQueuedScans(userId);
  const pendingItems = queue.filter((i) => i.status === 'saved_locally' || i.status === 'failed');

  if (pendingItems.length === 0) return 0;

  let successfulUploadCount = 0;

  for (const item of pendingItems) {
    try {
      const payload = {
        client_scan_id: item.id,
        owner_id: userId,
        barcode: item.barcode,
        sku: item.sku,
        weight_grams: item.weight_grams,
        cost_price: item.cost_price,
        stock_quantity: item.stock_quantity,
        product_name: item.product_name,
        price: item.price,
        mrp: item.mrp,
        collection: item.collection,
        category_id: item.category_id,
        notes: item.notes,
        action_type: item.action_type,
        status: 'staged',
        sync_error: null,
        updated_at: new Date().toISOString(),
      };

      // Upsert into Supabase inventory_staging table
      const { error } = await supabase
        .from('inventory_staging')
        .upsert(payload, { onConflict: 'client_scan_id' });

      if (error) {
        throw error;
      }

      // Mark locally as staged
      await updateQueueItem(item.id, { status: 'staged', sync_error: null }, userId);
      successfulUploadCount++;
    } catch (err: any) {
      console.warn(`[scanQueue] Failed to stage scan ${item.sku}:`, err?.message || err);
      // Leave as saved_locally or update sync_error
      await updateQueueItem(
        item.id,
        { sync_error: err?.message || 'Network staging error' },
        userId
      );
    }
  }

  return successfulUploadCount;
}

/**
 * Sync status with remote inventory_staging table:
 * Checks if records have been finalized by the website Sync Now engine.
 * Updates local status to 'synced' (triggering the green checkmark) once verified.
 */
export async function syncQueueWithRemote(userIdOverride?: string | null): Promise<void> {
  const userId = userIdOverride || getCurrentUserId();
  if (!userId) return;

  const queue = await getQueuedScans(userId);
  const stagedIds = queue
    .filter((i) => i.status === 'staged' || i.status === 'saved_locally')
    .map((i) => i.id);

  if (stagedIds.length === 0) return;

  try {
    const { data: remoteRows, error } = await supabase
      .from('inventory_staging')
      .select('client_scan_id, status, sync_error, synced_at')
      .in('client_scan_id', stagedIds);

    if (error || !remoteRows) return;

    for (const remote of remoteRows) {
      if (remote.status === 'synced') {
        await updateQueueItem(
          remote.client_scan_id,
          { status: 'synced', sync_error: null },
          userId
        );
      } else if (remote.status === 'failed') {
        await updateQueueItem(
          remote.client_scan_id,
          { status: 'failed', sync_error: remote.sync_error },
          userId
        );
      }
    }
  } catch (err) {
    console.warn('[scanQueue] Failed to sync queue status with remote:', err);
  }
}
