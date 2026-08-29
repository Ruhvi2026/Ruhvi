#!/usr/bin/env node
/**
 * Ruhvi Support — Auto-Close Cron (spec support-1.md §3.2)
 * ========================================================
 * Runs alongside sync.mjs on the ruhvi-crm1 VM (suggested: every 10 minutes).
 *
 * Closes tickets that are waiting on the customer and got no reply for 24 hours:
 *   - status = 'waiting_for_customer'
 *   - pending_customer_reply_since <= now() - 24h
 *
 * On auto-close:
 *   - status  -> 'closed'
 *   - close_reason -> 'auto_closed_no_reply'
 *   - closed_at -> now()
 *   - auto_close_eligible_until -> now() + 30 days (reopen window)
 *   - audit log row (actor = system)
 *
 * The customer-facing pre-close warning ("we haven't heard back...") is a
 * derived value the UI computes from pending_customer_reply_since (e.g. >= 20h
 * elapsed), so no separate scheduler step is needed for it.
 *
 * Config (env vars — same as sync.mjs):
 *   SUPABASE_URL              https://<ref>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY <service_role key>
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    '[ruhvi-auto-close] Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const AUTO_CLOSE_AFTER_MS = 24 * 60 * 60 * 1000; // 24 hours

async function autoCloseStaleTickets() {
  console.log('[ruhvi-auto-close] Checking for stale waiting-for-customer tickets...');

  const cutoff = new Date(Date.now() - AUTO_CLOSE_AFTER_MS).toISOString();

  const { data: tickets, error } = await supabase
    .from('support_tickets')
    .select('id, ticket_number, pending_customer_reply_since')
    .eq('status', 'waiting_for_customer')
    .not('pending_customer_reply_since', 'is', null)
    .lte('pending_customer_reply_since', cutoff)
    .limit(50);

  if (error) {
    console.error('[ruhvi-auto-close] Query error:', error.message);
    // 42703 = column missing (migration 0064 not applied)
    if (error.code === '42703') {
      console.warn(
        '[ruhvi-auto-close] pending_customer_reply_since column missing — ' +
          'apply supabase/migrations/0064_support_system_v2.sql first.'
      );
    }
    process.exit(1);
  }

  if (!tickets || tickets.length === 0) {
    console.log('[ruhvi-auto-close] No stale tickets found.');
    return 0;
  }

  const nowIso = new Date().toISOString();
  const eligibleUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  let closed = 0;
  for (const ticket of tickets ?? []) {
    const { error: updateErr } = await supabase
      .from('support_tickets')
      .update({
        status: 'closed',
        close_reason: 'auto_closed_no_reply',
        closed_at: nowIso,
        auto_close_eligible_until: eligibleUntil,
        pending_customer_reply_since: null,
        updated_at: nowIso,
      })
      .eq('id', ticket.id);

    if (updateErr) {
      console.error(
        `[ruhvi-auto-close] Failed to close ${ticket.ticket_number}:`,
        updateErr.message
      );
      continue;
    }

    await supabase.from('support_ticket_audit_log').insert({
      ticket_id: ticket.id,
      actor_id: null,
      actor_type: 'system',
      action: 'auto_closed_no_reply',
      old_value: { status: 'waiting_for_customer' },
      new_value: {
        status: 'closed',
        close_reason: 'auto_closed_no_reply',
        auto_close_eligible_until: eligibleUntil,
      },
    });

    closed++;
    console.log(
      `[ruhvi-auto-close] Closed ${ticket.ticket_number} (no customer reply in 24h)`
    );
  }

  return closed;
}

async function main() {
  console.log(`\n[ruhvi-auto-close] === Run started at ${new Date().toISOString()} ===`);
  const closed = await autoCloseStaleTickets();
  console.log(`[ruhvi-auto-close] === Done. Closed ${closed} ticket(s). ===\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[ruhvi-auto-close] Fatal:', err.message);
  process.exit(1);
});
