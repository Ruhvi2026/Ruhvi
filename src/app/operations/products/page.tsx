'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Plus, Search, Filter, Edit2, Trash2, Package } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProductsListingPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchProducts = async () => {
    try {
      const supabase = createClient();
      let query = supabase
        .from('products')
        .select(
          `
          id, name, sku, slug, price, stock_quantity, status,
          categories ( name ),
          product_images ( url )
        `
        )
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProducts(data || []);
    } catch (err: any) {
      toast.error('Failed to load products: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Products Catalog</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage your entire product inventory and variants.
          </p>
        </div>
        <Link
          href="/operations/products/new"
          className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#151520] py-2 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#151520] px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white">
          <Filter className="h-4 w-4" />
          Filter
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/5 bg-[#151520] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-black/20 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-6 py-4 font-medium">Product</th>
                <th className="px-6 py-4 font-medium">SKU</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Price</th>
                <th className="px-6 py-4 font-medium">Stock</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-slate-500"
                  >
                    Loading products...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <Package className="mb-4 h-12 w-12 opacity-20" />
                      <p>No products found.</p>
                      {search && (
                        <p className="mt-1 text-xs">
                          Try adjusting your search criteria.
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr
                    key={product.id}
                    className="transition-colors hover:bg-white/5"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-slate-800">
                          {product.product_images?.[0]?.url ? (
                            <Image
                              src={product.product_images[0].url}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <Package className="h-5 w-5 text-slate-500" />
                          )}
                        </div>
                        <div className="max-w-[200px]">
                          <p
                            className="truncate font-medium text-white"
                            title={product.name}
                          >
                            {product.name}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {product.slug}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-400">
                      {product.sku}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-300">
                        {product.categories?.name || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-white">
                      ₹{Number(product.price).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${product.stock_quantity > 10 ? 'bg-emerald-500' : product.stock_quantity > 0 ? 'bg-amber-500' : 'bg-rose-500'}`}
                        ></span>
                        <span>{product.stock_quantity}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {product.status === 'active' ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400">
                          Active
                        </span>
                      ) : product.status === 'hidden' ? (
                        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-400">
                          Hidden
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-400">
                          Out of Stock
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/operations/products/${product.id}`}
                        className="inline-flex items-center justify-center rounded p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                        title="Edit Product"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Link>
                      <button
                        className="ml-2 inline-flex items-center justify-center rounded p-1.5 text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                        title="Delete Product"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
