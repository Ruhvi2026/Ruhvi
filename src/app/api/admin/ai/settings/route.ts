import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { createServerClient } from '@supabase/ssr';
import { resolveEffectiveApiKey, isMaskedPlaceholder } from '@/lib/ai/keys';

async function verifyAdmin() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('__session')?.value;
  if (!sessionCookie) return false;
  try {
    const decoded = decodeJwt(sessionCookie);
    if (!decoded || !decoded.sub) return false;
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
      'gemini-flash-latest',
      'gemini-pro-latest',
      'gemini-1.5-flash-latest',
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

    // Resolve API key status for each provider (DB key or ENV key)
    const sanitizedProviders = rawProviders.map((p: any) => {
      const type = p.type || p.id;
      const keyInfo = resolveEffectiveApiKey(type, null, p.apiKey);

      return {
        ...p,
        id: p.id || type,
        type: type,
        apiKey: '', // Keep clean on frontend to avoid autofill/fake asterisks issues
        hasKey: keyInfo.hasKey,
        isEnvKey: keyInfo.isEnvKey,
        maskedKey: keyInfo.maskedKey,
        status: keyInfo.hasKey ? p.status || 'online' : 'offline',
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
        model: 'gemini-2.5-flash',
        enabled: true,
      },
      seo_metadata: {
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        enabled: true,
      },
      chatbot: { provider: 'gemini', model: 'gemini-2.5-flash', enabled: true },
    };
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
      sanitizedProviders = body.ai_providers.map((p: any) => {
        const type = p.type || p.id;
        const keyInfo = resolveEffectiveApiKey(type, null, p.apiKey);
        return {
          ...p,
          apiKey: '',
          hasKey: keyInfo.hasKey,
          isEnvKey: keyInfo.isEnvKey,
          maskedKey: keyInfo.maskedKey,
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
