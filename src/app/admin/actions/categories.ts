'use server';

import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth/require-admin';
import { revalidatePath } from 'next/cache';
import { Category } from '@/types/database';

export async function saveCategory(
  payload: Partial<Category>,
  editingCategoryId?: string
) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    throw new Error(auth.error || 'Unauthorized');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase environment variables missing');
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  if (editingCategoryId) {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .update(payload)
      .eq('id', editingCategoryId)
      .select();

    if (error) throw new Error(error.message);
    if (!data || data.length === 0)
      throw new Error('Category not found or update failed');
  } else {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert([payload])
      .select();

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error('Insert failed');
  }

  // Force revalidate
  revalidatePath('/', 'layout');
  revalidatePath('/admin/categories');

  return { success: true };
}

export async function deleteCategoryAction(id: string) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    throw new Error(auth.error || 'Unauthorized');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase environment variables missing');
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const { error } = await supabaseAdmin
    .from('categories')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath('/', 'layout');
  revalidatePath('/admin/categories');

  return { success: true };
}
