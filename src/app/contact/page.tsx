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
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      console.log('Form data:', data);
      toast.success('Message sent successfully. We will get back to you shortly.');
      reset();
    } catch (error) {
      toast.error('Failed to send message. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="text-center max-w-xl mx-auto">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">Contact Concierge</h1>
        <p className="text-xs text-stone-500 mt-2">
          We are here to assist with custom orders, sizing queries, and purchase assistance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-6">
          <h2 className="font-serif text-xl font-bold text-stone-900">Get in Touch</h2>

          <div className="space-y-4 text-xs text-stone-700">
            <div className="flex items-center space-x-3">
              <Mail className="w-5 h-5 text-amber-700" />
              <span>care@ruhvi.in</span>
            </div>
            <div className="flex items-center space-x-3">
              <Phone className="w-5 h-5 text-amber-700" />
              <span>+91 98765 43210</span>
            </div>
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-amber-700" />
              <span>Monday – Saturday: 10:00 AM – 7:00 PM IST</span>
            </div>
            <div className="flex items-center space-x-3">
              <MapPin className="w-5 h-5 text-amber-700" />
              <span>Ruhvi Fine Jewellery Pvt Ltd, Mumbai, Maharashtra, India</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
          <h2 className="font-serif text-xl font-bold text-stone-900">Send Us a Message</h2>
          
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Your Name</label>
            <input 
              type="text" 
              {...register('name')}
              className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-all ${
                errors.name ? 'border-rose-500 bg-rose-50' : 'border-stone-300'
              }`} 
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-rose-500 text-[10px] mt-1">{errors.name.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Email</label>
            <input 
              type="email" 
              {...register('email')}
              className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-all ${
                errors.email ? 'border-rose-500 bg-rose-50' : 'border-stone-300'
              }`} 
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="text-rose-500 text-[10px] mt-1">{errors.email.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Message</label>
            <textarea 
              rows={3} 
              {...register('message')}
              className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-all ${
                errors.message ? 'border-rose-500 bg-rose-50' : 'border-stone-300'
              }`} 
              disabled={isSubmitting}
            />
            {errors.message && (
              <p className="text-rose-500 text-[10px] mt-1">{errors.message.message}</p>
            )}
          </div>
          
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full py-2.5 bg-amber-950 text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-amber-900 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isSubmitting ? 'Sending...' : 'Send Message'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
