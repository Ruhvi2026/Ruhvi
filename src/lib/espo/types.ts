/**
 * EspoCRM ↔ Ruhvi integration shared types.
 */

/** Ruhvi (Supabase) support ticket – the source of truth. */
export interface RuhviTicket {
  id: string;
  ticket_number: string;
  customer_id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  source: string;
  assigned_to: string | null;
  order_id: string | null;
  product_id: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  espo_case_id: string | null;
  espo_synced_at: string | null;
  customer_email?: string;
  customer_name?: string;
  customer_phone?: string;
  created_at: string;
  updated_at: string;
}

/** Ruhvi support message – appended to EspoCRM cases as Notes. */
export interface RuhviMessage {
  id: string;
  ticket_id: string;
  sender_type: string;
  sender_id: string | null;
  message: string;
  visibility: string;
  created_at: string;
}

/** EspoCRM Case (as received via REST API). */
export interface EspoCasePayload {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  assignedUserId: string | null;
  assignedUserName: string | null;
  /** Custom field storing the Ruhvi ticket UUID. */
  ruhviTicketId_c: string | null;
  /** Custom field storing the Ruhvi ticket's canonical status for roundtrip fidelity. */
  ruhviStatus_c: string | null;
  /** Custom field storing the customer email for context-fetching. */
  ruhviCustomerEmail_c: string | null;
  /** Custom field storing the customer name. */
  ruhviCustomerName_c: string | null;
  /** Custom field storing the customer phone. */
  ruhviCustomerPhone_c: string | null;
  createdAt: string;
  modifiedAt: string;
}

/** EspoCRM Note (posted as comment on a Case). */
export interface EspoNotePayload {
  id: string;
  post: string;
  parentType: string;
  parentId: string;
  createdById: string | null;
  createdByName: string | null;
  createdAt: string;
}

/** Inbound webhook event from EspoCRM. */
export interface EspoWebhookEvent {
  eventType: 'case.create' | 'case.update' | 'note.create';
  /** The entity ID (Case ID or Note ID). */
  id: string;
  /** The full entity payload (varies by entity type). */
  payload: EspoCasePayload | EspoNotePayload;
  /** Timestamp of the event in ISO format. */
  timestamp?: string;
}

/** Status mapping entry. */
export interface StatusMappingEntry {
  ruhvi: string;
  espo: string;
}

/** Priority mapping entry. */
export interface PriorityMappingEntry {
  ruhvi: string;
  espo: string;
}
