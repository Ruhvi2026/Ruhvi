# Ruhvi Supabase Migrations Reconciliation & Parity Plan (P1.1)

## Executive Summary
This document provides the authoritative audit, reconciliation plan, and safety protocols for database migrations in `supabase/migrations/`.

---

## 1. Audit Analysis of Historical Collision Pairs

Between migrations `0001` and `0120`, exactly 9 pairs of migrations share duplicate numeric prefixes due to historical concurrent feature branching:

| Duplicate Prefix | File A (Track A / Phase) | File B (Track B / Feature) | Idempotency Status | Notes |
|:---|:---|:---|:---|:---|
| **0009** | `0009_phase9_ai_seo.sql` | `0009_seed_admin_account.sql` | 100% Idempotent | `ADD COLUMN IF NOT EXISTS` vs `ON CONFLICT (id) DO UPDATE` |
| **0010** | `0010_dynamic_taxonomy.sql` | `0010_phase10_global_settings.sql` | 100% Idempotent | `CREATE TABLE IF NOT EXISTS` + `ON CONFLICT (key) DO UPDATE` |
| **0011** | `0011_phase11_ai_logs.sql` | `0011_seed_taxonomy.sql` | 100% Idempotent | `CREATE TABLE IF NOT EXISTS` + `ON CONFLICT (slug) DO UPDATE` |
| **0019** | `0019_admin_firebase_uid.sql` | `0019_admin_users_rpc.sql` | 100% Idempotent | `WHERE NOT EXISTS` vs `CREATE OR REPLACE FUNCTION` |
| **0020** | `0020_admin_firebase_uid_fix.sql` | `0020_audit_logs.sql` | 100% Idempotent | `UPDATE ... WHERE` vs `CREATE OR REPLACE FUNCTION` + `CREATE TABLE IF NOT EXISTS` |
| **0031** | `0031_ai_logs_latency.sql` | `0031_fix_firebase_uid_rpcs.sql` | 100% Idempotent | `ADD COLUMN IF NOT EXISTS` vs `CREATE OR REPLACE FUNCTION` |
| **0041** | `0041_coupons_is_public.sql` | `0041_inventory_adjustments.sql` | 100% Idempotent | Hardened with `IF NOT EXISTS` enum guard, `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS` |
| **0042** | `0042_homepage_cms.sql` | `0042_promotions_table.sql` | 100% Idempotent | Hardened with `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS`, `ON CONFLICT DO NOTHING` |
| **0043** | `0043_expand_ticket_statuses.sql` | `0043_order_event_timeline.sql` | 100% Idempotent | `DROP CONSTRAINT IF EXISTS` vs `DO $$ IF NOT EXISTS (SELECT 1 FROM pg_type...)` |

---

## 2. Prevention of Future Collisions

- The open wallet-fix PR suggested `0114_secure_wallet_topup.sql`, which would have collided with `0114_order_call_remarks.sql`.
- In P0.2, this was avoided by allocating **`0118_secure_wallet_topup.sql`**.
- In P1.3, anomaly state was allocated **`0119_business_anomalies.sql`**.
- In P1.4, order event idempotency was allocated **`0120_order_events_idempotency.sql`**.
- All subsequent migrations must monotonically increment starting from **`0121_...`**.

---

## 3. Strict Safety Protocol: Why We Do NOT Blindly Rename In-Place Against Production

Supabase tracks applied migrations in the table:
```sql
SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;
```

1. **Remote Desync**: If migration files in `supabase/migrations/` are renamed in git without synchronizing `supabase_migrations.schema_migrations`, Supabase CLI tools (`supabase db push`) will either report:
   - `Remote migration ... not found in local directory` and halt, or
   - Treat the newly renamed file as a brand new, unapplied migration and attempt to execute it from scratch against production.
2. **Production Safety**: In accordance with the Project Ruhvi Protected Documentation and Optimization Rules, zero destructive or blind file renames should be applied without checking the production database's actual schema migration history.

---

## 4. Reconciled Sequential Renaming Plan (Staging Execution)

When reconciling in a safe staging clone or during a scheduled maintenance window with production database access, the canonical sequence is:

| Current Filename | Target Monotonic Filename |
|:---|:---|
| `0009_phase9_ai_seo.sql` | `0009_phase9_ai_seo.sql` |
| `0009_seed_admin_account.sql` | `0010_seed_admin_account.sql` |
| `0010_dynamic_taxonomy.sql` | `0011_dynamic_taxonomy.sql` |
| `0010_phase10_global_settings.sql` | `0012_phase10_global_settings.sql` |
| `0011_phase11_ai_logs.sql` | `0013_phase11_ai_logs.sql` |
| `0011_seed_taxonomy.sql` | `0014_seed_taxonomy.sql` |
| `0012_auto_confirm_users.sql` | `0015_auto_confirm_users.sql` |
| ... *(Sequential shift +3)* | ... |
| `0019_admin_firebase_uid.sql` | `0022_admin_firebase_uid.sql` |
| `0019_admin_users_rpc.sql` | `0023_admin_users_rpc.sql` |
| `0020_admin_firebase_uid_fix.sql` | `0024_admin_firebase_uid_fix.sql` |
| `0020_audit_logs.sql` | `0025_audit_logs.sql` |
| ... *(Sequential shift +5)* | ... |
| `0031_ai_logs_latency.sql` | `0037_ai_logs_latency.sql` |
| `0031_fix_firebase_uid_rpcs.sql` | `0038_fix_firebase_uid_rpcs.sql` |
| ... *(Sequential shift +6)* | ... |
| `0041_coupons_is_public.sql` | `0048_coupons_is_public.sql` |
| `0041_inventory_adjustments.sql` | `0049_inventory_adjustments.sql` |
| `0042_homepage_cms.sql` | `0050_homepage_cms.sql` |
| `0042_promotions_table.sql` | `0051_promotions_table.sql` |
| `0043_expand_ticket_statuses.sql` | `0052_expand_ticket_statuses.sql` |
| `0043_order_event_timeline.sql` | `0053_order_event_timeline.sql` |
| ... *(Sequential shift +9)* | ... |
| `0120_order_events_idempotency.sql` | `0129_order_events_idempotency.sql` |

### Database Sync Script for Staging:
```sql
-- Updates schema_migrations records in lockstep with the renamed files
UPDATE supabase_migrations.schema_migrations
SET version = '0010' WHERE version = '0009_seed_admin_account';
-- Repeat for mapped versions...
```

