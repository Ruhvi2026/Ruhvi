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
  if (!hasPermission(scopes, 'products', minLevel)) {
    return { error: 'Forbidden', status: 403 };
  }

  return { keyId: keyRow.id, keyName: keyRow.name, scopes };
}

// ---------------------------------------------------------------------------
// GET /api/external/products
// Read product list or detail
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'read');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get('productId');
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get('limit')) || 20)
  );

  const supabase = getServiceClient();

  if (productId) {
    // Detail mode
    const { data: product, error } = await supabase
      .from('products')
      .select(
        `
        *,
        images:product_images(*),
        variants:product_variants(*)
      `
      )
      .eq('id', productId)
      .maybeSingle();

    if (error) {
      console.error('[external/products GET] Detail error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, product }, { status: 200 });
  } else {
    // List mode
    const offset = (page - 1) * limit;
    const {
      data: products,
      error,
      count,
    } = await supabase
      .from('products')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[external/products GET] List error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        products: products || [],
        pagination: {
          page,
          limit,
          total: count || 0,
        },
      },
      { status: 200 }
    );
  }
}

// ---------------------------------------------------------------------------
// PUT /api/external/products
// Update product fields/stock/price
// ---------------------------------------------------------------------------
export async function PUT(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'write');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const productId = body.productId as string | undefined;
  if (!productId) {
    return NextResponse.json(
      { error: '`productId` is required' },
      { status: 422 }
    );
  }

  // Allowed fields for update
  const updates: Record<string, any> = {};
  const allowed = [
    'price',
    'mrp',
    'description',
    'stock_quantity',
    'status',
    'is_new_arrival',
    'is_best_seller',
    'name',
  ];
  for (const field of allowed) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'No valid fields provided to update' },
      { status: 422 }
    );
  }

  updates.updated_at = new Date().toISOString();

  const supabase = getServiceClient();
  const { error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', productId);

  if (error) {
    console.error('[external/products PUT] Update error:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }

  await logAuditEvent({
    portal: 'admin',
    action: 'EXTERNAL_API_PRODUCT_UPDATE',
    entityType: 'product',
    entityId: productId,
    changes: { updates, apiKey: auth.keyId },
  });

  return NextResponse.json(
    { success: true, message: 'Product updated successfully' },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// POST /api/external/products
// Create new products / Bulk import (Admin only)
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'admin');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const products = Array.isArray(body) ? body : [body];

  if (products.length === 0) {
    return NextResponse.json(
      { error: 'No products provided' },
      { status: 422 }
    );
  }
  if (products.length > 50) {
    return NextResponse.json(
      { error: 'Bulk import limit is 50 products per request' },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();
  const insertedIds: string[] = [];

  for (const product of products) {
    if (
      !product.sku ||
      !product.name ||
      !product.slug ||
      !product.price ||
      !product.mrp
    ) {
      return NextResponse.json(
        {
          error:
            'Missing required fields (sku, name, slug, price, mrp) in one or more products',
        },
        { status: 422 }
      );
    }

    const { data: insertedProduct, error: insertError } = await supabase
      .from('products')
      .insert({
        sku: product.sku,
        name: product.name,
        slug: product.slug,
        description: product.description || null,
        price: product.price,
        mrp: product.mrp,
        stock_quantity: product.stock_quantity || 0,
        status: product.status || 'active',
        category_id: product.category_id || null,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[external/products POST] Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create product(s): ' + insertError.message },
        { status: 500 }
      );
    }

    insertedIds.push(insertedProduct.id);

    // Optionally handle variants if provided
    if (Array.isArray(product.variants) && product.variants.length > 0) {
      const variantPayload = product.variants.map((v: any) => ({
        product_id: insertedProduct.id,
        sku: v.sku,
        size: v.size || null,
        metal_type: v.metal_type || null,
        stock_quantity: v.stock_quantity || 0,
        cost_price_override: v.cost_price_override || null,
        selling_price_override: v.selling_price_override || null,
      }));
      await supabase.from('product_variants').insert(variantPayload);
    }

    // Optionally handle images if provided
    if (Array.isArray(product.images) && product.images.length > 0) {
      const imagePayload = product.images.map((img: any, idx: number) => ({
        product_id: insertedProduct.id,
        url: img.url,
        type: img.type || 'still',
        sort_order: img.sort_order ?? idx,
      }));
      await supabase.from('product_images').insert(imagePayload);
    }
  }

  await logAuditEvent({
    portal: 'admin',
    action: 'EXTERNAL_API_PRODUCT_CREATE',
    entityType: 'product',
    entityId: insertedIds.join(','),
    changes: { count: insertedIds.length, apiKey: auth.keyId },
  });

  return NextResponse.json(
    {
      success: true,
      message: `Created ${insertedIds.length} product(s) successfully`,
      insertedIds,
    },
    { status: 201 }
  );
}

// ---------------------------------------------------------------------------
// DELETE /api/external/products
// Delete product (Admin only)
// ---------------------------------------------------------------------------
export async function DELETE(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'admin');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get('productId');

  if (!productId) {
    return NextResponse.json(
      { error: '`productId` is required in query parameters' },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId);

  if (error) {
    console.error('[external/products DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }

  await logAuditEvent({
    portal: 'admin',
    action: 'EXTERNAL_API_PRODUCT_DELETE',
    entityType: 'product',
    entityId: productId,
    changes: { apiKey: auth.keyId },
  });

  return NextResponse.json(
    { success: true, message: 'Product deleted successfully' },
    { status: 200 }
  );
}
