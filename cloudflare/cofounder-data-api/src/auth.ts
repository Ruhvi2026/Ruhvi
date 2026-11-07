import { Env } from './types';

/**
 * Validates Cloudflare Access Service Token or direct machine-to-machine credentials.
 * Blueprint Section 4.2:
 * "1. Protect the Data API hostname with Cloudflare Access.
 *  2. Create a service token for the Vercel Co-Founder backend only.
 *  3. Require a Service Auth policy."
 */
export function validateServiceAuth(
  request: Request,
  env: Env
): { authorized: boolean; reason?: string } {
  // Cloudflare Access passes CF-Access-Client-Id when Service Token is used
  const clientId = request.headers.get('CF-Access-Client-Id');
  const clientSecret = request.headers.get('CF-Access-Client-Secret');
  const jwtAssertion = request.headers.get('Cf-Access-Jwt-Assertion');

  // If running behind Cloudflare Access with validated JWT, request is authentic
  if (jwtAssertion) {
    return { authorized: true };
  }

  // If Client-Id & Secret are supplied in headers, verify against expected values (if configured) or non-empty
  if (clientId && clientSecret) {
    if (env.ACCESS_CLIENT_ID && env.ACCESS_CLIENT_SECRET) {
      if (
        clientId === env.ACCESS_CLIENT_ID &&
        clientSecret === env.ACCESS_CLIENT_SECRET
      ) {
        return { authorized: true };
      }
      return { authorized: false, reason: 'Invalid Service Token credentials' };
    }
    // Accept validly formed CF Access Service Token format
    if (clientId.endsWith('.access') && clientSecret.startsWith('cfast_')) {
      return { authorized: true };
    }
  }

  return {
    authorized: false,
    reason: 'Missing or invalid Cloudflare Access Service Token',
  };
}
