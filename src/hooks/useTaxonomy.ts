import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Category, Collection } from '@/types/database';

let cachedCategories: Category[] | null = null;
let cachedCollections: Collection[] | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function useTaxonomy() {
  const isCacheValid =
    Date.now() < cacheExpiry && cachedCategories && cachedCollections;

  const [categories, setCategories] = useState<Category[]>(
    isCacheValid ? (cachedCategories as Category[]) : []
  );
  const [collections, setCollections] = useState<Collection[]>(
    isCacheValid ? (cachedCollections as Collection[]) : []
  );
  const [loading, setLoading] = useState(!isCacheValid);

  useEffect(() => {
    if (Date.now() < cacheExpiry && cachedCategories && cachedCollections) {
      setCategories(cachedCategories);
      setCollections(cachedCollections);
      setLoading(false);
      return;
    }

    const fetchTaxonomy = async () => {
      try {
        const supabase = createClient();

        // Fetch categories and collections in parallel
        const [catRes, colRes] = await Promise.all([
          supabase
            .from('categories')
            .select('*')
            .neq('is_hidden', true)
            .order('name'),
          supabase.from('collections').select('*').order('title'),
        ]);

        if (!catRes.error && catRes.data && catRes.data.length > 0) {
          cachedCategories = catRes.data;
          setCategories(catRes.data);
        }

        if (!colRes.error && colRes.data) {
          cachedCollections = colRes.data;
          setCollections(colRes.data);
        }

        cacheExpiry = Date.now() + CACHE_TTL_MS;
      } catch (err) {
        console.error('Failed to fetch taxonomy:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTaxonomy();
  }, []);

  return { categories, collections, loading };
}
