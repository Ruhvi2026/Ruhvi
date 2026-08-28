import 'server-only';

import type { EspoCasePayload, EspoNotePayload } from './types';

/**
 * EspoCRM REST API client (server-side only).
 *
 * Calls EspoCRM REST API v1 (compatible with EspoCRM 8.x / 9.x).
 * Auth: Bearer token (API Key) via `X-Api-Key` header.
 * Custom field names: EspoCRM appends `_c` to custom fields (e.g., `ruhviTicketId_c`).
 */

const API_PATH = '/api/v1';

export interface EspoClientOptions {
  baseUrl: string;
  apiKey: string;
}

export class EspoClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(opts: EspoClientOptions) {
    this.baseUrl = `${opts.baseUrl.replace(/\/$/, '')}${API_PATH}`;
    this.apiKey = opts.apiKey;
  }

  private get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Api-Key': this.apiKey,
    };
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<{ data: T | null; error: string | null }> {
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: this.headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        return { data: null, error: `EspoCRM ${res.status}: ${text}` };
      }
      if (res.status === 204) {
        return { data: null, error: null };
      }
      const json = await res.json();
      return { data: json as T, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: `EspoCRM connection error: ${msg}` };
    }
  }

  /**
   * Create a Case in EspoCRM.
   * The `ruhviTicketId_c` custom field links it back to the Supabase ticket.
   */
  async createCase(
    fields: Record<string, unknown>
  ): Promise<{ data: EspoCasePayload | null; error: string | null }> {
    return this.request<EspoCasePayload>('POST', '/Case', fields);
  }

  /**
   * Update an existing Case in EspoCRM.
   * Sends only the fields that changed.
   */
  async updateCase(
    caseId: string,
    fields: Record<string, unknown>
  ): Promise<{ data: EspoCasePayload | null; error: string | null }> {
    return this.request<EspoCasePayload>('PUT', `/Case/${caseId}`, fields);
  }

  /**
   * Find a Case by the Ruhvi ticket UUID stored in the custom field.
   * Returns null if no match.
   */
  async findCaseByTicketId(
    ticketId: string
  ): Promise<{ data: EspoCasePayload | null; error: string | null }> {
    const path = `/Case?where[ruhviTicketId_c]=${encodeURIComponent(ticketId)}`;
    const { data, error } = await this.request<{ list: EspoCasePayload[] }>(
      'GET',
      path
    );
    if (error) return { data: null, error };
    const list = data?.list ?? [];
    return { data: list[0] ?? null, error: null };
  }

  /**
   * Add a Note (comment) to a Case.
   */
  async addNote(
    caseId: string,
    post: string,
    createdById: string | null = null
  ): Promise<{ data: EspoNotePayload | null; error: string | null }> {
    return this.request<EspoNotePayload>('POST', '/Note', {
      parentType: 'Case',
      parentId: caseId,
      post,
      type: 'Post',
      ...(createdById ? { createdById } : {}),
    });
  }

  /**
   * Fetch a Case by its ID.
   */
  async getCase(
    caseId: string
  ): Promise<{ data: EspoCasePayload | null; error: string | null }> {
    return this.request<EspoCasePayload>('GET', `/Case/${caseId}`);
  }
}
