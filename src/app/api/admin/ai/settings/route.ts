import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { createServerClient } from '@supabase/ssr';
import {
  resolveEffectiveApiKey,
  isMaskedPlaceholder,
  maskApiKey,
} from '@/lib/ai/keys';

async function verifyAdmin() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('__session')?.value;
  if (!sessionCookie) return false;
  try {
    const decoded = decodeJwt(sessionCookie);
    if (!decoded || !(decoded.firebase_uid || decoded.sub)) return false;
    return true;
  } catch (e) {
    return false;
  }
}

const DEFAULT_PROVIDERS = [
  {
    id: 'gemini',
    type: 'gemini',
    name: 'Google Gemini',
    apiKey: '',
    isEnabled: true,
    models: [
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash',
      'gemini-3.7-flash',
      'gemini-2.5-flash-lite',
      'gemini-flash-latest',
      'gemini-pro-latest',
    ],
    priority: 1,
    status: 'online',
  },
  {
    id: 'openai',
    type: 'openai',
    name: 'OpenAI',
    apiKey: '',
    isEnabled: false,
    models: ['gpt-3.5-turbo', 'gpt-4o', 'gpt-4o-mini'],
    priority: 2,
    status: 'offline',
  },
  {
    id: 'anthropic',
    type: 'anthropic',
    name: 'Anthropic Claude',
    apiKey: '',
    isEnabled: false,
    models: [
      'claude-3-haiku-20240307',
      'claude-3-sonnet-20240229',
      'claude-3-opus-20240229',
    ],
    priority: 3,
    status: 'offline',
  },
  {
    id: 'openrouter',
    type: 'openrouter',
    name: 'OpenRouter',
    apiKey: '',
    isEnabled: false,
    models: [],
    priority: 4,
    status: 'offline',
  },
  {
    id: 'deepseek',
    type: 'deepseek',
    name: 'DeepSeek AI',
    apiKey: '',
    isEnabled: false,
    models: ['deepseek-chat', 'deepseek-reasoner'],
    priority: 5,
    status: 'offline',
  },
  {
    id: 'custom',
    type: 'custom',
    name: 'Custom Gateway (OpenAI Compatible)',
    apiKey: '',
    isEnabled: false,
    models: [],
    priority: 6,
    status: 'offline',
    isCustom: true,
  },
];

export async function GET(req: Request) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
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
      .in('key', ['ai_providers', 'ai_global', 'ai_features', 'ai_prompts']);

    const result: Record<string, any> = {};
    if (settingsData && Array.isArray(settingsData)) {
      settingsData.forEach((row) => {
        result[row.key] = row.value;
      });
    }

    // Ensure ai_providers array exists and merge with default providers if needed
    let rawProviders: any[] = Array.isArray(result.ai_providers)
      ? result.ai_providers
      : [];

    if (rawProviders.length === 0) {
      rawProviders = DEFAULT_PROVIDERS;
    } else {
      // Make sure all default providers exist
      DEFAULT_PROVIDERS.forEach((def) => {
        if (!rawProviders.some((p) => p.id === def.id || p.type === def.type)) {
          rawProviders.push(def);
        }
      });
    }

    // Query active credentials from ai_provider_credentials table to support multi-credential engine
    const { data: dbCredentials } = await supabaseAdmin
      .from('ai_provider_credentials')
      .select(
        'provider_id, health_status, encrypted_key, is_enabled, priority, display_name'
      )
      .order('priority', { ascending: true });

    const credsByProvider: Record<string, any[]> = {};
    (dbCredentials || []).forEach((c: any) => {
      if (!credsByProvider[c.provider_id]) {
        credsByProvider[c.provider_id] = [];
      }
      credsByProvider[c.provider_id].push(c);
    });

    // Resolve API key status for each provider (DB multi-cred, DB legacy key, or ENV key)
    const sanitizedProviders = rawProviders.map((p: any) => {
      const type = p.type || p.id;
      const keyInfo = resolveEffectiveApiKey(type, null, p.apiKey);
      const providerCreds = credsByProvider[type] || [];
      const enabledCreds = providerCreds.filter(
        (c: any) => c.is_enabled !== false
      );
      const healthyCreds = enabledCreds.filter(
        (c: any) => c.health_status !== 'invalid'
      );

      const hasMultiCreds = enabledCreds.length > 0;
      const hasKey = keyInfo.hasKey || hasMultiCreds;

      let maskedKey = '';
      if (keyInfo.hasKey) {
        maskedKey = keyInfo.maskedKey;
      } else if (hasMultiCreds) {
        const topCred = enabledCreds[0];
        maskedKey = topCred?.encrypted_key
          ? maskApiKey(topCred.encrypted_key)
          : '••••••••••••';
      }

      let models = p.models || [];
      if (type === 'gemini') {
        // Ensure gemini-3.5-flash-lite is the default model and remove deprecated gemini-2.5-flash
        models = models.filter((m: string) => m !== 'gemini-2.5-flash');
        if (!models.includes('gemini-3.5-flash-lite')) {
          models.unshift('gemini-3.5-flash-lite');
        } else if (models[0] !== 'gemini-3.5-flash-lite') {
          models = [
            'gemini-3.5-flash-lite',
            ...models.filter((m: string) => m !== 'gemini-3.5-flash-lite'),
          ];
        }
      }

      const isOnline = keyInfo.hasKey || healthyCreds.length > 0;

      return {
        ...p,
        id: p.id || type,
        type: type,
        apiKey: '', // Keep clean on frontend to avoid autofill/fake asterisks issues
        hasKey,
        isEnvKey: keyInfo.isEnvKey,
        maskedKey,
        credentialCount: providerCreds.length,
        models,
        status: isOnline
          ? p.isEnabled !== false
            ? 'online'
            : 'offline'
          : 'offline',
      };
    });

    result.ai_providers = sanitizedProviders;
    result.ai_global = result.ai_global || {
      ai_enabled: true,
      default_language: 'English',
      brand_tone: 'Luxurious and Premium',
      creativity_level: 0.7,
      enableRateLimiting: true,
      enableInjectionFilter: true,
      enablePiiRedaction: true,
      routingStrategy: 'priority',
    };

    result.ai_features = result.ai_features || {
      product_description: {
        provider: 'gemini',
        model: 'gemini-3.5-flash-lite',
        enabled: true,
      },
      seo_metadata: {
        provider: 'gemini',
        model: 'gemini-3.5-flash-lite',
        enabled: true,
      },
      chatbot: {
        provider: 'gemini',
        model: 'gemini-3.5-flash-lite',
        enabled: true,
      },
    };

    // Upgrade any legacy gemini-2.5-flash references in ai_features
    if (result.ai_features) {
      Object.keys(result.ai_features).forEach((key) => {
        if (
          result.ai_features[key]?.provider === 'gemini' &&
          (!result.ai_features[key]?.model ||
            result.ai_features[key]?.model === 'gemini-2.5-flash')
        ) {
          result.ai_features[key].model = 'gemini-3.5-flash-lite';
        }
      });
    }
    result.ai_prompts = result.ai_prompts || {
      product_description: 'You are a world-class E-commerce SEO Expert...',
      seo_metadata: 'Focus on generating high-converting keywords...',
      chatbot:
        "CRITICAL SYSTEM INSTRUCTION: You are an AI assistant EXCLUSIVELY for the 'Ruhvi' jewelry store.",
    };

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Settings GET Error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
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

    // If saving ai_providers, merge incoming keys with existing DB keys safely
    if (body.ai_providers && Array.isArray(body.ai_providers)) {
      const { data: existingData } = await supabaseAdmin
        .from('settings')
        .select('value')
        .eq('key', 'ai_providers')
        .single();

      const existingProviders: any[] = Array.isArray(existingData?.value)
        ? existingData.value
        : [];

      body.ai_providers = body.ai_providers.map((p: any) => {
        const type = p.type || p.id;
        const existing = existingProviders.find(
          (ep: any) => ep.id === p.id || ep.type === type
        );

        let finalApiKey = existing ? existing.apiKey || '' : '';

        // If user submitted an explicit clear command
        if (p.apiKey === '__CLEAR_KEY__') {
          finalApiKey = '';
        } else if (p.apiKey && !isMaskedPlaceholder(p.apiKey)) {
          // If user typed a genuine new raw key
          finalApiKey = p.apiKey.trim();
        }

        return {
          id: p.id || type,
          type: type,
          name: p.name || type,
          apiKey: finalApiKey,
          isEnabled: Boolean(p.isEnabled),
          models: Array.isArray(p.models) ? p.models : [],
          priority: Number(p.priority) || 99,
          status: p.status || (finalApiKey ? 'online' : 'offline'),
          baseUrl: p.baseUrl || '',
          customHeaders: p.customHeaders || '',
          isCustom: Boolean(p.isCustom),
        };
      });
    }

    // Upsert all modified keys
    const updates = Object.keys(body).map((key) => ({
      key,
      value: body[key],
    }));

    for (const update of updates) {
      const { error } = await supabaseAdmin
        .from('settings')
        .upsert(update, { onConflict: 'key' });

      if (error) {
        console.warn(`Failed to update setting ${update.key}:`, error);
      }
    }

    // Re-sanitize providers for the response
    let sanitizedProviders: any[] = [];
    if (body.ai_providers) {
      const { data: dbCredentials } = await supabaseAdmin
        .from('ai_provider_credentials')
        .select(
          'provider_id, health_status, encrypted_key, is_enabled, priority, display_name'
        )
        .order('priority', { ascending: true });

      const credsByProvider: Record<string, any[]> = {};
      (dbCredentials || []).forEach((c: any) => {
        if (!credsByProvider[c.provider_id]) {
          credsByProvider[c.provider_id] = [];
        }
        credsByProvider[c.provider_id].push(c);
      });

      sanitizedProviders = body.ai_providers.map((p: any) => {
        const type = p.type || p.id;
        const keyInfo = resolveEffectiveApiKey(type, null, p.apiKey);
        const providerCreds = credsByProvider[type] || [];
        const enabledCreds = providerCreds.filter(
          (c: any) => c.is_enabled !== false
        );
        const healthyCreds = enabledCreds.filter(
          (c: any) => c.health_status !== 'invalid'
        );

        const hasMultiCreds = enabledCreds.length > 0;
        const hasKey = keyInfo.hasKey || hasMultiCreds;

        let maskedKey = '';
        if (keyInfo.hasKey) {
          maskedKey = keyInfo.maskedKey;
        } else if (hasMultiCreds) {
          const topCred = enabledCreds[0];
          maskedKey = topCred?.encrypted_key
            ? maskApiKey(topCred.encrypted_key)
            : '••••••••••••';
        }

        const isOnline = keyInfo.hasKey || healthyCreds.length > 0;

        return {
          ...p,
          apiKey: '',
          hasKey,
          isEnvKey: keyInfo.isEnvKey,
          maskedKey,
          credentialCount: providerCreds.length,
          status: isOnline
            ? p.isEnabled !== false
              ? 'online'
              : 'offline'
            : 'offline',
        };
      });
    }

    return NextResponse.json({
      success: true,
      ai_providers: sanitizedProviders,
      ai_features: body.ai_features,
      ai_prompts: body.ai_prompts,
      ai_global: body.ai_global,
    });
  } catch (err: any) {
    console.error('Settings API Error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
