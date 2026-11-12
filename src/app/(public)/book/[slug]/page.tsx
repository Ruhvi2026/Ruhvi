'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  Globe,
} from 'lucide-react';

export default function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [slug, setSlug] = useState<string>('');
  const [pageData, setPageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Booking Flow State
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0] // default tomorrow
  );
  const [selectedSlot, setSelectedSlot] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestNotes, setGuestNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);

  useEffect(() => {
    params.then((p) => {
      setSlug(p.slug);
      fetchPage(p.slug, selectedDate);
    });
  }, [params]);

  const fetchPage = async (pageSlug: string, dateStr: string) => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/mailbox/booking/${pageSlug}?date=${dateStr}`
      );
      const json = await res.json();
      if (json.success) {
        setPageData(json);
      } else {
        setError(json.error || 'Booking page not found');
      }
    } catch {
      setError('Network error loading booking schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (dateStr: string) => {
    setSelectedDate(dateStr);
    setSelectedSlot(null);
    if (slug) fetchPage(slug, dateStr);
  };

  // Generate slots
  const generateSlots = () => {
    if (!pageData?.page) return [];
    const { available_start, available_end, duration_minutes, buffer_minutes } =
      pageData.page;
    const [startH, startM] = available_start.split(':').map(Number);
    const [endH, endM] = available_end.split(':').map(Number);

    const baseDate = new Date(`${selectedDate}T00:00:00`);
    const slots: Array<{
      start: number;
      end: number;
      label: string;
      isBooked: boolean;
    }> = [];

    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    const bookedSlots: Array<{ start_time: number; end_time: number }> =
      pageData.bookedSlots || [];

    while (currentMinutes + duration_minutes <= endMinutes) {
      const slotStartSec =
        Math.floor(baseDate.getTime() / 1000) + currentMinutes * 60;
      const slotEndSec = slotStartSec + duration_minutes * 60;

      const isBooked = bookedSlots.some(
        (b) =>
          (slotStartSec >= b.start_time && slotStartSec < b.end_time) ||
          (slotEndSec > b.start_time && slotEndSec <= b.end_time)
      );

      const startLabel = `${String(Math.floor(currentMinutes / 60)).padStart(2, '0')}:${String(
        currentMinutes % 60
      ).padStart(2, '0')}`;

      slots.push({
        start: slotStartSec,
        end: slotEndSec,
        label: startLabel,
        isBooked,
      });

      currentMinutes += duration_minutes + buffer_minutes;
    }

    return slots;
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !guestName.trim() || !guestEmail.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/mailbox/booking/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_name: guestName,
          guest_email: guestEmail,
          start_time: selectedSlot.start,
          end_time: selectedSlot.end,
          notes: guestNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setConfirmedBooking(data.booking);
      } else {
        alert(data.error || 'Failed to complete booking');
      }
    } catch {
      alert('Booking request failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !pageData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d121f] p-4 text-slate-200">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (error || !pageData?.page) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d121f] p-4 text-slate-200">
        <div className="max-w-md rounded-2xl border border-white/10 bg-[#13192B] p-8 text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-rose-400" />
          <h1 className="text-lg font-bold text-white">
            Booking Page Unavailable
          </h1>
          <p className="mt-2 text-xs text-slate-400">
            {error || 'This schedule link does not exist.'}
          </p>
        </div>
      </div>
    );
  }

  const { page } = pageData;
  const slots = generateSlots();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0d121f] p-4 text-slate-200 sm:p-8">
      <div className="grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-3xl border border-white/10 bg-[#13192B] shadow-2xl md:grid-cols-3">
        {/* Left Side: Host Details */}
        <div className="flex flex-col justify-between border-b border-white/10 bg-gradient-to-b from-[#182138] to-[#13192B] p-6 sm:p-8 md:border-b-0 md:border-r">
          <div>
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-600/20">
              <CalendarIcon className="h-6 w-6 text-emerald-400" />
            </div>

            <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Ruhvi Jewels Concierge
            </p>
            <h1 className="mt-1 text-xl font-bold text-white">{page.title}</h1>

            {page.description && (
              <p className="mt-3 text-xs leading-relaxed text-slate-400">
                {page.description}
              </p>
            )}

            <div className="mt-6 space-y-3 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-400" />
                <span>{page.duration_minutes} Minutes Session</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-emerald-400" />
                <span>{page.timezone || 'Asia/Kolkata'} Time</span>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-white/5 pt-6">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Powered by RuhMail
            </span>
          </div>
        </div>

        {/* Right Side: Slot Selection & Form */}
        <div className="p-6 sm:p-8 md:col-span-2">
          {confirmedBooking ? (
            <div className="space-y-4 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-white">
                Booking Confirmed!
              </h2>
              <p className="mx-auto max-w-sm text-xs leading-relaxed text-slate-300">
                Thank you, <strong>{guestName}</strong>. A confirmation email
                with details has been sent to{' '}
                <strong className="text-emerald-400">{guestEmail}</strong>.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-300">
                  1. Select Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-xs text-white outline-none focus:border-emerald-500 sm:w-auto"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-300">
                  2. Select Available Slot (
                  {slots.filter((s) => !s.isBooked).length} slots open)
                </label>
                <div className="grid max-h-48 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
                  {slots.map((slot, i) => (
                    <button
                      key={i}
                      disabled={slot.isBooked}
                      onClick={() => setSelectedSlot(slot)}
                      className={`rounded-xl border p-2.5 text-center text-xs font-semibold transition ${
                        slot.isBooked
                          ? 'cursor-not-allowed border-transparent bg-white/5 text-slate-600 line-through'
                          : selectedSlot?.start === slot.start
                            ? 'border-emerald-400 bg-emerald-600 text-white shadow-lg shadow-emerald-950/40'
                            : 'border-white/10 bg-black/30 text-slate-200 hover:border-emerald-500/50'
                      }`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </div>

              {selectedSlot && (
                <form
                  onSubmit={handleConfirmBooking}
                  className="space-y-4 border-t border-white/10 pt-4"
                >
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    3. Your Information
                  </h3>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-[11px] text-slate-400">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="John Doe"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="john@example.com"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400">
                      Notes / Request (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Discuss custom bridal ring design or sizing consultation..."
                      value={guestNotes}
                      onChange={(e) => setGuestNotes(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 p-2.5 text-xs text-white outline-none focus:border-emerald-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="active:scale-98 w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-950/40 transition hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {submitting
                      ? 'Confirming Appointment...'
                      : 'Confirm Booking'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
