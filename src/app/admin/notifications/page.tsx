'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Send, Image as ImageIcon, Link as LinkIcon, History, AlertCircle } from 'lucide-react';
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

    const confirmSend = window.confirm('Are you sure you want to broadcast this message to ALL subscribers?');
    if (!confirmSend) return;

    setIsSending(true);
    const loadingToast = toast.loading('Broadcasting notification...');

    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, url, imageUrl }),
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
      toast.error(error.message || 'Something went wrong', { id: loadingToast });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Push Notifications</h1>
          <p className="text-sm text-slate-500 mt-1">
            Broadcast marketing messages and flash sales directly to your customers' devices.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose Form */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/50 p-4">
              <h2 className="font-semibold text-slate-800 flex items-center">
                <Send className="w-4 h-4 mr-2 text-primary-500" />
                Compose Broadcast
              </h2>
            </div>
            
            <form onSubmit={handleSend} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Notification Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Flash Sale is LIVE! ⚡"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                  maxLength={50}
                  required
                />
                <p className="text-xs text-slate-400 mt-1 text-right">{title.length}/50</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Message Body *
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g. Get 50% off all Kundan jewelry for the next 4 hours only!"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors min-h-[100px]"
                  maxLength={150}
                  required
                />
                <p className="text-xs text-slate-400 mt-1 text-right">{message.length}/150</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
                    <LinkIcon className="w-3 h-3 mr-1 text-slate-400" />
                    Target URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://ruhvi.in/sale"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
                    <ImageIcon className="w-3 h-3 mr-1 text-slate-400" />
                    Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors text-sm"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center text-xs text-slate-500 bg-amber-50 text-amber-700 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4 mr-2 text-amber-500" />
                  This will instantly reach all active subscribers.
                </div>
                <button
                  type="submit"
                  disabled={isSending || !title || !message}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-sm shadow-primary-600/20"
                >
                  {isSending ? 'Sending...' : 'Send Broadcast'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Live Preview */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-800 sticky top-6">
            <div className="bg-slate-800/50 px-4 py-3 flex items-center justify-between border-b border-slate-800">
              <span className="text-xs font-medium text-slate-400">Desktop Preview</span>
              <div className="flex space-x-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
              </div>
            </div>
            <div className="p-6 bg-slate-900 min-h-[300px] flex items-end justify-end">
              
              {/* Fake OS Notification */}
              <div className="bg-white rounded-lg shadow-2xl w-full max-w-[320px] overflow-hidden transform transition-all duration-300 translate-y-0 opacity-100">
                <div className="flex items-start p-4">
                  <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0 border border-primary-100">
                    <Bell className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="ml-3 flex-1 overflow-hidden">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {title || 'Notification Title'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                      {message || 'Your message will appear here. It should be catchy and create urgency!'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-2">ruhvi.in</p>
                  </div>
                </div>
                {imageUrl && (
                  <div className="w-full h-32 bg-slate-100 border-t border-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mt-8">
        <div className="border-b border-slate-100 bg-slate-50/50 p-4">
          <h2 className="font-semibold text-slate-800 flex items-center">
            <History className="w-4 h-4 mr-2 text-slate-500" />
            Campaign History
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Campaign</th>
                <th className="px-6 py-4 font-medium">Message</th>
                <th className="px-6 py-4 font-medium">Audience</th>
                <th className="px-6 py-4 font-medium text-right">Sent Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    No campaigns sent yet.
                  </td>
                </tr>
              ) : (
                history.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{campaign.title}</p>
                      <span className="inline-flex mt-1 items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-600 line-clamp-1 max-w-xs">{campaign.message}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{campaign.audience}</td>
                    <td className="px-6 py-4 text-right text-slate-500 whitespace-nowrap">
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
