import { NextResponse } from 'next/server';
import { getEspoConfig } from '@/lib/espo/config';

/**
 * GET /api/integrations/espo/health
 *
 * Simple health check for the EspoCRM integration. Returns the integration
 * status (enabled/disabled) and the configured base URL (without secrets).
 */
export async function GET() {
  const cfg = getEspoConfig();

  return NextResponse.json({
    integration: 'EspoCRM',
    status: cfg.enabled ? 'enabled' : 'disabled',
    baseUrl: cfg.enabled ? cfg.baseUrl : null,
    contextEndpoint: cfg.enabled
      ? `${cfg.ruhviBaseUrl}/api/integrations/espo/context`
      : null,
    webhookEndpoint: cfg.enabled
      ? `${cfg.ruhviBaseUrl}/api/integrations/espo/webhook`
      : null,
    timestamp: new Date().toISOString(),
  });
}
