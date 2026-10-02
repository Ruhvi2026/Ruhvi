import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/service';
import { getAuthenticatedStaff } from '@/lib/auth/task-auth';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: Request) {
  try {
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'order' | 'product' | 'ticket'
    const id = searchParams.get('id');
    const search = searchParams.get('search');

    if (!type || !['order', 'product', 'ticket'].includes(type)) {
      return NextResponse.json(
        { error: 'Valid type (order, product, ticket) is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // 1. Single Entity Detail Mode
    if (id) {
      if (type === 'order') {
        let orderQuery = supabase.from('orders').select(`
            id,
            order_number,
            status,
            total,
            subtotal,
            payment_method,
            payment_status,
            created_at,
            shipped_at,
            delivered_at,
            user_id
          `);

        if (UUID_RE.test(id)) {
          orderQuery = orderQuery.eq('id', id);
        } else {
          orderQuery = orderQuery.eq('order_number', id.trim());
        }

        const { data: order, error } = await orderQuery.maybeSingle();
        if (error) throw error;
        if (!order) {
          return NextResponse.json(
            { error: 'Order not found' },
            { status: 404 }
          );
        }

        // Fetch user customer info
        let customer = null;
        if (order.user_id) {
          const { data: u } = await supabase
            .from('users')
            .select('id, full_name, email, phone')
            .eq('id', order.user_id)
            .maybeSingle();
          customer = u;
        }

        // Fetch order items with product titles
        const { data: items } = await supabase
          .from('order_items')
          .select(
            `
            id,
            product_id,
            sku,
            quantity,
            price_at_purchase,
            line_total
          `
          )
          .eq('order_id', order.id);

        let enrichedItems = items || [];
        if (enrichedItems.length > 0) {
          const productIds = enrichedItems
            .map((i) => i.product_id)
            .filter(Boolean);
          if (productIds.length > 0) {
            const { data: prods } = await supabase
              .from('products')
              .select('id, name, slug')
              .in('id', productIds);
            const prodMap = new Map((prods || []).map((p) => [p.id, p]));
            enrichedItems = enrichedItems.map((item) => ({
              ...item,
              product_name:
                prodMap.get(item.product_id)?.name ||
                item.sku ||
                'Product Item',
              product_slug: prodMap.get(item.product_id)?.slug,
            }));
          }
        }

        return NextResponse.json({
          success: true,
          type: 'order',
          data: {
            ...order,
            customer,
            items: enrichedItems,
          },
        });
      }

      if (type === 'product') {
        let prodQuery = supabase.from('products').select(`
            id,
            name,
            slug,
            sku,
            price,
            mrp,
            stock_quantity,
            low_stock_threshold,
            description,
            status,
            category_id,
            created_at
          `);

        if (UUID_RE.test(id)) {
          prodQuery = prodQuery.eq('id', id);
        } else {
          prodQuery = prodQuery.or(`sku.eq.${id.trim()},slug.eq.${id.trim()}`);
        }

        const { data: product, error } = await prodQuery.maybeSingle();
        if (error) throw error;
        if (!product) {
          return NextResponse.json(
            { error: 'Product not found' },
            { status: 404 }
          );
        }

        // Fetch images
        const { data: images } = await supabase
          .from('product_images')
          .select('id, url, sort_order')
          .eq('product_id', product.id)
          .order('sort_order', { ascending: true });

        return NextResponse.json({
          success: true,
          type: 'product',
          data: {
            ...product,
            images: images || [],
          },
        });
      }

      if (type === 'ticket') {
        let ticketQuery = supabase.from('support_tickets').select(`
            id,
            ticket_number,
            title,
            description,
            ai_summary,
            priority,
            status,
            customer_email,
            guest_name,
            guest_phone,
            created_at,
            assigned_to,
            order_id,
            product_id
          `);

        if (UUID_RE.test(id)) {
          ticketQuery = ticketQuery.eq('id', id);
        } else {
          ticketQuery = ticketQuery.eq('ticket_number', id.trim());
        }

        const { data: ticket, error } = await ticketQuery.maybeSingle();
        if (error) throw error;
        if (!ticket) {
          return NextResponse.json(
            { error: 'Ticket not found' },
            { status: 404 }
          );
        }

        // Fetch recent messages
        const { data: messages } = await supabase
          .from('support_ticket_messages')
          .select('id, sender_type, message, created_at')
          .eq('ticket_id', ticket.id)
          .order('created_at', { ascending: false })
          .limit(10);

        return NextResponse.json({
          success: true,
          type: 'ticket',
          data: {
            ...ticket,
            messages: messages || [],
          },
        });
      }
    }

    // 2. Search / List Mode for Selectors
    if (type === 'order') {
      let query = supabase
        .from('orders')
        .select('id, order_number, status, total, created_at')
        .order('created_at', { ascending: false })
        .limit(15);

      if (search && search.trim()) {
        query = query.ilike('order_number', `%${search.trim()}%`);
      }

      const { data: orders, error } = await query;
      if (error) throw error;
      return NextResponse.json({ success: true, list: orders || [] });
    }

    if (type === 'product') {
      let query = supabase
        .from('products')
        .select('id, name, sku, price, stock_quantity, status')
        .order('created_at', { ascending: false })
        .limit(15);

      if (search && search.trim()) {
        query = query.or(
          `name.ilike.%${search.trim()}%,sku.ilike.%${search.trim()}%`
        );
      }

      const { data: products, error } = await query;
      if (error) throw error;
      return NextResponse.json({ success: true, list: products || [] });
    }

    if (type === 'ticket') {
      let query = supabase
        .from('support_tickets')
        .select('id, ticket_number, title, status, priority, created_at')
        .order('created_at', { ascending: false })
        .limit(15);

      if (search && search.trim()) {
        query = query.or(
          `ticket_number.ilike.%${search.trim()}%,title.ilike.%${search.trim()}%`
        );
      }

      const { data: tickets, error } = await query;
      if (error) throw error;
      return NextResponse.json({ success: true, list: tickets || [] });
    }

    return NextResponse.json({ success: true, list: [] });
  } catch (err: any) {
    console.error('[Related Entities API] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
