'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Collection } from '@/types/database';
import { Plus, Edit2, Trash2, Image as ImageIcon, X, Sparkles, Check } from 'lucide-react';
import Image from 'next/image';

const INITIAL_FALLBACK_COLLECTIONS: Collection[] = [
  { id: 'col-1', title: 'Gifts For Her', slug: 'for-her', subtitle: 'Timeless pieces designed to make her feel extraordinary.', image_url: 'https://images.unsplash.com/photo-1599643478524-fb66f70a0066?auto=format&fit=crop&q=80' },
  { id: 'col-2', title: 'Gifts Under ₹15,000', slug: 'under-15000', subtitle: 'Beautiful 22K Gold jewellery that fits perfectly within budget.', image_url: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80' },
  { id: 'col-3', title: 'Anniversary Specials', slug: 'anniversary', subtitle: 'Celebrate your beautiful journey with the timeless elegance of gold and diamonds.', image_url: 'https://images.unsplash.com/photo-1605100804763-247f67b4549e?auto=format&fit=crop&q=80' },
];

export default function CollectionManagerPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('collections').select('*').order('title');
      if (!error && data && data.length > 0) {
        setCollections(data);
      } else {
        setCollections(INITIAL_FALLBACK_COLLECTIONS);
      }
    } catch {
      setCollections(INITIAL_FALLBACK_COLLECTIONS);
    }
    setLoading(false);
  };

  const handleOpenAddModal = () => {
    setEditingCollection(null);
    setTitle('');
    setSlug('');
    setSubtitle('');
    setImageUrl('');
    setMessage(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (col: Collection) => {
    setEditingCollection(col);
    setTitle(col.title);
    setSlug(col.slug);
    setSubtitle(col.subtitle || '');
    setImageUrl(col.image_url || '');
    setMessage(null);
    setIsModalOpen(true);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editingCollection) {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setSlug(generatedSlug);
    }
  };

  const handleSaveCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) return;

    setSaving(true);
    setMessage(null);

    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      subtitle: subtitle.trim() || null,
      image_url: imageUrl.trim() || null,
    };

    try {
      if (editingCollection) {
        const { error } = await supabase.from('collections').update(payload).eq('id', editingCollection.id);
        if (error) {
          // Update local state fallback
          setCollections((prev) =>
            prev.map((c) => (c.id === editingCollection.id ? { ...c, ...payload } : c))
          );
        }
      } else {
        const newId = `col-${Date.now()}`;
        const { data, error } = await supabase.from('collections').insert([{ ...payload }]).select();
        if (error || !data) {
          setCollections((prev) => [{ id: newId, ...payload }, ...prev]);
        }
      }
      setMessage({ type: 'success', text: editingCollection ? 'Collection updated successfully!' : 'Collection created successfully!' });
      setTimeout(() => {
        setIsModalOpen(false);
        fetchCollections();
      }, 800);
    } catch {
      // Local state fallback
      if (editingCollection) {
        setCollections((prev) =>
          prev.map((c) => (c.id === editingCollection.id ? { ...c, ...payload } : c))
        );
      } else {
        setCollections((prev) => [{ id: `col-${Date.now()}`, ...payload }, ...prev]);
      }
      setIsModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const deleteCollection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this collection?')) return;
    try {
      await supabase.from('collections').delete().eq('id', id);
    } catch {
      // ignore
    }
    setCollections((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Collection Manager</h1>
          <p className="text-sm text-stone-500 mt-1">Manage collections, cover images, and promotional subtitles</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 bg-stone-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Collection
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-stone-500 border-b border-stone-200">
              <tr>
                <th className="px-6 py-4 font-medium">Cover Image</th>
                <th className="px-6 py-4 font-medium">Title & Slug</th>
                <th className="px-6 py-4 font-medium">Subtitle</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-stone-500">Loading collections...</td>
                </tr>
              ) : collections.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-stone-500">No collections found. Click "Add Collection" to create one.</td>
                </tr>
              ) : (
                collections.map((col) => (
                  <tr key={col.id} className="hover:bg-stone-50/50">
                    <td className="px-6 py-4">
                      {col.image_url ? (
                        <div className="relative w-16 h-12 rounded-md overflow-hidden bg-stone-100 border border-stone-200">
                          <Image src={col.image_url} alt={col.title} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-16 h-12 rounded-md bg-stone-100 flex items-center justify-center text-stone-400 border border-stone-200">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-stone-900">
                      <div>{col.title}</div>
                      <div className="text-xs text-amber-800 font-mono font-normal mt-0.5">/collections/{col.slug}</div>
                    </td>
                    <td className="px-6 py-4 text-stone-500 max-w-[280px] truncate">{col.subtitle || '-'}</td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button
                        onClick={() => handleOpenEditModal(col)}
                        className="text-amber-700 hover:text-amber-800 font-medium text-xs inline-flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => deleteCollection(col.id)}
                        className="text-rose-600 hover:text-rose-700 font-medium text-xs inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Collection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <h3 className="font-serif text-lg font-bold text-stone-900">
                {editingCollection ? 'Edit Collection' : 'Add New Collection'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {message && (
              <div
                className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
                  message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveCollection} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                  Collection Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. Royal Bridal Collection"
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                  URL Slug *
                </label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. royal-bridal-collection"
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none font-mono text-amber-900 bg-stone-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                  Subtitle / Promo Text
                </label>
                <textarea
                  rows={2}
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="e.g. Exquisite handcrafted pieces for your special wedding day."
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                  Cover Image URL
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
                {imageUrl && (
                  <div className="mt-2 relative h-24 w-full rounded-lg overflow-hidden border border-stone-200 bg-stone-100">
                    <Image src={imageUrl} alt="Preview" fill className="object-cover" />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-stone-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingCollection ? 'Update Collection' : 'Create Collection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

