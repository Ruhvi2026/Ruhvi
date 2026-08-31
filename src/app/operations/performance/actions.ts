'use server';

import { requireAdminClient } from '@/lib/auth/require-admin-client';
import { revalidatePath } from 'next/cache';

export async function recordRto(formData: FormData) {
  try {
    const { supabase, userId } = await requireAdminClient();

    const productId = formData.get('product_id') as string;
    const variantId = (formData.get('variant_id') as string) || null;
    const orderReference = formData.get('order_reference') as string;
    const reason = formData.get('reason') as string;

    if (!productId) throw new Error('Product is required');

    const { error } = await supabase.from('rto_records').insert({
      product_id: productId,
      variant_id: variantId,
      order_reference: orderReference || null,
      reason: reason || null,
      recorded_by: userId,
    });

    if (error) throw error;

    revalidatePath('/operations/performance');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
