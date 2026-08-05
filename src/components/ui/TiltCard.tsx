'use client';

import React from 'react';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  glare?: boolean;
  scale?: number;
}

export function TiltCard({ children, className = '' }: TiltCardProps) {
  return <div className={`relative ${className}`}>{children}</div>;
}
