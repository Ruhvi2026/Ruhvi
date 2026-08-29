# Ruhvi ↔ EspoCRM Bidirectional Cron Sync

Runs on the `ruhvi-crm1` Google Compute Engine VM every 5 minutes.

## What it does

| Direction | Action |
|-----------|--------|
| Supabase → EspoCRM | Creates EspoCRM **Contacts** for new customers (signed-up in the last 24 h, not yet linked) |
| Supabase → EspoCRM | Retries **Case creation** for support tickets that failed their initial event-driven push (`espo_case_id IS NULL`) |
| EspoCRM → Supabase | Handled live by the PHP `AfterSave` webhook hooks — no cron step needed |

> **Conflict rule:** EspoCRM always wins. This script only creates *new* records. It never overwrites CRM-owned fields (status, notes, agent assignments).

## Prerequisites

- Node.js ≥ 18 on the VM (`node --version`)
- `@supabase/supabase-js` npm package installed locally

## Setup on the VM

```bash
# 1. Create a working directory
mkdir -p /opt/ruhvi-crm
cd /opt/ruhvi-crm

# 2. Copy the script
cp /path/to/deploy/esporcrm/cron/sync.mjs .

# 3. Install the only runtime dependency
npm init -y
npm install @supabase/supabase-js

# 4. Create an env file (keep it root-only)
cat > /opt/ruhvi-crm/.env << 'EOF'
ESPO_BASE_URL=https://crm.support.ruhvi.in
ESPO_API_KEY=<from EspoCRM Admin → API Credentials>
SUPABASE_URL=https://igrkrkxdantrolbldapj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<Supabase service_role key>
EOF
chmod 600 /opt/ruhvi-crm/.env

# 5. Test the script manually
set -a && source /opt/ruhvi-crm/.env && set +a
node /opt/ruhvi-crm/sync.mjs

# 6. Schedule via cron (every 5 minutes)
crontab -e
# Add this line:
# */5 * * * * set -a && . /opt/ruhvi-crm/.env && set +a && /usr/bin/node /opt/ruhvi-crm/sync.mjs >> /var/log/ruhvi-sync.log 2>&1
```

## Logs

```bash
tail -f /var/log/ruhvi-sync.log
```

## Optional: Supabase migration for `espo_contact_id`

The customer-contact sync writes `espo_contact_id` back to the `users` table. This column doesn't exist yet — apply the small migration below before the first run if you want Contact sync enabled:

```sql
-- 0063_espo_contact_id.sql
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS espo_contact_id text;

CREATE INDEX IF NOT EXISTS idx_users_espo_contact
  ON public.users(espo_contact_id)
  WHERE espo_contact_id IS NOT NULL;
```

If the column is absent the script logs a warning and skips Contact sync automatically (ticket retry sync still runs).

## Monitoring

- Exit code `0` = success (or nothing to do)  
- Exit code `1` = at least one record failed to sync; check the log

Set up a simple alert (e.g., via `healthchecks.io` or a Uptime Robot ping) if you want proactive failure notification.
