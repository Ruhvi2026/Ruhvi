#!/usr/bin/env node
/**
 * Ruhvi <-> EspoCRM Bidirectional Cron Sync
 * =========================================
 * Runs on the ruhvi-crm1 VM every 5 minutes (crontab: * /5 * * * *).
 *
 * Direction 1  Supabase -> EspoCRM
 *   * New customers (no EspoCRM contact yet) -> create EspoCRM Contact
 *   * Failed-sync tickets (espo_case_id IS NULL) -> retry Case creation
 *
 * Direction 2  EspoCRM -> Supabase
 *   * Handled live by the PHP AfterSave webhook hooks. This script only
 *     retries the outbound direction where the event-driven path failed.
 *
 * Config (env vars — same values as /espo/custom/Espo/ruhvi-config.php):
 *   ESPO_BASE_URL             https://crm.support.ruhvi.in
 *   ESPO_API_KEY              <API key from EspoCRM Admin -> API Credentials>
 *   SUPABASE_URL              https://<ref>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY <service_role key>
 *
 * Conflict rule: EspoCRM always wins on CRM-owned fields (status, notes,
 * agent assignments). This script only creates NEW records — it never
 * overwrites existing EspoCRM data.
 *
 * Install on VM:
 *   mkdir -p /opt/ruhvi-crm && cd /opt/ruhvi-crm
 *   cp /path/to/deploy/esporcrm/cron/sync.mjs .
 *   npm init -y && npm install @supabase/supabase-js
 *   # crontab -e  ->  * /5 * * * * . /opt/ruhvi-crm/.env && /usr/bin/node /opt/ruhvi-crm/sync.mjs >> /var/log/ruhvi-sync.log 2>&1
 */

import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ESPO_BASE_URL = (
  process.env.ESPO_BASE_URL || 'https://crm.support.ruhvi.in'
).replace(/\/$/, '');
const ESPO_API_KEY = process.env.ESPO_API_KEY || '';
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!ESPO_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    '[ruhvi-sync] Missing required env vars: ESPO_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// ---------------------------------------------------------------------------
// EspoCRM REST helpers
// ---------------------------------------------------------------------------

/**
 * Thin wrapper around the EspoCRM REST API v1.
 * Returns { ok, status, data } — never throws.
 */
async function espoRequest(method, path, body = null) {
  const url = `${ESPO_BASE_URL}/api/v1/${path}`;
  const opts = {
    method,
    headers: {
      'X-Api-Key': ESPO_API_KEY,
      'Content-Type': 'application/json',
    },
  };
  if (body !== null) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(url, opts);
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (_e) {
      data = { _raw: text };
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { _error: err.message } };
  }
}

/** Find a Contact in EspoCRM by email. Returns the record or null. */
async function findContactByEmail(email) {
  const enc = encodeURIComponent(email);
  const { ok, data } = await espoRequest(
    'GET',
    `Contact?where[0][type]=equals&where[0][attribute]=emailAddress&where[0][value]=${enc}&maxSize=1`
  );
  if (!ok || !Array.isArray(data?.list) || data.list.length === 0) return null;
  return data.list[0];
}

/** Create an EspoCRM Contact for a Supabase customer. */
async function createContact(customer) {
  const parts = (customer.full_name || '').trim().split(/\s+/);
  const payload = {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
    emailAddress: customer.email || '',
    phoneNumber: customer.phone || '',
    description: `Ruhvi customer. ID: ${customer.id}`,
  };
  return espoRequest('POST', 'Contact', payload);
}

/** Find an EspoCRM Case by the custom ruhviTicketId_c field. Returns the record or null. */
async function findCaseByTicketId(ticketId) {
  const enc = encodeURIComponent(ticketId);
  const { ok, data } = await espoRequest(
    'GET',
    `Case?where[0][type]=equals&where[0][attribute]=ruhviTicketId_c&where[0][value]=${enc}&maxSize=1`
  );
  if (!ok || !Array.isArray(data?.list) || data.list.length === 0) return null;
  return data.list[0];
}

/** Create an EspoCRM Case for a Ruhvi support ticket. */
async function createCase(ticket, customerEmail) {
  const STATUS_MAP = {
    new:                   'New',
    open:                  'Assigned',
    in_progress:           'In Process',
    waiting_for_customer:  'Pending',
    waiting_for_team:      'Pending',
    resolved:              'Closed',
    closed:                'Closed',
    reopened:              'Reopened',
    rejected:              'Rejected',
    duplicate:             'Duplicate',
  };
  const PRIORITY_MAP = {
    low:    'Low',
    normal: 'Normal',
    high:   'High',
    urgent: 'Urgent',
  };

  const payload = {
    name:                  `[${ticket.ticket_number}] ${ticket.title}`,
    description:           ticket.description || '',
    status:                STATUS_MAP[ticket.status]   || 'New',
    priority:              PRIORITY_MAP[ticket.priority] || 'Normal',
    ruhviTicketId_c:       ticket.id,
    ruhviStatus_c:         ticket.status,
    ruhviCustomerEmail_c:  customerEmail || '',
    ruhviCustomerName_c:   ticket.customer_name  || '',
    ruhviCustomerPhone_c:  ticket.customer_phone || '',
  };
  return espoRequest('POST', 'Case', payload);
}

// ---------------------------------------------------------------------------
// Direction 1a: new Supabase customers -> EspoCRM Contacts
// ---------------------------------------------------------------------------

async function syncNewCustomers() {
  console.log('[ruhvi-sync] Checking for new customers to sync to EspoCRM...');

  // Look back 24 h. On first run this will catch all recent signups;
  // subsequent runs only pick up new arrivals since the last cron.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: customers, error } = await supabase
    .from('users')
    .select('id, full_name, email, phone, created_at')
    .gte('created_at', since)
    .not('email', 'is', null)
    .is('espo_contact_id', null)
    .limit(50);

  if (error) {
    // 42703 = column does not exist (migration 0063 not yet applied)
    if (error.code === '42703') {
      console.warn(
        '[ruhvi-sync] espo_contact_id column missing on users — ' +
          'skipping contact sync. Apply supabase/migrations/0063_espo_contact_id.sql first.'
      );
      return { created: 0, skipped: 0 };
    }
    console.error('[ruhvi-sync] Supabase customers query error:', error.message);
    return { created: 0, skipped: 0 };
  }

  let created = 0;
  let skipped = 0;

  for (const customer of customers ?? []) {
    try {
      // Defensive check: a Contact may already exist in EspoCRM even if
      // espo_contact_id is NULL in Supabase (e.g., created manually).
      const existing = await findContactByEmail(customer.email);
      if (existing) {
        await supabase
          .from('users')
          .update({ espo_contact_id: existing.id })
          .eq('id', customer.id);
        skipped++;
        continue;
      }

      const { ok, data } = await createContact(customer);
      if (ok && data?.id) {
        await supabase
          .from('users')
          .update({ espo_contact_id: data.id })
          .eq('id', customer.id);
        created++;
        console.log(`[ruhvi-sync] Created Contact ${data.id} for ${customer.email}`);
      } else {
        console.error(
          `[ruhvi-sync] Failed to create Contact for ${customer.email}:`,
          JSON.stringify(data)
        );
      }
    } catch (err) {
      console.error(`[ruhvi-sync] Error syncing customer ${customer.id}:`, err.message);
    }
  }

  return { created, skipped };
}

// ---------------------------------------------------------------------------
// Direction 1b: retry failed ticket -> EspoCRM Case syncs
// ---------------------------------------------------------------------------

async function retryFailedTicketSyncs() {
  console.log('[ruhvi-sync] Checking for unsynced tickets to push to EspoCRM...');

  // Exclude terminal statuses — no point creating a Case for a closed ticket.
  const { data: tickets, error } = await supabase
    .from('support_tickets')
    .select(
      `id, ticket_number, title, description, priority, status,
       customer:customer_id(email, full_name, phone)`
    )
    .is('espo_case_id', null)
    .not('status', 'in', '(closed,resolved)')   // PostgREST tuple syntax
    .order('created_at', { ascending: true })
    .limit(30);

  if (error) {
    // 42703 = espo_case_id column missing (migration 0062 not yet applied)
    if (error.code === '42703') {
      console.warn(
        '[ruhvi-sync] espo_case_id column missing on support_tickets — ' +
          'skipping ticket retry. Apply supabase/migrations/0062_espo_integration.sql first.'
      );
      return { synced: 0, failed: 0 };
    }
    console.error('[ruhvi-sync] Supabase tickets query error:', error.message);
    return { synced: 0, failed: 0 };
  }

  let synced = 0;
  let failed = 0;

  for (const ticket of tickets ?? []) {
    try {
      const customer = Array.isArray(ticket.customer)
        ? ticket.customer[0]
        : ticket.customer;
      const customerEmail = customer?.email || '';

      // The ticket may already have a Case in EspoCRM if the column update
      // failed after a previous successful API call.
      const existing = await findCaseByTicketId(ticket.id);
      if (existing) {
        await supabase
          .from('support_tickets')
          .update({
            espo_case_id:         existing.id,
            espo_synced_at:       new Date().toISOString(),
            espo_last_sync_error: null,
          })
          .eq('id', ticket.id);
        synced++;
        console.log(
          `[ruhvi-sync] Linked existing Case ${existing.id} to ticket ${ticket.ticket_number}`
        );
        continue;
      }

      const { ok, data } = await createCase(
        {
          id:             ticket.id,
          ticket_number:  ticket.ticket_number,
          title:          ticket.title,
          description:    ticket.description,
          priority:       ticket.priority,
          status:         ticket.status,
          customer_name:  customer?.full_name || '',
          customer_phone: customer?.phone || '',
        },
        customerEmail
      );

      if (ok && data?.id) {
        await supabase
          .from('support_tickets')
          .update({
            espo_case_id:         data.id,
            espo_synced_at:       new Date().toISOString(),
            espo_last_sync_error: null,
          })
          .eq('id', ticket.id);
        synced++;
        console.log(`[ruhvi-sync] Created Case ${data.id} for ticket ${ticket.ticket_number}`);
      } else {
        const errMsg = JSON.stringify(data);
        await supabase
          .from('support_tickets')
          .update({ espo_last_sync_error: errMsg })
          .eq('id', ticket.id);
        failed++;
        console.error(
          `[ruhvi-sync] Failed to create Case for ${ticket.ticket_number}:`,
          errMsg
        );
      }
    } catch (err) {
      failed++;
      console.error(
        `[ruhvi-sync] Error syncing ticket ${ticket.ticket_number || ticket.id}:`,
        err.message
      );
    }
  }

  return { synced, failed };
}

// ---------------------------------------------------------------------------
// Direction 1c: staff (agents/managers/admins) -> EspoCRM Users + Teams
// ---------------------------------------------------------------------------
// Section 5 of the support spec: staff identity lives in Supabase (source of
// truth) and EspoCRM's User/Team membership is a synced copy. New staff are
// created as EspoCRM Users and added to the Support Team so they become
// instantly eligible for auto-assignment. Deactivated staff are removed from
// the Team (dropping them out of the assignment pool) but their User stays.
//
// The Support Team ID comes from the spec (6a929c74b2f843cbf).

const SUPPORT_TEAM_ID =
  process.env.ESPO_SUPPORT_TEAM_ID || '6a929c74b2f843cbf';

/** Find an EspoCRM User by email. Returns the record or null. */
async function findUserByEmail(email) {
  const enc = encodeURIComponent(email);
  const { ok, data } = await espoRequest(
    'GET',
    `User?where[0][type]=equals&where[0][attribute]=emailAddress&where[0][value]=${enc}&maxSize=1`
  );
  if (!ok || !Array.isArray(data?.list) || data.list.length === 0) return null;
  return data.list[0];
}

/** Create an EspoCRM User and add them to the Support Team. */
async function createUser(staff, teamIds) {
  const parts = (staff.full_name || '').trim().split(/\s+/);
  const payload = {
    userName: (staff.email || '').split('@')[0].toLowerCase(),
    emailAddress: staff.email || '',
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
    type: 'regular',
    teamsIds: teamIds,
  };
  return espoRequest('POST', 'User', payload);
}

/** Ensure a user's Team membership reflects the current set. */
async function syncUserTeams(userId, teamIds) {
  return espoRequest('PUT', `User/${userId}`, { teamsIds: teamIds });
}

async function syncStaffUsers() {
  console.log('[ruhvi-sync] Checking staff to sync to EspoCRM...');

  const { data: staff, error } = await supabase
    .from('users')
    .select('id, full_name, email, role, account_status, espo_user_id, updated_at')
    .in('role', ['staff', 'manager', 'admin', 'super_admin', 'SUPER_ADMIN'])
    .not('email', 'is', null)
    .limit(100);

  if (error) {
    // 42703 = users.account_status / espo_user_id column missing (migration not applied)
    if (error.code === '42703') {
      console.warn(
        '[ruhvi-sync] espo_user_id/account_status column missing on users — ' +
          'skipping staff sync. Apply supabase/migrations/0064_support_system_v2.sql first.'
      );
      return { created: 0, updated: 0, deactivated: 0, skipped: 0 };
    }
    console.error('[ruhvi-sync] Supabase staff query error:', error.message);
    return { created: 0, updated: 0, deactivated: 0, skipped: 0 };
  }

  let created = 0;
  let updated = 0;
  let deactivated = 0;
  let skipped = 0;

  for (const member of staff ?? []) {
    try {
      const isActive = member.account_status !== 'disabled' && member.account_status !== 'suspended';
      const teamIds = isActive ? [SUPPORT_TEAM_ID] : [];

      // Resolve the EspoCRM user (by stored id, else by email).
      let espoUser = null;
      if (member.espo_user_id) {
        const { ok, data } = await espoRequest('GET', `User/${member.espo_user_id}`);
        if (ok && data?.id) espoUser = data;
      }
      if (!espoUser) espoUser = await findUserByEmail(member.email);

      if (!espoUser) {
        // New staff member -> create User + join Team.
        const { ok, data } = await createUser(member, teamIds);
        if (ok && data?.id) {
          await supabase
            .from('users')
            .update({ espo_user_id: data.id, updated_at: new Date().toISOString() })
            .eq('id', member.id);
          created++;
          console.log(
            `[ruhvi-sync] Created EspoCRM User ${data.id} for ${member.email} (${isActive ? 'in Support Team' : 'no team'})`
          );
        } else {
          console.error(
            `[ruhvi-sync] Failed to create User for ${member.email}:`,
            JSON.stringify(data)
          );
        }
        continue;
      }

      // Existing User -> reconcile Team membership.
      const currentTeams = Array.isArray(espoUser.teamsIds) ? espoUser.teamsIds : [];
      const hasSupport = currentTeams.includes(SUPPORT_TEAM_ID);
      if (isActive && !hasSupport) {
        const { ok } = await syncUserTeams(espoUser.id, [...currentTeams, SUPPORT_TEAM_ID]);
        if (ok) {
          updated++;
          console.log(`[ruhvi-sync] Added ${member.email} to Support Team`);
        }
      } else if (!isActive && hasSupport) {
        const { ok } = await syncUserTeams(
          espoUser.id,
          currentTeams.filter((t) => t !== SUPPORT_TEAM_ID)
        );
        if (ok) {
          deactivated++;
          console.log(`[ruhvi-sync] Removed ${member.email} from Support Team (deactivated)`);
        }
      }

      // Backfill espo_user_id if it was missing.
      if (!member.espo_user_id) {
        await supabase
          .from('users')
          .update({ espo_user_id: espoUser.id, updated_at: new Date().toISOString() })
          .eq('id', member.id);
      }
    } catch (err) {
      skipped++;
      console.error(`[ruhvi-sync] Error syncing staff ${member.id}:`, err.message);
    }
  }

  return { created, updated, deactivated, skipped };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const startedAt = new Date().toISOString();
  console.log(`\n[ruhvi-sync] === Run started at ${startedAt} ===`);
  console.log(`[ruhvi-sync] EspoCRM: ${ESPO_BASE_URL}`);
  console.log(`[ruhvi-sync] Supabase: ${SUPABASE_URL}`);

  const [contactResult, ticketResult, staffResult] = await Promise.allSettled([
    syncNewCustomers(),
    retryFailedTicketSyncs(),
    syncStaffUsers(),
  ]);

  const contacts =
    contactResult.status === 'fulfilled'
      ? contactResult.value
      : { created: 0, skipped: 0, error: contactResult.reason?.message };

  const tickets =
    ticketResult.status === 'fulfilled'
      ? ticketResult.value
      : { synced: 0, failed: 0, error: ticketResult.reason?.message };

  const staff =
    staffResult.status === 'fulfilled'
      ? staffResult.value
      : { created: 0, updated: 0, deactivated: 0, skipped: 0, error: staffResult.reason?.message };

  if (contacts.error) console.error('[ruhvi-sync] Contact sync error:', contacts.error);
  if (tickets.error)  console.error('[ruhvi-sync] Ticket sync error:',  tickets.error);
  if (staff.error)    console.error('[ruhvi-sync] Staff sync error:',    staff.error);

  console.log(
    `[ruhvi-sync] === Done. ` +
      `Contacts: +${contacts.created} created, ${contacts.skipped} already linked. ` +
      `Tickets: +${tickets.synced} synced, ${tickets.failed} failed. ` +
      `Staff: +${staff.created} created, ${staff.updated} joined team, ` +
      `${staff.deactivated} removed, ${staff.skipped} skipped. ===\n`
  );

  // Exit 1 so cron logs can detect failures
  if (contacts.error || tickets.error || tickets.failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[ruhvi-sync] Fatal:', err.message);
  process.exit(1);
});