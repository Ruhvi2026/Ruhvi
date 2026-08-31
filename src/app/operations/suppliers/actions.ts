'use server';

import { requireAdminClient } from '@/lib/auth/require-admin-client';
import { revalidatePath } from 'next/cache';

export async function createSupplier(formData: FormData) {
  try {
    const { supabase } = await requireAdminClient();
    const payload = {
      name: (formData.get('name') as string) || '',
      contact_person: (formData.get('contact_person') as string) || null,
      phone: (formData.get('phone') as string) || null,
      email: (formData.get('email') as string) || null,
      lead_time_days: formData.get('lead_time_days')
        ? parseInt(formData.get('lead_time_days') as string, 10)
        : null,
      quality_rating: formData.get('quality_rating')
        ? parseFloat(formData.get('quality_rating') as string)
        : null,
      notes: (formData.get('notes') as string) || null,
    };
    const { error } = await supabase.from('suppliers').insert(payload);
    if (error) throw error;
    revalidatePath('/operations/suppliers');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateSupplier(id: string, formData: FormData) {
  try {
    const { supabase } = await requireAdminClient();
    const payload = {
      name: (formData.get('name') as string) || '',
      contact_person: (formData.get('contact_person') as string) || null,
      phone: (formData.get('phone') as string) || null,
      email: (formData.get('email') as string) || null,
      lead_time_days: formData.get('lead_time_days')
        ? parseInt(formData.get('lead_time_days') as string, 10)
        : null,
      quality_rating: formData.get('quality_rating')
        ? parseFloat(formData.get('quality_rating') as string)
        : null,
      notes: (formData.get('notes') as string) || null,
    };
    const { error } = await supabase
      .from('suppliers')
      .update(payload)
      .eq('id', id);
    if (error) throw error;
    revalidatePath('/operations/suppliers');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteSupplier(id: string) {
  try {
    const { supabase } = await requireAdminClient();
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) throw error;
    revalidatePath('/operations/suppliers');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
