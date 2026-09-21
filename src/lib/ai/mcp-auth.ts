import 'server-only';

import {
  extractBearerToken,
  hashApiKey,
  hasPermission,
  touchLastUsed,
} from '@/lib/api-keys';
import { getServiceClient } from '@/lib/supabase/service';

// ---------------------------------------------------------------------------
// MCP Auth Guard
//
// Authenticates requests to /api/mcp using the existing API-key system.
// The key must carry one of the two MCP scopes:
//   - mcp_tools:read   → AI may call read-only tools only
//   - mcp_tools:write  → AI may call read AND write tools
//
// Security contract (identical to /api/external/* routes):
//   - Incoming key is hashed (SHA-256) before any DB lookup.
//   - Error messages are intentionally vague (never leak key existence).
//   - Revoked keys are treated identically to missing keys (401).
//   - last_used_at is updated fire-and-forget.
// ---------------------------------------------------------------------------

export type McpScopeLevel = 'read' | 'write';

export interface McpAuthSuccess {
  ok: true;
  keyId: string;
  keyName: string;
  /** Highest granted MCP scope level for this key. */
  scopeLevel: McpScopeLevel;
  /** List of all scopes granted to this key. */
  scopes: string[];
}

export interface McpAuthFailure {
  ok: false;
  status: 401 | 403;
  message: string;
}

export type McpAuthResult = McpAuthSuccess | McpAuthFailure;

/**
 * Authenticate an incoming MCP request.
 *
 * Reads the `Authorization: Bearer <token>` header, hashes the token,
 * looks it up in the `api_keys` table, and checks that the key holds at
 * least `mcp_tools:read`.  If it also holds `mcp_tools:write` the higher
 * scope level is returned so individual tools can enforce their own floor.
 */
export async function authenticateMcpRequest(
  authHeader: string | null | undefined
): Promise<McpAuthResult> {
  const rawKey = extractBearerToken(authHeader);
  if (!rawKey) {
    return { ok: false, status: 401, message: 'Unauthorized' };
  }

  const keyHash = hashApiKey(rawKey);

  try {
    const supabase = getServiceClient();

    const { data: keyRow, error } = await supabase
      .from('api_keys')
      .select('id, name, scopes, revoked_at')
      .eq('key_hash', keyHash)
      .maybeSingle();

    if (error || !keyRow) {
      return { ok: false, status: 401, message: 'Unauthorized' };
    }

    if (keyRow.revoked_at !== null) {
      return { ok: false, status: 401, message: 'Unauthorized' };
    }

    const scopes: string[] = Array.isArray(keyRow.scopes) ? keyRow.scopes : [];

    // Must have at minimum mcp_tools:read
    if (!hasPermission(scopes, 'mcp_tools', 'read')) {
      return { ok: false, status: 403, message: 'Forbidden' };
    }

    // Determine highest granted level
    const scopeLevel: McpScopeLevel = hasPermission(
      scopes,
      'mcp_tools',
      'write'
    )
      ? 'write'
      : 'read';

    // Fire-and-forget last_used_at update
    touchLastUsed(keyRow.id);

    return {
      ok: true,
      keyId: keyRow.id,
      keyName: keyRow.name,
      scopeLevel,
      scopes,
    };
  } catch {
    // Fail closed on any unexpected error
    return { ok: false, status: 401, message: 'Unauthorized' };
  }
}

/**
 * Assert that the authenticated scope satisfies a minimum level.
 * Returns an error object if not; returns null if allowed.
 */
export function assertMcpScope(
  scopeLevel: McpScopeLevel,
  required: McpScopeLevel
): { error: string } | null {
  if (required === 'write' && scopeLevel !== 'write') {
    return { error: 'This tool requires mcp_tools:write scope.' };
  }
  return null;
}

export const TOOL_PERMISSION_MAP: Record<
  string,
  { module: string; action: 'read' | 'write' }
> = {
  // Orders (Read Only)
  get_orders: { module: 'orders', action: 'read' },
  get_order_details: { module: 'orders', action: 'read' },

  // Products (Read & Write)
  get_products: { module: 'products', action: 'read' },
  create_product: { module: 'products', action: 'write' },
  update_product: { module: 'products', action: 'write' },

  // Categories (Read & Write)
  get_categories: { module: 'category', action: 'read' },
  create_category: { module: 'category', action: 'write' },

  // Inventory (Read & Write)
  get_inventory_levels: { module: 'inventory', action: 'read' },
  update_inventory_stock: { module: 'inventory', action: 'write' },

  // Customers (Read Only)
  get_customers: { module: 'customer', action: 'read' },
  get_customer_details: { module: 'customer', action: 'read' },

  // Finances (Read Only)
  get_user_wallet_balance: { module: 'wallet', action: 'read' },
  get_wallet_ledger: { module: 'wallet', action: 'read' },
  get_reward_coin_ledger: { module: 'rewards_coin', action: 'read' },
  get_payment_transactions: { module: 'payment', action: 'read' },

  // Messaging (Read & Write)
  send_whatsapp_message: { module: 'whatsapp', action: 'write' },
  get_whatsapp_templates: { module: 'whatsapp', action: 'read' },
  get_push_subscribers_count: { module: 'push_notifications', action: 'read' },
  send_push_notification: { module: 'push_notifications', action: 'write' },

  // Marketing & Content (Read & Write)
  get_blog_posts: { module: 'blog', action: 'read' },
  create_blog_post: { module: 'blog', action: 'write' },
  update_blog_post: { module: 'blog', action: 'write' },
  get_offers: { module: 'offers', action: 'read' },
  create_offer: { module: 'offers', action: 'write' },
  get_campaign_status: { module: 'marketing_campaign', action: 'read' },
  trigger_marketing_campaign: { module: 'marketing_campaign', action: 'write' },

  // Administration & Analytics
  get_website_banners: { module: 'website_management', action: 'read' },
  update_website_banners: { module: 'website_management', action: 'write' },
  get_sales_analytics: { module: 'analytics', action: 'read' },
  get_store_metrics: { module: 'analytics', action: 'read' },
  get_admin_users: { module: 'user_management', action: 'read' },
  get_teams: { module: 'team_management', action: 'read' },
  get_roles: { module: 'role_management', action: 'read' },
  get_mcp_capabilities: { module: 'mcp_tools', action: 'read' },

  // Support Tickets (Read & Write)
  get_support_tickets: { module: 'support_ticket', action: 'read' },
  create_support_ticket: { module: 'support_ticket', action: 'write' },
  update_ticket_status: { module: 'support_ticket', action: 'write' },

  // Coupons (Read & Write)
  get_coupons: { module: 'coupons', action: 'read' },
  create_coupon: { module: 'coupons', action: 'write' },
  update_coupon_status: { module: 'coupons', action: 'write' },
};

export function assertSpecificScope(
  grantedScopes: string[],
  requiredScope: string
): { error: string } | null {
  const [domain, action] = requiredScope.split(':');
  if (!hasPermission(grantedScopes, domain as any, action as any)) {
    return { error: `This tool requires the '${requiredScope}' scope.` };
  }
  return null;
}

/**
 * Assert that the token has the necessary permission to execute a specific tool.
 */
export function assertToolPermission(
  grantedScopes: string[],
  toolName: string
): { error: string } | null {
  const req = TOOL_PERMISSION_MAP[toolName];
  if (!req) {
    // If it's not mapped, we fail closed
    return {
      error: `Tool ${toolName} is not mapped in the permission matrix.`,
    };
  }
  if (!hasPermission(grantedScopes, req.module as any, req.action as any)) {
    return {
      error: `Forbidden: Token lacks ${req.action} permission for module ${req.module}`,
    };
  }
  return null;
}
