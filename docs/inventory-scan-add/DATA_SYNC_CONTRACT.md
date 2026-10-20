# DATA_SYNC_CONTRACT.md — Inventory Scan & Add Data Contract
**Feature:** Mobile Scan & Add Products -> Website Sync  
**Created:** 2026-10-20  
**Phase:** Phase 2 (Design Lock)  
**Status:** Approved Specification  

---

## 1. Field Mapping & Schema Specification

Every captured field is mapped directly to Ruhvi's canonical PostgreSQL schema (`public.products`, `public.inventory_adjustments`, and `public.inventory_staging`).

| User Field Name | Staging Column | Canonical Column | Data Type | Nullable? | Unit / Format | Validation Rule |
|---|---|---|---|---|---|---|
| **Barcode** | `barcode` | `products.barcode` | `text` | **NO** (Mandatory) | EAN-13, Code-128, QR, or text | Non-empty string; trimmed. |
| **SKU** | `sku` | `products.sku` | `text` | **NO** (Mandatory) | Alphanumeric (e.g. `RV-RN-001`) | Uppercase alphanumeric + dashes/underscores. |
| **Weight** | `weight_grams` | `products.weight_grams` | `numeric(10,2)` | **NO** (Mandatory) | Grams (`g`) | Decimal > 0.00 |
| **Purchase Price** | `cost_price` | `products.cost_price` | `numeric(12,2)` | **NO** (Mandatory) | INR (`₹`) | Decimal >= 0.00 |
| **Stock Quantity** | `stock_quantity` | `products.stock_quantity` | `integer` | **NO** (Mandatory) | Pieces | Positive Integer >= 1 |
| **Product Name** | `product_name` | `products.name` | `text` | YES (Optional) | Text string | Default to SKU if omitted on new product creation. |
| **Selling Price** | `price` | `products.price` | `numeric(12,2)` | YES (Optional) | INR (`₹`) | Default to `cost_price` if omitted on new product creation. |
| **MRP** | `mrp` | `products.mrp` | `numeric(12,2)` | YES (Optional) | INR (`₹`) | Default to `price` if omitted on new product creation. |
| **Collection** | `collection` | `products.collection` | `text` | YES (Optional) | Text | e.g. "Bridal", "Everyday" |
| **Category** | `category_id` | `products.category_id` | `uuid` | YES (Optional) | UUID | Valid `categories.id` reference. |
| **Notes** | `notes` | `inventory_adjustments.notes` | `text` | YES (Optional) | Text | Optional scan remarks/reason. |

---

## 2. Client-Side Durable Queue Model (`AsyncStorage`)

### 2.1 Storage Key
- Key: `@ruhvi_scan_queue_${authenticatedUserId}`
- Format: JSON array of `LocalScanRecord`

### 2.2 TypeScript Interface
```typescript
export interface LocalScanRecord {
  id: string; // Client-generated UUID (v4) acting as stable Idempotency Key
  owner_id: string; // Authenticated staff user UUID (from Firebase Auth / Supabase sub)
  barcode: string;
  sku: string;
  weight_grams: number;
  cost_price: number;
  stock_quantity: number;
  product_name?: string;
  price?: number;
  mrp?: number;
  collection?: string;
  category_id?: string;
  notes?: string;
  action_type: 'create_product' | 'update_stock' | 'register_barcode';
  local_status: 'saved_locally' | 'staging_uploading' | 'staged' | 'synced' | 'failed';
  staging_id?: string;
  sync_error?: string;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}
```

---

## 3. Server-Side Staging Table Schema (`public.inventory_staging`)

```sql
CREATE TABLE IF NOT EXISTS public.inventory_staging (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_scan_id uuid UNIQUE NOT NULL, -- Client idempotency key
  owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  barcode text NOT NULL,
  sku text NOT NULL,
  weight_grams numeric(10,2) NOT NULL,
  cost_price numeric(12,2) NOT NULL DEFAULT 0.00,
  stock_quantity integer NOT NULL DEFAULT 1,
  product_name text,
  price numeric(12,2),
  mrp numeric(12,2),
  collection text,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  notes text,
  action_type text NOT NULL DEFAULT 'auto', -- 'create_product', 'update_stock', 'register_barcode', 'auto'
  status text NOT NULL DEFAULT 'staged',    -- 'staged', 'syncing', 'synced', 'failed', 'skipped'
  sync_error text,
  synced_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast user queue lookup
CREATE INDEX IF NOT EXISTS idx_inventory_staging_owner_status 
  ON public.inventory_staging(owner_id, status);
```

---

## 4. Status State Machine & Transitions

```
[Mobile Scan Form]
        │ (Save & Next)
        ▼
[saved_locally] (Durable on device in AsyncStorage)
        │
        │ (Network online - automatic background push)
        ▼
[staged] (Uploaded to public.inventory_staging; visible on Web Portal)
        │
        │ (Staff clicks "Sync Now" on Web Portal: /operations/inventory/scan-sync)
        ▼
[syncing] (Atomic processing in server action)
        ├──► [synced] (Canonical product created/updated, stock adjusted, green tick visible)
        └──► [failed] (Safe error recorded, staff can edit and retry)
```

### Truthful UI State Rules:
1. **`saved_locally`**: Shown in mobile queue with Amber/Clock icon: *"Saved on device (Offline)"*.
2. **`staged`**: Shown in mobile queue and web portal with Blue/Cloud icon: *"Staged (Pending Web Sync)"*.
3. **`synced`**: Shown on BOTH mobile and web with Green Checkmark icon: *"Synced to Catalog"*. Green tick is NEVER displayed before canonical database write succeeds.
4. **`failed`**: Shown with Red/Alert icon: Displays user-safe failure reason with option to retry.

---

## 5. Security & Isolation Guarantees

1. **Owner Isolation on Staging Upload (Mobile -> Staging):**
   - Mobile client connects using authenticated staff JWT (`Bearer <jwt>`).
   - RLS policy on `public.inventory_staging` enforces `WITH CHECK (owner_id = auth.uid())`.
   - A client cannot forge an `owner_id` belonging to another staff member.

2. **Owner Isolation on Staging Read (Web & Mobile):**
   - RLS policy: `USING (owner_id = auth.uid())`.
   - Staff members can only view their own staged records.

3. **Authoritative Canonical Sync (Web Portal "Sync Now"):**
   - Executed exclusively via Next.js Server Action (`syncStagedInventoryAction`).
   - Server authenticates staff session via `requireAdminClient()`, which verifies `__session` JWT cookie against Firebase/Supabase and checks staff permissions (`inventory.adjust` or `products.create`).
   - Sync action queries records matching `WHERE owner_id = :userId AND status IN ('staged', 'failed')`.
   - No cross-tenant or cross-staff data modification is possible.

---

## 6. Duplicate & Conflict Resolution Contract

1. **Barcode / SKU Lookup at Scan Time:**
   - Mobile queries `products` by `barcode` or `sku`.
   - If match found:
     - Prompt modal: *"Item already exists: [Product Name] (SKU: [SKU], Current Stock: [Qty])"*.
     - Button 1: **Update SKU / Stock** -> Prefills form, sets `action_type = 'update_stock'`.
     - Button 2: **Skip** -> Discards current scan and re-enables camera for next item.
   - If no match found:
     - Shows: *"New Barcode"*. Staff inputs SKU. Sets `action_type = 'create_product'` or `'register_barcode'`.

2. **Idempotency on Retry:**
   - Every scan record generates a UUIDv4 `client_scan_id`.
   - `inventory_staging.client_scan_id` has a `UNIQUE` constraint.
   - Repeated uploads of the same local record use `ON CONFLICT (client_scan_id) DO UPDATE ...` to avoid creating duplicate staging rows.

3. **Concurrency Protection:**
   - During "Sync Now", the server uses row locking:
     `SELECT stock_quantity FROM products WHERE id = :productId FOR UPDATE;`
   - Atomic stock increment calls the verified database RPC `public.adjust_product_stock()`.

---

## 7. Server Response Payload Contract

When the website calls `syncStagedInventoryAction()`, the response contract is:

```typescript
export interface StagedSyncResponse {
  success: boolean;
  total_processed: number;
  synced_count: number;
  failed_count: number;
  results: Array<{
    client_scan_id: string;
    staging_id: string;
    sku: string;
    barcode: string;
    status: 'synced' | 'failed';
    action_taken: 'product_created' | 'stock_incremented' | 'barcode_registered';
    product_id?: string;
    new_stock?: number;
    error?: string;
  }>;
}
```
