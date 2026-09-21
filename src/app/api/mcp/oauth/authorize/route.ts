import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// GET /api/mcp/oauth/authorize
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const redirectUri = searchParams.get('redirect_uri');
  const state = searchParams.get('state');
  const clientId = searchParams.get('client_id');

  if (!redirectUri || !clientId) {
    return new NextResponse('Missing required OAuth parameters', {
      status: 400,
    });
  }

  // To keep the flow seamless for the admin, we auto-approve the authorization
  // and redirect back to Gemini immediately. Security is strictly enforced
  // at the token endpoint via the client_secret (which must be a valid API key).
  const authCode = 'mcp_auth_code_auto_approved';

  const redirectUrl = new URL(redirectUri);
  redirectUrl.searchParams.set('code', authCode);
  if (state) {
    redirectUrl.searchParams.set('state', state);
  }

  return NextResponse.redirect(redirectUrl.toString());
}
