'use server';

import { requireAdminClient } from '@/lib/auth/require-admin-client';
import { revalidatePath } from 'next/cache';

export async function createProduct(formData: FormData) {
  try {
    const { supabase } = await requireAdminClient();

    const name = formData.get('name') as string;
    const sku = formData.get('sku') as string;
    const slug = formData.get('slug') as string;
    const category_id = formData.get('category_id') as string;
    const price = parseFloat(formData.get('price') as string);
    const mrp = parseFloat(formData.get('mrp') as string);
    const stock_quantity = parseInt(
      formData.get('stock_quantity') as string,
      10
    );
    const status = formData.get('status') as string;
    const description = formData.get('description') as string;
    const seo_metadata = formData.get('seo_metadata')
      ? JSON.parse(formData.get('seo_metadata') as string)
      : {};
    const ai_content = formData.get('ai_content')
      ? JSON.parse(formData.get('ai_content') as string)
      : {};
    const gst_rate = parseFloat((formData.get('gst_rate') as string) || '3.00');
    const low_stock_threshold = parseInt(
      (formData.get('low_stock_threshold') as string) || '5',
      10
    );
    const is_new_arrival = formData.get('is_new_arrival') === 'true';
    const is_best_seller = formData.get('is_best_seller') === 'true';

    const { data: product, error } = await supabase
      .from('products')
      .insert([
        {
          name,
          sku,
          slug,
          category_id: category_id || null,
          price,
          mrp,
          stock_quantity,
          status,
          description,
          seo_metadata,
          ai_content,
          gst_rate,
          low_stock_threshold,
          is_new_arrival,
          is_best_seller,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Handle image URLs (MVP: comma separated URLs from a textarea)
    const imageUrls = formData.get('image_urls') as string;
    if (imageUrls && product) {
      const urls = imageUrls
        .split('\n')
        .map((u) => u.trim())
        .filter(Boolean);
      const imagesToInsert = urls.map((url, idx) => ({
        product_id: product.id,
        url,
        sort_order: idx,
      }));

      if (imagesToInsert.length > 0) {
        const { error: imgError } = await supabase
          .from('product_images')
          .insert(imagesToInsert);
        if (imgError) console.error('Image insert error:', imgError);
      }
    }

    revalidatePath('/operations/products');
    return { success: true, id: product.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateProduct(id: string, formData: FormData) {
  try {
    const { supabase } = await requireAdminClient();

    const name = formData.get('name') as string;
    const sku = formData.get('sku') as string;
    const slug = formData.get('slug') as string;
    const category_id = formData.get('category_id') as string;
    const price = parseFloat(formData.get('price') as string);
    const mrp = parseFloat(formData.get('mrp') as string);
    const stock_quantity = parseInt(
      formData.get('stock_quantity') as string,
      10
    );
    const status = formData.get('status') as string;
    const description = formData.get('description') as string;
    const seo_metadata = formData.get('seo_metadata')
      ? JSON.parse(formData.get('seo_metadata') as string)
      : {};
    const ai_content = formData.get('ai_content')
      ? JSON.parse(formData.get('ai_content') as string)
      : {};
    const gst_rate = parseFloat((formData.get('gst_rate') as string) || '3.00');
    const low_stock_threshold = parseInt(
      (formData.get('low_stock_threshold') as string) || '5',
      10
    );
    const is_new_arrival = formData.get('is_new_arrival') === 'true';
    const is_best_seller = formData.get('is_best_seller') === 'true';

    const { error } = await supabase
      .from('products')
      .update({
        name,
        sku,
        slug,
        category_id: category_id || null,
        price,
        mrp,
        stock_quantity,
        status,
        description,
        seo_metadata,
        ai_content,
        gst_rate,
        low_stock_threshold,
        is_new_arrival,
        is_best_seller,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    // Handle image URLs (MVP: replace all)
    const imageUrls = formData.get('image_urls') as string;
    if (imageUrls !== null) {
      await supabase.from('product_images').delete().eq('product_id', id);

      const urls = imageUrls
        .split('\n')
        .map((u) => u.trim())
        .filter(Boolean);
      const imagesToInsert = urls.map((url, idx) => ({
        product_id: id,
        url,
        sort_order: idx,
      }));

      if (imagesToInsert.length > 0) {
        const { error: imgError } = await supabase
          .from('product_images')
          .insert(imagesToInsert);
        if (imgError) console.error('Image insert error:', imgError);
      }
    }

    revalidatePath('/operations/products');
    revalidatePath(`/operations/products/${id}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteProduct(id: string) {
  try {
    const { supabase } = await requireAdminClient();

    const { error } = await supabase.from('products').delete().eq('id', id);

    if (error) throw error;

    revalidatePath('/operations/products');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
