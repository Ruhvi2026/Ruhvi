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
  // Orders & Logistics (Read & Write)
  get_orders: { module: 'orders', action: 'read' },
  get_order_details: { module: 'orders', action: 'read' },
  get_order_pipeline_status: { module: 'orders', action: 'read' },
  get_delivery_failed_and_rto_orders: { module: 'orders', action: 'read' },
  get_courier_sla_delays: { module: 'orders', action: 'read' },
  get_return_requests_and_reasons: { module: 'orders', action: 'read' },
  get_order_call_remarks: { module: 'orders', action: 'read' },
  add_order_call_remark: { module: 'orders', action: 'write' },

  // Products (Read & Write)
  get_products: { module: 'products', action: 'read' },
  get_product_velocity: { module: 'products', action: 'read' },
  create_product: { module: 'products', action: 'write' },
  update_product: { module: 'products', action: 'write' },

  // Categories (Read & Write)
  get_categories: { module: 'category', action: 'read' },
  create_category: { module: 'category', action: 'write' },

  // Inventory (Read & Write)
  get_inventory_levels: { module: 'inventory', action: 'read' },
  get_days_of_inventory: { module: 'inventory', action: 'read' },
  get_restock_recommendations: { module: 'inventory', action: 'read' },
  update_inventory_stock: { module: 'inventory', action: 'write' },

  // Customers (Read Only)
  get_customers: { module: 'customer', action: 'read' },
  get_customer_details: { module: 'customer', action: 'read' },
  get_prive_membership_status: { module: 'customer', action: 'read' },

  // Finances (Read Only)
  get_user_wallet_balance: { module: 'wallet', action: 'read' },
  get_wallet_ledger: { module: 'wallet', action: 'read' },
  get_reward_coin_ledger: { module: 'rewards_coin', action: 'read' },
  get_payment_transactions: { module: 'payment', action: 'read' },
  get_accounts_summary: { module: 'payment', action: 'read' },
  get_recent_gst_invoices: { module: 'orders', action: 'read' },
  get_active_quotations: { module: 'orders', action: 'read' },

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
  dispatch_marketing_coworker: { module: 'marketing_campaign', action: 'read' },
  get_marketing_coworker_statuses: {
    module: 'marketing_campaign',
    action: 'read',
  },
  toggle_marketing_coworker: { module: 'marketing_campaign', action: 'write' },
  trigger_media_processing_job: {
    module: 'marketing_campaign',
    action: 'write',
  },
  get_media_job_status: { module: 'marketing_campaign', action: 'read' },
  publish_ad_campaign: { module: 'marketing_campaign', action: 'write' },

  // Administration & Analytics
  get_website_banners: { module: 'website_management', action: 'read' },
  update_website_banners: { module: 'website_management', action: 'write' },
  get_sales_analytics: { module: 'analytics', action: 'read' },
  get_store_metrics: { module: 'analytics', action: 'read' },
  get_proactive_signals: { module: 'analytics', action: 'read' },
  acknowledge_proactive_signal: { module: 'analytics', action: 'write' },
  get_pending_approvals: { module: 'analytics', action: 'read' },
  submit_approval_decision: { module: 'analytics', action: 'write' },
  execute_approved_action: { module: 'analytics', action: 'write' },
  get_admin_users: { module: 'user_management', action: 'read' },
  get_teams: { module: 'team_management', action: 'read' },
  get_roles: { module: 'role_management', action: 'read' },
  get_mcp_capabilities: { module: 'mcp_tools', action: 'read' },
  get_repository_architecture: { module: 'mcp_tools', action: 'read' },
  inspect_recent_errors: { module: 'mcp_tools', action: 'read' },
  review_code_snippet: { module: 'mcp_tools', action: 'read' },
  record_outcome_feedback: { module: 'analytics', action: 'write' },
  get_outcome_analytics: { module: 'analytics', action: 'read' },
  verify_action_outcome: { module: 'analytics', action: 'write' },
  get_action_lifecycle_status: { module: 'analytics', action: 'read' },
  get_closed_loop_analytics: { module: 'analytics', action: 'read' },
  audit_seo_health: { module: 'analytics', action: 'read' },
  get_competitors: { module: 'analytics', action: 'read' },
  add_competitor: { module: 'analytics', action: 'write' },
  browse_website: { module: 'analytics', action: 'read' },
  get_business_context: { module: 'analytics', action: 'read' },
  run_business_intelligence_scan: { module: 'analytics', action: 'read' },
  get_category_margin_breakdown: { module: 'analytics', action: 'read' },
  investigate_root_cause: { module: 'analytics', action: 'read' },
  formulate_strategy: { module: 'analytics', action: 'read' },
  generate_action_plan: { module: 'analytics', action: 'write' },
  execute_action_plan: { module: 'analytics', action: 'write' },
  dispatch_worker_task: { module: 'mcp_tools', action: 'read' },
  get_worker_statuses: { module: 'mcp_tools', action: 'read' },
  execute_multi_worker_plan: { module: 'mcp_tools', action: 'read' },
  forecast_festive_demand: { module: 'analytics', action: 'read' },
  recommend_aov_bundles: { module: 'analytics', action: 'read' },

  // Support Tickets (Read & Write)
  get_support_tickets: { module: 'support_ticket', action: 'read' },
  create_support_ticket: { module: 'support_ticket', action: 'write' },
  update_ticket_status: { module: 'support_ticket', action: 'write' },
  update_support_ticket_status: { module: 'support_ticket', action: 'write' },

  // Coupons (Read & Write)
  get_coupons: { module: 'coupons', action: 'read' },
  create_coupon: { module: 'coupons', action: 'write' },
  update_coupon_status: { module: 'coupons', action: 'write' },

  // Memory 2.0 (Read & Write)
  search_co_founder_memory: { module: 'analytics', action: 'read' },
  store_co_founder_memory: { module: 'analytics', action: 'write' },
  extract_session_learnings: { module: 'analytics', action: 'read' },

  // Multimodal Vision Engine (Read)
  analyze_product_image: { module: 'analytics', action: 'read' },

  // AI Studio Photography Engine (Write — triggers billable Imagen 3 generation)
  generate_product_studio_photos: { module: 'products', action: 'write' },

  // E-commerce Catalog Drafting & Publishing (Write)
  create_draft_product: { module: 'products', action: 'write' },
  publish_product: { module: 'products', action: 'write' },

  // Internet Research Gateway Tools (RSI Phase 3 & 5 & 6)
  web_search: { module: 'mcp_tools', action: 'read' },
  read_webpage: { module: 'mcp_tools', action: 'read' },
  research_topic: { module: 'mcp_tools', action: 'read' },
  get_research_provider_health: { module: 'mcp_tools', action: 'read' },
  search_public_discussions: { module: 'mcp_tools', action: 'read' },

  // Specialist AI Worker Capability Contracts (Phase 7)
  // Products, Catalog & Merchandising
  get_reviews: { module: 'products', action: 'read' },
  get_product_detail: { module: 'products', action: 'read' },
  update_product_stock: { module: 'inventory', action: 'write' },
  inspect_product_details: { module: 'products', action: 'read' },
  draft_product_description: { module: 'products', action: 'read' },
  validate_hallmark_attributes: { module: 'products', action: 'read' },
  search_market_rates: { module: 'products', action: 'read' },
  compare_product_pricing: { module: 'products', action: 'read' },
  retrieve_public_citations: { module: 'products', action: 'read' },
  analyze_review_sentiment: { module: 'products', action: 'read' },
  get_recent_reviews: { module: 'products', action: 'read' },
  draft_review_response: { module: 'products', action: 'read' },

  // SEO & Editorial Content
  audit_catalog_seo_health: { module: 'analytics', action: 'read' },
  audit_page_seo: { module: 'analytics', action: 'read' },
  suggest_meta_tags: { module: 'analytics', action: 'read' },
  inspect_structured_data: { module: 'analytics', action: 'read' },
  read_search_console: { module: 'analytics', action: 'read' },
  plan_editorial_calendar: { module: 'blog', action: 'read' },
  draft_blog_post: { module: 'blog', action: 'read' },
  cluster_search_intent: { module: 'blog', action: 'read' },

  // Competitor Research
  analyze_competitor: { module: 'analytics', action: 'read' },
  reddit_social_sentiment: { module: 'analytics', action: 'read' },

  // Marketing & Campaigns
  get_ad_metrics: { module: 'marketing_campaign', action: 'read' },
  draft_campaign_brief: { module: 'marketing_campaign', action: 'read' },
  analyze_audience_segments: { module: 'marketing_campaign', action: 'read' },
  create_task_draft: { module: 'marketing_campaign', action: 'read' },

  // Sales & CRO
  get_abandonment_metrics: { module: 'analytics', action: 'read' },
  draft_recovery_template: { module: 'analytics', action: 'read' },
  simulate_checkout_flow: { module: 'analytics', action: 'read' },

  // Customer Support & Grievances
  read_ticket_details: { module: 'support_ticket', action: 'read' },
  check_courier_tracking: { module: 'support_ticket', action: 'read' },
  draft_support_reply: { module: 'support_ticket', action: 'read' },

  // Inventory & Supply Chain
  calculate_stock_velocity: { module: 'inventory', action: 'read' },
  get_low_stock_items: { module: 'inventory', action: 'read' },
  recommend_reorder_qty: { module: 'inventory', action: 'read' },
  audit_stock_levels: { module: 'inventory', action: 'read' },
  detect_low_stock_risks: { module: 'inventory', action: 'read' },
  draft_reorder_sheet: { module: 'inventory', action: 'read' },
  adjust_stock_level: { module: 'inventory', action: 'write' },

  // Execution & Governance
  execute_approved_payload: { module: 'analytics', action: 'write' },
  verify_approval_nonce: { module: 'analytics', action: 'write' },
  record_execution_receipt: { module: 'analytics', action: 'write' },

  // Monitoring & Outcomes
  measure_ground_truth_metric: { module: 'analytics', action: 'read' },
  record_outcome_learning: { module: 'analytics', action: 'read' },

  // Logistics & Delivery
  get_transit_exceptions: { module: 'orders', action: 'read' },
  calculate_rto_risk: { module: 'orders', action: 'read' },
  check_courier_slas: { module: 'orders', action: 'read' },

  // Accounts & Tax Compliance
  compute_gstr3b_summary: { module: 'payment', action: 'read' },
  compute_itc_breakdown: { module: 'payment', action: 'read' },
  get_income_tax_advisory: { module: 'payment', action: 'read' },
  get_day_book: { module: 'payment', action: 'read' },
  compute_sku_manufacturing_cogs: { module: 'payment', action: 'read' },
  create_double_entry_voucher: { module: 'payment', action: 'write' },
  record_purchase_bill: { module: 'payment', action: 'write' },
  audit_gst_calculations: { module: 'payment', action: 'read' },
  reconcile_gateway_settlements: { module: 'payment', action: 'read' },
  generate_discrepancy_report: { module: 'payment', action: 'read' },

  // Workforce Performance & Security Intelligence
  get_workforce_events: { module: 'analytics', action: 'read' },
  calculate_member_scorecard: { module: 'analytics', action: 'read' },
  audit_workforce_quality: { module: 'analytics', action: 'read' },
  generate_cofounder_report: { module: 'analytics', action: 'read' },
  get_security_posture: { module: 'analytics', action: 'read' },
  analyze_vulnerabilities: { module: 'analytics', action: 'read' },
  propose_containment: { module: 'analytics', action: 'write' },
  inspect_file_security: { module: 'analytics', action: 'read' },
  get_incident_report: { module: 'analytics', action: 'read' },
  get_kpi_summary: { module: 'analytics', action: 'read' },
  get_conversion_funnel: { module: 'analytics', action: 'read' },
  query_sales_trends: { module: 'analytics', action: 'read' },
  read_analytics: { module: 'analytics', action: 'read' },
  draft_metric_alert: { module: 'analytics', action: 'read' },
  read_metrics: { module: 'analytics', action: 'read' },
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
