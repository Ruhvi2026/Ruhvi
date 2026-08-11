'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Sparkles, Plus, Trash2 } from 'lucide-react';
import { INITIAL_CATEGORIES } from '@/lib/products';
import { generateSKU } from '@/lib/sku';
import { ImageType } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { AIProductAssistant } from '@/components/admin/AIProductAssistant';

export default function AddProductPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [categorySlug, setCategorySlug] = useState(INITIAL_CATEGORIES[0].slug);
  const [collectionSlug, setCollectionSlug] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [gstRate, setGstRate] = useState('3.0');
  const [stockQuantity, setStockQuantity] = useState('10');
  const [description, setDescription] = useState('');
  const [isNewArrival, setIsNewArrival] = useState(true);
  const [isBestSeller, setIsBestSeller] = useState(false);
  const [seoMetadata, setSeoMetadata] = useState<any>(null);
  const [aiContent, setAiContent] = useState<any>(null);

  const [images, setImages] = useState<{ url: string; type: ImageType }[]>([
    {
      url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80',
      type: 'still',
    },
  ]);

  const [tags, setTags] = useState('22K Gold, BIS Hallmarked, Diamond');
  const [availableCollections, setAvailableCollections] = useState<
    { slug: string; title: string }[]
  >([
    { slug: 'for-her', title: 'Gifts For Her' },
    { slug: 'under-15000', title: 'Gifts Under ₹15,000' },
    { slug: 'anniversary', title: 'Anniversary Specials' },
    { slug: 'bridal', title: 'Bridal Collection' },
  ]);

  useEffect(() => {
    const fetchCols = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('collections')
          .select('slug, title')
          .order('title');
        if (data && data.length > 0) {
          setAvailableCollections(data);
        }
      } catch {
        // ignore
      }
    };
    fetchCols();
  }, []);

  // Auto-generate slug and SKU when name or category changes
  useEffect(() => {
    if (name) {
      const generatedSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setSlug(generatedSlug);
    }
  }, [name]);

  useEffect(() => {
    if (categorySlug) {
      const randomSeq = Math.floor(100 + Math.random() * 900);
      setSku(generateSKU(categorySlug, randomSeq));
    }
  }, [categorySlug]);

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

      // 1. Get Category ID
      const { data: categoryData } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', categorySlug)
        .single();
      
      const categoryId = categoryData?.id;

      // 2. Insert product
      const { data: newProduct, error: productError } = await supabase
        .from('products')
        .insert([
          {
            sku,
            name,
            slug,
            description,
            category_id: categoryId,
            price: parseFloat(price),
            mrp: parseFloat(mrp),
            gst_rate: parseFloat(gstRate),
            stock_quantity: parseInt(stockQuantity, 10),
            low_stock_threshold: 5,
            status: 'active',
            is_new_arrival: isNewArrival,
            is_best_seller: isBestSeller,
            ...(seoMetadata ? { seo_metadata: seoMetadata } : {}),
            ...(aiContent ? { ai_content: aiContent } : {}),
          },
        ])
        .select()
        .single();

      if (productError) throw productError;

      // 2. Insert images
      if (images.length > 0) {
        const imageInserts = images
          .filter((img) => img.url.trim() !== '')
          .map((img, index) => ({
            product_id: newProduct.id,
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

      // 3. Insert collection mapping if applicable
      if (collectionSlug) {
        const { data: coll } = await supabase
          .from('collections')
          .select('id')
          .eq('slug', collectionSlug)
          .single();

        if (coll) {
          await supabase.from('product_collections').insert([
            {
              product_id: newProduct.id,
              collection_id: coll.id,
            },
          ]);
        }
      }

      toast.success(`Product "${name}" created successfully!`);
      router.push('/admin/products');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to save product: ' + err.message);
    }
  };

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
          Add New Jewellery Piece
        </h1>
        <p className="mt-1 text-xs text-stone-500">
          Auto-generates SKU formatted by category prefix (editable anytime).
        </p>
      </div>

      <AIProductAssistant
        productData={{ name, category: categorySlug, price, description, tags }}
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
        {/* Basic Info */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Product Title *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Royal Sapphire Solitaire Ring"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Category *
            </label>
            <select
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {INITIAL_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
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

        {/* Slug & SKU */}
        <div className="grid grid-cols-1 gap-6 rounded-xl border border-stone-200 bg-stone-50 p-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              URL Slug (Auto-generated)
            </label>
            <input
              type="text"
              readOnly
              value={slug}
              className="w-full rounded border border-stone-200 bg-white px-3 py-1.5 font-mono text-xs text-stone-600"
            />
          </div>

          <div>
            <label className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-amber-800">
              <span className="flex items-center space-x-1">
                <Sparkles className="h-3 w-3 text-amber-600" />
                <span>SKU Code (Editable)</span>
              </span>
              <span className="text-[9px] font-normal text-stone-400">
                Edit or customize
              </span>
            </label>
            <input
              type="text"
              required
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="e.g. RNG-101"
              className="w-full rounded border border-amber-300 bg-amber-50 px-3 py-1.5 font-mono text-xs font-bold text-amber-950 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Pricing & GST */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Selling Price (₹) *
            </label>
            <input
              type="number"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="49999"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-700">
              MRP (₹) *
            </label>
            <input
              type="number"
              required
              value={mrp}
              onChange={(e) => setMrp(e.target.value)}
              placeholder="59999"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-700">
              GST Rate (%)
            </label>
            <input
              type="number"
              step="0.5"
              value={gstRate}
              onChange={(e) => setGstRate(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Stock & Badges */}
        <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Stock Quantity *
            </label>
            <input
              type="number"
              required
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center space-x-2 pt-4 sm:pt-6">
            <input
              type="checkbox"
              id="newArrival"
              checked={isNewArrival}
              onChange={(e) => setIsNewArrival(e.target.checked)}
              className="accent-amber-900"
            />
            <label
              htmlFor="newArrival"
              className="cursor-pointer text-xs font-semibold text-stone-700"
            >
              Mark as New Arrival
            </label>
          </div>

          <div className="flex items-center space-x-2 pt-4 sm:pt-6">
            <input
              type="checkbox"
              id="bestSeller"
              checked={isBestSeller}
              onChange={(e) => setIsBestSeller(e.target.checked)}
              className="accent-amber-900"
            />
            <label
              htmlFor="bestSeller"
              className="cursor-pointer text-xs font-semibold text-stone-700"
            >
              Mark as Best Seller
            </label>
          </div>
        </div>

        {/* Description & Tags */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed craft description, metal purity, gemstone details..."
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-stone-700">
              <span>Product Tags (Comma Separated)</span>
              <span className="text-[10px] font-normal text-amber-800">
                For search & filters
              </span>
            </label>
            <textarea
              rows={3}
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. 22K Gold, Solitaire, Anniversary Gift, Wedding, Under 15000"
              className="w-full rounded-lg border border-stone-300 bg-stone-50/50 px-3 py-2 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
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

              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  id={`file-upload-${idx}`}
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    try {
                      const { uploadProductImage } =
                        await import('@/services/cloudinaryService');
                      const uploadResult = await uploadProductImage(file);

                      // Update the input with the secure Cloudinary URL
                      updateImage(idx, 'url', uploadResult.secure_url);
                    } catch (error: any) {
                      toast.error('Cloudinary upload failed: ' + error.message);
                    }
                  }}
                />
                <label
                  htmlFor={`file-upload-${idx}`}
                  className="block cursor-pointer whitespace-nowrap rounded bg-stone-200 px-3 py-1.5 text-center text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-300"
                >
                  Upload File
                </label>
              </div>

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

        {/* Submit */}
        <div className="flex justify-end space-x-3 border-t border-stone-200 pt-4">
          <Link
            href="/admin/products"
            className="rounded-lg bg-stone-100 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-stone-700 hover:bg-stone-200"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="rounded-lg bg-amber-950 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-amber-900"
          >
            Save Product
          </button>
        </div>
      </form>
    </div>
  );
}
