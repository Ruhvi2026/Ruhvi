'use server';

import { createClient } from '@/lib/supabase/server';
import { hasPermission } from '@/lib/auth/rbac';
import { revalidatePath } from 'next/cache';

async function checkAuth(permission: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const isAllowed = await hasPermission(user.id, permission, supabase);
  if (!isAllowed) {
    throw new Error('Forbidden: Insufficient permissions');
  }

  return { supabase, user };
}

export async function adjustStock(formData: FormData) {
  try {
    const { supabase, user } = await checkAuth('inventory.adjust');

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
        p_user_id: user.id,
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
