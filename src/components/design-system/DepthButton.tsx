'use client';

import React from 'react';

interface DepthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function DepthButton({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: DepthButtonProps) {
  const base =
    'relative font-bold uppercase tracking-wider rounded-xl transition-all duration-200 active:scale-95 active:translate-y-0.5 flex items-center justify-center gap-2';

  const variants = {
    primary:
      'bg-gradient-to-br from-gold-400 via-gold-500 to-gold-700 text-white shadow-lg shadow-gold-500/30 hover:shadow-xl hover:shadow-gold-500/40 hover:-translate-y-0.5 hover:from-gold-500 hover:to-gold-800',
    secondary:
      'bg-cream-50 border border-gold-300/70 text-charcoal-900 shadow-sm hover:shadow-md hover:border-gold-400 hover:-translate-y-0.5',
    ghost: 'bg-transparent text-gold-700 hover:bg-gold-50',
    glass:
      'bg-white/50 backdrop-blur-md border border-gold-200/50 text-charcoal-900 hover:bg-white/70 hover:shadow-md',
  };

  const sizes = {
    sm: 'px-4 py-2 text-[10px]',
    md: 'px-6 py-3 text-xs',
    lg: 'px-8 py-3.5 text-xs',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
