import { getOptimizedImageUrl } from '@/services/cloudinaryService';

/**
 * Returns a high-resolution image optimized for the fullscreen zoom viewer.
 * @param sourceUrl The original image URL
 * @returns Cloudinary optimized URL
 */
export function getZoomImage(sourceUrl: string): string {
  return getOptimizedImageUrl(sourceUrl, 'w_1600,c_limit');
}

/**
 * Returns a standard resolution image optimized for the product detail page main view.
 * @param sourceUrl The original image URL
 * @returns Cloudinary optimized URL
 */
export function getProductImage(sourceUrl: string): string {
  return getOptimizedImageUrl(sourceUrl, 'w_800,c_limit');
}

/**
 * Returns a small, perfectly square image optimized for thumbnail navigation grids.
 * @param sourceUrl The original image URL
 * @returns Cloudinary optimized URL
 */
export function getThumbnailImage(sourceUrl: string): string {
  return getOptimizedImageUrl(sourceUrl, 'w_150,h_150,c_fill');
}
