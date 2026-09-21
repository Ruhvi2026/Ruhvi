import { NextRequest, NextResponse } from 'next/server';
import { authenticateMcpRequest } from '@/lib/ai/mcp-auth';

export const runtime = 'nodejs'; // Nodejs runtime since authenticateMcpRequest uses service role/crypto

export async function POST(req: NextRequest) {
  try {
    let clientId: string | null = null;
    let clientSecret: string | null = null;

    // 1. Check for Authorization: Basic header
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Basic ')) {
      const b64 = authHeader.substring(6);
      const decoded = Buffer.from(b64, 'base64').toString('utf-8');
      const parts = decoded.split(':');
      if (parts.length >= 2) {
        clientId = parts[0];
        clientSecret = parts.slice(1).join(':');
      }
    }

    // 2. Fallback to POST body (application/x-www-form-urlencoded)
    if (!clientId || !clientSecret) {
      const contentType = req.headers.get('content-type') || '';
      if (contentType.includes('application/x-www-form-urlencoded')) {
        const text = await req.text();
        const params = new URLSearchParams(text);
        clientId = params.get('client_id') || clientId;
        clientSecret = params.get('client_secret') || clientSecret;
      } else if (contentType.includes('application/json')) {
        const body = await req.json();
        clientId = body.client_id || clientId;
        clientSecret = body.client_secret || clientSecret;
      }
    }

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          error: 'invalid_client',
          error_description: 'Client credentials missing',
        },
        { status: 401 }
      );
    }

    // Security core: Treat the client_secret as the API Key and validate it!
    // We pass it to authenticateMcpRequest as a Bearer token to reuse existing robust validation.
    const auth = await authenticateMcpRequest(`Bearer ${clientSecret}`);

    if (!auth.ok) {
      // Return 401 with standard OAuth error format
      return NextResponse.json(
        {
          error: 'invalid_client',
          error_description: 'Invalid client credentials or API key revoked.',
        },
        { status: 401 }
      );
    }

    // If valid, return the API key itself as the access token.
    // Gemini will now send this API key as a Bearer token to /api/mcp, which natively supports it.
    return NextResponse.json({
      access_token: clientSecret,
      token_type: 'Bearer',
      expires_in: 31536000, // 1 year representation
    });
  } catch (error) {
    console.error('[OAuth Token Error]', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
