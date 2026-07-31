'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Eye, EyeOff, AlertTriangle, ArrowLeft } from 'lucide-react';
import { DEMO_PRODUCTS } from '@/lib/products';
import { Product } from '@/types/database';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>(DEMO_PRODUCTS);
  const [search, setSearch] = useState('');

  const toggleStatus = (id: string) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const nextStatus = p.status === 'active' ? 'hidden' : 'active';
          return { ...p, status: nextStatus };
        }
        return p;
      })
    );
  };

  const toggleStock = (id: string) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const nextStock = p.status === 'out_of_stock' ? 'active' : 'out_of_stock';
          return { ...p, status: nextStock };
        }
        return p;
      })
    );
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <div className="flex items-center space-x-2 text-xs text-stone-500 mb-1">
            <Link href="/admin/dashboard" className="hover:text-amber-800 flex items-center space-x-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>
          </div>
          <h1 className="font-serif text-3xl font-bold text-stone-900">Product Management</h1>
          <p className="text-xs text-stone-500 mt-1">Manage catalog items, SKUs, pricing, stock, and image tags.</p>
        </div>

        <Link
          href="/admin/products/new"
          className="px-5 py-2.5 bg-amber-950 hover:bg-amber-900 text-white font-semibold text-xs uppercase tracking-wider rounded-lg shadow-md transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </Link>
      </div>

      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or SKU..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-stone-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
          />
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
        </div>

        <div className="text-xs text-stone-500 font-medium">
          Total Products: <span className="text-stone-900 font-bold">{filtered.length}</span>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-100 uppercase tracking-wider font-semibold text-[10px] text-stone-500 border-b border-stone-200">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price / MRP</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {filtered.map((product) => (
                <tr key={product.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3 flex items-center space-x-3">
                    {product.images && product.images[0] && (
                      <img
                        src={product.images[0].url}
                        alt={product.name}
                        className="w-10 h-10 object-cover rounded-md border border-stone-200"
                      />
                    )}
                    <div>
                      <div className="font-semibold text-stone-900">{product.name}</div>
                      <div className="text-[10px] text-stone-400">
                        {product.is_new_arrival && <span className="mr-2 text-amber-700">● New Arrival</span>}
                        {product.is_best_seller && <span className="text-emerald-700">● Best Seller</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-stone-800">{product.sku}</td>
                  <td className="px-4 py-3">{product.category?.name || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-stone-900">
                    ₹{product.price.toLocaleString('en-IN')}{' '}
                    <span className="text-stone-400 font-normal line-through text-[10px]">
                      ₹{product.mrp.toLocaleString('en-IN')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {product.stock_quantity <= product.low_stock_threshold ? (
                      <span className="inline-flex items-center space-x-1 text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{product.stock_quantity} Left</span>
                      </span>
                    ) : (
                      <span>{product.stock_quantity} pcs</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                        product.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : product.status === 'out_of_stock'
                          ? 'bg-stone-200 text-stone-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {product.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => toggleStatus(product.id)}
                      className="p-1.5 rounded hover:bg-stone-200 text-stone-600"
                      title="Toggle Visibility (Active / Hidden)"
                    >
                      {product.status === 'hidden' ? <EyeOff className="w-4 h-4 text-rose-600" /> : <Eye className="w-4 h-4 text-emerald-600" />}
                    </button>
                    <button
                      onClick={() => toggleStock(product.id)}
                      className="px-2 py-1 bg-stone-100 hover:bg-stone-200 rounded text-[10px] font-semibold text-stone-700"
                      title="Toggle Stock Status"
                    >
                      Stock Status
                    </button>
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="px-2 py-1 bg-amber-900 hover:bg-amber-800 text-white rounded text-[10px] font-semibold"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
