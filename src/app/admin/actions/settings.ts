'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { revalidateTag } from 'next/cache';
import { cacheDelete } from '@/lib/redis';

// All mutating settings actions and admin-only getters must verify the
// __session JWT + role. The customer-facing storefront reads
// getStoreSettings()/getHomepageSettings(), which stay public.
async function assertAdminAction() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    throw new Error(
      auth.error === 'Unauthorized'
        ? 'Unauthorized. Please sign in.'
        : 'Forbidden. Admin privileges are required.'
    );
  }
  return auth;
}

export interface StoreSettings {
  id: string;
  banner_enabled: boolean;
  banner_text: string;
  banner_color: string;
  banner_link: string | null;
}

export async function getStoreSettings(): Promise<StoreSettings | null> {
  const supabase = await createClient();
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
  await assertAdminAction();
  const supabase = await createClient();
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
  meta_pixel_id?: string;
  ga4_measurement_id?: string;
  google_ads_conversion_id?: string;
}

export async function getMarketingSettings(): Promise<MarketingSettings> {
  await assertAdminAction();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'marketing')
    .single();

  if (error || !data) {
    return {
      brevo_sender_email: 'marketing@ruhvi.in',
      brevo_sender_name: 'Ruhvi',
      meta_pixel_id: '',
      ga4_measurement_id: '',
      google_ads_conversion_id: '',
    };
  }
  return data.value as MarketingSettings;
}

export async function updateMarketingSettings(settings: MarketingSettings) {
  await assertAdminAction();
  const supabase = await createClient();
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
  const supabase = await createClient();
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
  await assertAdminAction();
  const supabase = await createClient();
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
  revalidateTag('settings');
  await cacheDelete('storefront:settings');
  return { success: true };
}

export interface StoreIdentitySettings {
  store_name?: string;
  store_email?: string;
  store_phone?: string;
  gst_number?: string;
  store_address?: string;
}

export interface ShippingSettings {
  free_shipping_threshold?: number;
  cod_charge?: number;
  cod_enabled?: boolean;
  pickup_address?: string;
}

export interface LoyaltySettings {
  coins_per_rupee?: number;
  min_redeem?: number;
  coins_expiry?: number;
}

export interface ReturnsSettings {
  return_window?: number;
  auto_approve?: boolean;
  auto_approve_limit?: number;
}

export interface IntegrationSettings {
  ga4_id?: string;
  meta_pixel_id?: string;
  clarity_id?: string;
}

export interface PaymentSettings {
  phonepe_enabled?: boolean;
}

export interface NotificationSettings {
  email_enabled?: boolean;
  whatsapp_enabled?: boolean;
  sender_email?: string;
  sender_name?: string;
}

async function getJsonSettings(
  key: string
): Promise<Record<string, unknown> | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .single();

  if (error || !data) {
    return null;
  }
  return data.value as Record<string, unknown>;
}

async function upsertJsonSettings(
  key: string,
  value: Record<string, unknown>
): Promise<{ success: true }> {
  const supabase = await createClient();
  const { error } = await supabase.from('settings').upsert(
    {
      key,
      value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' }
  );

  if (error) {
    throw new Error(error.message);
  }
  return { success: true };
}

export async function getStoreIdentitySettings(): Promise<StoreIdentitySettings> {
  await assertAdminAction();
  const data = await getJsonSettings('store_identity');
  return (data as StoreIdentitySettings) ?? {};
}

export async function updateStoreIdentitySettings(
  settings: StoreIdentitySettings
) {
  await assertAdminAction();
  return upsertJsonSettings(
    'store_identity',
    settings as Record<string, unknown>
  );
}

export async function getShippingSettings(): Promise<ShippingSettings> {
  await assertAdminAction();
  const data = await getJsonSettings('shipping');
  return (data as ShippingSettings) ?? {};
}

export async function updateShippingSettings(settings: ShippingSettings) {
  await assertAdminAction();
  return upsertJsonSettings('shipping', settings as Record<string, unknown>);
}

export async function getLoyaltySettings(): Promise<LoyaltySettings> {
  await assertAdminAction();
  const data = await getJsonSettings('loyalty');
  return (data as LoyaltySettings) ?? {};
}

export async function updateLoyaltySettings(settings: LoyaltySettings) {
  await assertAdminAction();
  return upsertJsonSettings('loyalty', settings as Record<string, unknown>);
}

export async function getReturnsSettings(): Promise<ReturnsSettings> {
  await assertAdminAction();
  const data = await getJsonSettings('returns');
  return (data as ReturnsSettings) ?? {};
}

export async function updateReturnsSettings(settings: ReturnsSettings) {
  await assertAdminAction();
  return upsertJsonSettings('returns', settings as Record<string, unknown>);
}

export async function getIntegrationSettings(): Promise<IntegrationSettings> {
  await assertAdminAction();
  const data = await getJsonSettings('integrations');
  return (data as IntegrationSettings) ?? {};
}

export async function updateIntegrationSettings(settings: IntegrationSettings) {
  await assertAdminAction();
  return upsertJsonSettings(
    'integrations',
    settings as Record<string, unknown>
  );
}

export async function getPaymentSettings(): Promise<PaymentSettings> {
  await assertAdminAction();
  const data = await getJsonSettings('payment');
  return (data as PaymentSettings) ?? {};
}

export async function updatePaymentSettings(settings: PaymentSettings) {
  await assertAdminAction();
  return upsertJsonSettings('payment', settings as Record<string, unknown>);
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  await assertAdminAction();
  const data = await getJsonSettings('notifications');
  return (data as NotificationSettings) ?? {};
}

export async function updateNotificationSettings(
  settings: NotificationSettings
) {
  await assertAdminAction();
  return upsertJsonSettings(
    'notifications',
    settings as Record<string, unknown>
  );
}
