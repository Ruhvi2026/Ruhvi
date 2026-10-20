# REQUIREMENTS_BASELINE.md — Inventory Scan & Add
**Feature:** Mobile Scan & Add Products -> Website Sync  
**Created:** 2026-10-20  
**Last Updated:** 2026-10-20 (Phase 1 Approved)  
**Status:** Phase 1 Complete — All 5 Blocking Questions Resolved & Approved  

---

## 1. Feature Overview & Scope
Enable Ruhvi operations/inventory staff to scan barcodes on physical jewellery stock using the Ruhvi mobile app (`ruhvi-mobile_DO_NOT_DELETE`), capture mandatory and optional product attributes durably offline/online, automatically upload staged scans to a secure database staging queue, and perform the final authoritative inventory/catalog sync exclusively via the Ruhvi Operations website portal (`/operations/inventory/scan-sync`) with a dedicated "Sync Now" control.

---

## 2. Requirements Traceability Matrix

| Req ID | Requirement Description | User Decision / Verified Codebase Status | Status |
|---|---|---|---|
| **REQ-01** | Mobile barcode scanning via device camera + manual fallback | Supported via `expo-camera` (`CameraView`) with manual input text fallback. | Verified & Ready |
| **REQ-02** | Mandatory Fields: SKU, Weight, Purchase Price | - SKU (`products.sku`, unique text)<br>- Weight (`products.weight_grams`, numeric, unit: grams)<br>- Purchase Price (`products.cost_price`, numeric, default 0) | Verified & Approved |
| **REQ-03** | Mandatory Stock Quantity | Staff manually inputs quantity upon scan. Can update existing stock or set initial inventory. | Verified & Approved |
| **REQ-04** | Barcode-to-SKU mapping & Unregistered Barcode Registration | Barcode maps to SKU. If barcode is already registered, displays product details. If unregistered, staff can manually register barcode with the SKU. | Verified & Approved |
| **REQ-05** | Duplicate Scan Handling | If scanned barcode already exists in catalog, display an interactive modal: "Item already exists: [Name/SKU]". Staff can choose: **Update SKU / Stock** or **Skip**. | Verified & Approved |
| **REQ-06** | "Trial Price" Removal | "Trial price" is removed entirely from scope. Purchase price maps exclusively to `cost_price`. | Verified & Approved |
| **REQ-07** | Optional Fields | Selling price (`price`), MRP (`mrp`), Collection (`collection`), Product Name (`name`), Category (`category_id`), Notes. | Verified & Ready |
| **REQ-08** | Durable Local Queue | Persist scans immediately into device storage (`AsyncStorage`) before network transmission. Retain across app reloads, crashes, and network loss. | Verified & Ready |
| **REQ-09** | Automatic Staging Upload (No Mobile Sync Button) | When network is active, mobile automatically uploads locally queued scans to `public.inventory_staging`. Mobile has NO button to write directly to canonical products. | Verified & Ready |
| **REQ-10** | Truthful UI Status & Green Tick Semantics | - `Saved Locally` (Orange/Yellow icon)<br>- `Staged to Cloud` (Blue icon)<br>- `Synced to Catalog` (Green tick)<br>- `Sync Error` (Red alert)<br>Green tick ONLY shown after server-side canonical sync completes. | Verified & Ready |
| **REQ-11** | Website Staging Portal & Sync Now | Dedicated Operations page at `/operations/inventory/scan-sync` displaying current user's staged scans. Single "Sync Now" button executes server action. | Verified & Ready |
| **REQ-12** | User Isolation & Security | Each signed-in staff member sees and syncs ONLY their own staged scans (`owner_id = auth.uid()`). No manager approval gate. Server derives owner from verified JWT/session. | Verified & Ready |
| **REQ-13** | Device Sharing Policy | No device hardware restrictions needed (User Decision OQ-5). Data isolation enforced strictly per authenticated user account. | Verified & Approved |

---

## 3. Resolved Decisions Log (Phase 1)

1. **OQ-1 (Trial Price):** Removed from scope entirely. Only `cost_price` (Purchase Price) is required.
2. **OQ-2 (Barcode Column):** Add `barcode text` to `public.products` with unique index `WHERE barcode IS NOT NULL`. Barcode maps 1:1 to product SKU.
3. **OQ-3 (Duplicate Handling):** Prompt dialog shown on mobile when barcode or SKU exists. User can select "Update SKU" or "Skip".
4. **OQ-4 (Stock Quantity Semantics):** Mandatory user input field. Adds to existing stock for existing products, sets initial stock for new products.
5. **OQ-5 (Shared Device Safety):** No device restriction required. Local queue is keyed by authenticated user ID (`@ruhvi_scan_queue_${userId}`).
