'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  QrCode,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Edit2,
  Search,
  Filter,
  Check,
  X,
  PackagePlus,
  Layers,
  Sparkles,
  ExternalLink,
  Printer,
} from 'lucide-react';
import {
  getStagedScans,
  deleteStagedScan,
  updateStagedScan,
  syncStagedInventory,
} from './actions';
import { InventoryStagingItem, StagedSyncResponse } from '@/types/database';

export default function InventoryScanSyncPage() {
  const [items, setItems] = useState<InventoryStagingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'staged' | 'synced' | 'failed'
  >('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSyncing, startSyncTransition] = useTransition();
  const [syncResponse, setSyncResponse] = useState<StagedSyncResponse | null>(
    null
  );

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<InventoryStagingItem | null>(
    null
  );
  const [editSku, setEditSku] = useState('');
  const [editBarcode, setEditBarcode] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editCost, setEditCost] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editName, setEditName] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getStagedScans(statusFilter);
      if (res.success && res.data) {
        setItems(res.data);
      }
    } catch (err) {
      console.error('Error loading staged scans:', err);
    } finally {
      setLoading(false);
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    return {
      total: items.length,
      pending: items.filter((i) => i.status === 'staged').length,
      synced: items.filter((i) => i.status === 'synced').length,
      failed: items.filter((i) => i.status === 'failed').length,
    };
  }, [items]);

  // Search Filter
  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (item) =>
        item.sku.toLowerCase().includes(q) ||
        item.barcode.toLowerCase().includes(q) ||
        (item.product_name && item.product_name.toLowerCase().includes(q))
    );
  }, [items, search]);

  // Handle Multi-Select
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pendingIds = filteredItems
        .filter((i) => i.status === 'staged' || i.status === 'failed')
        .map((i) => i.id);
      setSelectedIds(pendingIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Execute Authoritative Sync Now
  const handleSyncNow = () => {
    startSyncTransition(async () => {
      const targetIds = selectedIds.length > 0 ? selectedIds : undefined;
      const res = await syncStagedInventory(targetIds);
      setSyncResponse(res);
      setSelectedIds([]);
      await loadData();
    });
  };

  // Delete staged item
  const handleDelete = async (id: string) => {
    if (!confirm('Remove this staged item from queue?')) return;
    try {
      const res = await deleteStagedScan(id);
      if (res.success) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        setSelectedIds((prev) => prev.filter((item) => item !== id));
      } else {
        alert(res.error || 'Failed to delete item');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting item');
    }
  };

  // Open Edit Modal
  const openEditModal = (item: InventoryStagingItem) => {
    setEditingItem(item);
    setEditSku(item.sku);
    setEditBarcode(item.barcode);
    setEditWeight(String(item.weight_grams));
    setEditCost(String(item.cost_price));
    setEditStock(String(item.stock_quantity));
    setEditName(item.product_name || '');
  };

  // Save Edit
  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setIsSavingEdit(true);
    try {
      const res = await updateStagedScan(editingItem.id, {
        sku: editSku.trim().toUpperCase(),
        barcode: editBarcode.trim(),
        weight_grams: parseFloat(editWeight) || editingItem.weight_grams,
        cost_price: parseFloat(editCost) || editingItem.cost_price,
        stock_quantity: parseInt(editStock, 10) || editingItem.stock_quantity,
        product_name: editName ? editName.trim() : undefined,
      });

      if (res.success) {
        setEditingItem(null);
        await loadData();
      } else {
        alert(res.error || 'Failed to update item');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating item');
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/operations/inventory"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Mobile Scan & Add — Inventory Sync
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <Sparkles className="h-3 w-3" /> Authoritative Sync Engine
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Review mobile barcode captures, correct attributes, and
              authoritatively commit stock into the canonical catalog.
            </p>
          </div>
        </div>

        {/* Sync Now Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading || isSyncing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-[#151520] dark:text-slate-300 dark:hover:bg-white/5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleSyncNow}
            disabled={isSyncing || metrics.pending === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Syncing Catalogue...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Sync Now (
                {selectedIds.length > 0
                  ? selectedIds.length
                  : metrics.pending}{' '}
                Pending)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sync Response Toast/Banner */}
      {syncResponse && (
        <div
          className={`flex items-start justify-between rounded-xl border p-4 shadow-sm ${
            syncResponse.failed_count === 0
              ? 'border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-200'
              : 'border-amber-500/30 bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {syncResponse.failed_count === 0 ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />
            )}
            <div>
              <p className="text-sm font-semibold">
                Batch Synchronization Complete
              </p>
              <p className="mt-0.5 text-xs opacity-90">
                Processed {syncResponse.total_processed} items:{' '}
                {syncResponse.synced_count} successfully synced to canonical
                catalogue
                {syncResponse.failed_count > 0 &&
                  `, ${syncResponse.failed_count} failed.`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSyncResponse(null)}
            className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Pending Sync */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#151520]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pending Sync
            </span>
            <span className="rounded-full bg-amber-500/10 p-1.5 text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {metrics.pending}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Awaiting "Sync Now" commit
          </p>
        </div>

        {/* Synced */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#151520]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Synced to Catalog
            </span>
            <span className="rounded-full bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {metrics.synced}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Authoritatively in products
          </p>
        </div>

        {/* Errors */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#151520]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Sync Errors
            </span>
            <span className="rounded-full bg-rose-500/10 p-1.5 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {metrics.failed}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Needs review / correction
          </p>
        </div>

        {/* Total Scanned */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#151520]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Captured
            </span>
            <span className="rounded-full bg-indigo-500/10 p-1.5 text-indigo-600 dark:text-indigo-400">
              <QrCode className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {metrics.total}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Staged by your account
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by SKU, barcode, or product name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-white/10 dark:bg-[#151520] dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm focus:border-emerald-500 focus:outline-none dark:border-white/10 dark:bg-[#151520] dark:text-slate-200"
          >
            <option value="all">All Statuses</option>
            <option value="staged">Pending Sync</option>
            <option value="synced">Synced to Catalog</option>
            <option value="failed">Failed / Errors</option>
          </select>
        </div>
      </div>

      {/* Table Card */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#151520]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-white/10 dark:bg-black/20 dark:text-slate-400">
              <tr>
                <th className="w-10 px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredItems.length > 0 &&
                      selectedIds.length ===
                        filteredItems.filter(
                          (i) => i.status === 'staged' || i.status === 'failed'
                        ).length
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
                <th className="px-4 py-3 font-semibold">SKU & Barcode</th>
                <th className="px-4 py-3 font-semibold">Product Name</th>
                <th className="px-4 py-3 font-semibold">Weight</th>
                <th className="px-4 py-3 font-semibold">Cost Price</th>
                <th className="px-4 py-3 text-right font-semibold">
                  Stock Qty
                </th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Scanned</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-emerald-500" />
                    Loading staged scans...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-16 text-center text-slate-500 dark:text-slate-400"
                  >
                    <QrCode className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                      No staged scan records found
                    </p>
                    <p className="mt-1 text-xs">
                      Open the Ruhvi Mobile App on your device and tap the
                      scanner icon in the header to capture stock barcodes.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.02] ${
                        isSelected
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/10'
                          : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3 text-center">
                        {item.status !== 'synced' && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(item.id)}
                            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                        )}
                      </td>

                      {/* SKU & Barcode */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {item.sku}
                        </div>
                        <div className="flex items-center gap-1 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                          <QrCode className="h-3 w-3" />
                          {item.barcode}
                        </div>
                      </td>

                      {/* Product Name */}
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {item.product_name || (
                          <span className="italic text-slate-400">
                            Auto-derive from SKU
                          </span>
                        )}
                      </td>

                      {/* Weight */}
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-200">
                        {item.weight_grams} g
                      </td>

                      {/* Cost Price */}
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-200">
                        ₹{item.cost_price?.toLocaleString('en-IN')}
                      </td>

                      {/* Stock Quantity */}
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                          +{item.stock_quantity} pcs
                        </span>
                      </td>

                      {/* Truthful Status Badge */}
                      <td className="px-4 py-3">
                        {item.status === 'staged' && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
                            <Clock className="h-3 w-3" /> Pending Sync
                          </span>
                        )}
                        {item.status === 'synced' && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> Synced to
                            Catalog
                          </span>
                        )}
                        {item.status === 'failed' && (
                          <span
                            title={item.sync_error || 'Sync error'}
                            className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"
                          >
                            <AlertTriangle className="h-3 w-3" /> Error
                          </span>
                        )}
                      </td>

                      {/* Scanned At */}
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {new Date(item.created_at).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        {new Date(item.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {item.sku && (
                            <Link
                              href={`/operations/inventory/barcode?sku=${encodeURIComponent(item.sku)}`}
                              className="rounded p-1 text-[#C5A880] hover:bg-[#C5A880]/15"
                              title="Print Barcode Label"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </Link>
                          )}
                          {item.status !== 'synced' && (
                            <>
                              <button
                                onClick={() => openEditModal(item)}
                                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                                title="Edit attributes"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                                title="Delete staged scan"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                          {item.status === 'synced' &&
                            item.synced_product_id && (
                              <Link
                                href={`/operations/products/${item.synced_product_id}`}
                                className="rounded p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                                title="View Product in Catalog"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Link>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Staged Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#181824]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-white/10">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Correct Staged Scan
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">
                  SKU *
                </label>
                <input
                  type="text"
                  value={editSku}
                  onChange={(e) => setEditSku(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-black/20 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">
                  Barcode *
                </label>
                <input
                  type="text"
                  value={editBarcode}
                  onChange={(e) => setEditBarcode(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-black/20 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">
                    Weight (g) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editWeight}
                    onChange={(e) => setEditWeight(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-black/20 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">
                    Cost Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editCost}
                    onChange={(e) => setEditCost(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-black/20 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">
                  Stock Quantity (pcs) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={editStock}
                  onChange={(e) => setEditStock(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-black/20 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">
                  Product Name (Optional)
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-black/20 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {isSavingEdit ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
