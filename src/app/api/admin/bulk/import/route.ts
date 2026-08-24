import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth/verify-session';
import { getSupabaseAdminClient } from '@/lib/support/serverAuth';

const ADMIN_ROLES = ['super_admin', 'admin', 'manager', 'staff'];

interface BulkImportRow {
  sku: string;
  price: number;
  stock: number;
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('__session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifySessionToken(sessionCookie);
    if (!decoded?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await getSupabaseAdminClient(cookieStore);

    const { data: user } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', decoded.sub)
      .maybeSingle();

    if (!user || !ADMIN_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const rows: BulkImportRow[] = Array.isArray(body?.rows) ? body.rows : [];

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No rows to import' }, { status: 400 });
    }

    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, sku, price, stock_quantity');

    if (fetchError) throw fetchError;

    const productBySku = new Map<string, any>();
    for (const p of products || []) {
      productBySku.set(String(p.sku).trim().toLowerCase(), p);
    }

    let updated = 0;
    let notFound = 0;
    let invalid = 0;
    const skipped: string[] = [];

    for (const raw of rows) {
      const sku = String(raw.sku || '').trim();
      if (!sku) continue;

      const price = Number(raw.price);
      const stock = Number(raw.stock);

      if (isNaN(price) || isNaN(stock) || price < 0 || stock < 0) {
        invalid++;
        skipped.push(sku);
        continue;
      }

      const product = productBySku.get(sku.toLowerCase());
      if (!product) {
        notFound++;
        skipped.push(sku);
        continue;
      }

      const nextStock = Math.trunc(stock);
      const previousStock = product.stock_quantity;

      const { error: updateError } = await supabase
        .from('products')
        .update({
          price,
          stock_quantity: nextStock,
          updated_at: new Date().toISOString(),
        })
        .eq('id', product.id);

      if (updateError) throw updateError;

      if (previousStock !== nextStock) {
        await supabase.from('inventory_adjustments').insert({
          product_id: product.id,
          user_id: user.id,
          previous_stock: previousStock,
          adjusted_by: nextStock - previousStock,
          new_stock: nextStock,
          reason: 'manual',
          notes: 'Bulk CSV import',
        });
      }

      updated++;
    }

    return NextResponse.json({
      success: true,
      total: rows.length,
      updated,
      notFound,
      invalid,
      skipped: skipped.slice(0, 50),
    });
  } catch (err: any) {
    console.error('Bulk import error:', err);
    return NextResponse.json(
      { error: err.message || 'Bulk import failed' },
      { status: 500 }
    );
  }
}
