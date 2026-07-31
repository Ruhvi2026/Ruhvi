'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles, Plus, Trash2 } from 'lucide-react';
import { INITIAL_CATEGORIES } from '@/lib/products';
import { generateSKU } from '@/lib/sku';
import { ImageType } from '@/types/database';
import { createClient } from '@/lib/supabase/client';

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

  const [images, setImages] = useState<{ url: string; type: ImageType }[]>([
    { url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80', type: 'still' },
  ]);

  const [tags, setTags] = useState('22K Gold, BIS Hallmarked, Diamond');
  const [availableCollections, setAvailableCollections] = useState<{ slug: string; title: string }[]>([
    { slug: 'for-her', title: 'Gifts For Her' },
    { slug: 'under-15000', title: 'Gifts Under ₹15,000' },
    { slug: 'anniversary', title: 'Anniversary Specials' },
    { slug: 'bridal', title: 'Bridal Collection' },
  ]);

  useEffect(() => {
    const fetchCols = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.from('collections').select('slug, title').order('title');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Product "${name}" (SKU: ${sku}, Tags: ${tags}) created successfully!`);
    router.push('/admin/products');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center space-x-2 text-xs text-stone-500">
        <Link href="/admin/products" className="hover:text-amber-800 flex items-center space-x-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Products</span>
        </Link>
      </div>

      <div>
        <h1 className="font-serif text-3xl font-bold text-stone-900">Add New Jewellery Piece</h1>
        <p className="text-xs text-stone-500 mt-1">Auto-generates SKU formatted by category prefix (editable anytime).</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 shadow-sm space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Product Title *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Royal Sapphire Solitaire Ring"
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Category *
            </label>
            <select
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none bg-white"
            >
              {INITIAL_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-amber-800 mb-1">
              Collection (Optional)
            </label>
            <select
              value={collectionSlug}
              onChange={(e) => setCollectionSlug(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-amber-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none bg-amber-50/50 font-medium text-amber-900"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-stone-50 p-4 rounded-xl border border-stone-200">
          <div>
            <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
              URL Slug (Auto-generated)
            </label>
            <input
              type="text"
              readOnly
              value={slug}
              className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded text-stone-600 font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-amber-800 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span className="flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-amber-600" />
                <span>SKU Code (Editable)</span>
              </span>
              <span className="text-[9px] text-stone-400 font-normal">Edit or customize</span>
            </label>
            <input
              type="text"
              required
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="e.g. RNG-101"
              className="w-full px-3 py-1.5 text-xs bg-amber-50 border border-amber-300 rounded text-amber-950 font-mono font-bold focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Pricing & GST */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Selling Price (₹) *
            </label>
            <input
              type="number"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="49999"
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              MRP (₹) *
            </label>
            <input
              type="number"
              required
              value={mrp}
              onChange={(e) => setMrp(e.target.value)}
              placeholder="59999"
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              GST Rate (%)
            </label>
            <input
              type="number"
              step="0.5"
              value={gstRate}
              onChange={(e) => setGstRate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Stock & Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Stock Quantity *
            </label>
            <input
              type="number"
              required
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
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
            <label htmlFor="newArrival" className="text-xs font-semibold text-stone-700 cursor-pointer">
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
            <label htmlFor="bestSeller" className="text-xs font-semibold text-stone-700 cursor-pointer">
              Mark as Best Seller
            </label>
          </div>
        </div>

        {/* Description & Tags */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed craft description, metal purity, gemstone details..."
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1 flex items-center justify-between">
              <span>Product Tags (Comma Separated)</span>
              <span className="text-[10px] text-amber-800 font-normal">For search & filters</span>
            </label>
            <textarea
              rows={3}
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. 22K Gold, Solitaire, Anniversary Gift, Wedding, Under 15000"
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none bg-stone-50/50 font-mono"
            />
          </div>
        </div>

        {/* Image Tagger */}
        <div className="border-t border-stone-200 pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-900">
              Product Images & Tags (Model / Still / Zoom / 360)
            </label>
            <button
              type="button"
              onClick={addImageField}
              className="text-xs text-amber-800 font-semibold hover:underline flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Image</span>
            </button>
          </div>

          {images.map((img, idx) => (
            <div key={idx} className="flex items-center space-x-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
              <input
                type="url"
                required
                value={img.url}
                onChange={(e) => updateImage(idx, 'url', e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="flex-1 px-3 py-1.5 text-xs border border-stone-300 rounded bg-white"
              />
              <select
                value={img.type}
                onChange={(e) => updateImage(idx, 'type', e.target.value as ImageType)}
                className="px-3 py-1.5 text-xs border border-stone-300 rounded bg-white font-semibold text-stone-700"
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
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Submit */}
        <div className="border-t border-stone-200 pt-4 flex justify-end space-x-3">
          <Link
            href="/admin/products"
            className="px-5 py-2.5 bg-stone-100 text-stone-700 text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-stone-200"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="px-6 py-2.5 bg-amber-950 text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-amber-900"
          >
            Save Product
          </button>
        </div>
      </form>
    </div>
  );
}
