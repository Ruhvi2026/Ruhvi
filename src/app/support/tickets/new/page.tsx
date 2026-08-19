'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Sparkles,
  Send,
  User,
  ShoppingBag,
  Tag,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Category {
  id: string;
  name: string;
  slug: string;
  subcategories?: { id: string; name: string; slug: string }[];
}

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  active_tickets_count: number;
}

export default function NewSupportTicketPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'normal',
    category_slug: '',
    subcategory_slug: '',
    customer_email: '',
    order_id: '',
    assigned_to: '',
    auto_assign: true,
  });

  useEffect(() => {
    async function loadMeta() {
      try {
        const [catRes, teamRes] = await Promise.all([
          fetch('/api/support/categories'),
          fetch('/api/support/team'),
        ]);
        if (catRes.ok) {
          const cData = await catRes.json();
          setCategories(cData.categories || []);
        }
        if (teamRes.ok) {
          const tData = await teamRes.json();
          setTeamMembers(tData.team || []);
        }
      } catch (err) {
        console.error('Failed to load categories/team:', err);
      }
    }
    loadMeta();
  }, []);

  const selectedCategory = categories.find(
    (c) => c.slug === formData.category_slug
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Title and description are required');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create ticket');
      }

      toast.success('Ticket created successfully!');
      router.push(`/support/tickets/${data.ticket.id}`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/support/tickets"
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Create New Support Ticket
          </h1>
          <p className="mt-0.5 text-xs text-slate-400">
            Submit a manual customer ticket or log an inquiry from phone/email
          </p>
        </div>
      </div>

      {/* Main Form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-white/5 bg-[#131726] p-6 shadow-xl"
      >
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-200">
            Subject / Ticket Title <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            placeholder="e.g. Ring size exchange request or Hallmark verification question"
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-200">
              Category
            </label>
            <select
              value={formData.category_slug}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  category_slug: e.target.value,
                  subcategory_slug: '',
                })
              }
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="" className="bg-[#131726]">
                Select category...
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug} className="bg-[#131726]">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {selectedCategory?.subcategories &&
            selectedCategory.subcategories.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-200">
                  Subcategory
                </label>
                <select
                  value={formData.subcategory_slug}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      subcategory_slug: e.target.value,
                    })
                  }
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="" className="bg-[#131726]">
                    Select subcategory...
                  </option>
                  {selectedCategory.subcategories.map((sub) => (
                    <option
                      key={sub.id}
                      value={sub.slug}
                      className="bg-[#131726]"
                    >
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
        </div>

        {/* Priority & Customer Email */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-200">
              Priority Tier
            </label>
            <select
              value={formData.priority}
              onChange={(e) =>
                setFormData({ ...formData, priority: e.target.value })
              }
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="low" className="bg-[#131726]">
                Low
              </option>
              <option value="normal" className="bg-[#131726]">
                Normal (Standard)
              </option>
              <option value="high" className="bg-[#131726]">
                High
              </option>
              <option value="urgent" className="bg-[#131726]">
                Urgent (Immediate Escalation)
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200">
              Customer Email (Optional)
            </label>
            <input
              type="email"
              value={formData.customer_email}
              onChange={(e) =>
                setFormData({ ...formData, customer_email: e.target.value })
              }
              placeholder="customer@example.com"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Assignment & Auto-Distribution */}
        <div className="space-y-3 rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-white">
              Agent Assignment
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-emerald-400">
              <input
                type="checkbox"
                checked={formData.auto_assign}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    auto_assign: e.target.checked,
                    assigned_to: e.target.checked ? '' : formData.assigned_to,
                  })
                }
                className="rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-0"
              />
              <span className="flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                Auto-assign to lowest workload staff
              </span>
            </label>
          </div>

          {!formData.auto_assign && (
            <select
              value={formData.assigned_to}
              onChange={(e) =>
                setFormData({ ...formData, assigned_to: e.target.value })
              }
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="" className="bg-[#131726]">
                Leave Unassigned (Pending Dispatch)
              </option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id} className="bg-[#131726]">
                  {m.full_name} ({m.active_tickets_count} active tickets)
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Description / First Message */}
        <div>
          <label className="block text-xs font-semibold text-slate-200">
            Initial Message & Issue Description{' '}
            <span className="text-rose-400">*</span>
          </label>
          <textarea
            required
            rows={6}
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Detailed description of customer inquiry or phone call notes..."
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-slate-200 placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4">
          <Link
            href="/support/tickets"
            className="rounded-xl px-4 py-2.5 text-xs font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-900/30 transition hover:bg-emerald-500 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            <span>
              {loading ? 'Creating Ticket...' : 'Create Support Ticket'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
