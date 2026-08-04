'use client';

import { createClient } from '@/lib/supabase/client';

export interface StoreSettings {
  id: string;
  banner_enabled: boolean;
  banner_text: string;
  banner_color: string;
  banner_link: string | null;
}

export async function getStoreSettings(): Promise<StoreSettings | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('store_settings')
    .select('*')
    .eq('id', 'global')
    .single();

  if (error || !data) {
    return null;
  }
  return data as StoreSettings;
}

export async function updateStoreSettings(settings: Partial<StoreSettings>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('store_settings')
    .update({ ...settings, updated_at: new Date().toISOString() })
    .eq('id', 'global');

  if (error) {
    throw new Error(error.message);
  }
  return { success: true };
}
