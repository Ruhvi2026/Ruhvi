/**
 * Middleware Constants
 *
 * Shared constants for subdomain routing, portal detection,
 * and path-based access control used by the main middleware.
 */

/** Internal portal route prefixes — used for both storefront blocking and RBAC gating. */
export const INTERNAL_BASES = [
  '/admin',
  '/manager',
  '/staff',
  '/operations',
  '/portal-orders',
  '/support',
  '/marketing',
  '/tech',
  '/co-founder',
] as const;

/** Paths allowed on all hosts (login, API, auth callback, etc.) */
export const COMMON_ALLOWED_PATHS = [
  '/login',
  '/api',
  '/auth/callback',
  '/404',
  '/_not-found',
  '/unauthorized',
  '/admin/task-manager',
  '/admin/chat',
  '/co-founder',
] as const;
