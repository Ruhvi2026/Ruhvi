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
  if (!hasPermission(scopes, 'category', minLevel)) {
    return { error: 'Forbidden', status: 403 };
  }

  return { keyId: keyRow.id, keyName: keyRow.name, scopes };
}

// ---------------------------------------------------------------------------
// GET /api/external/category
// Read list, detail, or tree structure
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'read');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get('categoryId');
  const tree = searchParams.get('tree') === 'true';

  const supabase = getServiceClient();

  if (categoryId) {
    // Detail mode
    const { data: category, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', categoryId)
      .maybeSingle();

    if (error) {
      console.error('[external/category GET] Detail error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, category }, { status: 200 });
  } else {
    // List / Tree mode
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[external/category GET] List error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    if (tree) {
      // Build nested tree
      const categoryMap = new Map();
      const treeData: any[] = [];

      categories?.forEach((cat) => {
        categoryMap.set(cat.id, { ...cat, children: [] });
      });

      categories?.forEach((cat) => {
        if (cat.parent_id) {
          const parent = categoryMap.get(cat.parent_id);
          if (parent) {
            parent.children.push(categoryMap.get(cat.id));
          }
        } else {
          treeData.push(categoryMap.get(cat.id));
        }
      });

      return NextResponse.json(
        { success: true, categories: treeData },
        { status: 200 }
      );
    }

    // Flat list
    return NextResponse.json(
      { success: true, categories: categories || [] },
      { status: 200 }
    );
  }
}

// ---------------------------------------------------------------------------
// PUT /api/external/category
// Update category names/banners/etc.
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

  const categoryId = body.categoryId as string | undefined;
  if (!categoryId) {
    return NextResponse.json(
      { error: '`categoryId` is required' },
      { status: 422 }
    );
  }

  // Allowed fields for update
  const updates: Record<string, any> = {};
  const allowed = ['name', 'slug', 'parent_id', 'image_url', 'is_hidden'];
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

  const supabase = getServiceClient();
  const { error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', categoryId);

  if (error) {
    console.error('[external/category PUT] Update error:', error);
    return NextResponse.json(
      { error: 'Failed to update category: ' + error.message },
      { status: 500 }
    );
  }

  await logAuditEvent({
    portal: 'admin',
    action: 'EXTERNAL_API_CATEGORY_UPDATE',
    entityType: 'category',
    entityId: categoryId,
    changes: { updates, apiKey: auth.keyId },
  });

  return NextResponse.json(
    { success: true, message: 'Category updated successfully' },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// POST /api/external/category
// Create new category (Admin only)
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

  if (!body.name || !body.slug) {
    return NextResponse.json(
      { error: '`name` and `slug` are required' },
      { status: 422 }
    );
  }

  const insertData = {
    name: body.name,
    slug: body.slug,
    parent_id: body.parent_id || null,
    image_url: body.image_url || null,
    is_hidden: body.is_hidden !== undefined ? body.is_hidden : false,
  };

  const supabase = getServiceClient();
  const { data: category, error: insertError } = await supabase
    .from('categories')
    .insert(insertData)
    .select('id')
    .single();

  if (insertError) {
    console.error('[external/category POST] Insert error:', insertError);
    return NextResponse.json(
      { error: 'Failed to create category: ' + insertError.message },
      { status: 500 }
    );
  }

  await logAuditEvent({
    portal: 'admin',
    action: 'EXTERNAL_API_CATEGORY_CREATE',
    entityType: 'category',
    entityId: category.id,
    changes: { apiKey: auth.keyId },
  });

  return NextResponse.json(
    {
      success: true,
      message: 'Category created successfully',
      categoryId: category.id,
    },
    { status: 201 }
  );
}

// ---------------------------------------------------------------------------
// DELETE /api/external/category
// Delete category (Admin only)
// ---------------------------------------------------------------------------
export async function DELETE(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'admin');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get('categoryId');

  if (!categoryId) {
    return NextResponse.json(
      { error: '`categoryId` is required in query parameters' },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId);

  if (error) {
    console.error('[external/category DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete category: ' + error.message },
      { status: 500 }
    );
  }

  await logAuditEvent({
    portal: 'admin',
    action: 'EXTERNAL_API_CATEGORY_DELETE',
    entityType: 'category',
    entityId: categoryId,
    changes: { apiKey: auth.keyId },
  });

  return NextResponse.json(
    { success: true, message: 'Category deleted successfully' },
    { status: 200 }
  );
}
