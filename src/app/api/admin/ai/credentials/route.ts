/**
 * Credential CRUD API
 * GET    /api/admin/ai/credentials?providerId=gemini   — list credentials (masked keys)
 * POST   /api/admin/ai/credentials                     — create credential
 * PATCH  /api/admin/ai/credentials?id=xxx              — update credential
 * DELETE /api/admin/ai/credentials?id=xxx              — delete credential
 * POST   /api/admin/ai/credentials?action=test&id=xxx  — test credential
 * POST   /api/admin/ai/credentials?action=reset&id=xxx — reset health state
 * POST   /api/admin/ai/credentials?action=reorder      — update priorities
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { createServerClient } from '@supabase/ssr';
import {
  getAllCredentials,
  createCredential,
  resetCredentialHealth,
  markCredentialInvalid,
  getCredentialKey,
} from '@/lib/ai/credentials';
import { maskApiKey, isMaskedPlaceholder } from '@/lib/ai/keys';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function verifyAdmin() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('__session')?.value;
  if (!sessionCookie) return { ok: false, uid: '' };
  try {
    const decoded = decodeJwt(sessionCookie);
    if (!decoded?.sub) return { ok: false, uid: '' };
    return { ok: true, uid: decoded.sub as string };
  } catch {
    return { ok: false, uid: '' };
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

/**
 * Sanitize a credential for frontend display.
 * NEVER returns the raw key.
 */
function sanitizeCredential(c: any) {
  return {
    id: c.id,
    provider_id: c.provider_id,
    display_name: c.display_name,
    priority: c.priority,
    is_enabled: c.is_enabled,
    health_status: c.health_status,
    failure_count: c.failure_count || 0,
    success_count: c.success_count || 0,
    total_requests: c.total_requests || 0,
    rate_limit_count: c.rate_limit_count || 0,
    quota_exhaustion_count: c.quota_exhaustion_count || 0,
    cooldown_until: c.cooldown_until || null,
    last_used_at: c.last_used_at || null,
    last_success_at: c.last_success_at || null,
    last_failure_at: c.last_failure_at || null,
    last_error: c.last_error || null,
    has_key: Boolean(c.encrypted_key),
    masked_key: maskApiKey(c.encrypted_key || ''),
    created_at: c.created_at,
    updated_at: c.updated_at,
  };
}

// ── GET ────────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const { ok } = await verifyAdmin();
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const providerId = searchParams.get('providerId');
  if (!providerId)
    return NextResponse.json(
      { error: 'providerId is required' },
      { status: 400 }
    );

  const cookieStore = await cookies();
  const db = createAdminClient(cookieStore);

  const { data, error } = await db
    .from('ai_provider_credentials')
    .select('*')
    .eq('provider_id', providerId)
    .order('priority', { ascending: true });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    credentials: (data || []).map(sanitizeCredential),
    count: (data || []).length,
  });
}

// ── POST ───────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const { ok } = await verifyAdmin();
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const cookieStore = await cookies();
  const db = createAdminClient(cookieStore);
  const body = await req.json().catch(() => ({}));
  const { action, id } = body;

  // ── Test a specific credential ──────────────────────────────────────────
  if (action === 'test') {
    if (!id)
      return NextResponse.json(
        { error: 'id is required for test' },
        { status: 400 }
      );

    const { data: cred } = await db
      .from('ai_provider_credentials')
      .select('provider_id, encrypted_key')
      .eq('id', id)
      .single();

    if (!cred)
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      );

    const apiKey = cred.encrypted_key;
    if (!apiKey)
      return NextResponse.json(
        { error: 'No API key stored for this credential' },
        { status: 400 }
      );

    const startTime = Date.now();
    try {
      const providerType = cred.provider_id;

      if (providerType === 'gemini') {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: 'gemini-flash-latest',
        });
        const result = await model.generateContent('Say hello in one word.');
        const text = result.response.text();
        if (!text) throw new Error('Empty response from Gemini');
      } else if (providerType === 'openai') {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) throw new Error(`OpenAI: ${res.statusText}`);
      } else if (providerType === 'anthropic') {
        const res = await fetch('https://api.anthropic.com/v1/models', {
          headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        });
        if (!res.ok) throw new Error(`Anthropic: ${res.statusText}`);
      } else if (providerType === 'openrouter') {
        const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) throw new Error(`OpenRouter: ${res.statusText}`);
      } else if (providerType === 'deepseek') {
        const res = await fetch('https://api.deepseek.com/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) throw new Error(`DeepSeek: ${res.statusText}`);
      } else {
        // Custom provider — try to ping models endpoint
        const { data: credRow } = await db
          .from('ai_provider_credentials')
          .select('*')
          .eq('id', id)
          .single();
        // For custom we just validate the key exists
        return NextResponse.json({
          success: true,
          message:
            'Custom credential key is stored. Cannot auto-test without base URL.',
          latency_ms: Date.now() - startTime,
        });
      }

      // Update health state to healthy after successful test
      await db
        .from('ai_provider_credentials')
        .update({
          health_status: 'healthy',
          last_success_at: new Date().toISOString(),
          cooldown_until: null,
          last_error: null,
        })
        .eq('id', id);

      return NextResponse.json({
        success: true,
        message: '✓ Connection successful. Credential is valid.',
        latency_ms: Date.now() - startTime,
      });
    } catch (err: any) {
      // Mark invalid if it's an auth error
      if (/invalid.*key|unauthorized|401|403/i.test(err.message)) {
        await markCredentialInvalid(id, err.message, db);
      }
      return NextResponse.json(
        {
          success: false,
          error: `✕ Connection failed: ${err.message}`,
          latency_ms: Date.now() - startTime,
        },
        { status: 400 }
      );
    }
  }

  // ── Reset health state ──────────────────────────────────────────────────
  if (action === 'reset') {
    if (!id)
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    await resetCredentialHealth(id, db);
    return NextResponse.json({
      success: true,
      message: 'Credential health state reset to unknown.',
    });
  }

  // ── Reorder priorities ──────────────────────────────────────────────────
  if (action === 'reorder') {
    const { order } = body; // Array of { id, priority }
    if (!Array.isArray(order))
      return NextResponse.json(
        { error: 'order array is required' },
        { status: 400 }
      );

    for (const item of order) {
      await db
        .from('ai_provider_credentials')
        .update({ priority: item.priority })
        .eq('id', item.id);
    }
    return NextResponse.json({
      success: true,
      message: 'Priority order updated.',
    });
  }

  // ── Create credential ───────────────────────────────────────────────────
  const { provider_id, display_name, apiKey, priority, is_enabled } = body;
  if (!provider_id || !display_name) {
    return NextResponse.json(
      { error: 'provider_id and display_name are required' },
      { status: 400 }
    );
  }
  if (!apiKey || isMaskedPlaceholder(apiKey)) {
    return NextResponse.json(
      { error: 'A valid API key is required' },
      { status: 400 }
    );
  }

  const credential = await createCredential(
    { provider_id, display_name, apiKey: apiKey.trim(), priority, is_enabled },
    db
  );

  if (!credential) {
    return NextResponse.json(
      { error: 'Failed to create credential' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    credential: sanitizeCredential({ ...credential, encrypted_key: apiKey }),
  });
}

// ── PATCH ──────────────────────────────────────────────────────────────────

export async function PATCH(req: Request) {
  const { ok } = await verifyAdmin();
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const cookieStore = await cookies();
  const db = createAdminClient(cookieStore);
  const body = await req.json().catch(() => ({}));
  const { id, display_name, priority, is_enabled, apiKey } = body;

  if (!id)
    return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const update: Record<string, any> = {};
  if (display_name !== undefined) update.display_name = display_name;
  if (priority !== undefined) update.priority = Number(priority);
  if (is_enabled !== undefined) update.is_enabled = Boolean(is_enabled);

  // Replace API key if a valid new one was provided
  if (apiKey && !isMaskedPlaceholder(apiKey) && apiKey !== '__UNCHANGED__') {
    update.encrypted_key = apiKey.trim();
    update.health_status = 'unknown'; // Reset health on key change
    update.failure_count = 0;
    update.cooldown_until = null;
    update.last_error = null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: 'No valid fields to update' },
      { status: 400 }
    );
  }

  const { data, error } = await db
    .from('ai_provider_credentials')
    .update(update)
    .eq('id', id)
    .select('*')
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    credential: sanitizeCredential(data),
  });
}

// ── DELETE ─────────────────────────────────────────────────────────────────

export async function DELETE(req: Request) {
  const { ok } = await verifyAdmin();
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id)
    return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const cookieStore = await cookies();
  const db = createAdminClient(cookieStore);

  const { error } = await db
    .from('ai_provider_credentials')
    .delete()
    .eq('id', id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, message: 'Credential deleted.' });
}
