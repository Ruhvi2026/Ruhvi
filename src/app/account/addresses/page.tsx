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
  Home,
  Briefcase,
  Building2,
  Tag,
  AlertTriangle,
} from 'lucide-react';
import { Address } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import {
  AddressTagSelector,
  MAX_ADDRESSES,
} from '@/components/AddressTagSelector';

const EMPTY_FORM = {
  label: 'Home',
  full_name: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
};

const normalizePhone = (phone: string) => phone.replace(/\D/g, '').slice(-10);
const isValidPhone = (phone: string) =>
  /^[6-9]\d{9}$/.test(normalizePhone(phone));
const isValidPincode = (pincode: string) => /^\d{6}$/.test(pincode.trim());

function TagBadge({ tag }: { tag?: string }) {
  const label = tag?.trim() || 'Home';
  const icon = (() => {
    switch (label) {
      case 'Home':
        return <Home className="h-3 w-3" />;
      case 'Office':
        return <Briefcase className="h-3 w-3" />;
      case 'Other':
        return <Building2 className="h-3 w-3" />;
      default:
        return <Tag className="h-3 w-3" />;
    }
  })();

  return (
    <span className="inline-flex items-center space-x-1 rounded-md bg-amber-950/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-950">
      {icon}
      <span>{label}</span>
    </span>
  );
}

export default function AddressBookPage() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Address | null>(null);

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
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });

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

  const [formData, setFormData] = useState(EMPTY_FORM);

  const atLimit = addresses.length >= MAX_ADDRESSES;

  const openAddForm = () => {
    if (atLimit) {
      toast.error(
        `You've reached the maximum of ${MAX_ADDRESSES} addresses. Delete one to add a new address.`
      );
      return;
    }
    setEditingAddress(null);
    setFormData(EMPTY_FORM);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSetDefault = async (id: string) => {
    if (!user || saving) return;
    setSaving(true);
    try {
      const supabase = createClient();
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
    setSaving(true);
    try {
      const supabase = createClient();
      const target = addresses.find((a) => a.id === id);
      const { error } = await supabase
        .from('addresses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;

      let remaining = addresses.filter((a) => a.id !== id);

      // Auto-promote the next address when the default one is deleted
      if (target?.is_default && remaining.length > 0) {
        const nextDefault = remaining[0];
        const { error: promError } = await supabase
          .from('addresses')
          .update({ is_default: true })
          .eq('id', nextDefault.id)
          .eq('user_id', user.id);
        if (!promError) {
          remaining = remaining.map((a) => ({
            ...a,
            is_default: a.id === nextDefault.id,
          }));
        }
      }

      setAddresses(remaining);
      setDeleteTarget(null);
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
      label: addr.label || 'Home',
      full_name: addr.full_name,
      phone: addr.phone,
      line1: addr.line1,
      line2: addr.line2 || '',
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || saving) return;

    const label = formData.label.trim() || 'Home';

    if (!formData.full_name.trim()) {
      toast.error('Please enter the recipient name.');
      return;
    }
    if (!isValidPhone(formData.phone)) {
      toast.error('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!formData.line1.trim()) {
      toast.error('Please enter the street address.');
      return;
    }
    if (!formData.city.trim()) {
      toast.error('Please enter the city.');
      return;
    }
    if (!formData.state.trim()) {
      toast.error('Please enter the state.');
      return;
    }
    if (!isValidPincode(formData.pincode)) {
      toast.error('Please enter a valid 6-digit pincode.');
      return;
    }

    if (!editingAddress && addresses.length >= MAX_ADDRESSES) {
      toast.error(
        `You can save up to ${MAX_ADDRESSES} addresses. Please delete one before adding a new address.`
      );
      return;
    }

    const payload = {
      ...formData,
      label,
      phone: normalizePhone(formData.phone),
    };

    setSaving(true);
    try {
      const supabase = createClient();

      if (editingAddress) {
        const { data, error } = await supabase
          .from('addresses')
          .update(payload)
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
        const { data, error } = await supabase
          .from('addresses')
          .insert({
            user_id: user.id,
            ...payload,
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
      toast.error(
        err?.message?.includes('up to 10')
          ? `You can save up to ${MAX_ADDRESSES} addresses. Please delete one before adding a new address.`
          : err?.message || 'Failed to save address.'
      );
      return;
    } finally {
      setSaving(false);
    }

    setShowForm(false);
    setEditingAddress(null);
    setFormData(EMPTY_FORM);
  };

  const usagePercent = Math.min(100, (addresses.length / MAX_ADDRESSES) * 100);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-6">
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

        <div className="flex items-center gap-4">
          {/* Usage counter */}
          <div
            className="flex items-center gap-2"
            title={`${addresses.length} of ${MAX_ADDRESSES} addresses used`}
          >
            <div className="w-32">
              <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-stone-400">
                <span>
                  {addresses.length}/{MAX_ADDRESSES} used
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
                <div
                  className="h-full rounded-full bg-amber-900 transition-all"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>
          </div>

          <button
            onClick={openAddForm}
            disabled={atLimit}
            className={`flex items-center space-x-1.5 rounded-xl bg-amber-950 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-amber-100 shadow transition-colors ${
              atLimit ? 'cursor-not-allowed opacity-50' : 'hover:bg-amber-900'
            }`}
          >
            <Plus className="h-4 w-4" />
            <span>{atLimit ? 'Address Limit Reached' : 'Add New Address'}</span>
          </button>
        </div>
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
            <div className="sm:col-span-2">
              <label
                htmlFor="address-label"
                className="mb-1 block font-semibold text-stone-700"
              >
                Address Tag *
              </label>
              <p className="mb-2 text-[11px] text-stone-500">
                Give this address a name you&rsquo;ll recognise at a glance,
                like &ldquo;Home&rdquo;, &ldquo;Office&rdquo; or &ldquo;My
                Parents&rsquo; House&rdquo;.
              </p>
              <AddressTagSelector
                value={formData.label}
                onChange={(label) => setFormData({ ...formData, label })}
              />
            </div>

            <div>
              <label
                htmlFor="address-full-name"
                className="mb-1 block font-semibold text-stone-700"
              >
                Full Name *
              </label>
              <input
                id="address-full-name"
                type="text"
                autoComplete="name"
                required
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label
                htmlFor="address-phone"
                className="mb-1 block font-semibold text-stone-700"
              >
                Phone Number *
              </label>
              <input
                id="address-phone"
                type="tel"
                autoComplete="tel"
                required
                maxLength={10}
                inputMode="numeric"
                placeholder="10-digit mobile number"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    phone: e.target.value.replace(/\D/g, '').slice(0, 10),
                  })
                }
                className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="address-line1"
                className="mb-1 block font-semibold text-stone-700"
              >
                Address Line 1 *
              </label>
              <input
                id="address-line1"
                type="text"
                autoComplete="address-line1"
                required
                placeholder="House number, building, street"
                value={formData.line1}
                onChange={(e) =>
                  setFormData({ ...formData, line1: e.target.value })
                }
                className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="address-line2"
                className="mb-1 block font-semibold text-stone-700"
              >
                Address Line 2 (Optional)
              </label>
              <input
                id="address-line2"
                type="text"
                autoComplete="address-line2"
                placeholder="Apartment, area, landmark"
                value={formData.line2}
                onChange={(e) =>
                  setFormData({ ...formData, line2: e.target.value })
                }
                className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label
                htmlFor="address-city"
                className="mb-1 block font-semibold text-stone-700"
              >
                City *
              </label>
              <input
                id="address-city"
                type="text"
                autoComplete="address-level2"
                required
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label
                htmlFor="address-state"
                className="mb-1 block font-semibold text-stone-700"
              >
                State *
              </label>
              <input
                id="address-state"
                type="text"
                autoComplete="address-level1"
                required
                value={formData.state}
                onChange={(e) =>
                  setFormData({ ...formData, state: e.target.value })
                }
                className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label
                htmlFor="address-pincode"
                className="mb-1 block font-semibold text-stone-700"
              >
                Pincode *
              </label>
              <input
                id="address-pincode"
                type="text"
                autoComplete="postal-code"
                required
                inputMode="numeric"
                maxLength={6}
                placeholder="6-digit pincode"
                value={formData.pincode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    pincode: e.target.value.replace(/\D/g, '').slice(0, 6),
                  })
                }
                className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 border-t border-stone-100 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingAddress(null);
              }}
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
              <span>{editingAddress ? 'Save Changes' : 'Save Address'}</span>
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
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white py-16 text-center">
          <MapPin className="mx-auto mb-3 h-10 w-10 text-stone-300" />
          <p className="text-sm font-semibold text-stone-600">
            No saved addresses yet.
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-stone-400">
            Save your delivery locations so checkout is just a tap away. You can
            save up to {MAX_ADDRESSES} addresses.
          </p>
          <button
            onClick={openAddForm}
            className="mx-auto mt-5 flex items-center space-x-1.5 rounded-xl bg-amber-950 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-amber-100 shadow hover:bg-amber-900"
          >
            <Plus className="h-4 w-4" />
            <span>Add Your First Address</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`ph-no-capture relative flex flex-col justify-between space-y-4 rounded-2xl border bg-white p-6 shadow-sm ${
                addr.is_default
                  ? 'border-amber-900 bg-amber-950/5 ring-1 ring-amber-900'
                  : 'border-stone-200'
              }`}
            >
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <TagBadge tag={addr.label} />
                  {addr.is_default && (
                    <span className="flex items-center space-x-1 rounded bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase text-amber-950">
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
                    onClick={() => setDeleteTarget(addr)}
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

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-address-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start space-x-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3
                  id="delete-address-title"
                  className="text-sm font-bold text-stone-900"
                >
                  Delete this address?
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-stone-500">
                  You&rsquo;re about to remove{' '}
                  <span className="font-semibold text-stone-700">
                    {deleteTarget.label || 'Home'}
                  </span>{' '}
                  — {deleteTarget.line1}, {deleteTarget.city}. This action
                  can&rsquo;t be undone.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end space-x-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={saving}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-stone-500 hover:bg-stone-100 hover:text-stone-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteTarget.id)}
                disabled={saving}
                className="flex items-center space-x-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold uppercase text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Delete Address</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
