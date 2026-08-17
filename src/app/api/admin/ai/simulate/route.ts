/**
 * Routing Simulation API — Dry-Run Trace
 * POST /api/admin/ai/simulate
 *
 * Traces the routing decision loop WITHOUT making any real AI API call.
 * Returns a step-by-step JSON trace of how the engine would route a request,
 * including which provider/credential would be selected at each stage,
 * their current health states, and what fallback decisions would be made.
 *
 * This is read-only: no credential health states are mutated.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { createServerClient } from '@supabase/ssr';
import { getAllCredentials } from '@/lib/ai/credentials';
import { getAllModelHealth } from '@/lib/ai/model-health';

async function verifyAdmin() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('__session')?.value;
  if (!sessionCookie) return false;
  try {
    const decoded = decodeJwt(sessionCookie);
    return Boolean(decoded?.sub);
  } catch {
    return false;
  }
}

function createAdminClient(cookieStore: any) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
      'https://igrkrkxdantrolbldapj.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );
}

export interface SimulationStep {
  step: number;
  type:
    | 'provider_selected'
    | 'credential_selected'
    | 'health_check'
    | 'model_check'
    | 'would_succeed'
    | 'would_failover_credential'
    | 'would_failover_provider'
    | 'exhausted';
  provider?: string;
  credential?: string;
  credentialHealth?: string;
  model?: string;
  modelStatus?: string;
  reason?: string;
  action?: string;
}

export async function POST(req: Request) {
  if (!(await verifyAdmin()))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { routingStrategy = 'priority', providersEnabled = [] } = await req
    .json()
    .catch(() => ({}));

  const cookieStore = await cookies();
  const db = createAdminClient(cookieStore);

  // Load all providers (represented as settings rows) via a simple query
  const { data: providerRows, error: provErr } = await db
    .from('ai_providers')
    .select('id, name, priority, is_enabled, routing_strategy')
    .eq('is_enabled', true)
    .order('priority', { ascending: true });

  if (provErr || !providerRows || providerRows.length === 0) {
    // Fallback: use the providersEnabled list from the request body if DB isn't available
    if (!providersEnabled || providersEnabled.length === 0) {
      return NextResponse.json({
        trace: [
          {
            step: 1,
            type: 'exhausted',
            reason: 'No enabled providers found in database or request.',
          },
        ],
        summary: {
          wouldSucceed: false,
          selectedProvider: null,
          selectedCredential: null,
        },
      });
    }
  }

  const providers: any[] =
    providerRows ??
    providersEnabled.map((p: any) => ({
      id: p.id || p.type,
      name: p.name,
      priority: p.priority || 1,
      is_enabled: p.isEnabled !== false,
    }));

  const steps: SimulationStep[] = [];
  let stepNum = 0;

  let wouldSucceed = false;
  let selectedProvider: string | null = null;
  let selectedCredential: string | null = null;
  let selectedModel: string | null = null;

  // Simulate the priority/routing chain
  for (const provider of providers) {
    stepNum++;
    steps.push({
      step: stepNum,
      type: 'provider_selected',
      provider: provider.name || provider.id,
      reason: `Strategy: ${routingStrategy}. Provider priority: ${provider.priority ?? 'N/A'}.`,
    });

    // Load credentials for this provider
    const credentials = await getAllCredentials(provider.id, db);
    const healthyCredentials = credentials.filter(
      (c) => c.is_enabled && ['healthy', 'unknown'].includes(c.health_status)
    );
    const degradedCredentials = credentials.filter(
      (c) =>
        c.is_enabled && ['rate_limited', 'cooldown'].includes(c.health_status)
    );
    const invalidCredentials = credentials.filter(
      (c) => c.is_enabled && c.health_status === 'invalid'
    );

    if (credentials.length === 0) {
      stepNum++;
      steps.push({
        step: stepNum,
        type: 'would_failover_provider',
        provider: provider.name || provider.id,
        reason:
          'No credentials configured for this provider. Skipping to next.',
        action: 'SKIP_PROVIDER',
      });
      continue;
    }

    // Pick best credential
    const credToUse = healthyCredentials[0] ?? degradedCredentials[0] ?? null;

    if (!credToUse) {
      stepNum++;
      steps.push({
        step: stepNum,
        type: 'would_failover_provider',
        provider: provider.name || provider.id,
        reason: `All ${credentials.length} credential(s) are invalid or exhausted. Cannot use this provider.`,
        action: 'FAILOVER_TO_NEXT_PROVIDER',
      });
      continue;
    }

    stepNum++;
    steps.push({
      step: stepNum,
      type: 'credential_selected',
      provider: provider.name || provider.id,
      credential: credToUse.display_name,
      credentialHealth: credToUse.health_status,
      reason:
        credToUse.health_status === 'healthy'
          ? 'Credential is healthy and available.'
          : `Credential is ${credToUse.health_status} but still eligible (cooldown may apply).`,
    });

    stepNum++;
    steps.push({
      step: stepNum,
      type: 'health_check',
      provider: provider.name || provider.id,
      credential: credToUse.display_name,
      credentialHealth: credToUse.health_status,
      action:
        credToUse.health_status === 'healthy'
          ? 'PASS — credential is healthy'
          : credToUse.health_status === 'cooldown'
            ? `WARN — credential is in cooldown until ${credToUse.cooldown_until ?? 'unknown'}`
            : `WARN — credential is ${credToUse.health_status}`,
    });

    // Check model health
    const models = await getAllModelHealth(provider.id, db);
    const defaultModel = models.find(
      (m) => m.is_default && m.status === 'active'
    );
    const anyActiveModel = models.find((m) => m.status === 'active');
    const modelToUse = defaultModel ?? anyActiveModel;

    if (!modelToUse) {
      stepNum++;
      steps.push({
        step: stepNum,
        type: 'model_check',
        provider: provider.name || provider.id,
        reason: `No active models found (${models.length} total, all unavailable/deprecated).`,
        action: 'FAILOVER_MODEL → FAILOVER_PROVIDER',
      });
      continue;
    }

    stepNum++;
    steps.push({
      step: stepNum,
      type: 'model_check',
      provider: provider.name || provider.id,
      model: modelToUse.model_id,
      modelStatus: modelToUse.status,
      reason: modelToUse.is_default
        ? 'Default model is active.'
        : 'Non-default model selected (default unavailable).',
      action: 'PASS',
    });

    // Simulate success
    stepNum++;
    steps.push({
      step: stepNum,
      type: 'would_succeed',
      provider: provider.name || provider.id,
      credential: credToUse.display_name,
      model: modelToUse.model_id,
      reason:
        'All checks passed. This provider+credential+model combination would be used.',
      action: 'EXECUTE_REQUEST',
    });

    wouldSucceed = true;
    selectedProvider = provider.name || provider.id;
    selectedCredential = credToUse.display_name;
    selectedModel = modelToUse.model_id;
    break;
  }

  if (!wouldSucceed) {
    steps.push({
      step: stepNum + 1,
      type: 'exhausted',
      reason:
        'All providers exhausted. The request would fail with a "No AI provider available" error.',
      action: 'THROW_ERROR',
    });
  }

  return NextResponse.json({
    trace: steps,
    summary: {
      wouldSucceed,
      selectedProvider,
      selectedCredential,
      selectedModel,
      totalSteps: steps.length,
      providersChecked: providers.length,
    },
  });
}
