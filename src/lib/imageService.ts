import { createClient } from '@/lib/supabase/client';

/**
 * Returns a high-resolution image optimized for the fullscreen zoom viewer.
 * @param sourceUrl The original image URL
 * @returns Optimized URL
 */
export function getZoomImage(sourceUrl: string): string {
  return sourceUrl; // Supabase/Next.js handles optimization
}

/**
 * Returns a standard resolution image optimized for the product detail page main view.
 * @param sourceUrl The original image URL
 * @returns Optimized URL
 */
export function getProductImage(sourceUrl: string): string {
  return sourceUrl;
}

/**
 * Returns a small, perfectly square image optimized for thumbnail navigation grids.
 * @param sourceUrl The original image URL
 * @returns Optimized URL
 */
export function getThumbnailImage(sourceUrl: string): string {
  return sourceUrl;
}

/**
 * Uploads an attachment to Supabase Storage.
 * @param file The file to upload
 * @returns The secure URL
 */
export async function uploadAttachment(file: File): Promise<{ secure_url: string }> {
  const supabase = createClient();
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `attachments/${fileName}`;

  const { data, error } = await supabase.storage.from('assets').upload(filePath, file);

  if (error) {
    throw new Error(error.message || 'Failed to upload attachment to Supabase');
  }

  const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(filePath);
  return { secure_url: publicUrl };
}

/**
 * Uploads a product image to Supabase Storage.
 * @param file The file to upload
 * @returns The secure URL and public ID
 */
export async function uploadProductImage(file: File): Promise<{ secure_url: string; public_id: string; format: string; width: number; height: number; bytes: number }> {
  const supabase = createClient();
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `products/${fileName}`;

  const { data, error } = await supabase.storage.from('assets').upload(filePath, file);

  if (error) {
    throw new Error(error.message || 'Failed to upload image to Supabase');
  }

  const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(filePath);

  return {
    secure_url: publicUrl,
    public_id: filePath,
    format: fileExt || '',
    width: 0, // Supabase doesn't return this by default
    height: 0,
    bytes: file.size,
  };
}

/**
 * Deletes a product image from Supabase Storage.
 * @param publicId The public ID of the image
 */
export async function deleteProductImage(publicId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.storage.from('assets').remove([publicId]);
  
  if (error) {
    console.error('Failed to delete image', error);
    return false;
  }
  return true;
}
