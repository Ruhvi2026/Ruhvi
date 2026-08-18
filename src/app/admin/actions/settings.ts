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

export interface MarketingSettings {
  brevo_mcp_api_key?: string;
  brevo_fallback_api_key?: string;
  brevo_sender_email?: string;
  brevo_sender_name?: string;
}

export async function getMarketingSettings(): Promise<MarketingSettings> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'marketing')
    .single();

  if (error || !data) {
    return {
      brevo_sender_email: 'marketing@ruhvi.in',
      brevo_sender_name: 'Ruhvi',
    };
  }
  return data.value as MarketingSettings;
}

export async function updateMarketingSettings(settings: MarketingSettings) {
  const supabase = createClient();
  const { error } = await supabase.from('settings').upsert(
    {
      key: 'marketing',
      value: settings,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' }
  );

  if (error) {
    throw new Error(error.message);
  }
  return { success: true };
}

export interface HomepageSettings {
  hero_title?: string;
  hero_image_url?: string;
  hero_cta1_text?: string;
  hero_cta1_link?: string;
  hero_cta2_text?: string;
  hero_cta2_link?: string;
  lifestyle_title?: string;
  lifestyle_text?: string;
  lifestyle_image_url?: string;
  lifestyle_cta_text?: string;
  lifestyle_cta_link?: string;
  why_ruhvi_title?: string;
  why_ruhvi_text?: string;
  why_ruhvi_cta_text?: string;
  why_ruhvi_cta_link?: string;
}

export async function getHomepageSettings(): Promise<HomepageSettings> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'homepage')
    .single();

  if (error || !data) {
    return {};
  }
  return data.value as HomepageSettings;
}

export async function updateHomepageSettings(settings: HomepageSettings) {
  const supabase = createClient();
  const { error } = await supabase.from('settings').upsert(
    {
      key: 'homepage',
      value: settings,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' }
  );

  if (error) {
    throw new Error(error.message);
  }
  return { success: true };
}
