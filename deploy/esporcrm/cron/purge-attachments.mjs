#!/usr/bin/env node
/**
 * Ruhvi Support — Attachment Purge Cron (spec support-1.md §8)
 * =============================================================
 * Runs alongside sync.mjs on the ruhvi-crm1 VM (suggested: daily).
 *
 * Deletes support attachments 30 days after ticket closure:
 *   1. Finds tickets with status 'closed' and closed_at <= now() - 30 days.
 *   2. Deletes each attachment from Cloudinary via the Admin API.
 *   3. Deletes the attachment rows from support_ticket_attachments.
 *
 * If a ticket was reopened (status = 'reopened', or 'open' etc.) before the
 * purge runs, the ticket won't be picked up because its status is no longer
 * 'closed'. The purge only targets closed tickets.
 *
 * Config (env vars):
 *   SUPABASE_URL              https://<ref>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY <service_role key>
 *   CLOUDINARY_CLOUD_NAME     tfelmupe
 *   CLOUDINARY_API_KEY        <from Cloudinary dashboard>
 *   CLOUDINARY_API_SECRET     <from Cloudinary dashboard>
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'tfelmupe';
const CLOUD_API_KEY = process.env.CLOUDINARY_API_KEY || '';
const CLOUD_API_SECRET = process.env.CLOUDINARY_API_SECRET || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[ruhvi-purge] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Delete a Cloudinary asset by public_id. */
async function deleteCloudinaryAsset(publicId) {
  if (!CLOUD_API_KEY || !CLOUD_API_SECRET) {
    console.warn('[ruhvi-purge] Cloudinary creds missing — skipping API delete');
    return false;
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const params = `public_id=${publicId}&timestamp=${timestamp}${CLOUD_API_SECRET}`;
  const crypto = await import('node:crypto');
  const signature = crypto.createHash('sha1').update(params).digest('hex');

  const formData = new FormData();
  formData.append('public_id', publicId);
  formData.append('api_key', CLOUD_API_KEY);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`,
    { method: 'POST', body: formData }
  );
  const data = await res.json();
  return data.result === 'ok';
}

async function purgeAttachments() {
  console.log(`[ruhvi-purge] [${today()}] Checking for expired attachments...`);

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: tickets, error } = await supabase
    .from('support_tickets')
    .select('id, ticket_number, closed_at')
    .eq('status', 'closed')
    .lte('closed_at', cutoff)
    .limit(100);

  if (error) {
    console.error('[ruhvi-purge] Query error:', error.message);
    return 0;
  }

  if (!tickets || tickets.length === 0) {
    console.log('[ruhvi-purge] No expired tickets found.');
    return 0;
  }

  const ticketIds = tickets.map((t) => t.id);
  console.log(
    `[ruhvi-purge] Found ${ticketIds.length} tickets closed > 30 days ago. Purging attachments...`
  );

  const { data: attachments } = await supabase
    .from('support_ticket_attachments')
    .select('id, cloudinary_public_id')
    .in('ticket_id', ticketIds);

  if (!attachments || attachments.length === 0) {
    console.log('[ruhvi-purge] No attachments to purge.');
    return 0;
  }

  let purged = 0;
  let failed = 0;

  for (const att of attachments) {
    if (att.cloudinary_public_id) {
      const ok = await deleteCloudinaryAsset(att.cloudinary_public_id);
      if (!ok) {
        console.warn(
          `[ruhvi-purge] Cloudinary delete failed for ${att.cloudinary_public_id}`
        );
        failed++;
      }
    }

    const { error: delErr } = await supabase
      .from('support_ticket_attachments')
      .delete()
      .eq('id', att.id);

    if (delErr) {
      console.error(`[ruhvi-purge] DB delete failed for attachment ${att.id}:`, delErr.message);
      failed++;
    } else {
      purged++;
    }
  }

  console.log(`[ruhvi-purge] Purged ${purged} attachments (${failed} failed).`);
  return purged;
}

async function main() {
  console.log(`\n[ruhvi-purge] === Run started at ${new Date().toISOString()} ===`);
  const purged = await purgeAttachments();
  console.log(`[ruhvi-purge] === Done. Purged ${purged} attachment(s). ===\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[ruhvi-purge] Fatal:', err.message);
  process.exit(1);
});