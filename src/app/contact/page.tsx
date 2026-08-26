'use client';

import React, { useState } from 'react';
import { Mail, Phone, MapPin, Clock, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error || 'Failed to send message. Please try again later.'
        );
      }

      toast.success(
        'Message sent successfully. We will get back to you shortly.'
      );
      reset();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to send message. Please try again later.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl text-center">
        <h1 className="font-serif text-3xl font-bold text-stone-900 sm:text-4xl">
          Contact Concierge
        </h1>
        <p className="mt-2 text-xs text-stone-500">
          We are here to assist with custom orders, sizing queries, and purchase
          assistance.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="space-y-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="font-serif text-xl font-bold text-stone-900">
            Get in Touch
          </h2>

          <div className="space-y-4 text-xs text-stone-700">
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-amber-700" />
              <span>support@ruhvi.in</span>
            </div>
            <div className="flex items-center space-x-3">
              <Phone className="h-5 w-5 text-amber-700" />
              <span>+91 98765 43210</span>
            </div>
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-amber-700" />
              <span>Monday – Saturday: 10:00 AM – 7:00 PM IST</span>
            </div>
            <div className="flex items-center space-x-3">
              <MapPin className="h-5 w-5 text-amber-700" />
              <span>Ruhvi Jewels, Mumbai, Maharashtra, India</span>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
        >
          <h2 className="font-serif text-xl font-bold text-stone-900">
            Send Us a Message
          </h2>

          <div>
            <label
              htmlFor="contact-name"
              className="mb-1 block text-xs font-semibold text-stone-700"
            >
              Your Name
            </label>
            <input
              id="contact-name"
              type="text"
              {...register('name')}
              className={`w-full rounded-lg border px-3 py-2 text-xs outline-none transition-all focus:ring-2 focus:ring-amber-500 ${
                errors.name ? 'border-rose-500 bg-rose-50' : 'border-stone-300'
              }`}
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="mt-1 text-[10px] text-rose-500">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="contact-email"
              className="mb-1 block text-xs font-semibold text-stone-700"
            >
              Email
            </label>
            <input
              id="contact-email"
              type="email"
              {...register('email')}
              className={`w-full rounded-lg border px-3 py-2 text-xs outline-none transition-all focus:ring-2 focus:ring-amber-500 ${
                errors.email ? 'border-rose-500 bg-rose-50' : 'border-stone-300'
              }`}
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="mt-1 text-[10px] text-rose-500">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="contact-message"
              className="mb-1 block text-xs font-semibold text-stone-700"
            >
              Message
            </label>
            <textarea
              id="contact-message"
              rows={3}
              {...register('message')}
              className={`w-full rounded-lg border px-3 py-2 text-xs outline-none transition-all focus:ring-2 focus:ring-amber-500 ${
                errors.message
                  ? 'border-rose-500 bg-rose-50'
                  : 'border-stone-300'
              }`}
              disabled={isSubmitting}
            />
            {errors.message && (
              <p className="mt-1 text-[10px] text-rose-500">
                {errors.message.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center space-x-2 rounded-lg bg-amber-950 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{isSubmitting ? 'Sending...' : 'Send Message'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
