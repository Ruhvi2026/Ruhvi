'use client';

import React, { useState } from 'react';
import {
  Bell,
  Send,
  Loader2,
  AlertTriangle,
  Image as ImageIcon,
  Link as LinkIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function PushNotificationsPage() {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    url: '',
    imageUrl: '',
    audience: 'All Users',
  });
  const [sending, setSending] = useState(false);

  const handleSendPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.message) {
      toast.error('Title and message are required.');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          message: formData.message,
          url: formData.url,
          imageUrl: formData.imageUrl,
          audience: formData.audience,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Push notification sent successfully!');
        setFormData({
          title: '',
          message: '',
          url: '',
          imageUrl: '',
          audience: 'All Users',
        });
      } else {
        toast.error(data.error || 'Failed to send notification');
      }
    } catch (e) {
      toast.error('Network error while sending notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Push Notifications</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Send Firebase Cloud Messaging (FCM) notifications to your users.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/5 bg-[#131726]">
        <div className="flex gap-3 border-b border-white/5 bg-white/[0.02] p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
          <p className="text-xs leading-relaxed text-slate-300">
            Push notifications are sent immediately to all users in the selected
            audience who have granted notification permissions.
          </p>
        </div>

        <form onSubmit={handleSendPush} className="space-y-5 p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  Target Audience
                </label>
                <select
                  value={formData.audience}
                  onChange={(e) =>
                    setFormData({ ...formData, audience: e.target.value })
                  }
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white focus:border-fuchsia-500 focus:outline-none"
                >
                  <option value="All Users">All Users</option>
                  <option value="Active Buyers">
                    Active Buyers (Ordered in last 30 days)
                  </option>
                  <option value="Abandoned Carts">
                    Abandoned Carts (Unchecked items)
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  Notification Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flash Sale is Live!"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white focus:border-fuchsia-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  Message Body *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="e.g. Get 20% off all Kundan sets today only."
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white focus:border-fuchsia-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-slate-400">
                  <LinkIcon className="h-3.5 w-3.5" /> Tap Action URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://ruhvi.in/category/kundan"
                  value={formData.url}
                  onChange={(e) =>
                    setFormData({ ...formData, url: e.target.value })
                  }
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white focus:border-fuchsia-500 focus:outline-none"
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  Where the user is taken when they tap the notification.
                </p>
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-slate-400">
                  <ImageIcon className="h-3.5 w-3.5" /> Rich Image URL
                  (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://ruhvi.in/promo-banner.jpg"
                  value={formData.imageUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, imageUrl: e.target.value })
                  }
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white focus:border-fuchsia-500 focus:outline-none"
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  A large image to display in the notification (iOS 10+ and
                  Android).
                </p>
              </div>

              {formData.imageUrl && (
                <div className="mt-4 overflow-hidden rounded-lg border border-white/10 bg-black/50 p-2">
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-slate-500">
                    Image Preview
                  </p>
                  <img
                    src={formData.imageUrl}
                    alt="Preview"
                    className="h-32 w-full rounded-md bg-white/5 object-cover"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end border-t border-white/5 pt-5">
            <button
              type="submit"
              disabled={sending || !formData.title || !formData.message}
              className="flex items-center gap-2 rounded-lg bg-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-fuchsia-700 disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Broadcast Notification
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
