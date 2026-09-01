import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireAdmin } from '@/lib/auth/require-admin';
import { createServerClient } from '@supabase/ssr';
import {
  resolveEffectiveApiKey,
  isMaskedPlaceholder,
  maskApiKey,
  ENV_KEY_MAP,
} from '@/lib/ai/keys';
import { decryptApiKey } from '@/lib/ai/credential-encryption';
import { assertSafeOutboundUrl, UnsafeUrlError } from '@/lib/security/ssrf';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
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

    // Ensure ai_providers array exists
    const rawProviders: any[] = Array.isArray(result.ai_providers)
      ? result.ai_providers
      : [];

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
          ? maskApiKey(decryptApiKey(topCred.encrypted_key))
          : '••••••••••••';
      }

      let models = p.models || [];
      if (type === 'gemini') {
        // Ensure deprecated model names are replaced with valid ones
        const DEPRECATED_GEMINI_MODELS = [
          'gemini-2.5-flash',
          'gemini-3.5-flash',
          'gemini-3.5-flash-lite',
          'gemini-3.7-flash',
          'gemini-2.5-flash-lite',
          'gemini-2.0-flash',
          'gemini-flash-latest',
          'gemini-pro-latest',
        ];
        models = models.filter(
          (m: string) => !DEPRECATED_GEMINI_MODELS.includes(m)
        );
        const VALID_GEMINI_MODELS = [
          'gemini-3.6-flash',
          'gemini-1.5-flash',
          'gemini-1.5-pro',
        ];
        for (const vm of VALID_GEMINI_MODELS) {
          if (!models.includes(vm)) models.push(vm);
        }
        // Ensure gemini-3.6-flash is first (default)
        if (models[0] !== 'gemini-3.6-flash') {
          models = [
            'gemini-3.6-flash',
            ...models.filter((m: string) => m !== 'gemini-3.6-flash'),
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
    result.ai_global = result.ai_global || {};
    result.ai_features = result.ai_features || {};
    result.ai_prompts = result.ai_prompts || {};

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
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
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

      const envUpdates: Record<string, string> = {};

      body.ai_providers = body.ai_providers.map((p: any) => {
        const type = p.type || p.id;
        const existing = existingProviders.find(
          (ep: any) => ep.id === p.id || ep.type === type
        );

        let finalApiKey = existing ? existing.apiKey || '' : '';

        // If user submitted an explicit clear command
        if (p.apiKey === '__CLEAR_KEY__') {
          finalApiKey = '';
          const envVar = ENV_KEY_MAP[type];
          if (envVar) envUpdates[envVar] = '';
        } else if (p.apiKey && !isMaskedPlaceholder(p.apiKey)) {
          // If user typed a genuine new raw key
          finalApiKey = p.apiKey.trim();
          const envVar = ENV_KEY_MAP[type];
          if (envVar) envUpdates[envVar] = finalApiKey;
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

      // Update .env.local directly if any keys were changed
      if (Object.keys(envUpdates).length > 0) {
        try {
          const envPath = path.join(process.cwd(), '.env.local');
          let envContent = '';
          if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
          }

          for (const [envVar, newValue] of Object.entries(envUpdates)) {
            // Reject values that could break out of the quoted .env assignment
            // (quote or line-break injection into the env file).
            if (newValue !== '' && /['"\r\n]/.test(newValue)) {
              console.error(
                `Refusing to write ${envVar} to .env.local: value contains invalid characters.`
              );
              continue;
            }
            const regex = new RegExp(`^${envVar}=.*$`, 'm');
            if (newValue === '') {
              if (regex.test(envContent)) {
                envContent = envContent.replace(regex, `${envVar}=`);
              }
            } else {
              if (regex.test(envContent)) {
                envContent = envContent.replace(
                  regex,
                  `${envVar}='${newValue}'`
                );
              } else {
                envContent += `\n${envVar}='${newValue}'`;
              }
            }
          }

          fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');
        } catch (err) {
          console.error('Failed to update .env.local:', err);
        }
      }

      // Reject internal/private gateway base URLs before persisting them.
      // A disabled provider is never executed, so a stale or unreachable base
      // URL on it must not block unrelated config saves. The runtime path
      // (custom.ts) re-validates the URL on every request once enabled.
      for (const p of body.ai_providers) {
        if (p.type === 'custom' && p.baseUrl && p.isEnabled !== false) {
          try {
            await assertSafeOutboundUrl(p.baseUrl);
          } catch (e: any) {
            if (e instanceof UnsafeUrlError) {
              // A transient DNS failure must not block the save; the runtime
              // path (custom.ts) re-validates the URL on every request.
              if (e.message.includes('Unable to resolve host')) continue;
              return NextResponse.json(
                {
                  error: `Blocked gateway base URL: ${e.message}`,
                  provider: p.id,
                },
                { status: 400 }
              );
            }
            throw e;
          }
        }
      }
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
            ? maskApiKey(decryptApiKey(topCred.encrypted_key))
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
