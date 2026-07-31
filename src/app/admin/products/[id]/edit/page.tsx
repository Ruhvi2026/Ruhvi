'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { DEMO_PRODUCTS, INITIAL_CATEGORIES } from '@/lib/products';

interface EditProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditProductPage({ params }: EditProductPageProps) {
  const { id } = use(params);
  const router = useRouter();

  const product = DEMO_PRODUCTS.find((p) => p.id === id) || DEMO_PRODUCTS[0];

  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(String(product.price));
  const [mrp, setMrp] = useState(String(product.mrp));
  const [stockQuantity, setStockQuantity] = useState(String(product.stock_quantity));
  const [status, setStatus] = useState(product.status);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Product ${product.sku} updated!`);
    router.push('/admin/products');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center space-x-2 text-xs text-stone-500">
        <Link href="/admin/products" className="hover:text-amber-800 flex items-center space-x-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Products</span>
        </Link>
      </div>

      <div>
        <h1 className="font-serif text-3xl font-bold text-stone-900">Edit Product ({product.sku})</h1>
        <p className="text-xs text-stone-500 mt-1">Update pricing, stock availability, or hide product.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 shadow-sm space-y-6">
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
