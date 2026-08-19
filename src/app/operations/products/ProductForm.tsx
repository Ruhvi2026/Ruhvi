'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createProduct, updateProduct } from './actions';
import { Save, ArrowLeft, Loader2, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface ProductFormProps {
  initialData?: any;
  isEdit?: boolean;
}

export default function ProductForm({ initialData, isEdit }: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [categories, setCategories] = useState<any[]>([]);

  // Form State
  const [name, setName] = useState(initialData?.name || '');
  const [sku, setSku] = useState(initialData?.sku || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [categoryId, setCategoryId] = useState(initialData?.category_id || '');
  const [price, setPrice] = useState(initialData?.price || '');
  const [mrp, setMrp] = useState(initialData?.mrp || '');
  const [stockQuantity, setStockQuantity] = useState(
    initialData?.stock_quantity || '0'
  );
  const [status, setStatus] = useState(initialData?.status || 'active');
  const [description, setDescription] = useState(
    initialData?.description || ''
  );
  const [imageUrls, setImageUrls] = useState(
    initialData?.product_images?.map((img: any) => img.url).join('\n') || ''
  );

  useEffect(() => {
    const fetchCategories = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');
      if (data) setCategories(data);
    };
    fetchCategories();
  }, []);

  // Auto-generate slug from name
  useEffect(() => {
    if (!isEdit && name && !slug) {
      setSlug(
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '')
      );
    }
  }, [name, isEdit, slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('name', name);
    formData.append('sku', sku);
    formData.append('slug', slug);
    formData.append('category_id', categoryId);
    formData.append('price', price.toString());
    formData.append('mrp', mrp.toString());
    formData.append('stock_quantity', stockQuantity.toString());
    formData.append('status', status);
    formData.append('description', description);
    formData.append('image_urls', imageUrls);

    startTransition(async () => {
      try {
        let result;
        if (isEdit && initialData?.id) {
          result = await updateProduct(initialData.id, formData);
        } else {
          result = await createProduct(formData);
        }

        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success(
            `Product successfully ${isEdit ? 'updated' : 'created'}!`
          );
          router.push('/operations/products');
        }
      } catch (err: any) {
        toast.error('An unexpected error occurred');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/operations/products"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {isEdit ? 'Edit Product' : 'Add New Product'}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {isEdit
                ? 'Update product details and variations.'
                : 'Create a new product in the catalog.'}
            </p>
          </div>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isEdit ? 'Save Changes' : 'Create Product'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main Column */}
        <div className="space-y-6 lg:col-span-2">
          {/* General Information */}
          <div className="space-y-6 rounded-xl border border-white/5 bg-[#151520] p-6 shadow-xl">
            <h2 className="border-b border-white/10 pb-4 text-lg font-bold text-white">
              General Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g., Diamond Solitaire Ring"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">
                    SKU (Stock Keeping Unit) *
                  </label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value.toUpperCase())}
                    className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="e.g., RNG-DMD-001"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">
                    URL Slug *
                  </label>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) =>
                      setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))
                    }
                    className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="e.g., diamond-solitaire-ring"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Description
                </label>
                <textarea
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Enter detailed product description..."
                />
              </div>
            </div>
          </div>

          {/* Pricing & Inventory */}
          <div className="space-y-6 rounded-xl border border-white/5 bg-[#151520] p-6 shadow-xl">
            <h2 className="border-b border-white/10 pb-4 text-lg font-bold text-white">
              Pricing & Inventory
            </h2>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Selling Price (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  MRP (Original Price) (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={mrp}
                  onChange={(e) => setMrp(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Available Stock Quantity *
                </label>
                <input
                  type="number"
                  required
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          {/* Organization */}
          <div className="space-y-6 rounded-xl border border-white/5 bg-[#151520] p-6 shadow-xl">
            <h2 className="border-b border-white/10 pb-4 text-lg font-bold text-white">
              Organization
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Product Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="active">Active (Visible)</option>
                  <option value="hidden">Hidden (Draft)</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Select Category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Media */}
          <div className="space-y-6 rounded-xl border border-white/5 bg-[#151520] p-6 shadow-xl">
            <div className="flex items-center gap-2 border-b border-white/10 pb-4">
              <ImageIcon className="h-5 w-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white">Media (URLs)</h2>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-slate-400">
                Paste direct image URLs here (one per line). The first URL will
                be used as the thumbnail.
              </label>
              <textarea
                rows={5}
                value={imageUrls}
                onChange={(e) => setImageUrls(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 font-mono text-sm text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
