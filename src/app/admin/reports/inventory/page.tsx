'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, Package, CheckCircle, Search, Filter } from 'lucide-react';

const MOCK_INVENTORY = [
  { id: 'SKU-001', name: 'Aurelia Solitaire Diamond Ring', category: 'Rings', stock: 2, threshold: 5, price: 12500, status: 'low_stock' },
  { id: 'SKU-002', name: 'Celestial Pearl Drop Earrings', category: 'Earrings', stock: 14, threshold: 5, price: 7500, status: 'in_stock' },
  { id: 'SKU-003', name: 'Royal Heritage Gold Bangle', category: 'Bangles', stock: 1, threshold: 3, price: 39500, status: 'low_stock' },
  { id: 'SKU-004', name: 'Kundan Choker Statement Necklace', category: 'Necklaces', stock: 0, threshold: 2, price: 85000, status: 'out_of_stock' },
  { id: 'SKU-005', name: 'Minimalist 18K Gold Chain', category: 'Chains', stock: 18, threshold: 5, price: 12000, status: 'in_stock' },
];

export default function InventoryReportPage() {
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const filteredInventory = MOCK_INVENTORY.filter(item => {
    const matchesFilter = filter === 'all' || item.status === filter;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.id.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const lowStockCount = MOCK_INVENTORY.filter(i => i.status === 'low_stock').length;
  const outOfStockCount = MOCK_INVENTORY.filter(i => i.status === 'out_of_stock').length;
  const totalValuation = MOCK_INVENTORY.reduce((acc, curr) => acc + (curr.stock * curr.price), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-200 pb-6 gap-4">
        <div className="flex items-center space-x-4">
          <Link href="/admin/dashboard" className="p-2 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-stone-700" />
          </Link>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">Inventory & Low-Stock Valuation</h1>
            <p className="text-xs text-stone-500 mt-1">Real-time stock alerts and warehouse valuation</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Valuation</span>
            <Package className="w-5 h-5 text-stone-700" />
          </div>
          <p className="text-3xl font-serif font-bold text-stone-900">₹{totalValuation.toLocaleString('en-IN')}</p>
          <p className="text-xs text-stone-400">Total in-stock inventory value</p>
        </div>

        <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-xs font-semibold uppercase tracking-wider">Low Stock Warnings</span>
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-3xl font-serif font-bold text-amber-950">{lowStockCount} Items</p>
          <p className="text-xs text-amber-700">Stock below reorder threshold</p>
        </div>

        <div className="bg-rose-50 p-6 rounded-2xl border border-rose-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-rose-800">
            <span className="text-xs font-semibold uppercase tracking-wider">Out of Stock</span>
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </div>
          <p className="text-3xl font-serif font-bold text-rose-950">{outOfStockCount} Items</p>
          <p className="text-xs text-rose-700">Requires urgent restocking</p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
          <input 
            type="text" 
            placeholder="Search by product name or SKU..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-stone-200 rounded-xl text-sm outline-none focus:border-amber-900"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-stone-400" />
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-700 uppercase outline-none focus:border-amber-900 bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-stone-400 uppercase text-[10px] font-semibold tracking-wider bg-stone-50">
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Unit Price</th>
                <th className="py-3 px-4">Stock Level</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredInventory.map((item) => (
                <tr key={item.id} className="hover:bg-stone-50 transition-colors">
                  <td className="py-3 px-4 font-mono text-xs text-stone-500 font-semibold">{item.id}</td>
                  <td className="py-3 px-4 font-bold text-stone-900">{item.name}</td>
                  <td className="py-3 px-4 text-stone-600">{item.category}</td>
                  <td className="py-3 px-4 font-semibold text-stone-900">₹{item.price.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4 font-bold text-stone-900">{item.stock} units</td>
                  <td className="py-3 px-4">
                    {item.status === 'in_stock' && (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] uppercase font-bold px-2.5 py-1 rounded-md inline-flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1" /> Healthy
                      </span>
                    )}
                    {item.status === 'low_stock' && (
                      <span className="bg-amber-100 text-amber-800 text-[10px] uppercase font-bold px-2.5 py-1 rounded-md inline-flex items-center">
                        <AlertTriangle className="w-3 h-3 mr-1" /> Low Stock ({item.stock})
                      </span>
                    )}
                    {item.status === 'out_of_stock' && (
                      <span className="bg-rose-100 text-rose-800 text-[10px] uppercase font-bold px-2.5 py-1 rounded-md inline-flex items-center">
                        <AlertTriangle className="w-3 h-3 mr-1" /> Out of Stock
                      </span>
                    )}
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
