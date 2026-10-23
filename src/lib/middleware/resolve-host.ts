/**
 * Host Resolution Module
 *
 * Resolves the incoming hostname into structured portal flags.
 * Extracted from middleware.ts for clarity and testability.
 */

export interface HostFlags {
  hostname: string;
  isAdminHost: boolean;
  isOperationsHost: boolean;
  isOrdersHost: boolean;
  isSupportHost: boolean;
  isMarketingHost: boolean;
  isAuthHost: boolean;
  isTechHost: boolean;
  isCoFounderHost: boolean;
  /** True if any portal subdomain (admin, operations, orders, support, marketing, tech, co-founder). */
  isAnyPortalHost: boolean;
}

/**
 * Resolves a raw hostname (from request headers) into structured portal flags.
 *
 * Each portal can be matched by its production domain (e.g., `admin.ruhvi.in`)
 * or local dev alias (e.g., `admin.localhost`).
 */
export function resolveHost(hostname: string): HostFlags {
  const isAdminHost =
    hostname === 'admin.ruhvi.in' || hostname.startsWith('admin.localhost');
  const isOperationsHost =
    hostname === 'operation.ruhvi.in' ||
    hostname.startsWith('operation.localhost');
  const isOrdersHost =
    hostname === 'orders.ruhvi.in' || hostname.startsWith('orders.localhost');
  const isSupportHost =
    hostname === 'support.ruhvi.in' || hostname.startsWith('support.localhost');
  const isMarketingHost =
    hostname === 'marketing.ruhvi.in' ||
    hostname.startsWith('marketing.localhost');
  const isAuthHost =
    hostname === 'auth.ruhvi.in' || hostname.startsWith('auth.localhost');
  const isTechHost =
    hostname === 'tech.ruhvi.in' || hostname.startsWith('tech.localhost');
  const isCoFounderHost =
    hostname === 'co-founder.ruhvi.in' ||
    hostname.startsWith('co-founder.localhost') ||
    hostname === 'cofounder.ruhvi.in' ||
    hostname.startsWith('cofounder.localhost');

  const isAnyPortalHost =
    isAdminHost ||
    isOperationsHost ||
    isOrdersHost ||
    isSupportHost ||
    isMarketingHost ||
    isTechHost ||
    isCoFounderHost;

  return {
    hostname,
    isAdminHost,
    isOperationsHost,
    isOrdersHost,
    isSupportHost,
    isMarketingHost,
    isAuthHost,
    isTechHost,
    isCoFounderHost,
    isAnyPortalHost,
  };
}
