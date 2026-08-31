import 'server-only';
import { unstable_cache } from 'next/cache';
import { createPublicClient } from '@/lib/supabase/public';
import { cacheWrap } from '@/lib/redis';
import { Category, Collection } from '@/types/database';

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

const STOREFRONT_TTL = 3600;
const REDIS_TTL = 300;

export const getHomepageCategories = unstable_cache(
  async (): Promise<Category[]> => {
    return cacheWrap<Category[]>(
      'storefront:categories',
      REDIS_TTL,
      async () => {
        const supabase = createPublicClient();
        const { data } = await supabase
          .from('categories')
          .select('*')
          .neq('is_hidden', true)
          .order('name');
        return (data as Category[]) || [];
      }
    );
  },
  ['homepage-categories'],
  { revalidate: STOREFRONT_TTL, tags: ['categories'] }
);

export const getHomepageCollections = unstable_cache(
  async (): Promise<Collection[]> => {
    return cacheWrap<Collection[]>(
      'storefront:collections',
      REDIS_TTL,
      async () => {
        const supabase = createPublicClient();
        const { data } = await supabase
          .from('collections')
          .select('*')
          .order('title');
        return (data as Collection[]) || [];
      }
    );
  },
  ['homepage-collections'],
  { revalidate: STOREFRONT_TTL, tags: ['collections'] }
);

export const getHomepageSettings = unstable_cache(
  async (): Promise<HomepageSettings> => {
    return cacheWrap<HomepageSettings>(
      'storefront:settings',
      REDIS_TTL,
      async () => {
        const supabase = createPublicClient();
        const { data, error } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'homepage')
          .single();

        if (error || !data) {
          return {};
        }
        return (data.value as HomepageSettings) || {};
      }
    );
  },
  ['homepage-settings'],
  { revalidate: STOREFRONT_TTL, tags: ['settings'] }
);
