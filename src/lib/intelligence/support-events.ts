import 'server-only';

import { getServiceClient } from '@/lib/supabase/service';
import {
  createBusinessEvent,
  validateBusinessEvent,
  type BusinessEvent,
  type BusinessEventType,
  type EventSource,
  type EventActor,
} from './event-contract';

/**
 * ============================================================================
 * SUPPORT & CRM ACTIVITY EVENT PIPELINE (TRACK B - PHASE 12)
 * ============================================================================
 * Observes customer support and CRM lifecycle events (ticket creation,
 * assignment, replies, resolution, closing, reopening) for the Shared
 * Intelligence Layer.
 *
 * Guarantees:
 * 1. Strict Customer Privacy & Confidentiality: NEVER captures message bodies,
 *    private notes, conversational transcripts, or file attachment URLs.
 * 2. Pure Operational Signals: Tracks strictly operational metrics: SLA compliance,
 *    first-response times, resolution durations, priority, and agent assignment.
 * 3. CRM & System-of-Record Sync Safety: Read-only observation with deterministic
 *    idempotency keys; zero disruption to EspoCRM or live support workflows.
 * 4. PII Protection: Masked/minimized identifiers; customer phone/email excluded.
 */

export type SupportTicketStatus =
  | 'new'
  | 'open'
  | 'in_progress'
  | 'waiting_for_customer'
  | 'waiting_for_team'
  | 'resolved'
  | 'closed'
  | 'reopened';

export type SupportTicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface ObserveTicketLifecycleParams {
  ticketId: string;
  ticketNumber: string;
  status: SupportTicketStatus;
  previousStatus?: SupportTicketStatus;
  priority?: SupportTicketPriority;
  categoryId?: string;
  categoryName?: string;
  orderId?: string;
  assignedTo?: string;
  source?: 'ai_chat' | 'manual' | 'email' | 'crm';
  slaBreached?: boolean;
  responseTimeMs?: number;
  resolutionTimeMs?: number;
  actor?: EventActor;
  idempotencyKey?: string;
}

export interface ObserveTicketReplyParams {
  ticketId: string;
  ticketNumber: string;
  messageId: string;
  senderType: 'customer' | 'staff' | 'system' | 'ai';
  senderId?: string;
  visibility?: 'customer' | 'internal';
  hasAttachments?: boolean;
  actor?: EventActor;
}

export interface ObserveTicketLifecycleResult {
  observed: boolean;
  event: BusinessEvent;
  idempotencyKey: string;
}

/**
 * Maps ticket status or operational transition to canonical BusinessEventType.
 */
export function mapTicketStatusToEventType(
  status: SupportTicketStatus,
  isInitialCreation: boolean = false
): BusinessEventType {
  if (isInitialCreation || status === 'new' || status === 'open') {
    return 'SUPPORT_TICKET_CREATED';
  }
  switch (status) {
    case 'resolved':
      return 'SUPPORT_TICKET_RESOLVED';
    case 'closed':
      return 'SUPPORT_TICKET_CLOSED';
    case 'reopened':
      return 'SUPPORT_TICKET_REOPENED';
    case 'in_progress':
    case 'waiting_for_customer':
    case 'waiting_for_team':
    default:
      return 'SUPPORT_TICKET_ASSIGNED';
  }
}

/**
 * Observes, normalizes, and validates a support ticket lifecycle transition.
 * Guaranteed zero message content leakage.
 */
export async function observeTicketLifecycleTransition(
  params: ObserveTicketLifecycleParams
): Promise<ObserveTicketLifecycleResult> {
  const {
    ticketId,
    ticketNumber,
    status,
    previousStatus,
    priority = 'normal',
    categoryId,
    categoryName,
    orderId,
    assignedTo,
    source = 'ai_chat',
    slaBreached = false,
    responseTimeMs,
    resolutionTimeMs,
    actor = { type: 'staff', id: assignedTo },
    idempotencyKey,
  } = params;

  const isInitial = !previousStatus || previousStatus === 'new';
  const eventType = mapTicketStatusToEventType(status, isInitial);

  // Deterministic idempotency key per ticket transition
  const deterministicKey =
    idempotencyKey ||
    (isInitial
      ? `idemp_supp_create_${ticketId}`
      : `idemp_supp_status_${ticketId}_${status}`);

  // Operational metadata ONLY — strictly no message body or conversational text
  const payload: Record<string, any> = {
    ticketId,
    ticketNumber,
    status,
    previousStatus: previousStatus || undefined,
    priority,
    categoryId: categoryId || undefined,
    categoryName: categoryName || undefined,
    orderId: orderId || undefined,
    assignedTo: assignedTo || undefined,
    source,
    slaBreached,
    responseTimeMs:
      responseTimeMs !== undefined ? Number(responseTimeMs) : undefined,
    resolutionTimeMs:
      resolutionTimeMs !== undefined ? Number(resolutionTimeMs) : undefined,
  };

  // Strip undefined values
  Object.keys(payload).forEach(
    (key) => payload[key] === undefined && delete payload[key]
  );

  const event = createBusinessEvent({
    eventType,
    source: 'support_portal',
    idempotencyKey: deterministicKey,
    actor,
    entity: {
      type: 'ticket',
      id: ticketId,
      code: ticketNumber,
    },
    payload,
  });

  return {
    observed: true,
    event,
    idempotencyKey: deterministicKey,
  };
}

/**
 * Observes a ticket reply activity signal without capturing confidential text.
 */
export async function observeTicketReply(
  params: ObserveTicketReplyParams
): Promise<ObserveTicketLifecycleResult> {
  const {
    ticketId,
    ticketNumber,
    messageId,
    senderType,
    senderId,
    visibility = 'customer',
    hasAttachments = false,
    actor = {
      type:
        senderType === 'ai'
          ? 'ai_agent'
          : senderType === 'customer'
            ? 'customer'
            : 'staff',
      id: senderId,
    },
  } = params;

  const deterministicKey = `idemp_supp_reply_${messageId}`;

  const payload: Record<string, any> = {
    ticketId,
    ticketNumber,
    messageId,
    senderType,
    visibility,
    hasAttachments,
  };

  const event = createBusinessEvent({
    eventType: 'SUPPORT_TICKET_REPLIED',
    source: 'support_portal',
    idempotencyKey: deterministicKey,
    actor,
    entity: {
      type: 'ticket',
      id: ticketId,
      code: ticketNumber,
    },
    payload,
  });

  return {
    observed: true,
    event,
    idempotencyKey: deterministicKey,
  };
}

/**
 * Reads historical ticket lifecycle metadata from PostgreSQL public.support_tickets.
 */
export async function fetchTicketLifecycleEvents(
  ticketId: string
): Promise<BusinessEvent[]> {
  const supabase = getServiceClient();

  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .select(
      'id, ticket_number, priority, status, source, assigned_to, created_at, first_response_at, resolved_at, closed_at, sla_breached'
    )
    .eq('id', ticketId)
    .single();

  if (error || !ticket) {
    return [];
  }

  const events: BusinessEvent[] = [];

  // 1. Ticket Created Event
  const createdCandidate = {
    id: `evt_supp_created_${ticket.id}`,
    schemaVersion: 1,
    eventType: 'SUPPORT_TICKET_CREATED' as BusinessEventType,
    source: 'support_portal' as EventSource,
    timestamp: ticket.created_at,
    idempotencyKey: `idemp_supp_create_${ticket.id}`,
    actor: { type: 'customer' as const },
    entity: {
      type: 'ticket',
      id: ticket.id,
      code: ticket.ticket_number,
    },
    payload: {
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number,
      priority: ticket.priority,
      status: 'new',
      source: ticket.source,
    },
  };
  const valCreated = validateBusinessEvent(createdCandidate);
  if (valCreated.success && valCreated.event) events.push(valCreated.event);

  // 2. Ticket Resolved Event (if resolved)
  if (ticket.resolved_at) {
    const resolvedCandidate = {
      id: `evt_supp_resolved_${ticket.id}`,
      schemaVersion: 1,
      eventType: 'SUPPORT_TICKET_RESOLVED' as BusinessEventType,
      source: 'support_portal' as EventSource,
      timestamp: ticket.resolved_at,
      idempotencyKey: `idemp_supp_status_${ticket.id}_resolved`,
      actor: { type: 'staff' as const, id: ticket.assigned_to || undefined },
      entity: {
        type: 'ticket',
        id: ticket.id,
        code: ticket.ticket_number,
      },
      payload: {
        ticketId: ticket.id,
        ticketNumber: ticket.ticket_number,
        status: 'resolved',
        slaBreached: ticket.sla_breached,
      },
    };
    const valResolved = validateBusinessEvent(resolvedCandidate);
    if (valResolved.success && valResolved.event)
      events.push(valResolved.event);
  }

  // 3. Ticket Closed Event (if closed)
  if (ticket.closed_at) {
    const closedCandidate = {
      id: `evt_supp_closed_${ticket.id}`,
      schemaVersion: 1,
      eventType: 'SUPPORT_TICKET_CLOSED' as BusinessEventType,
      source: 'support_portal' as EventSource,
      timestamp: ticket.closed_at,
      idempotencyKey: `idemp_supp_status_${ticket.id}_closed`,
      actor: { type: 'staff' as const, id: ticket.assigned_to || undefined },
      entity: {
        type: 'ticket',
        id: ticket.id,
        code: ticket.ticket_number,
      },
      payload: {
        ticketId: ticket.id,
        ticketNumber: ticket.ticket_number,
        status: 'closed',
      },
    };
    const valClosed = validateBusinessEvent(closedCandidate);
    if (valClosed.success && valClosed.event) events.push(valClosed.event);
  }

  return events;
}
