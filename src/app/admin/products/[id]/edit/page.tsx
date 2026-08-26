'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react';
import { DEMO_PRODUCTS } from '@/lib/products';
import { ImageType, Product } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { AIProductAssistant } from '@/components/admin/AIProductAssistant';
import { Product360Editor } from '@/components/admin/Product360Editor';
import { ImagePicker } from '@/components/admin/ImagePicker';

interface EditProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditProductPage({ params }: EditProductPageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [sku, setSku] = useState('');
  const [tags, setTags] = useState(
    '22K Gold Plated, Anti-Tarnish, Best Seller'
  );
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [seoMetadata, setSeoMetadata] = useState<any>(null);
  const [aiContent, setAiContent] = useState<any>(null);
  const [stockQuantity, setStockQuantity] = useState('');
  const [status, setStatus] = useState<any>('active');
  const [collectionSlug, setCollectionSlug] = useState('');
  const [images, setImages] = useState<
    { id?: string; url: string; type: ImageType }[]
  >([]);

  const availableCollections = [
    { slug: 'for-her', title: 'Gifts For Her' },
    { slug: 'under-15000', title: 'Gifts Under ₹15,000' },
    { slug: 'anniversary', title: 'Anniversary Specials' },
    { slug: 'bridal', title: 'Bridal Collection' },
  ];

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const supabase = createClient();
        const { data: product, error } = await supabase
          .from('products')
          .select('*, images:product_images(*)')
          .eq('id', id)
          .single();

        if (error) throw error;

        if (product) {
          setSku(product.sku);
          setName(product.name);
          setPrice(String(product.price));
          setMrp(String(product.mrp));
          setStockQuantity(String(product.stock_quantity));
          setStatus(product.status);
          setDescription(product.description || '');
          setSeoMetadata(product.seo_metadata || null);
          setAiContent(product.ai_content || null);

          if (product.images && product.images.length > 0) {
            setImages(product.images.map((img: any) => ({ ...img })));
          } else {
            setImages([{ url: '', type: 'still' }]);
          }
        }
      } catch (err: any) {
        console.error('Error fetching product:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const addImageField = () => {
    setImages((prev) => [...prev, { url: '', type: 'still' }]);
  };

  const updateImage = (index: number, field: 'url' | 'type', value: string) => {
    setImages((prev) =>
      prev.map((img, idx) => (idx === index ? { ...img, [field]: value } : img))
    );
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const supabase = createClient();

      const { error: productError } = await supabase
        .from('products')
        .update({
          name,
          sku,
          description,
          price: parseFloat(price),
          mrp: parseFloat(mrp),
          stock_quantity: parseInt(stockQuantity, 10),
          status,
          seo_metadata: seoMetadata,
          ai_content: aiContent,
        })
        .eq('id', id);

      if (productError) throw productError;

      // Handle images (simplistic: delete old, insert new)
      if (images.length > 0) {
        // Delete existing
        await supabase.from('product_images').delete().eq('product_id', id);

        // Insert new ones
        const imageInserts = images
          .filter((img) => img.url.trim() !== '')
          .map((img, index) => ({
            product_id: id,
            url: img.url,
            type: img.type,
            sort_order: index,
          }));

        if (imageInserts.length > 0) {
          const { error: imageError } = await supabase
            .from('product_images')
            .insert(imageInserts);
          if (imageError) throw imageError;
        }
      }

      alert(`Product "${name}" updated successfully!`);
      router.push('/admin/products');
    } catch (err: any) {
      console.error(err);
      alert('Failed to update product: ' + err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-4xl items-center justify-center px-4 py-16">
        <Loader2 className="h-8 w-8 animate-spin text-amber-900" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center space-x-2 text-xs text-stone-500">
        <Link
          href="/admin/products"
          className="flex items-center space-x-1 hover:text-amber-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Products</span>
        </Link>
      </div>

      <div>
        <h1 className="font-serif text-3xl font-bold text-stone-900">
          Edit Product ({sku})
        </h1>
        <p className="mt-1 text-xs text-stone-500">
          Update pricing, stock availability, SKU, images, or tags.
        </p>
      </div>

      <AIProductAssistant
        productData={{
          name,
          category: 'Uncategorized',
          price,
          description,
          tags,
        }}
        onApply={(data) => {
          if (data.description) setDescription(data.description);
          if (data.tags) setTags(data.tags);
          if (data.seo_metadata) setSeoMetadata(data.seo_metadata);
          if (data.ai_content) setAiContent(data.ai_content);
        }}
      />

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Product Title
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-amber-900">
              SKU Code (Editable)
            </label>
            <input
              type="text"
              required
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 font-mono text-xs font-bold text-amber-950 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-amber-800">
              Collection (Optional)
            </label>
            <select
              value={collectionSlug}
              onChange={(e) => setCollectionSlug(e.target.value)}
              className="w-full rounded-lg border border-amber-300 bg-amber-50/50 px-3 py-2 text-xs font-medium text-amber-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="">-- None (Standard Catalog) --</option>
              {availableCollections.map((col) => (
                <option key={col.slug} value={col.slug}>
                  {col.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Selling Price (₹)
            </label>
            <input
              type="number"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-700">
              MRP (₹)
            </label>
            <input
              type="number"
              required
              value={mrp}
              onChange={(e) => setMrp(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Stock Quantity
            </label>
            <input
              type="number"
              required
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
            >
              <option value="active">Active (Visible)</option>
              <option value="out_of_stock">Out of Stock</option>
              <option value="hidden">Hidden from Customer Catalog</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Product Tags (Comma Separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. 22K Gold, Solitaire, Anniversary Gift, Wedding"
              className="w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 font-mono text-xs focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Image Tagger */}
        <div className="space-y-4 border-t border-stone-200 pt-4">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-900">
              Product Images & Tags (Model / Still / Zoom / 360)
            </label>
            <button
              type="button"
              onClick={addImageField}
              className="flex items-center space-x-1 text-xs font-semibold text-amber-800 hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Image</span>
            </button>
          </div>

          {images.map((img, idx) => (
            <div
              key={idx}
              className="flex flex-col space-y-2 rounded-lg border border-stone-200 bg-stone-50 p-3 sm:flex-row sm:items-center sm:space-x-3 sm:space-y-0"
            >
              <input
                type="url"
                required
                value={img.url}
                onChange={(e) => updateImage(idx, 'url', e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="flex-1 rounded border border-stone-300 bg-white px-3 py-1.5 text-xs"
              />

              <ImagePicker
                onSelect={(url) => updateImage(idx, 'url', url)}
                buttonLabel="Select Image"
                buttonClassName="block whitespace-nowrap rounded bg-stone-200 px-3 py-1.5 text-center text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-300"
              />

              <select
                value={img.type}
                onChange={(e) =>
                  updateImage(idx, 'type', e.target.value as ImageType)
                }
                className="rounded border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700"
              >
                <option value="still">Still Photo</option>
                <option value="model">On-Model Shot</option>
                <option value="zoom">High-Res Zoom</option>
                <option value="360">360° Interactive</option>
              </select>
              {images.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="p-1.5 text-stone-400 hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end space-x-3 border-t border-stone-200 pt-4">
          <Link
            href="/admin/products"
            className="rounded-lg bg-stone-100 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-stone-700"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="rounded-lg bg-amber-950 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-amber-900"
          >
            Update Product
          </button>
        </div>
      </form>

      <Product360Editor productId={id} />
    </div>
  );
}
