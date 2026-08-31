import { NextResponse } from 'next/server';
import { queryCatalogPage, type CatalogFilters } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(
    48,
    Math.max(1, parseInt(searchParams.get('pageSize') || '12', 10) || 12)
  );
  const maxPriceRaw = searchParams.get('maxPrice');

  const filters: CatalogFilters = {
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || 'all',
    stock: (searchParams.get('stock') as CatalogFilters['stock']) || 'all',
    maxPrice: maxPriceRaw ? Number(maxPriceRaw) : undefined,
    sortBy:
      (searchParams.get('sortBy') as CatalogFilters['sortBy']) || 'newest',
    page,
    pageSize,
  };

  try {
    const result = await queryCatalogPage(filters);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to query products:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
