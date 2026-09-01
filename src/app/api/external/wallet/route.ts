import { NextRequest, NextResponse } from 'next/server';
import { extractBearerToken, hashApiKey, hasPermission } from '@/lib/api-keys';
import { getServiceClient } from '@/lib/supabase/service';
import { logAuditEvent } from '@/lib/audit';
import { generateMerchantTransactionId } from '@/lib/wallet/topup';

// Internal secret used in migration 0017 for secure RPC calls
const INTERNAL_SECRET = 'ruhvi_wallet_secret_2026';

// ---------------------------------------------------------------------------
// Helper to authenticate request and check scopes
// ---------------------------------------------------------------------------
async function getAuthenticatedKey(
  req: NextRequest,
  minLevel: 'read' | 'write' | 'admin'
) {
  const rawKey = extractBearerToken(req.headers.get('authorization'));
  if (!rawKey) {
    return { error: 'Unauthorized', status: 401 };
  }

  const keyHash = hashApiKey(rawKey);
  const supabaseAuth = getServiceClient();
  const { data: keyRow } = await supabaseAuth
    .from('api_keys')
    .select('id, scopes, revoked_at')
    .eq('key_hash', keyHash)
    .maybeSingle();

  if (!keyRow || keyRow.revoked_at !== null) {
    return { error: 'Unauthorized', status: 401 };
  }

  const scopes: string[] = Array.isArray(keyRow.scopes) ? keyRow.scopes : [];
  if (!hasPermission(scopes, 'wallet', minLevel)) {
    return { error: 'Forbidden', status: 403 };
  }

  return { keyId: keyRow.id, scopes };
}

// ---------------------------------------------------------------------------
// GET /api/external/wallet
// Read balance + transaction history.
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'read');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json(
      { error: '`userId` is required in query parameters' },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();

  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('wallet_balance')
    .eq('id', userId)
    .maybeSingle();

  if (userError) {
    console.error('[external/wallet GET] Supabase user error:', userError);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
  if (!userRow) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { data: ledger, error: ledgerError } = await supabase
    .from('wallet_ledger')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (ledgerError) {
    console.error('[external/wallet GET] Supabase ledger error:', ledgerError);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      balance: userRow.wallet_balance || 0,
      transactions: ledger || [],
    },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// POST /api/external/wallet
// Create a transaction request (Top-up initialization).
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'write');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const userId = body.userId as string | undefined;
  const amount = Number(body.amount);

  if (!userId || typeof userId !== 'string') {
    return NextResponse.json(
      { error: '`userId` is required' },
      { status: 422 }
    );
  }
  if (!amount || amount <= 0 || isNaN(amount)) {
    return NextResponse.json(
      { error: '`amount` must be a positive number' },
      { status: 422 }
    );
  }

  const supabase = getServiceClient();

  const { data: userRow } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (!userRow) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const merchantTransactionId = generateMerchantTransactionId();

  const { data, error } = await supabase
    .from('wallet_topups')
    .insert({
      user_id: userRow.id,
      amount,
      bonus_amount: 0,
      merchant_transaction_id: merchantTransactionId,
      status: 'pending',
    })
    .select('*')
    .single();

  if (error) {
    console.error('[external/wallet POST] Supabase error:', error);
    return NextResponse.json(
      { error: 'Failed to create top-up request' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      topup: data,
    },
    { status: 201 }
  );
}

// ---------------------------------------------------------------------------
// PUT /api/external/wallet
// Admin manual credit/debit adjustment (requires Admin scope).
// ---------------------------------------------------------------------------
export async function PUT(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'admin');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const userId = body.userId as string | undefined;
  const amount = Number(body.amount);
  const type = body.type as string | undefined;
  const reason = body.reason as string | undefined;

  if (!userId || typeof userId !== 'string') {
    return NextResponse.json(
      { error: '`userId` is required' },
      { status: 422 }
    );
  }
  if (!amount || amount <= 0 || isNaN(amount)) {
    return NextResponse.json(
      { error: '`amount` must be a positive number' },
      { status: 422 }
    );
  }
  if (type !== 'credit' && type !== 'debit') {
    return NextResponse.json(
      { error: '`type` must be either "credit" or "debit"' },
      { status: 422 }
    );
  }
  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    return NextResponse.json(
      { error: '`reason` is required for manual adjustments' },
      { status: 422 }
    );
  }

  const supabase = getServiceClient();

  const { data: userRow } = await supabase
    .from('users')
    .select('id, wallet_balance')
    .eq('id', userId)
    .maybeSingle();

  if (!userRow) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (type === 'debit') {
    const balance = Number(userRow.wallet_balance) || 0;
    if (balance < amount) {
      return NextResponse.json(
        { error: 'Insufficient wallet balance for debit' },
        { status: 400 }
      );
    }

    const { error: insertError } = await supabase.from('wallet_ledger').insert({
      user_id: userRow.id,
      amount,
      type: 'debit',
    });

    if (insertError) {
      console.error('[external/wallet PUT] Supabase debit error:', insertError);
      return NextResponse.json(
        { error: 'Failed to apply debit' },
        { status: 500 }
      );
    }
  } else {
    // credit
    const { error: rpcError } = await supabase.rpc('wallet_topup', {
      p_user_id: userRow.id,
      p_amount: amount,
      p_type: 'credit',
      p_secret: INTERNAL_SECRET,
    });

    if (rpcError) {
      console.error('[external/wallet PUT] Supabase credit error:', rpcError);
      return NextResponse.json(
        { error: 'Failed to apply credit' },
        { status: 500 }
      );
    }
  }

  // Write audit log entry
  await logAuditEvent({
    portal: 'admin',
    action: `MANUAL_WALLET_${type.toUpperCase()}`,
    entityType: 'wallet',
    entityId: userRow.id,
    changes: {
      amount,
      reason,
      apiKey: auth.keyId,
    },
  });

  return NextResponse.json(
    {
      success: true,
      message: `Wallet manually ${type === 'credit' ? 'credited' : 'debited'} successfully`,
    },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// DELETE /api/external/wallet
// ---------------------------------------------------------------------------
export async function DELETE(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'admin');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  return NextResponse.json(
    { error: 'DELETE is not supported on the wallet resource' },
    { status: 405 } // Method Not Allowed
  );
}
