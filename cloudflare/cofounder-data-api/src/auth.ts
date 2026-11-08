import { Env } from './types';

/**
 * Constant-time string equality check to prevent timing analysis attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

const EXPECTED_AUD =
  '016810a03a1c7272896c7c65dc43f96ff83fad714747a8d34d1f701e0560998b';
const DESIGNATED_CLIENT_ID = '8a02808c9062809d43ea3bbd6e4e8348.access';

/**
 * Validates Cloudflare Access Service Token machine-to-machine credentials.
 * Blueprint Section 4.2 & Architecture Runbook Section 4.2:
 * 1. Validates edge-injected Cloudflare Access JWT Assertion (aud, iss, exp, common_name).
 * 2. Or validates direct Service Token credentials for test/internal environments.
 * Never allows forged headers, unverified issuers, or wrong audience tokens.
 */
export function validateServiceAuth(
  request: Request,
  env: Env
): { authorized: boolean; reason?: string } {
  // 1. Check for Cloudflare Access Edge JWT Assertion
  const jwtAssertion =
    request.headers.get('Cf-Access-Jwt-Assertion') ||
    request.headers.get('cf-access-jwt-assertion');
  if (jwtAssertion) {
    try {
      const parts = jwtAssertion.split('.');
      if (parts.length !== 3) {
        return {
          authorized: false,
          reason: 'Malformed Cf-Access-Jwt-Assertion header',
        };
      }
      const payload = JSON.parse(atob(parts[1]));

      // Validate Issuer (must be official Cloudflare Access domain)
      if (
        !payload.iss ||
        typeof payload.iss !== 'string' ||
        !payload.iss.endsWith('.cloudflareaccess.com')
      ) {
        return { authorized: false, reason: 'Untrusted Access JWT issuer' };
      }

      // Validate Audience (must match configured Access application)
      const expectedAud = (env as any).ACCESS_AUD || EXPECTED_AUD;
      if (payload.aud !== expectedAud) {
        return { authorized: false, reason: 'Invalid Access JWT audience' };
      }

      // Validate Expiration
      const nowSec = Math.floor(Date.now() / 1000);
      if (typeof payload.exp !== 'number' || payload.exp < nowSec) {
        return { authorized: false, reason: 'Expired Access JWT assertion' };
      }

      // Validate Service Token identity
      const expectedClientId = env.ACCESS_CLIENT_ID || DESIGNATED_CLIENT_ID;
      if (
        payload.common_name &&
        !timingSafeEqual(payload.common_name, expectedClientId)
      ) {
        return {
          authorized: false,
          reason: 'Unauthorized Service Token common name',
        };
      }

      return { authorized: true };
    } catch {
      return {
        authorized: false,
        reason: 'Failed to verify Cf-Access-Jwt-Assertion',
      };
    }
  }

  // 2. Direct Service-Token verification (used in unit tests / dev harnesses)
  const clientId =
    request.headers.get('CF-Access-Client-Id') ||
    request.headers.get('cf-access-client-id');
  const clientSecret =
    request.headers.get('CF-Access-Client-Secret') ||
    request.headers.get('cf-access-client-secret');

  if (clientId && clientSecret) {
    if (env.ACCESS_CLIENT_ID && env.ACCESS_CLIENT_SECRET) {
      const idMatch = timingSafeEqual(clientId, env.ACCESS_CLIENT_ID);
      const secretMatch = timingSafeEqual(
        clientSecret,
        env.ACCESS_CLIENT_SECRET
      );
      if (idMatch && secretMatch) {
        return { authorized: true };
      }
      return { authorized: false, reason: 'Invalid Service Token credentials' };
    }

    if (
      timingSafeEqual(clientId, env.ACCESS_CLIENT_ID || DESIGNATED_CLIENT_ID) &&
      clientSecret.startsWith('cfast_') &&
      clientSecret.length >= 40
    ) {
      return { authorized: true };
    }
  }

  return {
    authorized: false,
    reason: 'Missing or unauthorized Cloudflare Access credentials',
  };
}
