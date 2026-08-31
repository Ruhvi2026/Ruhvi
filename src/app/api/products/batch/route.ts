import { NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/supabase/public';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get('ids');
  if (!idsParam) {
    return NextResponse.json(
      { error: 'Missing ids query parameter' },
      { status: 400 }
    );
  }

  const ids = idsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return NextResponse.json({ products: [] });
  }

  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from('products')
      .select(
        'id, name, slug, sku, price, stock_quantity, status, images:product_images(url, sort_order, type)'
      )
      .in('id', ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ products: data ?? [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
