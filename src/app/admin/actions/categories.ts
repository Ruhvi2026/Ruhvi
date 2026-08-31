'use server';

import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth/require-admin';
import { revalidatePath, revalidateTag } from 'next/cache';
import { cacheDelete } from '@/lib/redis';
import { Category } from '@/types/database';
import { INITIAL_CATEGORIES } from '@/lib/products';

export async function saveCategory(
  payload: Partial<Category>,
  editingCategoryId?: string
) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return { success: false, error: auth.error || 'Unauthorized' };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return { success: false, error: 'Supabase environment variables missing' };
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  if (editingCategoryId) {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .update(payload)
      .eq('id', editingCategoryId)
      .select();

    if (error) return { success: false, error: error.message };
    if (!data || data.length === 0)
      return { success: false, error: 'Category not found or update failed' };
  } else {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert([payload])
      .select();

    if (error) return { success: false, error: error.message };
    if (!data || data.length === 0)
      return { success: false, error: 'Insert failed' };
  }

  // Force revalidate
  revalidatePath('/', 'layout');
  revalidatePath('/admin/categories');
  revalidateTag('categories');
  await cacheDelete('storefront:categories');

  return { success: true };
}

export async function deleteCategoryAction(id: string) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return { success: false, error: auth.error || 'Unauthorized' };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return { success: false, error: 'Supabase environment variables missing' };
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const { error } = await supabaseAdmin
    .from('categories')
    .delete()
    .eq('id', id);
  if (error) return { success: false, error: error.message };

  revalidatePath('/', 'layout');
  revalidatePath('/admin/categories');
  revalidateTag('categories');
  await cacheDelete('storefront:categories');

  return { success: true };
}

export async function seedCategories() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return { success: false, error: auth.error || 'Unauthorized' };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return { success: false, error: 'Supabase environment variables missing' };
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const { data: existing } = await supabaseAdmin
    .from('categories')
    .select('id')
    .limit(1);

  if (existing && existing.length > 0) {
    return { success: true, seeded: 0 };
  }

  const { count, error } = await supabaseAdmin
    .from('categories')
    .insert(INITIAL_CATEGORIES);

  if (error) return { success: false, error: error.message };

  revalidatePath('/', 'layout');
  revalidatePath('/admin/categories');
  revalidateTag('categories');
  await cacheDelete('storefront:categories');

  return { success: true, seeded: count ?? INITIAL_CATEGORIES.length };
}
