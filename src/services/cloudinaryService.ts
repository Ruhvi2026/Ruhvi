/**
 * Service for handling Cloudinary image uploads and optimization.
 *
 * Uploads are done securely from the client using an unsigned upload preset.
 * Deletions and secure operations would typically be routed through a backend API
 * to avoid exposing the Cloudinary API Secret.
 */

// Use NEXT_PUBLIC_ for Next.js, fallback to VITE_ if in a Vite context
const CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
  process.env.VITE_CLOUDINARY_CLOUD_NAME ||
  'tfelmupe';
const UPLOAD_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ||
  process.env.VITE_CLOUDINARY_UPLOAD_PRESET ||
  'ruhvi_products';

const CLOUDINARY_API_BASE = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}`;
const CLOUDINARY_FETCH_BASE = `https://res.cloudinary.com/${CLOUD_NAME}/image/fetch`;

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

/**
 * Uploads an image file to Cloudinary using the configured unsigned upload preset.
 *
 * @param file The File object from an input element
 * @returns A promise that resolves to the Cloudinary upload response
 */
export async function uploadProductImage(
  file: File
): Promise<CloudinaryUploadResponse> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary configuration is missing.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  // You can also specify folder here if allowed by the preset
  // formData.append('folder', 'products');

  const response = await fetch(`${CLOUDINARY_API_BASE}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.error?.message || 'Failed to upload image to Cloudinary'
    );
  }

  return await response.json();
}

/**
 * Placeholder for deleting an image from Cloudinary.
 * Note: Cloudinary requires a secure signature (using the API Secret) to delete images.
 * This should be implemented by calling a secure backend API endpoint (e.g. Next.js API route).
 *
 * @param publicId The Cloudinary public ID of the image to delete
 */
export async function deleteProductImage(publicId: string): Promise<boolean> {
  console.warn(`Deleting images directly from the client is not securely supported without exposing the API Secret.
    You should route this request to a secure backend endpoint that uses the Cloudinary Admin API.`);

  // Example of how it would call your internal API:
  /*
  const response = await fetch('/api/admin/cloudinary/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicId })
  });
  return response.ok;
  */

  return Promise.resolve(true);
}

/**
 * Helper to construct an optimized Cloudinary fetch URL for transformations.
 *
 * @param sourceUrl The original image URL (or Cloudinary secure_url)
 * @param transformations A string of Cloudinary transformations (e.g. 'w_800,c_limit')
 * @returns Optimized Cloudinary URL
 */
export function getOptimizedImageUrl(
  sourceUrl: string,
  transformations: string = 'f_auto,q_auto'
): string {
  if (!sourceUrl) return '';

  // If the image is already a Cloudinary URL, we can inject transformations directly
  // However, using the Fetch API is robust and handles all external URLs cleanly.
  if (
    sourceUrl.includes('res.cloudinary.com') &&
    !sourceUrl.includes('/image/fetch/')
  ) {
    // A native cloudinary URL usually looks like:
    // https://res.cloudinary.com/cloud_name/image/upload/v1234/public_id.jpg
    // We can inject transformations right after /upload/
    return sourceUrl.replace(
      '/upload/',
      `/upload/${transformations},f_auto,q_auto/`
    );
  }

  // Ensure transformations contain standard optimization
  const baseTransformations = 'f_auto,q_auto';
  const finalTransformations = transformations
    ? transformations.includes('f_auto')
      ? transformations
      : `${baseTransformations},${transformations}`
    : baseTransformations;

  return `${CLOUDINARY_FETCH_BASE}/${finalTransformations}/${sourceUrl}`;
}

export async function uploadAttachment(
  file: File
): Promise<{ secure_url: string }> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary configuration is missing.');
  }

  const fileType = file.type.split('/')[0];
  let endpoint = 'image';
  if (fileType === 'video') {
    endpoint = 'video';
  } else if (file.type === 'application/pdf') {
    endpoint = 'raw';
  } else {
    endpoint = 'auto';
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${endpoint}/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.error?.message || 'Failed to upload attachment to Cloudinary'
    );
  }

  return await response.json();
}
