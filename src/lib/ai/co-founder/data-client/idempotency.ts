import { createHash, randomUUID } from 'crypto';

/**
 * Generate a deterministic or unique idempotency key for Cloudflare Data API operations.
 */
export function generateIdempotencyKey(
  operation: string,
  payload?: Record<string, any>
): string {
  if (!payload) {
    return `${operation}_${randomUUID()}`;
  }
  const hash = createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex')
    .slice(0, 24);
  return `${operation}_${hash}`;
}
