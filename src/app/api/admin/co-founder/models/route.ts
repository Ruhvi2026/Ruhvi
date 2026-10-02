import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireAdmin } from '@/lib/auth/require-admin';
import { createServerClient } from '@supabase/ssr';
import { resolveEffectiveApiKey } from '@/lib/ai/keys';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface ProviderModelInfo {
  id: string;
  name: string;
  type: string;
  isEnabled: boolean;
  priority: number;
  models: string[];
  isOnline: boolean;
  baseUrl?: string;
}

const DEFAULT_MODELS_BY_TYPE: Record<string, string[]> = {
  gemini: [
    'gemini-3.5-flash-lite',
    'gemini-3.6-flash',
    'gemini-2.0-flash',
    'gemini-1.5-pro',
    'gemini-flash-latest',
    'gemini-3.8-flash',
  ],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  custom: ['auto/best-fast', 'llama3', 'mistral', 'deepseek-coder'],
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
  anthropic: [
    'claude-3-5-sonnet-20241022',
    'claude-3-haiku-20240307',
    'claude-3-opus-20240229',
  ],
};

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
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

    const { data: settingsData } = await supabaseAdmin
      .from('settings')
      .select('key, value')
      .in('key', ['ai_providers', 'ai_features', 'ai_global']);

    const settingsMap: Record<string, any> = {};
    if (settingsData && Array.isArray(settingsData)) {
      settingsData.forEach((row) => {
        settingsMap[row.key] = row.value;
      });
    }

    const rawProviders: any[] = Array.isArray(settingsMap.ai_providers)
      ? settingsMap.ai_providers
      : [];

    // Query active credentials to know if providers have active keys
    const { data: dbCredentials } = await supabaseAdmin
      .from('ai_provider_credentials')
      .select('provider_id, health_status, is_enabled')
      .order('priority', { ascending: true });

    const credsByProvider: Record<string, any[]> = {};
    (dbCredentials || []).forEach((c: any) => {
      if (!credsByProvider[c.provider_id]) credsByProvider[c.provider_id] = [];
      credsByProvider[c.provider_id].push(c);
    });

    const knownTypes = ['gemini', 'deepseek', 'custom', 'openai', 'anthropic'];
    const providers: ProviderModelInfo[] = [];

    // 1. Process DB configured providers
    for (const p of rawProviders) {
      const type = p.type || p.id;
      const keyInfo = resolveEffectiveApiKey(type, null, p.apiKey);
      const enabledCreds = (credsByProvider[type] || []).filter(
        (c: any) => c.is_enabled !== false && c.health_status !== 'invalid'
      );
      const isOnline =
        type === 'custom'
          ? !!p.baseUrl
          : keyInfo.hasKey ||
            enabledCreds.length > 0 ||
            (type === 'gemini' && !!process.env.GEMINI_LIVE_API_KEY);

      let models =
        Array.isArray(p.models) && p.models.length > 0
          ? p.models
          : DEFAULT_MODELS_BY_TYPE[type] || [];

      // If gemini, ensure gemini-3.5-flash-lite is included at the top for Co-Founder real-time latency
      if (type === 'gemini') {
        const withoutLite = models.filter(
          (m: string) => m !== 'gemini-3.5-flash-lite'
        );
        models = ['gemini-3.5-flash-lite', ...withoutLite];
      }

      providers.push({
        id: p.id || type,
        name: p.name || type,
        type,
        isEnabled: p.isEnabled ?? true,
        priority: Number(p.priority) || 99,
        models,
        isOnline,
        baseUrl: p.baseUrl,
      });
    }

    // 2. Add missing default providers if not configured in DB yet
    for (const type of knownTypes) {
      if (!providers.some((p) => p.type === type || p.id === type)) {
        const keyInfo = resolveEffectiveApiKey(type, null, null);
        const isOnline =
          type === 'gemini'
            ? !!(process.env.GEMINI_LIVE_API_KEY || process.env.GEMINI_API_KEY)
            : keyInfo.hasKey;

        providers.push({
          id: type,
          name:
            type === 'gemini'
              ? 'Google Gemini'
              : type === 'deepseek'
                ? 'DeepSeek AI'
                : type === 'custom'
                  ? 'Custom Gateway'
                  : type === 'openai'
                    ? 'OpenAI'
                    : 'Anthropic Claude',
          type,
          isEnabled: true,
          priority:
            type === 'gemini'
              ? 1
              : type === 'deepseek'
                ? 2
                : type === 'custom'
                  ? 3
                  : 4,
          models: DEFAULT_MODELS_BY_TYPE[type] || [],
          isOnline,
        });
      }
    }

    // Sort providers by priority
    providers.sort((a, b) => a.priority - b.priority);

    // 3. Resolve Co-Founder feature binding
    const aiFeatures = settingsMap.ai_features || {};
    const coFounderFeature = aiFeatures.co_founder || {
      enabled: true,
      provider: 'gemini',
      model: 'gemini-3.5-flash-lite',
      temperature: 0.3,
      maxTokens: 1000,
    };

    // 4. Resolve Active Fallback Chain
    const fallbackChain = providers
      .filter((p) => p.isEnabled)
      .map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        defaultModel: p.models[0] || '',
        priority: p.priority,
        isOnline: p.isOnline,
      }));

    return NextResponse.json({
      providers,
      currentConfig: coFounderFeature,
      fallbackChain,
      routingStrategy: settingsMap.ai_global?.routingStrategy || 'priority',
    });
  } catch (error: any) {
    console.error('[Co-Founder Models API Error]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch AI models' },
      { status: 500 }
    );
  }
}
