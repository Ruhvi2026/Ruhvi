'use client';

import React from 'react';
import type { ChatUserProfile } from '@/types/chat';
import { Users } from 'lucide-react';
import { avatarColor, getInitials } from './chat-helpers';

export function UserAvatar({
  user,
  size = 'md',
}: {
  user: ChatUserProfile | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const szClass =
    size === 'sm'
      ? 'h-7 w-7 text-xs'
      : size === 'lg'
        ? 'h-11 w-11 text-base'
        : 'h-9 w-9 text-sm';
  if (!user)
    return (
      <div
        className={`${szClass} flex flex-shrink-0 items-center justify-center rounded-full bg-slate-700 text-slate-400`}
      >
        <Users className="h-4 w-4" />
      </div>
    );
  return (
    <div
      className={`${szClass} ${avatarColor(user.id)} flex flex-shrink-0 select-none items-center justify-center rounded-full font-bold text-white`}
    >
      {getInitials(user.full_name, user.email)}
    </div>
  );
}
