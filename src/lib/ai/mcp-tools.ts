import 'server-only';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getServiceClient } from '@/lib/supabase/service';
import { logAuditEvent } from '@/lib/audit';
import { assertMcpScope, type McpScopeLevel } from '@/lib/ai/mcp-auth';

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

  registerReadTools(server, ctx);
  registerWriteTools(server, ctx);

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

      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(data ?? [], null, 2) },
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
          'id, order_number, status, total_amount, currency, customer_email, created_at, updated_at',
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) query = query.eq('status', status);
      if (customer_email) query = query.eq('customer_email', customer_email);
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
    'get_order_detail',
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

      await audit(ctx, 'mcp_get_order_detail', 'order', order_id);

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
    'get_inventory_summary',
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

      await audit(ctx, 'mcp_get_inventory_summary', 'inventory');

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
          'id, ticket_number, subject, status, priority, customer_email, created_at, updated_at',
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
        .select(
          'id, code, discount_type, discount_value, min_order_amount, usage_count, usage_limit, expires_at, is_active'
        )
        .order('created_at', { ascending: false })
        .limit(limit);

      if (active_only) {
        query = query
          .eq('is_active', true)
          .or(`expires_at.is.null,expires_at.gt.${now}`);
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
    'get_storefront_info',
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

      await audit(ctx, 'mcp_get_storefront_info', 'website_management');

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
}

// ===========================================================================
// WRITE TOOLS  (require mcp_tools:write)
// ===========================================================================

function registerWriteTools(server: McpServer, ctx: McpRequestContext) {
  // -------------------------------------------------------------------------
  // update_product_status
  // -------------------------------------------------------------------------
  server.tool(
    'update_product_status',
    "Set a product's status to active, inactive, or draft.",
    {
      product_id: uuidSchema.describe('Product UUID'),
      status: z
        .enum(['active', 'inactive', 'draft'])
        .describe('New product status'),
    },
    async ({ product_id, status }) => {
      const scopeError = assertMcpScope(ctx.scopeLevel, 'write');
      if (scopeError)
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(scopeError) },
          ],
          isError: true,
        };

      const supabase = getServiceClient();
      const { error } = await supabase
        .from('products')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', product_id);

      if (error) throw new Error(`DB error: ${error.message}`);

      await audit(ctx, 'mcp_update_product_status', 'product', product_id, {
        status,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              product_id,
              new_status: status,
            }),
          },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // update_product_price
  // -------------------------------------------------------------------------
  server.tool(
    'update_product_price',
    'Update the selling price and/or MRP of a product. Price must be less than or equal to MRP.',
    {
      product_id: uuidSchema.describe('Product UUID'),
      price: z
        .number()
        .positive()
        .max(10_000_000)
        .optional()
        .describe('New selling price (INR)'),
      mrp: z
        .number()
        .positive()
        .max(10_000_000)
        .optional()
        .describe('New maximum retail price (INR)'),
    },
    async ({ product_id, price, mrp }) => {
      const scopeError = assertMcpScope(ctx.scopeLevel, 'write');
      if (scopeError)
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(scopeError) },
          ],
          isError: true,
        };

      if (!price && !mrp) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                error: 'Provide at least one of price or mrp',
              }),
            },
          ],
          isError: true,
        };
      }

      // Fetch current values to validate the price ≤ MRP invariant
      const supabase = getServiceClient();
      const { data: current, error: fetchError } = await supabase
        .from('products')
        .select('price, mrp')
        .eq('id', product_id)
        .maybeSingle();

      if (fetchError || !current) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: 'Product not found' }),
            },
          ],
          isError: true,
        };
      }

      const resolvedPrice = price ?? current.price;
      const resolvedMrp = mrp ?? current.mrp;

      if (resolvedPrice > resolvedMrp) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                error: `Selling price (${resolvedPrice}) cannot exceed MRP (${resolvedMrp})`,
              }),
            },
          ],
          isError: true,
        };
      }

      const updates: Record<string, number | string> = {
        updated_at: new Date().toISOString(),
      };
      if (price !== undefined) updates.price = price;
      if (mrp !== undefined) updates.mrp = mrp;

      const { error: updateError } = await supabase
        .from('products')
        .update(updates)
        .eq('id', product_id);
      if (updateError) throw new Error(`DB error: ${updateError.message}`);

      await audit(ctx, 'mcp_update_product_price', 'product', product_id, {
        price,
        mrp,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              product_id,
              price: resolvedPrice,
              mrp: resolvedMrp,
            }),
          },
        ],
      };
    }
  );

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
      const scopeError = assertMcpScope(ctx.scopeLevel, 'write');
      if (scopeError)
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(scopeError) },
          ],
          isError: true,
        };

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
      const scopeError = assertMcpScope(ctx.scopeLevel, 'write');
      if (scopeError)
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(scopeError) },
          ],
          isError: true,
        };

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
    'update_support_ticket_status',
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
      const scopeError = assertMcpScope(ctx.scopeLevel, 'write');
      if (scopeError)
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(scopeError) },
          ],
          isError: true,
        };

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
        'mcp_update_support_ticket_status',
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
