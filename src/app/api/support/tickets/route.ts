import { NextResponse, NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';

/**
 * Support Tickets API
 * GET  — List tickets (customer sees own, staff sees all)
 * POST — Create a new ticket manually
 */

async function getSupabaseAdmin(cookieStore: any) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
      'https://igrkrkxdantrolbldapj.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );
}

async function getCurrentUser(cookieStore: any) {
  const sessionCookie = cookieStore.get('__session')?.value;
  if (!sessionCookie) return null;

  try {
    const decoded = decodeJwt(sessionCookie);
    const uid = decoded.sub;
    if (!uid) return null;

    const supabase = await getSupabaseAdmin(cookieStore);
    const { data: user } = await supabase
      .from('users')
      .select('id, full_name, email, phone, role')
      .eq('firebase_uid', uid)
      .maybeSingle();

    // Grant admin to primary email
    if (user && decoded.email === 'ruhvi.main@gmail.com') {
      user.role = 'admin';
    }

    return user;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const user = await getCurrentUser(cookieStore);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await getSupabaseAdmin(cookieStore);
    const { searchParams } = new URL(req.url);

    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const category = searchParams.get('category');
    const assignee = searchParams.get('assignee');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = (page - 1) * limit;
    const sortBy = searchParams.get('sort') || 'created_at';
    const sortOrder = searchParams.get('order') === 'asc';

    let query = supabase.from('support_tickets').select(
      `
        id, ticket_number, title, description, ai_summary,
        priority, status, source, created_at, updated_at,
        sla_due_at, sla_breached, ai_created,
        first_response_at, resolved_at,
        customer:customer_id(id, full_name, email, phone),
        assigned:assigned_to(id, full_name, email),
        category:category_id(id, name, slug),
        subcategory:subcategory_id(id, name, slug),
        order:order_id(id, order_number, status, total),
        product:product_id(id, name, slug)
      `,
      { count: 'exact' }
    );

    // Customer only sees own tickets
    const isStaff = ['admin', 'manager', 'staff'].includes(user.role);
    if (!isStaff) {
      query = query.eq('customer_id', user.id);
    }

    // Filters
    if (status) query = query.eq('status', status);
    if (priority) query = query.eq('priority', priority);
    if (category) query = query.eq('category_id', category);
    if (assignee === 'unassigned') {
      query = query.is('assigned_to', null);
    } else if (assignee === 'me') {
      query = query.eq('assigned_to', user.id);
    } else if (assignee) {
      query = query.eq('assigned_to', assignee);
    }
    if (search) {
      query = query.or(
        `ticket_number.ilike.%${search}%,title.ilike.%${search}%`
      );
    }

    // Sorting
    const validSortFields = [
      'created_at',
      'updated_at',
      'priority',
      'sla_due_at',
    ];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    query = query.order(sortField, { ascending: sortOrder });

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data: tickets, error, count } = await query;

    if (error) {
      console.error('Tickets query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tickets' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      tickets: tickets || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (err: any) {
    console.error('Tickets GET Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const user = await getCurrentUser(cookieStore);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await getSupabaseAdmin(cookieStore);
    const body = await req.json();

    const {
      title,
      description,
      category_slug,
      subcategory_slug,
      priority,
      order_id,
      product_id,
    } = body;

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required.' },
        { status: 400 }
      );
    }

    // Look up category
    let categoryId = null;
    let subcategoryId = null;

    if (category_slug) {
      const { data: cat } = await supabase
        .from('support_categories')
        .select('id')
        .eq('slug', category_slug)
        .is('parent_id', null)
        .maybeSingle();
      categoryId = cat?.id || null;

      if (subcategory_slug && categoryId) {
        const { data: subcat } = await supabase
          .from('support_categories')
          .select('id')
          .eq('slug', subcategory_slug)
          .eq('parent_id', categoryId)
          .maybeSingle();
        subcategoryId = subcat?.id || null;
      }
    }

    // Validate order belongs to user (if customer)
    if (order_id && user.role === 'customer') {
      const { data: order } = await supabase
        .from('orders')
        .select('id')
        .eq('id', order_id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!order) {
        return NextResponse.json(
          { error: 'Order not found.' },
          { status: 404 }
        );
      }
    }

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert({
        customer_id: user.id,
        order_id: order_id || null,
        product_id: product_id || null,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        title,
        description,
        priority: priority || 'normal',
        source: 'manual',
        ai_created: false,
      })
      .select('id, ticket_number')
      .single();

    if (error) {
      console.error('Ticket creation error:', error);
      return NextResponse.json(
        { error: 'Failed to create ticket' },
        { status: 500 }
      );
    }

    // Add the initial message
    await supabase.from('support_messages').insert({
      ticket_id: ticket.id,
      sender_type: 'customer',
      sender_id: user.id,
      message: description,
      visibility: 'customer',
    });

    // Audit log
    await supabase.from('support_audit_logs').insert({
      ticket_id: ticket.id,
      actor_id: user.id,
      actor_type: 'customer',
      action: 'ticket_created',
      new_value: { ticket_number: ticket.ticket_number, source: 'manual' },
    });

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (err: any) {
    console.error('Tickets POST Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
