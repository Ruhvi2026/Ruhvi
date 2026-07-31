import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Category, Collection } from '@/types/database';
import { INITIAL_CATEGORIES } from '@/lib/products';

export function useTaxonomy() {
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTaxonomy = async () => {
      const supabase = createClient();
      
      // Fetch categories
      const { data: cats, error: catErr } = await supabase
        .from('categories')
        .select('*')
        .order('name');
        
      if (!catErr && cats && cats.length > 0) {
        setCategories(cats);
      }

      // Fetch collections
      const { data: cols, error: colErr } = await supabase
        .from('collections')
        .select('*')
        .order('title');
        
      if (!colErr && cols) {
        setCollections(cols);
      }
      
      setLoading(false);
    };

    fetchTaxonomy();
  }, []);

  return { categories, collections, loading };
}
