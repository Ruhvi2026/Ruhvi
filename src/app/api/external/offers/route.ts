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
  if (!hasPermission(scopes, 'offers', minLevel)) {
    return { error: 'Forbidden', status: 403 };
  }

  return { keyId: keyRow.id, keyName: keyRow.name, scopes };
}

// ---------------------------------------------------------------------------
// GET /api/external/offers
// Read active promotional banners/sliders and promotions
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'read');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = getServiceClient();
  const isAdmin = hasPermission(auth.scopes, 'offers', 'admin');

  let slidesQuery = supabase
    .from('hero_slides')
    .select('*')
    .order('sort_order', { ascending: true });
  let promosQuery = supabase
    .from('promotions')
    .select('*')
    .order('created_at', { ascending: false });

  if (!isAdmin) {
    // Only return active items for standard read scopes
    slidesQuery = slidesQuery.eq('is_active', true);

    const now = new Date().toISOString();
    promosQuery = promosQuery
      .eq('active', true)
      .or(`start_date.is.null,start_date.lte.${now}`)
      .or(`end_date.is.null,end_date.gt.${now}`);
  }

  const [
    { data: slides, error: slidesError },
    { data: promotions, error: promosError },
  ] = await Promise.all([slidesQuery, promosQuery]);

  if (slidesError || promosError) {
    console.error('[external/offers GET] Error:', slidesError, promosError);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      offers: {
        slides: slides || [],
        promotions: promotions || [],
      },
    },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// PUT /api/external/offers
// Schedule or update offers (Admin Only)
// ---------------------------------------------------------------------------
export async function PUT(req: NextRequest) {
  // Strict block: Admin scope required
  const auth = await getAuthenticatedKey(req, 'admin');
  if ('error' in auth) {
    return NextResponse.json(
      {
        error:
          'Forbidden: standard `write` scope is not permitted for Offers. Requires `admin` scope.',
      },
      { status: 403 }
    );
  }

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const type = body.type as 'slide' | 'promotion';
  const id = body.id as string | undefined;

  if (!type || !id) {
    return NextResponse.json(
      { error: '`type` ("slide" or "promotion") and `id` are required' },
      { status: 422 }
    );
  }

  const supabase = getServiceClient();

  if (type === 'slide') {
    const updates = { ...body };
    delete updates.type;
    delete updates.id;

    const { error } = await supabase
      .from('hero_slides')
      .update(updates)
      .eq('id', id);
    if (error)
      return NextResponse.json(
        { error: 'Failed to update slide: ' + error.message },
        { status: 500 }
      );
  } else if (type === 'promotion') {
    const updates = { ...body };
    delete updates.type;
    delete updates.id;

    const { error } = await supabase
      .from('promotions')
      .update(updates)
      .eq('id', id);
    if (error)
      return NextResponse.json(
        { error: 'Failed to update promotion: ' + error.message },
        { status: 500 }
      );
  } else {
    return NextResponse.json({ error: 'Invalid `type`' }, { status: 400 });
  }

  await logAuditEvent({
    portal: 'admin',
    action: 'EXTERNAL_API_OFFER_UPDATE',
    entityType: type,
    entityId: id,
    changes: { apiKey: auth.keyId },
  });

  return NextResponse.json(
    { success: true, message: `${type} scheduled/updated successfully` },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// POST /api/external/offers
// Create new offer (Admin Only)
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'admin');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const type = body.type as 'slide' | 'promotion';
  if (!type) {
    return NextResponse.json(
      { error: '`type` ("slide" or "promotion") is required' },
      { status: 422 }
    );
  }

  const supabase = getServiceClient();
  let newId;

  if (type === 'slide') {
    if (!body.title || !body.image_url) {
      return NextResponse.json(
        { error: '`title` and `image_url` are required for slide' },
        { status: 422 }
      );
    }
    const { data, error } = await supabase
      .from('hero_slides')
      .insert({
        title: body.title,
        subtitle: body.subtitle,
        image_url: body.image_url,
        button_text: body.button_text,
        button_link: body.button_link,
        sort_order: body.sort_order || 0,
        is_active: body.is_active !== undefined ? body.is_active : true,
      })
      .select('id')
      .single();

    if (error)
      return NextResponse.json(
        { error: 'Failed to create slide: ' + error.message },
        { status: 500 }
      );
    newId = data.id;
  } else if (type === 'promotion') {
    if (
      !body.name ||
      !body.discount_type ||
      body.discount_value === undefined
    ) {
      return NextResponse.json(
        {
          error:
            '`name`, `discount_type`, and `discount_value` are required for promotion',
        },
        { status: 422 }
      );
    }
    const { data, error } = await supabase
      .from('promotions')
      .insert({
        name: body.name,
        discount_type: body.discount_type,
        discount_value: body.discount_value,
        start_date: body.start_date || null,
        end_date: body.end_date || null,
        active: body.active !== undefined ? body.active : true,
        applicable_to: body.applicable_to || 'all',
      })
      .select('id')
      .single();

    if (error)
      return NextResponse.json(
        { error: 'Failed to create promotion: ' + error.message },
        { status: 500 }
      );
    newId = data.id;
  } else {
    return NextResponse.json({ error: 'Invalid `type`' }, { status: 400 });
  }

  await logAuditEvent({
    portal: 'admin',
    action: 'EXTERNAL_API_OFFER_CREATE',
    entityType: type,
    entityId: newId,
    changes: { apiKey: auth.keyId },
  });

  return NextResponse.json(
    { success: true, message: `${type} created successfully`, id: newId },
    { status: 201 }
  );
}

// ---------------------------------------------------------------------------
// DELETE /api/external/offers
// Delete offer (Admin Only)
// ---------------------------------------------------------------------------
export async function DELETE(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'admin');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const id = searchParams.get('id');

  if (!type || !id) {
    return NextResponse.json(
      { error: '`type` and `id` are required in query parameters' },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();
  let error;

  if (type === 'slide') {
    const res = await supabase.from('hero_slides').delete().eq('id', id);
    error = res.error;
  } else if (type === 'promotion') {
    const res = await supabase.from('promotions').delete().eq('id', id);
    error = res.error;
  } else {
    return NextResponse.json({ error: 'Invalid `type`' }, { status: 400 });
  }

  if (error) {
    console.error('[external/offers DELETE] Error:', error);
    return NextResponse.json(
      { error: `Failed to delete ${type}: ` + error.message },
      { status: 500 }
    );
  }

  await logAuditEvent({
    portal: 'admin',
    action: 'EXTERNAL_API_OFFER_DELETE',
    entityType: type,
    entityId: id,
    changes: { apiKey: auth.keyId },
  });

  return NextResponse.json(
    { success: true, message: `${type} deleted successfully` },
    { status: 200 }
  );
}
