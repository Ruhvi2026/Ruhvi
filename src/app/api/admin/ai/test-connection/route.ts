import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

import { resolveEffectiveApiKey } from '@/lib/ai/keys';
import { createServerClient } from '@supabase/ssr';

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

    const { provider, providerId, providerType, apiKey } = body;
    const id = provider?.id || providerId || 'gemini';
    const typeToTest =
      provider?.type || providerType || (id === 'gemini' ? 'gemini' : id);
    const candidateKey = provider?.apiKey || apiKey;

    // Fetch DB key for this provider if candidateKey is not a newly provided raw key
    let dbKey = '';
    const { data: dbData } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'ai_providers')
      .single();

    if (dbData && Array.isArray(dbData.value)) {
      const match = dbData.value.find(
        (p: any) => p.id === id || p.type === typeToTest
      );
      if (match?.apiKey) dbKey = match.apiKey;
    }

    const keyResolution = resolveEffectiveApiKey(
      typeToTest,
      candidateKey,
      dbKey
    );
    const key = keyResolution.apiKey;

    if (!key && typeToTest !== 'custom') {
      return NextResponse.json(
        {
          error: `No API key configured for ${typeToTest}. Please enter an API key or configure ${typeToTest.toUpperCase()}_API_KEY in environment.`,
        },
        { status: 400 }
      );
    }

    if (typeToTest === 'gemini') {
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({
        model: 'gemini-3.5-flash-lite',
      });

      const result = await model.generateContent('Say hello world.');
      const response = await result.response;
      if (response.text()) {
        return NextResponse.json({
          success: true,
          message: 'Gemini connection successful!',
        });
      }
    } else if (typeToTest === 'openai') {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) {
        return NextResponse.json({
          success: true,
          message: 'OpenAI connection successful!',
        });
      } else {
        const err = await res.text();
        return NextResponse.json(
          { error: `OpenAI Error: ${err}` },
          { status: 400 }
        );
      }
    } else if (typeToTest === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'hello' }],
        }),
      });
      if (res.ok) {
        return NextResponse.json({
          success: true,
          message: 'Anthropic connection successful!',
        });
      } else {
        const err = await res.text();
        return NextResponse.json(
          { error: `Anthropic Error: ${err}` },
          { status: 400 }
        );
      }
    } else if (typeToTest === 'openrouter') {
      const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) {
        return NextResponse.json({
          success: true,
          message: 'OpenRouter connection successful!',
        });
      } else {
        const err = await res.text();
        return NextResponse.json(
          { error: `OpenRouter Error: ${err}` },
          { status: 400 }
        );
      }
    } else if (typeToTest === 'deepseek') {
      const res = await fetch('https://api.deepseek.com/models', {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) {
        return NextResponse.json({
          success: true,
          message: 'DeepSeek connection successful!',
        });
      } else {
        const err = await res.text();
        return NextResponse.json(
          { error: `DeepSeek Error: ${err}` },
          { status: 400 }
        );
      }
    } else if (typeToTest === 'custom') {
      if (!provider?.baseUrl) {
        return NextResponse.json(
          { error: 'Base URL is required for custom gateways.' },
          { status: 400 }
        );
      }

      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (key) {
        headers['Authorization'] = `Bearer ${key}`;
      }

      try {
        if (provider.customHeaders) {
          const parsed = JSON.parse(provider.customHeaders);
          headers = { ...headers, ...parsed };
        }
      } catch (e) {}

      // Ping the models endpoint (standard OpenAI spec)
      const res = await fetch(`${provider.baseUrl.replace(/\/$/, '')}/models`, {
        headers: headers,
      });

      if (res.ok) {
        return NextResponse.json({
          success: true,
          message: 'Custom Gateway connection successful!',
        });
      } else {
        const err = await res.text();
        return NextResponse.json(
          { error: `Gateway Error (${res.status}): ${err}` },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Unsupported provider or connection failed.' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('Test connection error:', err);
    return NextResponse.json(
      { error: `Connection failed: ${err.message}` },
      { status: 500 }
    );
  }
}
