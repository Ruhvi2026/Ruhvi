# Database Backup, Retention & Disaster Recovery Runbook (Finding G1)

> **Authoritative Operational Runbook for Project Ruhvi**  
> Target RTO (Recovery Time Objective): **< 30 minutes**  
> Target RPO (Recovery Point Objective): **< 24 hours**  
> Classification: **Confidential / Internal Staff Only**

---

## 1. Data Classification & Scope

Project Ruhvi utilizes PostgreSQL managed via Supabase (`public` schema). Stored data is partitioned into five criticality tiers:

| Tier | Category | Key Tables | Sensitivity | Backup Priority |
|---|---|---|---|---|
| **Tier 0** | **Financial & Transactions** | `orders`, `order_items`, `wallet_ledger`, `wallet_topups`, `reward_coin_ledger` | Critical (P0) | Real-time / Daily |
| **Tier 1** | **Customer Accounts** | `users`, `addresses`, `customer_identities` | High / PII (P1) | Daily |
| **Tier 2** | **Catalog & Inventory** | `products`, `product_images`, `inventory_adjustments`, `categories` | High (P1) | Daily |
| **Tier 3** | **Operations & Support** | `support_tickets`, `tasks`, `marketing_campaign_dispatches`, `audit_logs` | Medium (P2) | Weekly |
| **Tier 4** | **AI Intelligence & Telemetry** | `co_founder_memories`, `co_founder_signals`, `co_founder_action_plans` | Operational (P3) | Weekly |

---

## 2. Backup Schedule, Encryption & Storage

1. **Automated Provider Snapshots (Supabase)**:
   - Daily automated physical volume snapshot executed by Supabase at 00:00 UTC.
   - Retention: 7 days rolling.
   - Encryption: Encrypted at rest via AES-256 and TLS 1.3 in transit.

2. **Logical Encrypted Dumps (`pg_dump`)**:
   - Generated weekly or prior to major structural schema migrations.
   - Command:
     ```bash
     supabase db dump --data-only -f backup_data_$(date +%Y%m%d).sql
     ```
   - Encryption: GPG/OpenSSL symmetric encryption (`aes-256-cbc`) prior to cloud upload.
   - **Strict Security Rule**: Customer database dumps must **NEVER** be committed to GitHub repositories or uploaded as unencrypted CI artifacts.

---

## 3. Step-by-Step Disaster Recovery Procedure

In the event of total data corruption, accidental drop, or cloud region failover, follow these steps sequentially:

### Step 1: Provision Target Database
Obtain the target PostgreSQL connection string for the recovery instance:
```bash
export RESTORE_DB_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"
```

### Step 2: Apply Deterministic Schema Migrations
Ensure all 121+ ordered migrations are applied cleanly to establish the schema:
```bash
# Using Supabase CLI
supabase db push --db-url "$RESTORE_DB_URL"

# Or sequentially applying migrations
for file in supabase/migrations/*.sql; do
  echo "Applying $file..."
  psql "$RESTORE_DB_URL" -f "$file"
done
```

### Step 3: Restore Logical Data Dump
```bash
# Decrypt the encrypted backup
openssl enc -d -aes-256-cbc -in backup_encrypted.enc -out backup_data.sql -pass env:BACKUP_PASSPHRASE

# Restore data tables with foreign keys temporarily disabled
psql "$RESTORE_DB_URL" <<EOF
SET session_replication_role = 'replica';
\i backup_data.sql
SET session_replication_role = 'origin';
EOF
```

### Step 4: Validate Row Count & Financial Invariants
Execute data sanity queries to verify transaction records:
```sql
SELECT 
  (SELECT count(*) FROM users) AS user_count,
  (SELECT count(*) FROM orders) AS order_count,
  (SELECT count(*) FROM products) AS product_count,
  (SELECT count(*) FROM wallet_ledger) AS wallet_entries,
  (SELECT count(*) FROM reward_coin_ledger) AS coin_entries;
```

### Step 5: Run Synthetic Health Probes & E2E Smoke Tests
```bash
# 1. Run synthetic read-only health probes
npm test -- src/lib/qa/__tests__/health-probes.test.ts

# 2. Run Playwright E2E smoke tests
npm run test:e2e:smoke
```

### Step 6: Traffic Switchover
Update `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel project environment variables, trigger immediate production deployment, and verify `/tech/status`.

---

## 4. Restore Drill Verification Schedule

- **Cadence**: Semi-annually (every 6 months) or after major e-commerce framework upgrades.
- **Drill Log Requirement**: Document the drill date, operator ID, time taken (minutes), and data validation status in `docs/archived-reports/restore-drill-log.md`.

