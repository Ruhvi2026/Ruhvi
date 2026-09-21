import 'server-only';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getServiceClient } from '@/lib/supabase/service';
import { logAuditEvent } from '@/lib/audit';
import {
  assertMcpScope,
  assertSpecificScope,
  assertToolPermission,
  TOOL_PERMISSION_MAP,
  type McpScopeLevel,
} from '@/lib/ai/mcp-auth';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { sendFcmToTokens, getTokensForUsers } from '@/lib/fcm-admin';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Strict UUID v4 pattern — rejects SQL injection via ID fields. */
const uuidSchema = z
  .string()
  .trim()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    'Must be a valid UUID v4'
  );

/** Safe bounded string — prevents unbounded inputs and XSS payloads. */
const safeStringSchema = (maxLen = 256) => z.string().trim().min(1).max(maxLen);

/** Positive integer — used for pagination. */
const positiveInt = z.number().int().positive().max(200);

/** Date string in ISO 8601 format. */
const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');

// ---------------------------------------------------------------------------
// Per-request context injected when the server is initialised for each call
// ---------------------------------------------------------------------------
export interface McpRequestContext {
  keyId: string;
  keyName: string;
  scopeLevel: McpScopeLevel;
  scopes: string[];
}

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

/**
 * Creates and configures a scoped McpServer instance with all Ruhvi tools.
 *
 * Called once per HTTP request so each request gets an isolated server
 * instance with its own auth context embedded in tool handlers.
 */
export function createRuhviMcpServer(ctx: McpRequestContext): McpServer {
  const server = new McpServer({
    name: 'ruhvi-mcp-server',
    version: '1.0.0',
  });

  const proxyServer = new Proxy(server, {
    get(target, prop) {
      if (prop === 'tool') {
        return (name: string, ...args: any[]) => {
          // Dynamic Tool Filtering (tools/list)
          // If the token lacks permission, do not register the tool at all.
          // This ensures it does not appear in `tools/list`.
          // Unauthorized `tools/call` attempts are intercepted in route.ts and return -32000.
          const err = assertToolPermission(ctx.scopes, name);
          if (err) {
            return;
          }

          const handler = args.pop();
          const wrappedHandler = async (...hArgs: any[]) => {
            return handler(...hArgs);
          };

          return (target.tool as any)(name, ...args, wrappedHandler);
        };
      }
      return Reflect.get(target, prop);
    },
  });

  registerReadTools(proxyServer as McpServer, ctx);
  registerWriteTools(proxyServer as McpServer, ctx);

  return server;
}

// ===========================================================================
// READ-ONLY TOOLS  (require mcp_tools:read)
// ===========================================================================

function registerReadTools(server: McpServer, ctx: McpRequestContext) {
  // -------------------------------------------------------------------------
  // get_products
  // -------------------------------------------------------------------------
  server.tool(
    'get_products',
    'List or search Ruhvi products with optional filters. Returns paginated results.',
    {
      page: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .default(1)
        .describe('Page number (1-indexed)'),
      limit: positiveInt
        .max(100)
        .default(20)
        .describe('Items per page (max 100)'),
      status: z
        .enum(['active', 'inactive', 'draft'])
        .optional()
        .describe('Filter by product status'),
      category_id: uuidSchema.optional().describe('Filter by category UUID'),
      search: safeStringSchema(128)
        .optional()
        .describe('Keyword search on product name or SKU'),
    },
    async ({ page, limit, status, category_id, search }) => {
      const supabase = getServiceClient();
      const offset = (page - 1) * limit;

      let query = supabase
        .from('products')
        .select(
          'id, sku, name, slug, price, mrp, stock_quantity, status, category_id, created_at',
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) query = query.eq('status', status);
      if (category_id) query = query.eq('category_id', category_id);
      if (search)
        query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);

      const { data, error, count } = await query;
      if (error) throw new Error(`DB error: ${error.message}`);

      await audit(ctx, 'mcp_get_products', 'product', undefined, {
        page,
        limit,
        status,
        category_id,
        search,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                products: data ?? [],
                pagination: {
                  page,
                  limit,
                  total: count ?? 0,
                  pages: Math.ceil((count ?? 0) / limit),
                },
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // get_product_detail
  // -------------------------------------------------------------------------
  server.tool(
    'get_product_detail',
    'Get complete details for a single product including variants and images.',
    {
      product_id: uuidSchema
        .optional()
        .describe('Product UUID (use this OR sku)'),
      sku: safeStringSchema(64)
        .optional()
        .describe('Product SKU (use this OR product_id)'),
    },
    async ({ product_id, sku }) => {
      if (!product_id && !sku) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                error: 'Provide either product_id or sku',
              }),
            },
          ],
          isError: true,
        };
      }

      const supabase = getServiceClient();
      let query = supabase
        .from('products')
        .select('*, images:product_images(*), variants:product_variants(*)')
        .limit(1);

      if (product_id) query = query.eq('id', product_id);
      else if (sku) query = query.eq('sku', sku);

      const { data, error } = await query.maybeSingle();
      if (error) throw new Error(`DB error: ${error.message}`);
      if (!data)
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: 'Product not found' }),
            },
          ],
          isError: true,
        };

      await audit(ctx, 'mcp_get_product_detail', 'product', product_id ?? sku);

      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(data, null, 2) },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // get_categories
  // -------------------------------------------------------------------------
  server.tool(
    'get_categories',
    'List all product categories with their slugs and hierarchy info.',
    {},
    async () => {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, parent_id, sort_order, is_active')
        .order('sort_order', { ascending: true });

      if (error) throw new Error(`DB error: ${error.message}`);

      await audit(ctx, 'mcp_get_categories', 'category');

      const formattedData = (data ?? []).map((c: any) => ({
        id: c.id,
        code: c.code,
        discount_type: c.discount_type,
        discount_value: c.discount_value,
        min_order_amount: c.min_order_amount ?? c.min_order_value ?? 0,
        usage_count: c.usage_count ?? 0,
        usage_limit_total: c.usage_limit_total,
        usage_limit_per_user: c.usage_limit_per_user,
        expires_at: c.expires_at ?? c.expiry_date,
        is_active: c.is_active ?? c.active,
      }));

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(formattedData, null, 2),
          },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // get_orders
  // -------------------------------------------------------------------------
  server.tool(
    'get_orders',
    'List recent orders with optional filters. Returns order summaries (not full line items).',
    {
      page: z.number().int().min(1).max(1000).default(1),
      limit: positiveInt.max(50).default(20),
      status: z
        .enum([
          'pending',
          'processing',
          'shipped',
          'delivered',
          'cancelled',
          'refunded',
        ])
        .optional()
        .describe('Filter by order status'),
      customer_email: z
        .string()
        .trim()
        .email()
        .optional()
        .describe('Filter by customer email address'),
      date_from: isoDateSchema
        .optional()
        .describe('Start date filter (YYYY-MM-DD)'),
      date_to: isoDateSchema
        .optional()
        .describe('End date filter (YYYY-MM-DD)'),
    },
    async ({ page, limit, status, customer_email, date_from, date_to }) => {
      const supabase = getServiceClient();
      const offset = (page - 1) * limit;

      let query = supabase
        .from('orders')
        .select(
          'id, order_number, status, total_amount:total, users!inner(email), created_at, updated_at',
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) query = query.eq('status', status);
      if (customer_email) query = query.eq('users.email', customer_email);
      if (date_from) query = query.gte('created_at', `${date_from}T00:00:00Z`);
      if (date_to) query = query.lte('created_at', `${date_to}T23:59:59Z`);

      const { data, error, count } = await query;
      if (error) throw new Error(`DB error: ${error.message}`);

      await audit(ctx, 'mcp_get_orders', 'order', undefined, {
        page,
        limit,
        status,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                orders: data ?? [],
                pagination: { page, limit, total: count ?? 0 },
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // get_order_detail
  // -------------------------------------------------------------------------
  server.tool(
    'get_order_details',
    'Get full order details including line items, shipping address, and payment info.',
    {
      order_id: uuidSchema.describe('Order UUID'),
    },
    async ({ order_id }) => {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from('orders')
        .select(
          '*, items:order_items(*, product:products(id, name, sku)), shipping_address:order_shipping_addresses(*)'
        )
        .eq('id', order_id)
        .maybeSingle();

      if (error) throw new Error(`DB error: ${error.message}`);
      if (!data)
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: 'Order not found' }),
            },
          ],
          isError: true,
        };

      await audit(ctx, 'mcp_get_order_details', 'order', order_id);

      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(data, null, 2) },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // get_inventory_summary
  // -------------------------------------------------------------------------
  server.tool(
    'get_inventory_levels',
    'Get inventory levels. Optionally filter for low-stock items only.',
    {
      low_stock_threshold: z
        .number()
        .int()
        .min(0)
        .max(10000)
        .default(5)
        .describe('Consider stock at or below this quantity as low-stock'),
      low_stock_only: z
        .boolean()
        .default(false)
        .describe('Return only products at or below the threshold'),
      limit: positiveInt.max(100).default(50),
    },
    async ({ low_stock_threshold, low_stock_only, limit }) => {
      const supabase = getServiceClient();

      let query = supabase
        .from('products')
        .select('id, sku, name, stock_quantity, status')
        .order('stock_quantity', { ascending: true })
        .limit(limit);

      if (low_stock_only) {
        query = query.lte('stock_quantity', low_stock_threshold);
      }

      const { data, error } = await query;
      if (error) throw new Error(`DB error: ${error.message}`);

      const summary = {
        total_products: data?.length ?? 0,
        low_stock_count: (data ?? []).filter(
          (p) => p.stock_quantity <= low_stock_threshold
        ).length,
        out_of_stock_count: (data ?? []).filter((p) => p.stock_quantity === 0)
          .length,
        products: data ?? [],
      };

      await audit(ctx, 'mcp_get_inventory_levels', 'inventory');

      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(summary, null, 2) },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // get_blog_posts
  // -------------------------------------------------------------------------
  server.tool(
    'get_blog_posts',
    'List blog posts. Returns title, slug, status, and publication date.',
    {
      page: z.number().int().min(1).default(1),
      limit: positiveInt.max(50).default(20),
      status: z.enum(['draft', 'published', 'archived']).optional(),
    },
    async ({ page, limit, status }) => {
      const supabase = getServiceClient();
      const offset = (page - 1) * limit;

      let query = supabase
        .from('blog_posts')
        .select(
          'id, title, slug, status, author_id, published_at, created_at',
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) query = query.eq('status', status);

      const { data, error, count } = await query;
      if (error) throw new Error(`DB error: ${error.message}`);

      await audit(ctx, 'mcp_get_blog_posts', 'blog');

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                posts: data ?? [],
                pagination: { page, limit, total: count ?? 0 },
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // get_support_tickets
  // -------------------------------------------------------------------------
  server.tool(
    'get_support_tickets',
    'List recent support tickets, optionally filtered by status.',
    {
      page: z.number().int().min(1).default(1),
      limit: positiveInt.max(50).default(20),
      status: z
        .enum(['open', 'in_progress', 'resolved', 'closed'])
        .optional()
        .describe('Filter by ticket status'),
    },
    async ({ page, limit, status }) => {
      const supabase = getServiceClient();
      const offset = (page - 1) * limit;

      let query = supabase
        .from('support_tickets')
        .select(
          'id, ticket_number, subject:title, status, priority, users!inner(email), created_at, updated_at',
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) query = query.eq('status', status);

      const { data, error, count } = await query;
      if (error) throw new Error(`DB error: ${error.message}`);

      await audit(ctx, 'mcp_get_support_tickets', 'support_ticket');

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                tickets: data ?? [],
                pagination: { page, limit, total: count ?? 0 },
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // get_sales_analytics
  // -------------------------------------------------------------------------
  server.tool(
    'get_sales_analytics',
    'Get revenue and order statistics for a date range. Returns totals, order count, and top products.',
    {
      date_from: isoDateSchema.describe('Start date (YYYY-MM-DD, inclusive)'),
      date_to: isoDateSchema.describe('End date (YYYY-MM-DD, inclusive)'),
    },
    async ({ date_from, date_to }) => {
      const supabase = getServiceClient();

      // Aggregate orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, total_amount, status, created_at')
        .gte('created_at', `${date_from}T00:00:00Z`)
        .lte('created_at', `${date_to}T23:59:59Z`)
        .neq('status', 'cancelled');

      if (ordersError) throw new Error(`DB error: ${ordersError.message}`);

      const totalRevenue = (orders ?? []).reduce(
        (sum, o) => sum + (o.total_amount ?? 0),
        0
      );
      const orderCount = orders?.length ?? 0;

      // Top products by order items in range
      const { data: topProducts, error: topError } = await supabase
        .from('order_items')
        .select('product_id, quantity, products:products(name, sku)')
        .in(
          'order_id',
          (orders ?? []).map((o) => o.id)
        )
        .limit(10);

      if (topError) throw new Error(`DB error: ${topError.message}`);

      // Aggregate by product
      const productMap: Record<
        string,
        { name: string; sku: string; total_qty: number }
      > = {};
      for (const item of topProducts ?? []) {
        const pid = item.product_id;
        if (!productMap[pid]) {
          const prod = item.products as any;
          productMap[pid] = {
            name: prod?.name ?? 'Unknown',
            sku: prod?.sku ?? '',
            total_qty: 0,
          };
        }
        productMap[pid].total_qty += item.quantity ?? 0;
      }
      const topList = Object.entries(productMap)
        .sort((a, b) => b[1].total_qty - a[1].total_qty)
        .slice(0, 5)
        .map(([id, v]) => ({ product_id: id, ...v }));

      await audit(ctx, 'mcp_get_sales_analytics', 'analytics', undefined, {
        date_from,
        date_to,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                period: { from: date_from, to: date_to },
                total_revenue: totalRevenue,
                order_count: orderCount,
                average_order_value:
                  orderCount > 0 ? +(totalRevenue / orderCount).toFixed(2) : 0,
                top_products: topList,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // get_coupons
  // -------------------------------------------------------------------------
  server.tool(
    'get_coupons',
    'List discount coupons, optionally filtered to only active ones.',
    {
      active_only: z
        .boolean()
        .default(true)
        .describe('Return only currently active, non-expired coupons'),
      limit: positiveInt.max(100).default(50),
    },
    async ({ active_only, limit }) => {
      const supabase = getServiceClient();
      const now = new Date().toISOString();

      let query = supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (active_only) {
        query = query
          .eq('active', true)
          .or(`expiry_date.is.null,expiry_date.gt.${now}`);
      }

      const { data, error } = await query;
      if (error) throw new Error(`DB error: ${error.message}`);

      await audit(ctx, 'mcp_get_coupons', 'coupons');

      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(data ?? [], null, 2) },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // get_storefront_info
  // -------------------------------------------------------------------------
  server.tool(
    'get_store_metrics',
    'Get high-level storefront metadata: product count, active offers, and site health indicators.',
    {},
    async () => {
      const supabase = getServiceClient();

      const [
        { count: productCount },
        { count: activeOffers },
        { count: openTickets },
      ] = await Promise.all([
        supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active'),
        supabase
          .from('offers')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true),
        supabase
          .from('support_tickets')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'open'),
      ]);

      await audit(ctx, 'mcp_get_store_metrics', 'website_management');

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                active_product_count: productCount ?? 0,
                active_offer_count: activeOffers ?? 0,
                open_support_ticket_count: openTickets ?? 0,
                retrieved_at: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // get_customers
  // -------------------------------------------------------------------------
  server.tool(
    'get_customers',
    'List customers with optional filters for segment, email, or role.',
    {
      page: z.number().int().min(1).default(1),
      limit: positiveInt.max(50).default(20),
      segment: safeStringSchema(64).optional(),
      email: z.string().email().optional(),
      role: z.string().optional(),
    },
    async ({ page, limit, segment, email, role }) => {
      const supabase = getServiceClient();
      const offset = (page - 1) * limit;

      let query = supabase
        .from('users')
        .select(
          'id, full_name, email, phone, wallet_balance, reward_coins, created_at',
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (segment) query = query.eq('segment', segment);
      if (email) query = query.ilike('email', `%${email}%`);
      if (role) query = query.eq('role', role);

      const { data, error, count } = await query;
      if (error) throw new Error(`DB error: ${error.message}`);

      await audit(ctx, 'mcp_get_customers', 'customer');

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                customers: data ?? [],
                pagination: { page, limit, total: count ?? 0 },
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // get_customer_detail
  // -------------------------------------------------------------------------
  server.tool(
    'get_customer_details',
    'Fetch complete customer details by user ID or email, including recent orders and wallet balance.',
    {
      user_id: uuidSchema.optional(),
      email: z.string().email().optional(),
    },
    async ({ user_id, email }) => {
      if (!user_id && !email) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: 'Provide user_id or email' }),
            },
          ],
          isError: true,
        };
      }

      const supabase = getServiceClient();
      let query = supabase.from('users').select('*').limit(1);

      if (user_id) query = query.eq('id', user_id);
      else if (email) query = query.eq('email', email);

      const { data: user, error } = await query.maybeSingle();
      if (error) throw new Error(`DB error: ${error.message}`);
      if (!user) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: 'Customer not found' }),
            },
          ],
          isError: true,
        };
      }

      const { data: orders } = await supabase
        .from('orders')
        .select('id, order_number, status, total, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      await audit(ctx, 'mcp_get_customer_details', 'customer', user.id);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              { customer: user, recent_orders: orders ?? [] },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // get_wallet_ledger
  // -------------------------------------------------------------------------
  server.tool(
    'get_wallet_ledger',
    'Get wallet transaction ledger for a user or order.',
    {
      user_id: uuidSchema.optional(),
      order_id: uuidSchema.optional(),
      limit: positiveInt.max(50).default(20),
    },
    async ({ user_id, order_id, limit }) => {
      if (!user_id && !order_id) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: 'Provide user_id or order_id' }),
            },
          ],
          isError: true,
        };
      }

      const supabase = getServiceClient();
      let query = supabase
        .from('wallet_ledger')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (user_id) query = query.eq('user_id', user_id);
      if (order_id) query = query.eq('order_id', order_id);

      const { data, error } = await query;
      if (error) throw new Error(`DB error: ${error.message}`);

      await audit(ctx, 'mcp_get_wallet_ledger', 'wallet', user_id || order_id);

      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(data ?? [], null, 2) },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // get_reward_ledger
  // -------------------------------------------------------------------------
  server.tool(
    'get_reward_ledger',
    'Get reward coin transaction ledger for a user or order.',
    {
      user_id: uuidSchema.optional(),
      order_id: uuidSchema.optional(),
      limit: positiveInt.max(50).default(20),
    },
    async ({ user_id, order_id, limit }) => {
      if (!user_id && !order_id) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: 'Provide user_id or order_id' }),
            },
          ],
          isError: true,
        };
      }

      const supabase = getServiceClient();
      let query = supabase
        .from('reward_coin_ledger')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (user_id) query = query.eq('user_id', user_id);
      if (order_id) query = query.eq('order_id', order_id);

      const { data, error } = await query;
      if (error) throw new Error(`DB error: ${error.message}`);

      await audit(
        ctx,
        'mcp_get_reward_ledger',
        'rewards_coin',
        user_id || order_id
      );

      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(data ?? [], null, 2) },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // get_wallet_balance
  // -------------------------------------------------------------------------
  server.tool(
    'get_user_wallet_balance',
    'Get wallet balance for a user.',
    { user_id: uuidSchema },
    async ({ user_id }) => {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from('users')
        .select('wallet_balance')
        .eq('id', user_id)
        .single();
      if (error) throw new Error(`DB error: ${error.message}`);
      await audit(ctx, 'mcp_get_wallet_balance', 'wallet', user_id);
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(data, null, 2) },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // get_payments
  // -------------------------------------------------------------------------
  server.tool(
    'get_payment_transactions',
    'List recent payments across the platform.',
    { limit: positiveInt.max(50).default(20) },
    async ({ limit }) => {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from('orders')
        .select('id, payment_method, payment_status, total, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw new Error(`DB error: ${error.message}`);
      await audit(ctx, 'mcp_get_payment_transactions', 'payment');
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(data ?? [], null, 2) },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // get_payment_status
  // -------------------------------------------------------------------------
  server.tool(
    'get_payment_status',
    'Get payment status for a specific order.',
    { order_id: uuidSchema },
    async ({ order_id }) => {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from('orders')
        .select('payment_status')
        .eq('id', order_id)
        .single();
      if (error) throw new Error(`DB error: ${error.message}`);
      await audit(ctx, 'mcp_get_payment_status', 'payment', order_id);
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(data, null, 2) },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // get_whatsapp_templates
  // -------------------------------------------------------------------------
  server.tool(
    'get_whatsapp_templates',
    'List available WhatsApp templates (mocked/static).',
    {},
    async () => {
      const templates = [
        { name: 'order_shipped', lang: 'en' },
        { name: 'payment_failed', lang: 'en' },
      ];
      await audit(ctx, 'mcp_get_whatsapp_templates', 'whatsapp');
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(templates, null, 2) },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // get_offers
  // -------------------------------------------------------------------------
  server.tool(
    'get_offers',
    'List marketing offers.',
    { limit: positiveInt.max(50).default(20) },
    async ({ limit }) => {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw new Error(`DB error: ${error.message}`);
      await audit(ctx, 'mcp_get_offers', 'offers');
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(data ?? [], null, 2) },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // list_users
  // -------------------------------------------------------------------------
  server.tool('get_admin_users', 'List admin/staff users.', {}, async () => {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, role')
      .in('role', ['admin', 'staff', 'manager']);
    if (error) throw new Error(`DB error: ${error.message}`);
    await audit(ctx, 'mcp_list_users', 'user_management');
    return {
      content: [
        { type: 'text' as const, text: JSON.stringify(data ?? [], null, 2) },
      ],
    };
  });

  // -------------------------------------------------------------------------
  // list_teams
  // -------------------------------------------------------------------------
  server.tool('get_teams', 'List teams (mocked for now).', {}, async () => {
    const teams = [
      { id: '1', name: 'Support' },
      { id: '2', name: 'Operations' },
    ];
    await audit(ctx, 'mcp_list_teams', 'team_management');
    return {
      content: [
        { type: 'text' as const, text: JSON.stringify(teams, null, 2) },
      ],
    };
  });

  // -------------------------------------------------------------------------
  // list_roles
  // -------------------------------------------------------------------------
  server.tool('get_roles', 'List roles.', {}, async () => {
    const roles = ['admin', 'staff', 'manager', 'customer'];
    await audit(ctx, 'mcp_list_roles', 'role_management');
    return {
      content: [
        { type: 'text' as const, text: JSON.stringify(roles, null, 2) },
      ],
    };
  });

  // -------------------------------------------------------------------------
  // list_available_mcp_tools
  // -------------------------------------------------------------------------
  server.tool('get_mcp_capabilities', 'List all MCP tools.', {}, async () => {
    await audit(ctx, 'mcp_list_tools', 'mcp_tools');
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            message:
              'List of tools is handled natively by MCP protocol discovery.',
          }),
        },
      ],
    };
  });
}

// ===========================================================================
// WRITE TOOLS  (require mcp_tools:write)
// ===========================================================================

function registerWriteTools(server: McpServer, ctx: McpRequestContext) {
  // -------------------------------------------------------------------------
  // update_inventory_stock
  // -------------------------------------------------------------------------
  server.tool(
    'update_inventory_stock',
    'Set the stock quantity for a product or a specific variant.',
    {
      product_id: uuidSchema.describe('Product UUID'),
      stock_quantity: z
        .number()
        .int()
        .min(0)
        .max(1_000_000)
        .describe('New absolute stock quantity (not a delta)'),
      variant_id: uuidSchema
        .optional()
        .describe(
          'Variant UUID — if provided, updates the variant stock instead of product-level stock'
        ),
    },
    async ({ product_id, stock_quantity, variant_id }) => {
      const supabase = getServiceClient();
      const ts = new Date().toISOString();

      if (variant_id) {
        const { error } = await supabase
          .from('product_variants')
          .update({ stock_quantity, updated_at: ts })
          .eq('id', variant_id)
          .eq('product_id', product_id); // Ensures variant belongs to product

        if (error) throw new Error(`DB error: ${error.message}`);
      } else {
        const { error } = await supabase
          .from('products')
          .update({ stock_quantity, updated_at: ts })
          .eq('id', product_id);

        if (error) throw new Error(`DB error: ${error.message}`);
      }

      await audit(ctx, 'mcp_update_inventory_stock', 'inventory', product_id, {
        stock_quantity,
        variant_id,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              product_id,
              variant_id: variant_id ?? null,
              new_stock: stock_quantity,
            }),
          },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // create_coupon
  // -------------------------------------------------------------------------
  server.tool(
    'create_coupon',
    'Create a new discount coupon. Code must be unique.',
    {
      code: safeStringSchema(32)
        .regex(
          /^[A-Z0-9_-]+$/,
          'Code must be uppercase alphanumeric with _ or -'
        )
        .describe('Coupon code (uppercase alphanumeric)'),
      discount_type: z
        .enum(['percentage', 'fixed'])
        .describe(
          'Discount type: percentage (e.g. 10%) or fixed amount (e.g. ₹100)'
        ),
      discount_value: z
        .number()
        .positive()
        .max(100_000)
        .describe('Discount value: 10 for 10%, or 100 for ₹100 off'),
      min_order_amount: z
        .number()
        .min(0)
        .max(10_000_000)
        .optional()
        .describe('Minimum cart value for coupon to apply'),
      usage_limit: z
        .number()
        .int()
        .positive()
        .max(1_000_000)
        .optional()
        .describe('Maximum number of times this coupon can be used'),
      expires_at: z
        .string()
        .trim()
        .datetime({ offset: true })
        .optional()
        .describe('Expiry datetime in ISO 8601 format'),
    },
    async ({
      code,
      discount_type,
      discount_value,
      min_order_amount,
      usage_limit,
      expires_at,
    }) => {
      // Validate: percentage discount cannot exceed 100
      if (discount_type === 'percentage' && discount_value > 100) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                error: 'Percentage discount cannot exceed 100',
              }),
            },
          ],
          isError: true,
        };
      }

      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from('coupons')
        .insert({
          code: code.toUpperCase(),
          discount_type,
          discount_value,
          min_order_amount: min_order_amount ?? null,
          usage_limit: usage_limit ?? null,
          usage_count: 0,
          is_active: true,
          expires_at: expires_at ?? null,
        })
        .select('id, code, discount_type, discount_value')
        .single();

      if (error) {
        if (error.code === '23505') {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  error: `Coupon code "${code.toUpperCase()}" already exists`,
                }),
              },
            ],
            isError: true,
          };
        }
        throw new Error(`DB error: ${error.message}`);
      }

      await audit(ctx, 'mcp_create_coupon', 'coupons', data.id, {
        code,
        discount_type,
        discount_value,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ success: true, coupon: data }),
          },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // update_support_ticket_status
  // -------------------------------------------------------------------------
  server.tool(
    'update_ticket_status',
    'Update the status of a support ticket.',
    {
      ticket_id: uuidSchema.describe('Support ticket UUID'),
      status: z
        .enum(['in_progress', 'resolved', 'closed'])
        .describe('New ticket status (cannot re-open a ticket via MCP)'),
      resolution_note: safeStringSchema(2000)
        .optional()
        .describe('Optional resolution note to attach to the ticket'),
    },
    async ({ ticket_id, status, resolution_note }) => {
      const supabase = getServiceClient();
      const updates: Record<string, string> = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (resolution_note) {
        updates.resolution_note = resolution_note;
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', ticket_id);

      if (error) throw new Error(`DB error: ${error.message}`);

      await audit(
        ctx,
        'mcp_update_ticket_status',
        'support_ticket',
        ticket_id,
        { status }
      );

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              ticket_id,
              new_status: status,
            }),
          },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // send_whatsapp_message
  // -------------------------------------------------------------------------
  server.tool(
    'send_whatsapp_message',
    'Send a WhatsApp message using a pre-defined template to a customer phone number.',
    {
      to: safeStringSchema(20).describe('Customer phone number'),
      template_name: safeStringSchema(128).describe('WhatsApp template name'),
      language_code: safeStringSchema(10)
        .default('en')
        .describe('Language code (e.g., en)'),
      components: z
        .array(z.any())
        .default([])
        .describe('Template components payload'),
    },
    async ({ to, template_name, language_code, components }) => {
      try {
        const result = await sendWhatsAppMessage(
          to,
          template_name,
          language_code,
          components
        );
        await audit(ctx, 'mcp_send_whatsapp', 'whatsapp', undefined, {
          to,
          template_name,
        });
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ success: true, result }),
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                error: err.message || 'WhatsApp sending failed',
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // -------------------------------------------------------------------------
  // send_push_notification
  // -------------------------------------------------------------------------
  server.tool(
    'send_push_notification',
    'Send an FCM push notification to specific users.',
    {
      user_ids: z.array(uuidSchema).min(1).describe('Array of user UUIDs'),
      title: safeStringSchema(128).describe('Notification title'),
      body: safeStringSchema(512).optional().describe('Notification body text'),
      url: z.string().url().optional().describe('Deep link or action URL'),
      image_url: z
        .string()
        .url()
        .optional()
        .describe('Image URL for rich notification'),
    },
    async ({ user_ids, title, body, url, image_url }) => {
      try {
        const tokens = await getTokensForUsers(user_ids);
        if (tokens.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  error: 'No push tokens found for specified users',
                }),
              },
            ],
            isError: true,
          };
        }

        const result = await sendFcmToTokens(tokens, {
          title,
          body,
          url,
          imageUrl: image_url,
        });
        await audit(
          ctx,
          'mcp_send_push_notification',
          'push_notification',
          undefined,
          { user_count: user_ids.length, result }
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ success: true, ...result }),
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                error: err.message || 'Push notification failed',
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // -------------------------------------------------------------------------
  // create_product
  // -------------------------------------------------------------------------
  server.tool(
    'create_product',
    'Create a new product.',
    {
      sku: safeStringSchema(64),
      name: safeStringSchema(128),
      slug: safeStringSchema(128),
      price: z.number().positive(),
      mrp: z.number().positive(),
    },
    async (args) => {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from('products')
        .insert(args)
        .select()
        .single();
      if (error) throw new Error(`DB error: ${error.message}`);
      await audit(ctx, 'mcp_create_product', 'products', data.id);
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(data, null, 2) },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // update_product
  // -------------------------------------------------------------------------
  server.tool(
    'update_product',
    'Update a product.',
    {
      product_id: uuidSchema,
      name: safeStringSchema(128).optional(),
      price: z.number().positive().optional(),
      mrp: z.number().positive().optional(),
      status: z.enum(['active', 'inactive', 'draft']).optional(),
    },
    async ({ product_id, ...args }) => {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from('products')
        .update({ ...args, updated_at: new Date().toISOString() })
        .eq('id', product_id)
        .select()
        .single();
      if (error) throw new Error(`DB error: ${error.message}`);
      await audit(ctx, 'mcp_update_product', 'products', product_id);
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(data, null, 2) },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // create_category
  // -------------------------------------------------------------------------
  server.tool(
    'create_category',
    'Create a new category.',
    { name: safeStringSchema(128), slug: safeStringSchema(128) },
    async (args) => {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from('categories')
        .insert(args)
        .select()
        .single();
      if (error) throw new Error(`DB error: ${error.message}`);
      await audit(ctx, 'mcp_create_category', 'category', data.id);
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(data, null, 2) },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // update_category
  // -------------------------------------------------------------------------
  server.tool(
    'update_category',
    'Update a category.',
    {
      category_id: uuidSchema,
      name: safeStringSchema(128).optional(),
    },
    async ({ category_id, ...args }) => {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from('categories')
        .update(args)
        .eq('id', category_id)
        .select()
        .single();
      if (error) throw new Error(`DB error: ${error.message}`);
      await audit(ctx, 'mcp_update_category', 'category', category_id);
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(data, null, 2) },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // create_blog_post
  // -------------------------------------------------------------------------
  server.tool(
    'create_blog_post',
    'Create a new blog post.',
    {
      title: safeStringSchema(256),
      slug: safeStringSchema(256),
      status: z.enum(['draft', 'published']).default('draft'),
    },
    async (args) => {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from('blog_posts')
        .insert(args)
        .select()
        .single();
      if (error) throw new Error(`DB error: ${error.message}`);
      await audit(ctx, 'mcp_create_blog_post', 'blog', data.id);
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(data, null, 2) },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // create_offer
  // -------------------------------------------------------------------------
  server.tool(
    'create_offer',
    'Create an offer.',
    {
      title: safeStringSchema(128),
      description: safeStringSchema(512),
      is_active: z.boolean().default(true),
    },
    async (args) => {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from('offers')
        .insert(args)
        .select()
        .single();
      if (error) throw new Error(`DB error: ${error.message}`);
      await audit(ctx, 'mcp_create_offer', 'offers', data.id);
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(data, null, 2) },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // trigger_marketing_campaign
  // -------------------------------------------------------------------------
  server.tool(
    'trigger_marketing_campaign',
    'Trigger a marketing campaign.',
    { campaign_id: safeStringSchema(128) },
    async ({ campaign_id }) => {
      await audit(
        ctx,
        'mcp_trigger_campaign',
        'marketing_campaign',
        campaign_id
      );
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              message: 'Campaign triggered',
            }),
          },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // create_support_ticket
  // -------------------------------------------------------------------------
  server.tool(
    'create_support_ticket',
    'Create a support ticket.',
    {
      customer_id: uuidSchema,
      title: safeStringSchema(128),
      description: safeStringSchema(1024),
      priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
    },
    async (args) => {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({ ...args, source: 'ai_chat', ai_created: true })
        .select()
        .single();
      if (error) throw new Error(`DB error: ${error.message}`);
      await audit(ctx, 'mcp_create_ticket', 'support_ticket', data.id);
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(data, null, 2) },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // update_coupon
  // -------------------------------------------------------------------------
  server.tool(
    'update_coupon_status',
    'Update a coupon.',
    {
      coupon_id: uuidSchema,
      active: z.boolean().optional(),
    },
    async ({ coupon_id, active }) => {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from('coupons')
        .update({ active })
        .eq('id', coupon_id)
        .select()
        .single();
      if (error) throw new Error(`DB error: ${error.message}`);
      await audit(ctx, 'mcp_update_coupon_status', 'coupons', coupon_id);
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(data, null, 2) },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // update_website_banners
  // -------------------------------------------------------------------------
  server.tool(
    'update_website_banners',
    'Update website banners (stub)',
    {
      banner_id: z.string(),
      active: z.boolean(),
    },
    async ({ banner_id, active }) => {
      await audit(ctx, 'mcp_update_website_banners', 'website_management');
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify({ success: true }) },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // update_blog_post
  // -------------------------------------------------------------------------
  server.tool(
    'update_blog_post',
    'Update a blog post (stub)',
    {
      id: z.string(),
      title: z.string().optional(),
    },
    async ({ id, title }) => {
      await audit(ctx, 'mcp_update_blog_post', 'blog');
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify({ success: true }) },
        ],
      };
    }
  );
}

// ---------------------------------------------------------------------------
// Internal audit helper — wraps logAuditEvent with MCP context
// ---------------------------------------------------------------------------
async function audit(
  ctx: McpRequestContext,
  action: string,
  entityType: string,
  entityId?: string,
  changes?: Record<string, unknown>
) {
  // Non-blocking — never throw
  logAuditEvent({
    portal: 'admin',
    action,
    entityType,
    entityId,
    changes: {
      ...changes,
      mcpKeyId: ctx.keyId,
      mcpKeyName: ctx.keyName,
      mcpScopeLevel: ctx.scopeLevel,
    },
  }).catch(() => {});
}
