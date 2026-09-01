'use server';

import { requireAdminClient } from '@/lib/auth/require-admin-client';
import { revalidatePath } from 'next/cache';

// -----------------------------------------------------------------------------
// Top Banner Actions
// -----------------------------------------------------------------------------

export async function updateStoreBanner(formData: FormData) {
  try {
    const { supabase } = await requireAdminClient();

    const bannerEnabled = formData.get('banner_enabled') === 'on';
    const bannerText = formData.get('banner_text') as string;
    const bannerColor = formData.get('banner_color') as string;
    const bannerLink = formData.get('banner_link') as string;

    const { error } = await supabase
      .from('store_settings')
      .update({
        banner_enabled: bannerEnabled,
        banner_text: bannerText,
        banner_color: bannerColor,
        banner_link: bannerLink || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 'global');

    if (error) throw error;

    revalidatePath('/'); // Revalidate main storefront
    revalidatePath('/operations/cms');
    revalidatePath('/operations/cms/banners');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// -----------------------------------------------------------------------------
// Hero Slides Actions
// -----------------------------------------------------------------------------

export async function createHeroSlide(formData: FormData) {
  try {
    const { supabase } = await requireAdminClient();

    const title = formData.get('title') as string;
    const subtitle = formData.get('subtitle') as string;
    const image_url = formData.get('image_url') as string;
    const button_text = formData.get('button_text') as string;
    const button_link = formData.get('button_link') as string;
    const sort_order = parseInt(formData.get('sort_order') as string, 10) || 0;
    const is_active = formData.get('is_active') === 'on';

    if (!title || !image_url) {
      throw new Error('Title and Image URL are required');
    }

    const { error } = await supabase.from('hero_slides').insert([
      {
        title,
        subtitle,
        image_url,
        button_text,
        button_link,
        sort_order,
        is_active,
      },
    ]);

    if (error) throw error;

    revalidatePath('/');
    revalidatePath('/operations/cms');
    revalidatePath('/operations/cms/homepage');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateHeroSlide(id: string, formData: FormData) {
  try {
    const { supabase } = await requireAdminClient();

    const title = formData.get('title') as string;
    const subtitle = formData.get('subtitle') as string;
    const image_url = formData.get('image_url') as string;
    const button_text = formData.get('button_text') as string;
    const button_link = formData.get('button_link') as string;
    const sort_order = parseInt(formData.get('sort_order') as string, 10) || 0;
    const is_active = formData.get('is_active') === 'on';

    if (!title || !image_url) {
      throw new Error('Title and Image URL are required');
    }

    const { error } = await supabase
      .from('hero_slides')
      .update({
        title,
        subtitle,
        image_url,
        button_text,
        button_link,
        sort_order,
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/');
    revalidatePath('/operations/cms');
    revalidatePath('/operations/cms/homepage');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteHeroSlide(id: string) {
  try {
    const { supabase } = await requireAdminClient();

    const { error } = await supabase.from('hero_slides').delete().eq('id', id);

    if (error) throw error;

    revalidatePath('/');
    revalidatePath('/operations/cms');
    revalidatePath('/operations/cms/homepage');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
