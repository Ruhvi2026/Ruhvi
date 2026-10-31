import { NextRequest, NextResponse } from 'next/server';
import { requireAdminClient } from '@/lib/auth/require-admin-client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/operations/inventory/stage
 * Fetch all pending staged scan records for the authenticated staff user.
 */
export async function GET(req: NextRequest) {
  try {
    const { supabase, userId, role } = await requireAdminClient();

    let query = supabase
      .from('inventory_staging')
      .select('*')
      .order('created_at', { ascending: false });

    // Enforce owner isolation unless super admin
    if (role !== 'super_admin' && role !== 'SUPER_ADMIN') {
      query = query.eq('owner_id', userId);
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err: any) {
    const status = err.message?.includes('Unauthorized') ? 401 : 403;
    return NextResponse.json(
      { error: err.message || 'Unauthorized' },
      { status }
    );
  }
}

/**
 * POST /api/operations/inventory/stage
 * Upload or batch-upload locally queued scans from mobile or web.
 * Idempotent via client_scan_id. Strict owner_id enforcement.
 */
export async function POST(req: NextRequest) {
  try {
    const { supabase, userId, role } = await requireAdminClient();

    const body = await req.json();
    const rawScans = Array.isArray(body.scans)
      ? body.scans
      : body.scan
        ? [body.scan]
        : [body];

    if (!rawScans || rawScans.length === 0) {
      return NextResponse.json(
        { error: 'No scan items provided' },
        { status: 400 }
      );
    }

    const stagingRows = [];
    const validationErrors = [];

    for (let i = 0; i < rawScans.length; i++) {
      const item = rawScans[i];
      const clientScanId = item.client_scan_id || item.id;
      const barcode = String(item.barcode || '').trim();
      const sku = String(item.sku || '')
        .trim()
        .toUpperCase();
      const weightGrams = Number(item.weight_grams);
      const costPrice = Number(item.cost_price);
      const stockQuantity = parseInt(String(item.stock_quantity || 1), 10);

      if (!clientScanId) {
        validationErrors.push(
          `Item ${i + 1}: Missing client_scan_id (idempotency key)`
        );
        continue;
      }
      if (!barcode) {
        validationErrors.push(`Item ${i + 1}: Missing barcode`);
        continue;
      }
      if (!sku) {
        validationErrors.push(`Item ${i + 1}: Missing SKU`);
        continue;
      }
      if (isNaN(weightGrams) || weightGrams <= 0) {
        validationErrors.push(
          `Item ${i + 1} (${sku}): Weight must be greater than 0g`
        );
        continue;
      }
      if (isNaN(costPrice) || costPrice < 0) {
        validationErrors.push(
          `Item ${i + 1} (${sku}): Cost price must be >= 0`
        );
        continue;
      }
      if (isNaN(stockQuantity) || stockQuantity < 1) {
        validationErrors.push(
          `Item ${i + 1} (${sku}): Stock quantity must be at least 1`
        );
        continue;
      }

      stagingRows.push({
        client_scan_id: clientScanId,
        owner_id: userId, // Enforce authenticated identity - client cannot forge owner
        barcode,
        sku,
        weight_grams: weightGrams,
        cost_price: costPrice,
        stock_quantity: stockQuantity,
        product_name: item.product_name
          ? String(item.product_name).trim()
          : null,
        price: Number(item.price) > 0 ? Number(item.price) : null,
        mrp: Number(item.mrp) > 0 ? Number(item.mrp) : null,
        collection: item.collection ? String(item.collection).trim() : null,
        category_id: item.category_id || null,
        notes: item.notes ? String(item.notes).trim() : null,
        action_type: item.action_type || 'auto',
        status: 'staged',
        sync_error: null,
        updated_at: new Date().toISOString(),
      });
    }

    if (stagingRows.length === 0) {
      return NextResponse.json(
        {
          error: 'All scan items failed validation',
          details: validationErrors,
        },
        { status: 400 }
      );
    }

    // Pre-flight cross-user collision check to prevent scan takeover
    const clientScanIds = stagingRows.map((r) => r.client_scan_id);
    const { data: existingRows, error: checkError } = await supabase
      .from('inventory_staging')
      .select('id, client_scan_id, owner_id')
      .in('client_scan_id', clientScanIds);

    if (checkError) {
      console.error('Error checking scan ownership:', checkError);
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if (existingRows && existingRows.length > 0) {
      const isSuperAdmin = role === 'super_admin' || role === 'SUPER_ADMIN';
      const collidingRows = existingRows.filter(
        (row: any) => row.owner_id !== userId
      );

      if (collidingRows.length > 0 && !isSuperAdmin) {
        return NextResponse.json(
          {
            error:
              'Ownership collision: one or more scan IDs belong to another staff user',
            conflicting_ids: collidingRows.map((r: any) => r.client_scan_id),
          },
          { status: 409 }
        );
      }
    }

    // Upsert into inventory_staging table using client_scan_id for idempotency
    const { data: upserted, error: upsertError } = await supabase
      .from('inventory_staging')
      .upsert(stagingRows, { onConflict: 'client_scan_id' })
      .select('id, client_scan_id, barcode, sku, status');

    if (upsertError) {
      console.error('Error staging scans in Supabase:', upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      staged_count: upserted?.length || stagingRows.length,
      records: upserted || [],
      validation_warnings:
        validationErrors.length > 0 ? validationErrors : undefined,
    });
  } catch (err: any) {
    const status = err.message?.includes('Unauthorized') ? 401 : 403;
    return NextResponse.json(
      { error: err.message || 'Unauthorized' },
      { status }
    );
  }
}
