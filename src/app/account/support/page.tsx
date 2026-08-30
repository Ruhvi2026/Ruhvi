'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  Ticket,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  MessageSquare,
  Plus,
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-emerald-100 text-emerald-700',
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  waiting_for_customer: 'bg-purple-100 text-purple-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  open: 'Open',
  in_progress: 'In Progress',
  waiting_for_customer: 'Needs Your Response',
  resolved: 'Resolved',
  closed: 'Closed',
};

export default function CustomerSupportPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchTickets();
  }, [user]);

  async function fetchTickets() {
    try {
      const res = await fetch('/api/support/tickets?limit=50');
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleCreateTicket() {
    window.dispatchEvent(
      new CustomEvent('ruhvi:open-support-chat', {
        detail: { intent: 'create_ticket' },
      })
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <MessageSquare className="mx-auto mb-4 h-12 w-12 text-gold-400 opacity-60" />
        <h2 className="text-xl font-bold text-charcoal-900">
          Sign in to View Support
        </h2>
        <p className="mt-2 text-sm text-charcoal-500">
          Please sign in to view your support tickets and get help.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <Link
            href="/login"
            className="inline-block rounded-lg bg-charcoal-900 px-6 py-2.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-charcoal-800"
          >
            Sign In
          </Link>
          <Link
            href="/support-status"
            className="inline-block rounded-lg border border-gold-300 px-6 py-2.5 text-sm font-semibold text-gold-700 transition-colors hover:bg-gold-50"
          >
            Track a Ticket Without Signing In
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-900">Support</h1>
          <p className="mt-1 text-sm text-charcoal-500">
            Track your support requests and get help
          </p>
        </div>
        <button
          onClick={handleCreateTicket}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-charcoal-900 px-4 py-2.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-charcoal-800"
        >
          <Plus className="h-4 w-4" />
          Create Ticket
        </button>
      </div>

      {/* Waiting for Customer - highlight */}
      {tickets.filter((t) => t.status === 'waiting_for_customer').length >
        0 && (
        <div className="mb-6 rounded-xl border border-purple-200 bg-purple-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-purple-700">
            <AlertCircle className="h-4 w-4" />
            Action Required
          </div>
          <p className="mt-1 text-xs text-purple-600">
            You have tickets that need your response. Please check them below.
          </p>
        </div>
      )}

      {tickets.length === 0 ? (
        <div className="rounded-xl border border-charcoal-100 bg-white py-16 text-center">
          <Ticket className="mx-auto mb-4 h-12 w-12 text-charcoal-300" />
          <h2 className="text-lg font-semibold text-charcoal-700">
            No Support Tickets
          </h2>
          <p className="mt-2 text-sm text-charcoal-400">
            Need help? Start a conversation with our support assistant.
          </p>
          <button
            onClick={handleCreateTicket}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-charcoal-900 px-5 py-2.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-charcoal-800"
          >
            <Plus className="h-4 w-4" />
            Create Ticket
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/account/support/${ticket.id}`}
              className="block rounded-xl border border-charcoal-100 bg-white p-4 shadow-sm transition-all hover:border-gold-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-charcoal-400">
                      {ticket.ticket_number}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        STATUS_COLORS[ticket.status] || STATUS_COLORS.open
                      }`}
                    >
                      {STATUS_LABELS[ticket.status] || ticket.status}
                    </span>
                  </div>
                  <h2 className="mt-1.5 text-sm font-semibold text-charcoal-800">
                    {ticket.title}
                  </h2>
                  <div className="mt-1 flex items-center gap-3 text-xs text-charcoal-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(ticket.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    {ticket.category && <span>{ticket.category.name}</span>}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 flex-shrink-0 text-charcoal-300" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
