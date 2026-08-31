'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
import { cacheDelete } from '@/lib/redis';

export async function revalidateStorefront() {
  const auth = await requireAdmin();
  if (!auth.ok) return;

  revalidatePath('/', 'layout');
  revalidateTag('categories');
  revalidateTag('collections');
  revalidateTag('settings');
  await cacheDelete('storefront:categories');
  await cacheDelete('storefront:collections');
  await cacheDelete('storefront:settings');
}
