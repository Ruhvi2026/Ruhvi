import React from 'react';

const AVATAR_COLORS = [
  'bg-emerald-600',
  'bg-violet-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-sky-600',
  'bg-pink-600',
  'bg-teal-600',
  'bg-orange-600',
];

function avatarColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++)
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name?: string | null, email?: string | null) {
  const n = name || email || '?';
  const parts = n.split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return n.slice(0, 2).toUpperCase();
}

export interface StaffAvatarProps {
  user?: {
    id?: string;
    full_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  } | null;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  xs: 'w-5 h-5 text-[9px]',
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-10 h-10 text-sm',
};

export function StaffAvatar({
  user,
  name,
  email,
  avatarUrl,
  size = 'md',
  className = '',
}: StaffAvatarProps) {
  const finalName = user?.full_name ?? name ?? null;
  const finalEmail = user?.email ?? email ?? null;
  const finalAvatar = user?.avatar_url ?? avatarUrl ?? null;
  const userId = user?.id || finalName || 'user';
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  if (finalAvatar) {
    return (
      <img
        src={finalAvatar}
        alt={finalName || 'Staff Avatar'}
        className={`${sizeClass} rounded-full object-cover shadow-sm ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full ${avatarColor(
        userId
      )} flex flex-shrink-0 items-center justify-center font-semibold text-white shadow-sm ${className}`}
    >
      {getInitials(finalName, finalEmail)}
    </div>
  );
}

export default StaffAvatar;
