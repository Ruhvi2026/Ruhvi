'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Bell,
  Send,
  Image as ImageIcon,
  Link as LinkIcon,
  History,
  AlertCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface Campaign {
  id: string;
  title: string;
  message: string;
  audience: string;
  status: string;
  created_at: string;
}

export default function NotificationsAdminPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [url, setUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [audience, setAudience] = useState('Subscribed Users');
  const [isSending, setIsSending] = useState(false);
  const [history, setHistory] = useState<Campaign[]>([]);
  const supabase = createClient();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from('push_campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (data && !error) {
      setHistory(data);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) {
      toast.error('Title and message are required.');
      return;
    }

    const confirmSend = window.confirm(
      `Are you sure you want to broadcast this message to "${audience}"?`
    );
    if (!confirmSend) return;

    setIsSending(true);
    const loadingToast = toast.loading('Broadcasting notification...');

    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, url, imageUrl, audience }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to send');

      toast.success('Broadcast sent successfully!', { id: loadingToast });
      setTitle('');
      setMessage('');
      setUrl('');
      setImageUrl('');
      fetchHistory(); // Refresh history table
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong', {
        id: loadingToast,
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Push Notifications
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Broadcast marketing messages and flash sales directly to your
            customers' devices.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Compose Form */}
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/50 p-4">
              <h2 className="flex items-center font-semibold text-slate-800">
                <Send className="text-primary-500 mr-2 h-4 w-4" />
                Compose Broadcast
              </h2>
            </div>

            <form onSubmit={handleSend} className="space-y-5 p-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Notification Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Flash Sale is LIVE! ⚡"
                    className="focus:ring-primary-500/20 focus:border-primary-500 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 transition-colors focus:outline-none focus:ring-2"
                    maxLength={50}
                    required
                  />
                  <p className="mt-1 text-right text-xs text-slate-400">
                    {title.length}/50
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Target Audience *
                  </label>
                  <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    className="focus:ring-primary-500/20 focus:border-primary-500 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 transition-colors focus:outline-none focus:ring-2"
                  >
                    <option value="Subscribed Users">
                      All Active Subscribers
                    </option>
                    <option value="Active Users">Highly Active Users</option>
                    <option value="Inactive Users">
                      Inactive Users (Re-engagement)
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Message Body *
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g. Get 50% off all Kundan jewelry for the next 4 hours only!"
                  className="focus:ring-primary-500/20 focus:border-primary-500 min-h-[100px] w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 transition-colors focus:outline-none focus:ring-2"
                  maxLength={150}
                  required
                />
                <p className="mt-1 text-right text-xs text-slate-400">
                  {message.length}/150
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-1 block flex items-center text-sm font-medium text-slate-700">
                    <LinkIcon className="mr-1 h-3 w-3 text-slate-400" />
                    Target URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://ruhvi.in/sale"
                    className="focus:ring-primary-500/20 focus:border-primary-500 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm transition-colors focus:outline-none focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block flex items-center text-sm font-medium text-slate-700">
                    <ImageIcon className="mr-1 h-3 w-3 text-slate-400" />
                    Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="focus:ring-primary-500/20 focus:border-primary-500 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm transition-colors focus:outline-none focus:ring-2"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <div className="flex items-center rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 text-slate-500">
                  <AlertCircle className="mr-2 h-4 w-4 text-amber-500" />
                  This will instantly reach the selected audience ({audience}).
                </div>
                <button
                  type="submit"
                  disabled={isSending || !title || !message}
                  className="bg-primary-600 hover:bg-primary-700 shadow-primary-600/20 flex items-center rounded-lg px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSending ? 'Sending...' : 'Send Broadcast'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Live Preview */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-800/50 px-4 py-3">
              <span className="text-xs font-medium text-slate-400">
                Desktop Preview
              </span>
              <div className="flex space-x-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-slate-700"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-slate-700"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-slate-700"></div>
              </div>
            </div>
            <div className="flex min-h-[300px] items-end justify-end bg-slate-900 p-6">
              {/* Fake OS Notification */}
              <div className="w-full max-w-[320px] translate-y-0 transform overflow-hidden rounded-lg bg-white opacity-100 shadow-2xl transition-all duration-300">
                <div className="flex items-start p-4">
                  <div className="bg-primary-50 border-primary-100 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border">
                    <Bell className="text-primary-600 h-5 w-5" />
                  </div>
                  <div className="ml-3 flex-1 overflow-hidden">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {title || 'Notification Title'}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                      {message ||
                        'Your message will appear here. It should be catchy and create urgency!'}
                    </p>
                    <p className="mt-2 text-[10px] text-slate-400">ruhvi.in</p>
                  </div>
                </div>
                {imageUrl && (
                  <div className="relative h-32 w-full border-t border-slate-100 bg-slate-100">
                    <Image
                      src={imageUrl}
                      alt="Notification image preview"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/50 p-4">
          <h2 className="flex items-center font-semibold text-slate-800">
            <History className="mr-2 h-4 w-4 text-slate-500" />
            Campaign History
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/50 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Campaign</th>
                <th className="px-6 py-4 font-medium">Message</th>
                <th className="px-6 py-4 font-medium">Audience</th>
                <th className="px-6 py-4 text-right font-medium">Sent Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-slate-500"
                  >
                    No campaigns sent yet.
                  </td>
                </tr>
              ) : (
                history.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">
                        {campaign.title}
                      </p>
                      <span className="mt-1 inline-flex items-center rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="line-clamp-1 max-w-xs text-slate-600">
                        {campaign.message}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {campaign.audience}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-slate-500">
                      {new Date(campaign.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
