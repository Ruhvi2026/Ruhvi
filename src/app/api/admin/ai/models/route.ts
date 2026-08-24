/**
 * Model Health API
 * GET  /api/admin/ai/models?providerId=gemini  — list model health records
 * POST /api/admin/ai/models?action=set-default — set default model
 * POST /api/admin/ai/models?action=toggle      — enable/disable model
 * POST /api/admin/ai/models?action=validate    — refresh model health via discovery
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth/verify-session';
import { createServerClient } from '@supabase/ssr';
import {
  getAllModelHealth,
  setDefaultModel,
  upsertModelsFromDiscovery,
  inferModelCapabilities,
} from '@/lib/ai/model-health';
import { resolveEffectiveApiKey } from '@/lib/ai/keys';

async function verifyAdmin() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('__session')?.value;
  if (!sessionCookie) return false;
  try {
    const decoded = await verifySessionToken(sessionCookie);
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

// ── GET ────────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  if (!(await verifyAdmin()))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const providerId = searchParams.get('providerId');
  if (!providerId)
    return NextResponse.json(
      { error: 'providerId is required' },
      { status: 400 }
    );

  const cookieStore = await cookies();
  const db = createAdminClient(cookieStore);

  const models = await getAllModelHealth(providerId, db);

  return NextResponse.json({
    models,
    summary: {
      total: models.length,
      active: models.filter((m) => m.status === 'active').length,
      deprecated: models.filter((m) => m.status === 'deprecated').length,
      unavailable: models.filter((m) => m.status === 'unavailable').length,
      unknown: models.filter((m) => m.status === 'unknown').length,
      default: models.find((m) => m.is_default)?.model_id || null,
    },
  });
}

// ── POST ───────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  if (!(await verifyAdmin()))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const cookieStore = await cookies();
  const db = createAdminClient(cookieStore);
  const body = await req.json().catch(() => ({}));
  const { action, providerId, modelId, is_enabled, priority } = body;

  // ── Set default model ──────────────────────────────────────────────────
  if (action === 'set-default') {
    if (!providerId || !modelId) {
      return NextResponse.json(
        { error: 'providerId and modelId are required' },
        { status: 400 }
      );
    }
    await setDefaultModel(providerId, modelId, db);
    return NextResponse.json({
      success: true,
      message: `${modelId} set as default model for ${providerId}.`,
    });
  }

  // ── Toggle enabled state ───────────────────────────────────────────────
  if (action === 'toggle') {
    if (!providerId || !modelId) {
      return NextResponse.json(
        { error: 'providerId and modelId are required' },
        { status: 400 }
      );
    }
    const { error } = await db
      .from('ai_model_health')
      .update({ is_enabled: Boolean(is_enabled) })
      .eq('provider_id', providerId)
      .eq('model_id', modelId);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // ── Update priority ────────────────────────────────────────────────────
  if (action === 'set-priority') {
    if (!providerId || !modelId || priority === undefined) {
      return NextResponse.json(
        { error: 'providerId, modelId, and priority are required' },
        { status: 400 }
      );
    }
    await db
      .from('ai_model_health')
      .update({ priority: Number(priority) })
      .eq('provider_id', providerId)
      .eq('model_id', modelId);
    return NextResponse.json({ success: true });
  }

  // ── Validate / refresh model health ────────────────────────────────────
  if (action === 'validate' || action === 'refresh') {
    if (!providerId)
      return NextResponse.json(
        { error: 'providerId is required' },
        { status: 400 }
      );

    // Get API key for this provider from settings or credentials
    const { data: settingsData } = await db
      .from('settings')
      .select('value')
      .eq('key', 'ai_providers')
      .single();

    let apiKey = '';
    if (settingsData?.value && Array.isArray(settingsData.value)) {
      const providerConfig = settingsData.value.find(
        (p: any) => p.id === providerId || p.type === providerId
      );
      if (providerConfig?.apiKey) apiKey = providerConfig.apiKey;
    }

    // Try credentials table if no key in settings
    if (!apiKey) {
      const { data: credData } = await db
        .from('ai_provider_credentials')
        .select('encrypted_key')
        .eq('provider_id', providerId)
        .eq('is_enabled', true)
        .eq('health_status', 'healthy')
        .order('priority', { ascending: true })
        .limit(1)
        .single();
      if (credData?.encrypted_key) apiKey = credData.encrypted_key;
    }

    // Fall back to environment variable
    if (!apiKey) {
      const resolved = resolveEffectiveApiKey(providerId, null, null);
      apiKey = resolved.apiKey;
    }

    // Fetch models from provider API
    let models: string[] = [];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      if (providerId === 'gemini') {
        if (!apiKey) throw new Error('No API key configured for Gemini');
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
          {
            signal: controller.signal,
          }
        );
        if (!res.ok) throw new Error(`Gemini API error: ${res.statusText}`);
        const data = await res.json();
        models = (data.models || [])
          .filter((m: any) =>
            m.supportedGenerationMethods?.includes('generateContent')
          )
          .map((m: any) => m.name.replace('models/', ''));
      } else if (providerId === 'openai') {
        if (!apiKey) throw new Error('No API key configured for OpenAI');
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`OpenAI API error: ${res.statusText}`);
        const data = await res.json();
        models = (data.data || [])
          .filter((m: any) => m.id.startsWith('gpt-'))
          .map((m: any) => m.id);
      } else if (providerId === 'anthropic') {
        if (!apiKey) throw new Error('No API key configured for Anthropic');
        const res = await fetch('https://api.anthropic.com/v1/models', {
          headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Anthropic API error: ${res.statusText}`);
        const data = await res.json();
        models = (data.data || []).map((m: any) => m.id);
      } else if (providerId === 'deepseek') {
        models = ['deepseek-chat', 'deepseek-reasoner'];
      } else if (providerId === 'openrouter') {
        const res = await fetch('https://openrouter.ai/api/v1/models', {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`OpenRouter API error: ${res.statusText}`);
        const data = await res.json();
        models = (data.data || []).map((m: any) => m.id).slice(0, 100);
      }

      clearTimeout(timeout);
    } catch (err: any) {
      clearTimeout(timeout);
      return NextResponse.json(
        { error: `Failed to fetch models: ${err.message}` },
        { status: 400 }
      );
    }

    // Save to model health table
    await upsertModelsFromDiscovery(providerId, models, db);

    const allModels = await getAllModelHealth(providerId, db);
    return NextResponse.json({
      success: true,
      message: `Discovered and cached ${models.length} models for ${providerId}.`,
      models: allModels,
      summary: {
        total: allModels.length,
        active: allModels.filter((m) => m.status === 'active').length,
        deprecated: allModels.filter((m) => m.status === 'deprecated').length,
      },
    });
  }

  return NextResponse.json(
    { error: `Unknown action '${action}'` },
    { status: 400 }
  );
}

// ── DELETE ─────────────────────────────────────────────────────────────────

export async function DELETE(req: Request) {
  if (!(await verifyAdmin()))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const providerId = searchParams.get('providerId');
  const modelId = searchParams.get('modelId');

  const cookieStore = await cookies();
  const db = createAdminClient(cookieStore);

  if (modelId && providerId) {
    await db
      .from('ai_model_health')
      .delete()
      .eq('provider_id', providerId)
      .eq('model_id', modelId);
    return NextResponse.json({
      success: true,
      message: 'Model health record deleted.',
    });
  }

  return NextResponse.json(
    { error: 'providerId and modelId are required' },
    { status: 400 }
  );
}
