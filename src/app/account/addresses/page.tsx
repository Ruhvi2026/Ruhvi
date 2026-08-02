'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, Plus, Trash2, Edit2, Check, ArrowLeft } from 'lucide-react';
import { Address } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';

export default function AddressBookPage() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  useEffect(() => {
    if (user) {
      const fetchAddresses = async () => {
        setLoading(true);
        try {
          const supabase = createClient();
          const { data, error } = await supabase
            .from('addresses')
            .select('*')
            .eq('user_id', user.id)
            .order('is_default', { ascending: false });

          if (!error && data) {
            setAddresses(data as Address[]);
          }
        } catch (err) {
          console.error('Error fetching addresses:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchAddresses();
    } else {
      setAddresses([]);
      setLoading(false);
    }
  }, [user]);

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

  const handleSetDefault = (id: string) => {
    setAddresses((prev) =>
      prev.map((a) => ({
        ...a,
        is_default: a.id === id,
      }))
    );
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this address?')) {
      setAddresses((prev) => prev.filter((a) => a.id !== id));
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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAddress) {
      setAddresses((prev) =>
        prev.map((a) => (a.id === editingAddress.id ? { ...a, ...formData } : a))
      );
    } else {
      const created: Address = {
        id: `addr-${Date.now()}`,
        user_id: 'demo-user',
        ...formData,
        is_default: addresses.length === 0,
      };
      setAddresses((prev) => [...prev, created]);
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-6">
        <div className="flex items-center space-x-3">
          <Link
            href="/account"
            className="p-2 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-serif text-3xl font-bold text-stone-900 flex items-center space-x-3">
              <MapPin className="w-7 h-7 text-amber-900" />
              <span>Saved Addresses</span>
            </h1>
            <p className="text-stone-500 text-xs mt-1">Manage delivery locations for fast checkout</p>
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
          className="px-4 py-2.5 bg-amber-950 hover:bg-amber-900 text-amber-100 font-bold text-xs uppercase tracking-wider rounded-xl shadow flex items-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Address</span>
        </button>
      </div>

      {/* Address Form */}
      {showForm && (
        <form onSubmit={handleSave} className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 shadow-md space-y-4">
          <h3 className="font-serif text-lg font-bold text-stone-900 border-b border-stone-100 pb-3">
            {editingAddress ? 'Edit Address' : 'Add New Delivery Address'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-stone-700 font-semibold mb-1">Address Label</label>
              <select
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
              >
                <option value="Home">Home</option>
                <option value="Office">Office</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">Phone Number *</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">Address Line 1 *</label>
              <input
                type="text"
                required
                value={formData.line1}
                onChange={(e) => setFormData({ ...formData, line1: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">Address Line 2 (Optional)</label>
              <input
                type="text"
                value={formData.line2}
                onChange={(e) => setFormData({ ...formData, line2: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">City *</label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">State *</label>
              <input
                type="text"
                required
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">Pincode *</label>
              <input
                type="text"
                required
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-stone-500 hover:text-stone-800 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-950 text-amber-100 text-xs font-bold uppercase rounded-lg hover:bg-amber-900"
            >
              Save Address
            </button>
          </div>
        </form>
      )}

      {/* Address Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {addresses.map((addr) => (
          <div
            key={addr.id}
            className={`bg-white p-6 rounded-2xl border shadow-sm space-y-4 relative flex flex-col justify-between ${
              addr.is_default ? 'border-amber-900 ring-1 ring-amber-900 bg-amber-950/5' : 'border-stone-200'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 bg-stone-200 rounded text-stone-800">
                  {addr.label}
                </span>
                {addr.is_default && (
                  <span className="text-[10px] uppercase font-bold text-amber-950 bg-amber-100 px-2 py-0.5 rounded flex items-center space-x-1">
                    <Check className="w-3 h-3" />
                    <span>Default Address</span>
                  </span>
                )}
              </div>

              <h3 className="font-bold text-sm text-stone-900">{addr.full_name}</h3>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                {addr.line1}, {addr.line2 ? `${addr.line2}, ` : ''}
                {addr.city}, {addr.state} - {addr.pincode}
              </p>
              <p className="text-[11px] font-mono text-stone-400 mt-2">Phone: {addr.phone}</p>
            </div>

            <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-xs">
              {!addr.is_default && (
                <button
                  onClick={() => handleSetDefault(addr.id)}
                  className="text-amber-900 hover:underline font-semibold"
                >
                  Set as Default
                </button>
              )}

              <div className="flex items-center space-x-3 ml-auto">
                <button
                  onClick={() => handleOpenEdit(addr)}
                  className="p-1.5 text-stone-500 hover:text-amber-900 rounded hover:bg-stone-100 transition-colors"
                  title="Edit Address"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(addr.id)}
                  className="p-1.5 text-stone-500 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                  title="Delete Address"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
