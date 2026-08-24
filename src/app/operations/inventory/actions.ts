'use server';

import { requireAdminClient } from '@/lib/auth/require-admin-client';
import { revalidatePath } from 'next/cache';

export async function adjustStock(formData: FormData) {
  try {
    const { supabase, userId } = await requireAdminClient();

    const productId = formData.get('product_id') as string;
    const adjustmentStr = formData.get('adjustment') as string;
    const reason = formData.get('reason') as string;
    const notes = formData.get('notes') as string;

    const adjustment = parseInt(adjustmentStr, 10);
    if (isNaN(adjustment) || adjustment === 0) {
      throw new Error('Invalid adjustment amount');
    }

    if (!productId || !reason) {
      throw new Error('Missing required fields');
    }

    // Call the Postgres RPC function to atomically update stock and log it
    const { data: newStock, error } = await supabase.rpc(
      'adjust_product_stock',
      {
        p_product_id: productId,
        p_user_id: userId,
        p_adjustment: adjustment,
        p_reason: reason,
        p_notes: notes || null,
      }
    );

    if (error) {
      console.error('adjust_product_stock error:', error);
      throw error;
    }

    revalidatePath('/operations/inventory');
    revalidatePath('/operations/inventory/adjustment');
    revalidatePath('/operations/products');

    return { success: true, newStock };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
