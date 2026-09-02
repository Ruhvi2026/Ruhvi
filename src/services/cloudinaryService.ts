import {
  uploadProductImage as uploadProductImageSupabase,
  getProductImage,
} from '@/lib/imageService';

export const getOptimizedImageUrl = (url: string) => {
  return getProductImage(url);
};

export const uploadProductImage = async (file: File) => {
  return await uploadProductImageSupabase(file);
};
