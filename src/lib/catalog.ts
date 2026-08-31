import 'server-only';
import { createPublicClient } from '@/lib/supabase/public';
import { cacheWrap } from '@/lib/redis';

export type CatalogStockFilter = 'all' | 'in_stock' | 'out_of_stock';
export type CatalogSortBy = 'newest' | 'price-low' | 'price-high';

export interface CatalogFilters {
  search?: string;
  category?: string; // category slug, or 'all'
  stock?: CatalogStockFilter;
  maxPrice?: number;
  sortBy?: CatalogSortBy;
  page: number;
  pageSize: number;
}

export interface CatalogPage {
  products: any[];
  count: number;
}

const CATALOG_REDIS_TTL = 300;

/**
 * Server-side catalog query: filtering, sorting, and pagination are pushed
 * into the Supabase query itself (never filtered in the browser). The whole
 * page result (rows + exact count) is cached in Upstash Redis so the exact
 * count is computed at most once per TTL window (plan Fix 6 / Fix 7).
 */
export async function queryCatalogPage(
  filters: CatalogFilters
): Promise<CatalogPage> {
  const cacheKey = `catalog:${JSON.stringify(filters)}`;

  return cacheWrap<CatalogPage>(cacheKey, CATALOG_REDIS_TTL, async () => {
    const supabase = createPublicClient();

    let query = supabase
      .from('products')
      .select('*, images:product_images(*), category:categories(*)', {
        count: 'exact',
      })
      .neq('status', 'hidden');

    if (filters.category && filters.category !== 'all') {
      query = query.eq('categories.slug', filters.category);
    }

    if (filters.stock === 'in_stock') {
      query = query.neq('status', 'out_of_stock');
    } else if (filters.stock === 'out_of_stock') {
      query = query.eq('status', 'out_of_stock');
    }

    if (filters.maxPrice != null) {
      query = query.lte('price', filters.maxPrice);
    }

    const trimmedSearch = filters.search?.trim();
    if (trimmedSearch) {
      const q = trimmedSearch.toLowerCase();
      // Supabase's or() cannot reference the embedded categories relation, so
      // resolve matching category ids first and OR on category_id instead.
      const { data: matchingCats } = await supabase
        .from('categories')
        .select('id')
        .ilike('name', `%${q}%`);
      const catIds = (matchingCats || []).map((c: any) => c.id);
      let orStr = `name.ilike.%${q}%,sku.ilike.%${q}%`;
      if (catIds.length > 0) {
        orStr += `,category_id.in.(${catIds.join(',')})`;
      }
      query = query.or(orStr);
    }

    if (filters.sortBy === 'price-low') {
      query = query.order('price', { ascending: true });
    } else if (filters.sortBy === 'price-high') {
      query = query.order('price', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const from = (filters.page - 1) * filters.pageSize;
    const to = from + filters.pageSize - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) {
      throw new Error(error.message);
    }

    return {
      products: (data as any[]) || [],
      count: count ?? 0,
    };
  });
}
