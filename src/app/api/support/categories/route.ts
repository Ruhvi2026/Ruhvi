import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/support/serverAuth';

/**
 * GET /api/support/categories
 * Returns hierarchical support categories and active subcategories.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await getSupabaseAdminClient();

    const { data: categories, error } = await supabase
      .from('support_categories')
      .select('id, name, slug, parent_id, sort_order, active')
      .eq('active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Failed to fetch support categories:', error);
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: 500 }
      );
    }

    const all = categories || [];
    const mainCategories = all.filter((c) => !c.parent_id);
    const subCategories = all.filter((c) => c.parent_id);

    const structured = mainCategories.map((main) => ({
      ...main,
      subcategories: subCategories.filter((sub) => sub.parent_id === main.id),
    }));

    return NextResponse.json({
      categories: structured,
      flat: all,
    });
  } catch (err: any) {
    console.error('Support Categories error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
