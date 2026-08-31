'use server';

import { requireAdminClient } from '@/lib/auth/require-admin-client';
import { revalidatePath } from 'next/cache';

export async function createPackaging(formData: FormData) {
  try {
    const { supabase } = await requireAdminClient();
    const payload = {
      name: (formData.get('name') as string) || '',
      cost: parseFloat(formData.get('cost') as string) || 0,
      description: (formData.get('description') as string) || null,
    };
    const { error } = await supabase.from('packaging_variants').insert(payload);
    if (error) throw error;
    revalidatePath('/operations/packaging');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updatePackaging(id: string, formData: FormData) {
  try {
    const { supabase } = await requireAdminClient();
    const payload = {
      name: (formData.get('name') as string) || '',
      cost: parseFloat(formData.get('cost') as string) || 0,
      description: (formData.get('description') as string) || null,
    };
    const { error } = await supabase
      .from('packaging_variants')
      .update(payload)
      .eq('id', id);
    if (error) throw error;
    revalidatePath('/operations/packaging');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deletePackaging(id: string) {
  try {
    const { supabase } = await requireAdminClient();
    const { error } = await supabase
      .from('packaging_variants')
      .delete()
      .eq('id', id);
    if (error) throw error;
    revalidatePath('/operations/packaging');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
