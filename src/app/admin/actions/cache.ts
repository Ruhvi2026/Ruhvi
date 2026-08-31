'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';

export async function revalidateStorefront() {
  const auth = await requireAdmin();
  if (!auth.ok) return;

  revalidatePath('/', 'layout');
  revalidateTag('categories');
  revalidateTag('collections');
  revalidateTag('settings');
}
