'use server';

import { requireAdminClient } from '@/lib/auth/require-admin-client';
import { revalidatePath } from 'next/cache';

export async function createCompetitorPrice(formData: FormData) {
  try {
    const { supabase } = await requireAdminClient();
    const payload = {
      product_id: (formData.get('product_id') as string) || null,
      competitor_name: (formData.get('competitor_name') as string) || '',
      competitor_price: formData.get('competitor_price')
        ? parseFloat(formData.get('competitor_price') as string)
        : null,
      url: (formData.get('url') as string) || null,
    };
    const { error } = await supabase.from('competitor_prices').insert(payload);
    if (error) throw error;
    revalidatePath('/operations/competitor-prices');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteCompetitorPrice(id: string) {
  try {
    const { supabase } = await requireAdminClient();
    const { error } = await supabase
      .from('competitor_prices')
      .delete()
      .eq('id', id);
    if (error) throw error;
    revalidatePath('/operations/competitor-prices');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
