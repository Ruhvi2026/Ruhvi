'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';

export async function revalidateStorefront() {
  const auth = await requireAdmin();
  if (!auth.ok) return;

  revalidatePath('/', 'layout');
}
