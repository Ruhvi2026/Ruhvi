# IMPLEMENTATION_PLAN.md — Inventory Scan & Add Implementation Plan
**Feature:** Mobile Scan & Add Products -> Website Sync  
**Created:** 2026-10-20  
**Phase:** Phase 2 (Approved Design Lock)  
**Status:** Implementation Ready — Pending Approval for Phase 3 Execution  

---

## 1. System Architecture Overview

The system bridges physical stock handling on mobile with authoritative catalog management on the web through a 4-tier pipeline:

```
[Mobile Device Camera]
       │
       ▼ (Scan Barcode / Fallback Input)
[Product Entry Screen] (SKU, Weight, Cost Price, Stock Qty)
       │
       ▼ (Save: Instant Local Persistence)
[Local Queue: AsyncStorage] (@ruhvi_scan_queue_${userId})
       │
       ▼ (Auto-Upload over Network - RLS owner_id Check)
[Staging Table: Supabase] (public.inventory_staging)
       │
       ▼ (Staff views pending scans & clicks "Sync Now")
[Operations Web Portal] (/operations/inventory/scan-sync)
       │
       ▼ (Server Action with requireAdminClient)
[Authoritative Sync Engine] (adjust_product_stock RPC / products INSERT)
       │
       ▼ (Realtime event / queue reload)
[Truthful Green Synced Status on Both Mobile & Web]
```

---

## 2. Dependency Assessment & Justification

| Scope | Package | Purpose | Alternatives Considered | Why Chosen |
|---|---|---|---|---|
| **Mobile** | `expo-camera` (SDK 57) | Barcode scanning via device camera | `expo-barcode-scanner` (deprecated in SDK 51+); `react-native-vision-camera` (requires native compilation/plugins) | Official Expo SDK 57 package, zero native linking issues, includes high-performance built-in `CameraView` with barcode callbacks. |
| **Mobile** | `@react-native-async-storage/async-storage` | Durable offline queue storage | SQLite, MMKV | Already installed (`2.2.0`) in `ruhvi-mobile_DO_NOT_DELETE`. Lightweight, proven reliability for JSON records. |
| **Mobile** | `@supabase/supabase-js` | Staging upload & status listener | Custom REST fetch | Already installed (`^2.117.1`). Directly supports RLS token pass-through and Realtime subscriptions. |
| **Website** | None (Zero new packages) | Web Staging UI & Sync Engine | External libraries | Next.js 15, React 19, Lucide React, Tailwind, and Supabase client are already present in the workspace. |

---

## 3. Implementation Phases & Gate Order

### Phase 0 — Read-only Architecture & Repository Audit ✅ (COMPLETED)
- Verified database models, Firebase auth + custom JWT, mobile Expo setup, and existing operations tools.
- Deliverables: `phase0_audit_report.md`, `REQUIREMENTS_BASELINE.md`.

### Phase 1 — Requirements Gap Analysis & Final Contract Review ✅ (COMPLETED)
- Resolved all 5 open questions with explicit user approval:
  1. Mandatory Purchase price (`cost_price`), "trial price" removed.
  2. Barcode mapped to SKU; unregistered barcode can be manually mapped.
  3. Existing barcode scan prompts: "Update SKU / Stock" or "Skip".
  4. Mandatory stock quantity field with additive/initial logic.
  5. No device hardware restrictions needed.

### Phase 2 — Approved Design Lock & Implementation Preparation ⏳ (CURRENT)
- Finalize `REQUIREMENTS_BASELINE.md`, `DATA_SYNC_CONTRACT.md`, `MIGRATION_PLAN.md`, `IMPLEMENTATION_PLAN.md`.
- Present exact file list, API contracts, migration proposal, and test plan.
- **Stop Condition:** Await explicit user approval before executing Phase 3.

### Phase 3 — Additive Server-Side Staging Model & Secure APIs (NEXT)
- Create migration file `supabase/migrations/0112_inventory_scan_and_staging.sql` (after user approval to run).
- Implement Server Action & API endpoints for staging and canonical sync:
  - `src/app/operations/inventory/scan-sync/actions.ts`: `fetchStagedScans()`, `syncStagedInventoryAction()`, `deleteStagedScanAction()`.
- Server authorization: Enforce `requireAdminClient()`, verify user role and session token.

### Phase 4 — Durable Local Capture Queue (Mobile)
- Implement `ruhvi-mobile_DO_NOT_DELETE/src/lib/scanQueue.ts`:
  - `saveScanLocally()`, `getQueuedScans()`, `updateQueueItem()`, `deleteQueueItem()`.
  - Background uploader that runs when online and updates status to `staged`.
- User isolation: Queue partitioned by `AsyncStorage` key `@ruhvi_scan_queue_${userId}`.

### Phase 5 — Mobile Barcode Scanning & Product-Entry Form (Mobile)
- Install `expo-camera` in `ruhvi-mobile_DO_NOT_DELETE`.
- Implement `ruhvi-mobile_DO_NOT_DELETE/src/screens/InventoryScanScreen.tsx`:
  - Camera scanner with frame viewfinder, torch toggle, and manual input fallback.
  - Barcode lookup against Supabase: displays prompt dialog if item already exists (Update SKU / Skip).
  - Clean form: SKU (mandatory), Weight (mandatory), Purchase Price (mandatory), Stock Quantity (mandatory), optional fields collapsible.
  - Save & Next button for rapid sequential scanning.
  - Bottom tab / modal for "Recent Scans" showing truthful status icons.
- Register route in `App.tsx` and add Scan icon to header/navigation.

### Phase 6 — Website Pending-Table View & Authoritative Sync Now (Web)
- Create `/operations/inventory/scan-sync/page.tsx`:
  - Table of staged scans for the logged-in staff member.
  - Prominent "Sync Now" button with loading indicators and batch progress.
  - Editable modal/inline correction for flagged records.
  - Summary metrics: Staged count, Synced today, Errors.
  - Add "Scan & Sync" nav link to `src/app/operations/layout.tsx` under `INVENTORY`.

### Phase 7 — Offline, Sync, Partial-Failure & Conflict Hardening
- Implement partial failure handling: if record 3 of 10 fails, records 1-2 and 4-10 succeed; record 3 marked `failed` with safe error.
- Set up Supabase Realtime subscription on mobile so mobile status ticks update automatically when website sync finishes.

### Phase 8 — End-to-End Verification, Documentation & Handover
- Execute comprehensive test checklist across mobile and web.
- Produce final `docs/inventory-scan-add/IMPLEMENTATION_REPORT.md`.

---

## 4. Exact File Impact List

### Files to CREATE:
1. `supabase/migrations/0112_inventory_scan_and_staging.sql` — Additive schema & RLS policies.
2. `src/app/operations/inventory/scan-sync/page.tsx` — Website Operations pending scans & Sync Now UI.
3. `src/app/operations/inventory/scan-sync/actions.ts` — Server actions for staging query, delete, and sync.
4. `ruhvi-mobile_DO_NOT_DELETE/src/screens/InventoryScanScreen.tsx` — Mobile scanning & product form.
5. `ruhvi-mobile_DO_NOT_DELETE/src/lib/scanQueue.ts` — Mobile local queue manager & staging sync.

### Files to MODIFY (Minimal & Non-Breaking):
1. `src/app/operations/layout.tsx` — Add "Mobile Scan Sync" link under the `INVENTORY` navigation group.
2. `ruhvi-mobile_DO_NOT_DELETE/App.tsx` — Add `InventoryScanScreen` to Stack navigator and add a header shortcut icon.
3. `ruhvi-mobile_DO_NOT_DELETE/package.json` — Add `expo-camera`.

---

## 5. Test & Acceptance Criteria

| Phase | Test Scenario | Acceptance Criteria |
|---|---|---|
| **Phase 3** | RLS & Tenant Isolation | User A cannot query or stage records with User B's `owner_id`. |
| **Phase 3** | Staging Idempotency | Inserting same `client_scan_id` twice updates existing row, never duplicates. |
| **Phase 4** | Offline Storage | Saving 5 items in airplane mode preserves all 5 items across app restarts. |
| **Phase 4** | Auto-Staging Upload | Reconnecting network uploads all 5 items to `inventory_staging`. |
| **Phase 5** | Barcode Scan & Prompt | Scanning existing barcode opens "Item Exists" dialog with "Update SKU" and "Skip". |
| **Phase 5** | Unregistered Barcode | Scanning new barcode allows manual SKU mapping and saves successfully. |
| **Phase 5** | Mandatory Validation | Form blocks submission if SKU, Weight, Cost Price, or Stock Qty is missing. |
| **Phase 6** | Web Portal Display | Staged items appear on `/operations/inventory/scan-sync` matching current user. |
| **Phase 6** | Sync Now Execution | Clicking "Sync Now" updates canonical `products` and increments stock via `adjust_product_stock`. |
| **Phase 7** | Truthful Status | Green tick only appears after website sync succeeds. |
