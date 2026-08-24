'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Plus,
  Trash2,
  Edit2,
  Check,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { Address } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

export default function AddressBookPage() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  const fetchAddresses = useCallback(async () => {
    if (!user) {
      setAddresses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });

      if (error) {
        toast.error('Failed to load addresses.');
        console.error('Error fetching addresses:', error);
      } else {
        setAddresses((data || []) as Address[]);
      }
    } catch (err) {
      console.error('Error fetching addresses:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const [formData, setFormData] = useState({
    label: 'Home',
    full_name: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
  });

  const handleSetDefault = async (id: string) => {
    if (!user || saving) return;
    setSaving(true);
    try {
      const supabase = createClient();
      // Clear previous default, then set the new one
      const { error: clearError } = await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .neq('id', id);
      if (clearError) throw clearError;

      const { data, error } = await supabase
        .from('addresses')
        .update({ is_default: true })
        .eq('id', id)
        .eq('user_id', user.id)
        .select('*')
        .maybeSingle();
      if (error) throw error;

      setAddresses((prev) =>
        prev.map((a) => ({
          ...a,
          is_default: a.id === (data?.id || id),
        }))
      );
      toast.success('Default address updated.');
    } catch (err: any) {
      console.error('Error setting default address:', err);
      toast.error(err?.message || 'Failed to set default address.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user || saving) return;
    if (!confirm('Are you sure you want to delete this address?')) return;

    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('addresses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;

      setAddresses((prev) => prev.filter((a) => a.id !== id));
      toast.success('Address deleted.');
    } catch (err: any) {
      console.error('Error deleting address:', err);
      toast.error(err?.message || 'Failed to delete address.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (addr: Address) => {
    setEditingAddress(addr);
    setFormData({
      label: addr.label || '',
      full_name: addr.full_name,
      phone: addr.phone,
      line1: addr.line1,
      line2: addr.line2 || '',
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
    });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || saving) return;

    setSaving(true);
    try {
      const supabase = createClient();

      if (editingAddress) {
        // Update existing address
        const { data, error } = await supabase
          .from('addresses')
          .update(formData)
          .eq('id', editingAddress.id)
          .eq('user_id', user.id)
          .select('*')
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setAddresses((prev) =>
            prev.map((a) =>
              a.id === editingAddress.id ? (data as Address) : a
            )
          );
          toast.success('Address updated successfully.');
        }
      } else {
        // Insert new address; first address becomes the default
        const { data, error } = await supabase
          .from('addresses')
          .insert({
            user_id: user.id,
            ...formData,
            is_default: addresses.length === 0,
          })
          .select('*')
          .single();

        if (error) throw error;

        if (data) {
          setAddresses((prev) => [...prev, data as Address]);
          toast.success('Address added successfully.');
        }
      }
    } catch (err: any) {
      console.error('Error saving address:', err);
      toast.error(err?.message || 'Failed to save address.');
      return;
    } finally {
      setSaving(false);
    }

    setShowForm(false);
    setEditingAddress(null);
    setFormData({
      label: 'Home',
      full_name: '',
      phone: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      pincode: '',
    });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-6">
        <div className="flex items-center space-x-3">
          <Link
            href="/account"
            className="rounded-lg p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="flex items-center space-x-3 font-serif text-3xl font-bold text-stone-900">
              <MapPin className="h-7 w-7 text-amber-900" />
              <span>Saved Addresses</span>
            </h1>
            <p className="mt-1 text-xs text-stone-500">
              Manage delivery locations for fast checkout
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setEditingAddress(null);
            setFormData({
              label: 'Home',
              full_name: '',
              phone: '',
              line1: '',
              line2: '',
              city: '',
              state: '',
              pincode: '',
            });
            setShowForm(!showForm);
          }}
          className="flex items-center space-x-1.5 rounded-xl bg-amber-950 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-amber-100 shadow hover:bg-amber-900"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Address</span>
        </button>
      </div>

      {/* Address Form */}
      {showForm && (
        <form
          onSubmit={handleSave}
          className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-md sm:p-8"
        >
          <h3 className="border-b border-stone-100 pb-3 font-serif text-lg font-bold text-stone-900">
            {editingAddress ? 'Edit Address' : 'Add New Delivery Address'}
          </h3>

          <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-semibold text-stone-700">
                Address Label
              </label>
              <select
                value={formData.label}
                onChange={(e) =>
                  setFormData({ ...formData, label: e.target.value })
                }
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="Home">Home</option>
                <option value="Office">Office</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block font-semibold text-stone-700">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold text-stone-700">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold text-stone-700">
                Address Line 1 *
              </label>
              <input
                type="text"
                required
                value={formData.line1}
                onChange={(e) =>
                  setFormData({ ...formData, line1: e.target.value })
                }
                className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold text-stone-700">
                Address Line 2 (Optional)
              </label>
              <input
                type="text"
                value={formData.line2}
                onChange={(e) =>
                  setFormData({ ...formData, line2: e.target.value })
                }
                className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold text-stone-700">
                City *
              </label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold text-stone-700">
                State *
              </label>
              <input
                type="text"
                required
                value={formData.state}
                onChange={(e) =>
                  setFormData({ ...formData, state: e.target.value })
                }
                className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold text-stone-700">
                Pincode *
              </label>
              <input
                type="text"
                required
                value={formData.pincode}
                onChange={(e) =>
                  setFormData({ ...formData, pincode: e.target.value })
                }
                className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 border-t border-stone-100 pt-4">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-500 hover:text-stone-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 rounded-lg bg-amber-950 px-5 py-2 text-xs font-bold uppercase text-amber-100 hover:bg-amber-900 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Save Address</span>
            </button>
          </div>
        </form>
      )}

      {/* Address Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-stone-400">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          <span className="text-xs font-semibold">
            Loading your addresses...
          </span>
        </div>
      ) : addresses.length === 0 ? (
        <div className="py-16 text-center">
          <MapPin className="mx-auto mb-3 h-10 w-10 text-stone-300" />
          <p className="text-sm font-semibold text-stone-500">
            No saved addresses yet.
          </p>
          <p className="mt-1 text-xs text-stone-400">
            Click "Add New Address" to save your first delivery location.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`relative flex flex-col justify-between space-y-4 rounded-2xl border bg-white p-6 shadow-sm ${
                addr.is_default
                  ? 'border-amber-900 bg-amber-950/5 ring-1 ring-amber-900'
                  : 'border-stone-200'
              }`}
            >
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="rounded bg-stone-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-800">
                    {addr.label}
                  </span>
                  {addr.is_default && (
                    <span className="flex items-center space-x-1 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-950">
                      <Check className="h-3 w-3" />
                      <span>Default Address</span>
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-stone-900">
                  {addr.full_name}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-stone-600">
                  {addr.line1}, {addr.line2 ? `${addr.line2}, ` : ''}
                  {addr.city}, {addr.state} - {addr.pincode}
                </p>
                <p className="mt-2 font-mono text-[11px] text-stone-400">
                  Phone: {addr.phone}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-stone-100 pt-4 text-xs">
                {!addr.is_default && (
                  <button
                    onClick={() => handleSetDefault(addr.id)}
                    className="font-semibold text-amber-900 hover:underline"
                  >
                    Set as Default
                  </button>
                )}

                <div className="ml-auto flex items-center space-x-3">
                  <button
                    onClick={() => handleOpenEdit(addr)}
                    className="rounded p-1.5 text-stone-500 transition-colors hover:bg-stone-100 hover:text-amber-900"
                    title="Edit Address"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(addr.id)}
                    className="rounded p-1.5 text-stone-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
                    title="Delete Address"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
