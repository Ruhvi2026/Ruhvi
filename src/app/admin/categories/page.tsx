'use client';

import React, { useState, useEffect } from 'react';

import { createClient } from '@/lib/supabase/client';
import { Category } from '@/types/database';
import { INITIAL_CATEGORIES } from '@/lib/products';
import {
  saveCategory,
  deleteCategoryAction,
} from '@/app/admin/actions/categories';
import {
  Plus,
  Edit2,
  Trash2,
  Image as ImageIcon,
  X,
  Check,
} from 'lucide-react';
import Image from 'next/image';
import { ImagePicker } from '@/components/admin/ImagePicker';

export default function CategoryManagerPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (!error && data && data.length > 0) {
        setCategories(data);
      } else if (!error && data && data.length === 0) {
        await supabase.from('categories').insert(INITIAL_CATEGORIES);
        setCategories(INITIAL_CATEGORIES);
      } else {
        setCategories(INITIAL_CATEGORIES);
      }
    } catch {
      setCategories(INITIAL_CATEGORIES);
    }
    setLoading(false);
  };

  const handleOpenAddModal = () => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setImageUrl('');
    setIsHidden(false);
    setMessage(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setImageUrl(cat.image_url || '');
    setIsHidden(cat.is_hidden || false);
    setMessage(null);
    setIsModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingCategory) {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setSlug(generatedSlug);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setSaving(true);
    setMessage(null);

    const payload = {
      name: name.trim(),
      slug: slug.trim(),
      image_url: imageUrl.trim() || null,
      is_hidden: isHidden,
    };

    try {
      await saveCategory(payload, editingCategory?.id);

      setMessage({
        type: 'success',
        text: editingCategory
          ? 'Category updated successfully!'
          : 'Category created successfully!',
      });

      setTimeout(() => {
        setIsModalOpen(false);
        fetchCategories();
      }, 800);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err?.message || 'An unexpected error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await deleteCategoryAction(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete category');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">
            Category Manager
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Manage product categories and cover images
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-stone-800"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-stone-500">
              <tr>
                <th className="px-6 py-4 font-medium">Image</th>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Slug</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-stone-500"
                  >
                    Loading categories...
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-stone-500"
                  >
                    No categories found. Click "Add Category" to create one.
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-stone-50/50">
                    <td className="px-6 py-4">
                      {cat.image_url ? (
                        <div className="relative h-12 w-12 overflow-hidden rounded-md border border-stone-200 bg-stone-100">
                          <Image
                            src={cat.image_url}
                            alt={cat.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-md border border-stone-200 bg-stone-100 text-stone-400">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-stone-900">
                      {cat.name}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-stone-500">
                      {cat.slug}
                    </td>
                    <td className="px-6 py-4">
                      {cat.is_hidden ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-stone-400"></span>
                          Hidden
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                          Live
                        </span>
                      )}
                    </td>
                    <td className="space-x-3 px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenEditModal(cat)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-800"
                      >
                        <Edit2 className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => deleteCategory(cat.id)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="animate-in fade-in zoom-in w-full max-w-lg space-y-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-serif text-lg font-bold text-stone-900">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {message && (
              <div
                className={`flex items-center gap-2 rounded-lg p-3 text-xs font-medium ${
                  message.type === 'success'
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border border-rose-200 bg-rose-50 text-rose-800'
                }`}
              >
                <Check className="h-4 w-4" />
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-700">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Emerald Necklaces"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-700">
                  URL Slug *
                </label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. emerald-necklaces"
                  className="w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 font-mono text-xs text-amber-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-700">
                  Cover Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <ImagePicker
                    onSelect={(url) => setImageUrl(url)}
                    buttonLabel="Upload / Select"
                    buttonClassName="flex shrink-0 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-stone-300 bg-stone-100 px-4 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-200 hover:text-stone-900"
                  />
                </div>
                {imageUrl && (
                  <div className="relative mt-2 h-24 w-full overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
                    <Image
                      src={imageUrl}
                      alt="Preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hide-category"
                  checked={isHidden}
                  onChange={(e) => setIsHidden(e.target.checked)}
                  className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                />
                <label
                  htmlFor="hide-category"
                  className="text-xs font-medium text-stone-700"
                >
                  Hide Category (Will not be visible to customers)
                </label>
              </div>

              <div className="flex justify-end gap-3 border-t border-stone-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-stone-900 px-5 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-stone-800 disabled:opacity-50"
                >
                  {saving
                    ? 'Saving...'
                    : editingCategory
                      ? 'Update Category'
                      : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
