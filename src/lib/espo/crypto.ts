import 'server-only';

/**
 * HMAC signing/verification for EspoCRM webhook payloads.
 *
 * The shared ESPO_WEBHOOK_SECRET is used to sign outbound payloads from Ruhvi
 * (when calling EspoCRM) and to verify inbound webhooks from EspoCRM.
 */

const encoder = new TextEncoder();

/**
 * Sign a payload with HMAC-SHA256 using the webhook secret.
 */
export async function signPayload(
  payload: string,
  secret: string
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verify an HMAC-SHA256 signature.
 */
export async function verifySignature(
  payload: string,
  secret: string,
  signature: string
): Promise<boolean> {
  const expected = await signPayload(payload, secret);
  return expected === signature;
}
