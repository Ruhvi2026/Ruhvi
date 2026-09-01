import { NextRequest, NextResponse } from 'next/server';
import { extractBearerToken, hashApiKey, hasPermission } from '@/lib/api-keys';
import { getServiceClient } from '@/lib/supabase/service';
import { logAuditEvent } from '@/lib/audit';

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
    .select('id, name, scopes, revoked_at')
    .eq('key_hash', keyHash)
    .maybeSingle();

  if (!keyRow || keyRow.revoked_at !== null) {
    return { error: 'Unauthorized', status: 401 };
  }

  const scopes: string[] = Array.isArray(keyRow.scopes) ? keyRow.scopes : [];
  if (!hasPermission(scopes, 'rewards_coin', minLevel)) {
    return { error: 'Forbidden', status: 403 };
  }

  return { keyId: keyRow.id, keyName: keyRow.name, scopes };
}

// Helpers for 100-day coin expiry
const EXPIRY_DAYS = 100;
function getExpiryDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + EXPIRY_DAYS);
  return date.toISOString();
}

// ---------------------------------------------------------------------------
// GET /api/external/rewards-coin
// Read reward coins balance + transaction history.
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
    .select('reward_coins')
    .eq('id', userId)
    .maybeSingle();

  if (userError) {
    console.error(
      '[external/rewards-coin GET] Supabase user error:',
      userError
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
  if (!userRow) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { data: ledger, error: ledgerError } = await supabase
    .from('reward_coin_ledger')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (ledgerError) {
    console.error(
      '[external/rewards-coin GET] Supabase ledger error:',
      ledgerError
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      balance: userRow.reward_coins || 0,
      transactions: ledger || [],
    },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// POST /api/external/rewards-coin
// Create a transaction request (Grant coins with 100-day expiry).
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
  if (amount > 100000 && !hasPermission(auth.scopes, 'rewards_coin', 'admin')) {
    // Safety cap for non-admin keys
    return NextResponse.json(
      { error: 'Coin grant amount exceeds safe threshold' },
      { status: 400 }
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

  const { error } = await supabase.from('reward_coin_ledger').insert({
    user_id: userRow.id,
    amount,
    type: 'earned',
    expiry_date: getExpiryDate(),
  });

  if (error) {
    console.error('[external/rewards-coin POST] Supabase error:', error);
    return NextResponse.json(
      { error: 'Failed to grant reward coins' },
      { status: 500 }
    );
  }

  // Write audit log entry
  await logAuditEvent({
    portal: 'admin',
    action: 'EXTERNAL_API_REWARD_GRANT',
    entityType: 'reward_coin',
    entityId: userRow.id,
    changes: {
      amount,
      apiKey: auth.keyId,
    },
  });

  return NextResponse.json(
    {
      success: true,
      message: `Granted ${amount} reward coins successfully`,
    },
    { status: 201 }
  );
}

// ---------------------------------------------------------------------------
// PUT /api/external/rewards-coin
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
  const type = body.type as string | undefined; // 'earned', 'redeemed', 'expired', 'cashback'
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

  const validTypes = ['earned', 'redeemed', 'expired', 'cashback'];
  if (!validTypes.includes(type || '')) {
    return NextResponse.json(
      { error: '`type` must be one of: ' + validTypes.join(', ') },
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
    .select('id, reward_coins')
    .eq('id', userId)
    .maybeSingle();

  if (!userRow) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (type === 'redeemed' || type === 'expired') {
    const balance = Number(userRow.reward_coins) || 0;
    if (balance < amount) {
      return NextResponse.json(
        { error: 'Insufficient reward coins for debit' },
        { status: 400 }
      );
    }
  }

  const insertPayload: any = {
    user_id: userRow.id,
    amount,
    type,
  };

  // Apply 100-day expiry rule for credit actions
  if (type === 'earned' || type === 'cashback') {
    insertPayload.expiry_date = getExpiryDate();
  }

  const { error: insertError } = await supabase
    .from('reward_coin_ledger')
    .insert(insertPayload);

  if (insertError) {
    console.error('[external/rewards-coin PUT] Supabase error:', insertError);
    return NextResponse.json(
      { error: 'Failed to apply reward coin adjustment' },
      { status: 500 }
    );
  }

  // Write audit log entry
  await logAuditEvent({
    portal: 'admin',
    action: `MANUAL_REWARDS_COIN_${type?.toUpperCase()}`,
    entityType: 'reward_coin',
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
      message: `Rewards coin adjustment applied successfully`,
    },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// DELETE /api/external/rewards-coin
// ---------------------------------------------------------------------------
export async function DELETE(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'admin');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  return NextResponse.json(
    { error: 'DELETE is not supported on the rewards-coin resource' },
    { status: 405 } // Method Not Allowed
  );
}
