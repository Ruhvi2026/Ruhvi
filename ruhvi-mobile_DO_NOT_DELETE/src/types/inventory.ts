// src/types/inventory.ts
// TypeScript interfaces for Mobile Inventory Scan & Local Queue

export type LocalScanStatus = 'saved_locally' | 'staged' | 'synced' | 'failed';

export interface LocalScanItem {
  id: string; // Client UUIDv4 (acts as client_scan_id idempotency key)
  owner_id: string; // Authenticated staff user ID
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
  action_type: 'create_product' | 'update_stock' | 'register_barcode' | 'auto';
  status: LocalScanStatus;
  sync_error?: string | null;
  created_at: string;
  updated_at: string;
}

export interface QueueSummary {
  total: number;
  savedLocally: number;
  staged: number;
  synced: number;
  failed: number;
}
