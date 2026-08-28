import 'server-only';

import { getEspoConfig } from './config';
import { EspoClient } from './client';
import { ruhviStatusToEspo, ruhviPriorityToEspo } from './mapping';
import type { RuhviTicket } from './types';

/**
 * Orchestrates outbound sync from Ruhvi (Supabase) → EspoCRM.
 *
 * All functions are **non-blocking**: they swallow errors and log them, so
 * existing API flows never break.  Gated by ESPO_ENABLED.
 */

let client: EspoClient | null = null;

function getClient(): EspoClient | null {
  const cfg = getEspoConfig();
  if (!cfg.enabled || !cfg.apiKey) return null;
  if (!client) {
    client = new EspoClient({ baseUrl: cfg.baseUrl, apiKey: cfg.apiKey });
  }
  return client;
}

/**
 * Push a newly created Ruhvi ticket to EspoCRM as a Case.
 * Stores the returned EspoCRM case ID on the Supabase ticket.
 */
export async function pushTicketToEspo(
  ticket: Pick<
    RuhviTicket,
    | 'id'
    | 'ticket_number'
    | 'title'
    | 'description'
    | 'priority'
    | 'status'
    | 'customer_email'
    | 'customer_name'
    | 'customer_phone'
    | 'assigned_to'
  >,
  supabase: any
): Promise<void> {
  const c = getClient();
  if (!c) return;

  try {
    const { data: existing, error: findErr } = await c.findCaseByTicketId(
      ticket.id
    );
    if (findErr) {
      console.error('[EspoCRM] find case error:', findErr);
      return;
    }

    if (existing) {
      await supabase
        .from('support_tickets')
        .update({
          espo_case_id: existing.id,
          espo_synced_at: new Date().toISOString(),
        })
        .eq('id', ticket.id);
      return;
    }

    const body: Record<string, unknown> = {
      name: `[${ticket.ticket_number}] ${ticket.title}`,
      description: ticket.description,
      status: ruhviStatusToEspo(ticket.status),
      priority: ruhviPriorityToEspo(ticket.priority),
      ruhviTicketId_c: ticket.id,
      ruhviStatus_c: ticket.status,
      ruhviCustomerEmail_c: ticket.customer_email || '',
      ruhviCustomerName_c: ticket.customer_name || '',
      ruhviCustomerPhone_c: ticket.customer_phone || '',
    };

    const { data: created, error: createErr } = await c.createCase(body);
    if (createErr) {
      console.error('[EspoCRM] create case error:', createErr);
      return;
    }

    if (created?.id) {
      await supabase
        .from('support_tickets')
        .update({
          espo_case_id: created.id,
          espo_synced_at: new Date().toISOString(),
        })
        .eq('id', ticket.id);
    }
  } catch (err) {
    console.error('[EspoCRM] pushTicketToEspo error:', err);
  }
}

/**
 * Load a ticket (with customer context) from Supabase and push it to EspoCRM.
 * Fire-and-forget wrapper for use in API routes. Never throws.
 */
export async function syncTicketToEspo(
  ticketId: string,
  supabase: any
): Promise<void> {
  try {
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select(
        `id, ticket_number, title, description, priority, status, assigned_to,
         customer:customer_id(email, full_name, phone)`
      )
      .eq('id', ticketId)
      .maybeSingle();
    if (!ticket) return;

    const customer = Array.isArray(ticket.customer)
      ? ticket.customer[0]
      : ticket.customer;

    await pushTicketToEspo(
      {
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        title: ticket.title,
        description: ticket.description,
        priority: ticket.priority,
        status: ticket.status,
        customer_email: customer?.email || null,
        customer_name: customer?.full_name || null,
        customer_phone: customer?.phone || null,
        assigned_to: ticket.assigned_to || null,
      },
      supabase
    );
  } catch (err) {
    console.error('[EspoCRM] syncTicketToEspo error:', err);
  }
}

/**
 * Push a ticket update (status/priority/assignment) to its EspoCRM Case.
 */
export async function pushTicketUpdateToEspo(
  ticketId: string,
  updates: Record<string, unknown>
): Promise<void> {
  const c = getClient();
  if (!c) return;

  try {
    const { data: existing, error: findErr } =
      await c.findCaseByTicketId(ticketId);
    if (findErr || !existing) {
      console.error('[EspoCRM] find case for update error:', findErr);
      return;
    }

    const body: Record<string, unknown> = {};
    if (updates.status) {
      body.status = ruhviStatusToEspo(updates.status as string);
      body.ruhviStatus_c = updates.status as string;
    }
    if (updates.priority) {
      body.priority = ruhviPriorityToEspo(updates.priority as string);
    }

    if (Object.keys(body).length === 0) return;

    const { error: updateErr } = await c.updateCase(existing.id, body);
    if (updateErr) {
      console.error('[EspoCRM] update case error:', updateErr);
    }
  } catch (err) {
    console.error('[EspoCRM] pushTicketUpdateToEspo error:', err);
  }
}

/**
 * Push a new message (customer/staff reply) to the EspoCRM case as a Note.
 */
export async function pushMessageToEspo(
  ticketId: string,
  message: {
    sender_type: string;
    message: string;
    visibility: string;
    created_at: string;
  }
): Promise<void> {
  const c = getClient();
  if (!c) return;

  if (message.visibility === 'internal') return;

  try {
    const { data: existing, error: findErr } =
      await c.findCaseByTicketId(ticketId);
    if (findErr || !existing) return;

    const prefix =
      message.sender_type === 'staff'
        ? '[Staff] '
        : message.sender_type === 'customer'
          ? '[Customer] '
          : '[System] ';
    const post = `${prefix}${message.message}`;

    const { error: noteErr } = await c.addNote(existing.id, post);
    if (noteErr) {
      console.error('[EspoCRM] add note error:', noteErr);
    }
  } catch (err) {
    console.error('[EspoCRM] pushMessageToEspo error:', err);
  }
}
