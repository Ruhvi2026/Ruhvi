'use server';

import { requireAdminClient } from '@/lib/auth/require-admin-client';
import { revalidatePath } from 'next/cache';

export async function createBatch(formData: FormData) {
  try {
    const { supabase } = await requireAdminClient();
    const payload = {
      product_id: (formData.get('product_id') as string) || null,
      quantity: parseInt(formData.get('quantity') as string, 10) || 0,
      target_completion_date:
        (formData.get('target_completion_date') as string) || null,
      status: (formData.get('status') as string) || 'planned',
      notes: (formData.get('notes') as string) || null,
    };
    const { error } = await supabase.from('production_batches').insert(payload);
    if (error) throw error;
    revalidatePath('/operations/batches');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateBatch(id: string, formData: FormData) {
  try {
    const { supabase } = await requireAdminClient();
    const payload = {
      product_id: (formData.get('product_id') as string) || null,
      quantity: parseInt(formData.get('quantity') as string, 10) || 0,
      target_completion_date:
        (formData.get('target_completion_date') as string) || null,
      status: (formData.get('status') as string) || 'planned',
      notes: (formData.get('notes') as string) || null,
    };
    const { error } = await supabase
      .from('production_batches')
      .update(payload)
      .eq('id', id);
    if (error) throw error;
    revalidatePath('/operations/batches');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteBatch(id: string) {
  try {
    const { supabase } = await requireAdminClient();
    const { error } = await supabase
      .from('production_batches')
      .delete()
      .eq('id', id);
    if (error) throw error;
    revalidatePath('/operations/batches');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
