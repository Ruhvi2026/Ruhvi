import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireAdmin } from '@/lib/auth/require-admin';

import { resolveEffectiveApiKey } from '@/lib/ai/keys';
import { decryptApiKey } from '@/lib/ai/credential-encryption';
import { createServerClient } from '@supabase/ssr';
import { safeFetch, UnsafeUrlError } from '@/lib/security/ssrf';

// Keep this simple to avoid caching issues in Next.js
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. Security Check: Ensure user is an admin
    const auth = await requireAdmin();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const cookieStore = await cookies();
    const supabaseAdmin = createServerClient(
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

    const {
      providerId,
      baseUrl,
      customHeaders,
      apiKey: candidateKey,
      freeOnly,
    } = await req.json();

    // Fetch DB key for this provider
    let dbKey = '';
    const { data: dbData } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'ai_providers')
      .single();

    if (dbData && Array.isArray(dbData.value)) {
      const match = dbData.value.find(
        (p: any) => p.id === providerId || p.type === providerId
      );
      if (match?.apiKey) dbKey = match.apiKey;
    }

    const keyResolution = resolveEffectiveApiKey(
      providerId,
      candidateKey,
      dbKey
    );
    let apiKey = keyResolution.apiKey;

    // If no direct key or legacy settings key found, check ai_provider_credentials table
    if (!apiKey) {
      const { data: creds } = await supabaseAdmin
        .from('ai_provider_credentials')
        .select('encrypted_key')
        .eq('provider_id', providerId)
        .eq('is_enabled', true)
        .neq('health_status', 'invalid')
        .order('priority', { ascending: true })
        .limit(1);
      if (creds && creds.length > 0 && creds[0].encrypted_key) {
        apiKey = decryptApiKey(creds[0].encrypted_key);
      }
    }

    let models: string[] = [];
    let rawOpenRouterData: any[] = [];

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 15000);

    try {
      if (providerId === 'gemini') {
        if (!apiKey)
          throw new Error('API Key is required for Gemini model discovery.');
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
          { signal: controller.signal }
        );
        clearTimeout(timeout);
        if (!res.ok) throw new Error(`Gemini API Error: ${res.statusText}`);
        const data = await res.json();
        models = (data.models || []).map((m: any) =>
          m.name.replace('models/', '')
        );
      } else if (providerId === 'openai') {
        if (!apiKey)
          throw new Error('API Key is required for OpenAI model discovery.');
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) throw new Error(`OpenAI API Error: ${res.statusText}`);
        const data = await res.json();
        models = (data.data || []).map((m: any) => m.id);
      } else if (providerId === 'anthropic') {
        if (!apiKey)
          throw new Error('API Key is required for Anthropic model discovery.');
        const res = await fetch('https://api.anthropic.com/v1/models', {
          headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) throw new Error(`Anthropic API Error: ${res.statusText}`);
        const data = await res.json();
        models = (data.data || []).map((m: any) => m.id);
      } else if (providerId === 'openrouter') {
        const res = await fetch('https://openrouter.ai/api/v1/models', {
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) throw new Error(`OpenRouter API Error: ${res.statusText}`);
        const data = await res.json();
        rawOpenRouterData = data.data || [];
        models = rawOpenRouterData.map((m: any) => m.id);
      } else if (providerId === 'deepseek') {
        if (!apiKey)
          throw new Error('API Key is required for DeepSeek model discovery.');
        const res = await fetch('https://api.deepseek.com/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) throw new Error(`DeepSeek API Error: ${res.statusText}`);
        const data = await res.json();
        models = (data.data || []).map((m: any) => m.id);
        if (models.length === 0) {
          models = ['deepseek-chat', 'deepseek-reasoner'];
        }
      } else {
        // Custom Provider logic
        if (!baseUrl) {
          return NextResponse.json(
            { error: 'Base URL is required for custom model discovery.' },
            { status: 400 }
          );
        }

        let headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
        if (customHeaders) {
          try {
            const parsed = JSON.parse(customHeaders);
            headers = { ...headers, ...parsed };
          } catch (e) {
            return NextResponse.json(
              { error: 'Invalid custom headers JSON.' },
              { status: 400 }
            );
          }
        }

        const normalizedUrl = baseUrl.endsWith('/')
          ? baseUrl.slice(0, -1)
          : baseUrl;
        const discoverUrl = `${normalizedUrl}/models`;

        let res: Response;
        try {
          res = await safeFetch(discoverUrl, {
            headers,
            signal: controller.signal,
          });
        } catch (err: any) {
          clearTimeout(timeout);
          if (err?.name === 'AbortError') throw err;
          return NextResponse.json(
            {
              error:
                err instanceof UnsafeUrlError
                  ? `Blocked gateway URL: ${err.message}`
                  : `Connection failed: ${err.message}`,
            },
            { status: 400 }
          );
        }
        clearTimeout(timeout);
        if (!res.ok)
          throw new Error(`Gateway returned ${res.status}: ${res.statusText}`);
        const data = await res.json();
        if (!data.data || !Array.isArray(data.data)) {
          throw new Error(
            'Gateway response did not contain a valid models array (data property missing).'
          );
        }
        models = data.data.map((m: any) => m.id);
      }

      // Apply "Free Only" Filter if requested
      if (freeOnly) {
        if (providerId === 'openrouter' && rawOpenRouterData.length > 0) {
          models = rawOpenRouterData
            .filter(
              (m: any) =>
                m.id.includes(':free') ||
                m.id.endsWith(':free') ||
                (m.pricing &&
                  m.pricing.prompt === '0' &&
                  m.pricing.completion === '0')
            )
            .map((m: any) => m.id);
        } else {
          models = models.filter((m: string) =>
            /:free|free|flash|lite|nano|mini|gemma|auto\/best/i.test(m)
          );
        }
      }

      return NextResponse.json({
        success: true,
        models,
        message: freeOnly
          ? `Found ${models.length} free models`
          : `Found ${models.length} models`,
      });
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Connection timed out while fetching models.' },
          { status: 408 }
        );
      }
      return NextResponse.json(
        { error: `Connection failed: ${err.message}` },
        { status: 400 }
      );
    }
  } catch (err: any) {
    console.error('Model Discovery API Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
