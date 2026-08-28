import 'server-only';

/**
 * EspoCRM integration configuration (server-side only).
 *
 * EspoCRM is deployed independently on the VPS at crm.support.ruhvi.in and acts
 * as the agent console for customer support. Supabase remains the single source
 * of truth for customers/orders/wallet — EspoCRM only holds Cases (tickets) and
 * pulls context on demand via the Ruhvi context API (see
 * /api/integrations/espo/context).
 *
 * All integration traffic is gated behind ESPO_ENABLED so the existing support
 * flows are unaffected when EspoCRM is not configured.
 */

export interface EspoConfig {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  webhookSecret: string;
  ruhviBaseUrl: string;
  defaultAssigneeEmail: string | null;
}

const DEFAULT_RUHVI_BASE =
  process.env.NEXT_PUBLIC_APP_URL || 'https://support.ruhvi.in';

export function getEspoConfig(): EspoConfig {
  return {
    enabled: process.env.ESPO_ENABLED === 'true',
    baseUrl: (
      process.env.ESPO_BASE_URL || 'https://crm.support.ruhvi.in'
    ).replace(/\/$/, ''),
    apiKey: process.env.ESPO_API_KEY || '',
    webhookSecret: process.env.ESPO_WEBHOOK_SECRET || '',
    ruhviBaseUrl: (process.env.RUHVI_BASE_URL || DEFAULT_RUHVI_BASE).replace(
      /\/$/,
      ''
    ),
    defaultAssigneeEmail: process.env.ESPO_DEFAULT_ASSIGNEE_EMAIL || null,
  };
}
