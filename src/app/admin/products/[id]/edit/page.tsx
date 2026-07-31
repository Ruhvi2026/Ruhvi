'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react';
import { DEMO_PRODUCTS } from '@/lib/products';
import { ImageType, Product } from '@/types/database';
import { createClient } from '@/lib/supabase/client';

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
  const [tags, setTags] = useState('22K Gold, BIS Hallmarked, Best Seller');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [status, setStatus] = useState<any>('active');
  const [collectionSlug, setCollectionSlug] = useState('');
  const [images, setImages] = useState<{ id?: string, url: string; type: ImageType }[]>([]);

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
          price: parseFloat(price),
          mrp: parseFloat(mrp),
          stock_quantity: parseInt(stockQuantity, 10),
          status,
        })
        .eq('id', id);

      if (productError) throw productError;

      // Handle images (simplistic: delete old, insert new)
      if (images.length > 0) {
        // Delete existing
        await supabase.from('product_images').delete().eq('product_id', id);
        
        // Insert new ones
        const imageInserts = images.filter(img => img.url.trim() !== '').map((img, index) => ({
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
      <div className="max-w-4xl mx-auto px-4 py-16 flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-900" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center space-x-2 text-xs text-stone-500">
        <Link href="/admin/products" className="hover:text-amber-800 flex items-center space-x-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Products</span>
        </Link>
      </div>

      <div>
        <h1 className="font-serif text-3xl font-bold text-stone-900">Edit Product ({sku})</h1>
        <p className="text-xs text-stone-500 mt-1">Update pricing, stock availability, SKU, images, or tags.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 shadow-sm space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Product Title
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-amber-900 mb-1">
              SKU Code (Editable)
            </label>
            <input
              type="text"
              required
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-amber-300 bg-amber-50 rounded-lg focus:ring-1 focus:ring-amber-500 font-mono font-bold text-amber-950"
            />
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Selling Price (₹)
            </label>
            <input
              type="number"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              MRP (₹)
            </label>
            <input
              type="number"
              required
              value={mrp}
              onChange={(e) => setMrp(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Stock Quantity
            </label>
            <input
              type="number"
              required
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-1 focus:ring-amber-500 bg-white"
            >
              <option value="active">Active (Visible)</option>
              <option value="out_of_stock">Out of Stock</option>
              <option value="hidden">Hidden from Customer Catalog</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
            Product Tags (Comma Separated)
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g. 22K Gold, Solitaire, Anniversary Gift, Wedding"
            className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-1 focus:ring-amber-500 bg-stone-50 font-mono"
          />
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
            <div key={idx} className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
              <input
                type="url"
                required
                value={img.url}
                onChange={(e) => updateImage(idx, 'url', e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="flex-1 px-3 py-1.5 text-xs border border-stone-300 rounded bg-white"
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
                      const { uploadProductImage } = await import('@/services/cloudinaryService');
                      const uploadResult = await uploadProductImage(file);
                      
                      updateImage(idx, 'url', uploadResult.secure_url);
                    } catch (error: any) {
                      alert('Cloudinary upload failed: ' + error.message);
                    }
                  }}
                />
                <label
                  htmlFor={`file-upload-${idx}`}
                  className="px-3 py-1.5 text-xs font-semibold bg-stone-200 text-stone-700 rounded cursor-pointer hover:bg-stone-300 transition-colors whitespace-nowrap block text-center"
                >
                  Upload File
                </label>
              </div>

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

        <div className="border-t border-stone-200 pt-4 flex justify-end space-x-3">
          <Link
            href="/admin/products"
            className="px-5 py-2.5 bg-stone-100 text-stone-700 text-xs font-semibold uppercase tracking-wider rounded-lg"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="px-6 py-2.5 bg-amber-950 text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-amber-900"
          >
            Update Product
          </button>
        </div>
      </form>
    </div>
  );
}
