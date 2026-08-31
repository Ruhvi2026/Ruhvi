'use server';

import { requireAdminClient } from '@/lib/auth/require-admin-client';
import { revalidatePath } from 'next/cache';

export async function createQcLog(formData: FormData) {
  try {
    const { supabase, userId } = await requireAdminClient();
    const payload = {
      product_id: (formData.get('product_id') as string) || null,
      variant_id: (formData.get('variant_id') as string) || null,
      batch_reference: (formData.get('batch_reference') as string) || null,
      issue_type: (formData.get('issue_type') as string) || 'other',
      notes: (formData.get('notes') as string) || null,
      checked_by: userId,
    };
    const { error } = await supabase
      .from('quality_control_logs')
      .insert(payload);
    if (error) throw error;
    revalidatePath('/operations/quality-control');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteQcLog(id: string) {
  try {
    const { supabase } = await requireAdminClient();
    const { error } = await supabase
      .from('quality_control_logs')
      .delete()
      .eq('id', id);
    if (error) throw error;
    revalidatePath('/operations/quality-control');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
