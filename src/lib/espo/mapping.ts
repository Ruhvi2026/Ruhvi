/**
 * Status and priority mapping between Ruhvi (Supabase) and EspoCRM.
 *
 * Ruhvi uses a richer set of statuses (8 statuses) while EspoCRM uses a leaner
 * default set (New, Assigned, Pending, On Hold, Closed). To preserve round-trip
 * fidelity, the canonical Ruhvi status is stored in a custom field
 * `ruhviStatus_c` on the EspoCRM Case entity. When reading back, the canonical
 * field is preferred; the mapped EspoCRM status is used for UI display.
 */

import type { StatusMappingEntry, PriorityMappingEntry } from './types';

/** Default status mapping: Ruhvi → EspoCRM. */
export const STATUS_MAP: StatusMappingEntry[] = [
  { ruhvi: 'new', espo: 'New' },
  { ruhvi: 'open', espo: 'Assigned' },
  { ruhvi: 'in_progress', espo: 'In Process' },
  { ruhvi: 'waiting_for_customer', espo: 'Pending' },
  { ruhvi: 'waiting_for_team', espo: 'On Hold' },
  { ruhvi: 'resolved', espo: 'Closed' },
  { ruhvi: 'closed', espo: 'Closed' },
  { ruhvi: 'reopened', espo: 'Reopened' },
  { ruhvi: 'rejected', espo: 'Rejected' },
  { ruhvi: 'duplicate', espo: 'Duplicate' },
];

/** Reverse mapping: EspoCRM → Ruhvi. */
const ESPO_TO_RUHVI_STATUS: Record<string, string> = {};
for (const entry of STATUS_MAP) {
  ESPO_TO_RUHVI_STATUS[entry.espo] = entry.ruhvi;
}

/** Default priority mapping: Ruhvi → EspoCRM. */
export const PRIORITY_MAP: PriorityMappingEntry[] = [
  { ruhvi: 'low', espo: 'Low' },
  { ruhvi: 'normal', espo: 'Normal' },
  { ruhvi: 'high', espo: 'High' },
  { ruhvi: 'urgent', espo: 'Urgent' },
];

const ESPO_TO_RUHVI_PRIORITY: Record<string, string> = {};
for (const entry of PRIORITY_MAP) {
  ESPO_TO_RUHVI_PRIORITY[entry.espo] = entry.ruhvi;
}

/**
 * Map a Ruhvi status to its EspoCRM equivalent.
 * Falls back to the Ruhvi status as-is if no mapping exists.
 */
export function ruhviStatusToEspo(ruhviStatus: string): string {
  const found = STATUS_MAP.find((e) => e.ruhvi === ruhviStatus);
  return found?.espo ?? ruhviStatus;
}

/**
 * Map an EspoCRM status to its Ruhvi equivalent.
 * Falls back to the EspoCRM status as-is if no mapping exists.
 */
export function espoStatusToRuhvi(espoStatus: string): string {
  return ESPO_TO_RUHVI_STATUS[espoStatus] ?? espoStatus.toLowerCase();
}

/**
 * Map a Ruhvi priority to its EspoCRM equivalent.
 */
export function ruhviPriorityToEspo(ruhviPriority: string): string {
  const found = PRIORITY_MAP.find((e) => e.ruhvi === ruhviPriority);
  return found?.espo ?? ruhviPriority;
}

/**
 * Map an EspoCRM priority to its Ruhvi equivalent.
 */
export function espoPriorityToRuhvi(espoPriority: string): string {
  return ESPO_TO_RUHVI_PRIORITY[espoPriority] ?? espoPriority.toLowerCase();
}

/**
 * Fields that should be synced from EspoCRM back to the Ruhvi ticket.
 */
export const SYNCABLE_FIELDS = [
  'status',
  'priority',
  'assignedUserId',
  'assignedUserName',
] as const;
