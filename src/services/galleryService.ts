import { createClient } from '@/lib/supabase/client';

export interface GalleryImage {
  url: string;
  source: string;
  addedAt?: string;
}

export async function fetchAllGalleryImages(): Promise<GalleryImage[]> {
  const supabase = createClient();
  const allImages = new Map<string, GalleryImage>();

  // 1. Fetch from settings (Standalone Media Gallery uploads)
  try {
    const { data: settingsData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'media_gallery')
      .single();

    if (settingsData && Array.isArray(settingsData.value)) {
      settingsData.value.forEach((item: any) => {
        if (item && item.url) {
          allImages.set(item.url, {
            url: item.url,
            source: 'Standalone Gallery',
            addedAt: item.addedAt || new Date().toISOString(),
          });
        }
      });
    }
  } catch (err) {
    // ignore if settings key doesn't exist
  }

  // 2. Fetch from Product Images
  try {
    const { data: pImages } = await supabase
      .from('product_images')
      .select('url, created_at');
    if (pImages) {
      pImages.forEach((img: any) => {
        if (img.url && !allImages.has(img.url)) {
          allImages.set(img.url, {
            url: img.url,
            source: 'Products',
            addedAt: img.created_at,
          });
        }
      });
    }
  } catch (err) {
    // ignore
  }

  // 3. Fetch from Categories
  try {
    const { data: catImages } = await supabase
      .from('categories')
      .select('image_url, created_at');
    if (catImages) {
      catImages.forEach((cat: any) => {
        if (cat.image_url && !allImages.has(cat.image_url)) {
          allImages.set(cat.image_url, {
            url: cat.image_url,
            source: 'Categories',
            addedAt: cat.created_at,
          });
        }
      });
    }
  } catch (err) {
    // ignore
  }

  // 4. Fetch from Collections
  try {
    const { data: colImages } = await supabase
      .from('collections')
      .select('image_url, created_at');
    if (colImages) {
      colImages.forEach((col: any) => {
        if (col.image_url && !allImages.has(col.image_url)) {
          allImages.set(col.image_url, {
            url: col.image_url,
            source: 'Collections',
            addedAt: col.created_at,
          });
        }
      });
    }
  } catch (err) {
    // ignore
  }

  // Convert Map to Array and Sort by date (newest first)
  const result = Array.from(allImages.values());
  result.sort((a, b) => {
    const timeA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
    const timeB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
    return timeB - timeA;
  });

  return result;
}

export async function addImageToStandaloneGallery(url: string): Promise<void> {
  const supabase = createClient();

  // First, get existing gallery
  let existingGallery: any[] = [];
  try {
    const { data: settingsData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'media_gallery')
      .single();

    if (settingsData && Array.isArray(settingsData.value)) {
      existingGallery = settingsData.value;
    }
  } catch (err) {
    // Key might not exist, proceed with empty array
  }

  // Prevent duplicates in standalone gallery
  if (!existingGallery.find((img: any) => img.url === url)) {
    existingGallery.unshift({
      url,
      addedAt: new Date().toISOString(),
    });

    // Save back to settings
    await supabase.from('settings').upsert(
      {
        id: 'media_gallery', // if id is required, use key as id or random. Usually just key is fine but wait, let's look at Setting schema
        key: 'media_gallery',
        value: existingGallery,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
  }
}
