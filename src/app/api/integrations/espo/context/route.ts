import { NextResponse, NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getEspoConfig } from '@/lib/espo/config';
import { verifySignature } from '@/lib/espo/crypto';

/**
 * GET /api/integrations/espo/context
 *
 * Secure context API called by the EspoCRM VPS so agents can view relevant
 * customer / order / wallet / history data **inside a Case** without duplicating
 * the primary data in EspoCRM's own database (Supabase remains the source of
 * truth).
 *
 * Auth: requires `X-Ruhvi-Signature` = HMAC-SHA256(ESPO_WEBHOOK_SECRET, body)
 *       or `X-Api-Key` matching ESPO_API_KEY. `X-Ruhvi-Timestamp` guards replay.
 *
 * Query params:
 *   - customerId   (Ruhvi user UUID) OR
 *   - ticketId     (Ruhvi support_tickets UUID) OR
 *   - email        (customer email)
 *   - ordersLimit  (default 5)
 *   - historyLimit (default 5)
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

export async function GET(req: NextRequest) {
  const cfg = getEspoConfig();
  if (!cfg.enabled) {
    return NextResponse.json(
      { error: 'EspoCRM integration is disabled' },
      { status: 404 }
    );
  }

  // ── Auth: API key or HMAC signature ─────────────────────────────────────
  const apiKey = req.headers.get('X-Api-Key') || '';
  const signature = req.headers.get('X-Ruhvi-Signature') || '';
  const timestamp = req.headers.get('X-Ruhvi-Timestamp') || '';

  const apiKeyOk = apiKey && cfg.apiKey && apiKey === cfg.apiKey;

  let hmacOk = false;
  if (signature && cfg.webhookSecret) {
    if (timestamp) {
      const age = Math.abs(Date.now() - parseInt(timestamp, 10));
      if (age > 5 * 60 * 1000) {
        return NextResponse.json(
          { error: 'Request timestamp is stale' },
          { status: 401 }
        );
      }
    }
    hmacOk = await verifySignature(
      `${timestamp}${req.nextUrl.pathname}${req.nextUrl.search}`,
      cfg.webhookSecret,
      signature
    );
  }

  if (!apiKeyOk && !hmacOk) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    const ticketId = searchParams.get('ticketId');
    const email = searchParams.get('email')?.trim().toLowerCase();
    const ordersLimit = Math.min(
      parseInt(searchParams.get('ordersLimit') || '5'),
      20
    );
    const historyLimit = Math.min(
      parseInt(searchParams.get('historyLimit') || '5'),
      20
    );

    const cookieStore = await cookies();
    const supabase = await getSupabaseAdmin(cookieStore);

    // Resolve the customer UUID from any of the provided identifiers.
    let resolvedCustomerId: string | null = customerId;
    if (!resolvedCustomerId && ticketId) {
      const { data: t } = await supabase
        .from('support_tickets')
        .select('customer_id')
        .eq('id', ticketId)
        .maybeSingle();
      resolvedCustomerId = t?.customer_id || null;
    }
    if (!resolvedCustomerId && email) {
      const { data: u } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      resolvedCustomerId = u?.id || null;
    }

    if (!resolvedCustomerId) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Customer profile (no duplication — read live from Supabase).
    const { data: customer, error: customerErr } = await supabase
      .from('users')
      .select(
        'id, full_name, email, phone, created_at, wallet_balance, reward_coins, referral_code'
      )
      .eq('id', resolvedCustomerId)
      .maybeSingle();

    if (customerErr || !customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Recent orders with items.
    const { data: orders } = await supabase
      .from('orders')
      .select(
        `id, order_number, status, total, payment_status, payment_method, created_at, shipping_charge, awb_code, courier_name,
         items:order_items(id, sku, quantity, price_at_purchase, product:product_id(name, slug))`
      )
      .eq('user_id', resolvedCustomerId)
      .order('created_at', { ascending: false })
      .limit(ordersLimit);

    // Recent support history.
    const { data: history } = await supabase
      .from('support_tickets')
      .select(
        'id, ticket_number, title, status, priority, created_at, updated_at'
      )
      .eq('customer_id', resolvedCustomerId)
      .order('created_at', { ascending: false })
      .limit(historyLimit);

    return NextResponse.json({
      customer: {
        id: customer.id,
        full_name: customer.full_name,
        email: customer.email,
        phone: customer.phone,
        member_since: customer.created_at,
        wallet_balance: customer.wallet_balance,
        reward_coins: customer.reward_coins,
        referral_code: customer.referral_code,
      },
      orders: orders || [],
      support_history: history || [],
      generated_at: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('EspoCRM context API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
