'use client';

import React, { useEffect, useState } from 'react';
import { Tag, X } from 'lucide-react';

export const MAX_ADDRESSES = 10;

export const ADDRESS_TAG_SUGGESTIONS = ['Home', 'Office', 'Other'];

interface AddressTagSelectorProps {
  value: string;
  onChange: (label: string) => void;
}

export function AddressTagSelector({
  value,
  onChange,
}: AddressTagSelectorProps) {
  const isCustom =
    value.trim().length > 0 && !ADDRESS_TAG_SUGGESTIONS.includes(value.trim());
  const [customValue, setCustomValue] = useState(isCustom ? value : '');

  useEffect(() => {
    if (!value.trim() || ADDRESS_TAG_SUGGESTIONS.includes(value.trim())) {
      setCustomValue('');
    }
  }, [value]);

  const selectChip = (tag: string) => {
    setCustomValue('');
    onChange(tag);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {ADDRESS_TAG_SUGGESTIONS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => selectChip(tag)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              value === tag
                ? 'border-amber-900 bg-amber-950 text-amber-100'
                : 'border-stone-300 bg-white text-stone-600 hover:border-amber-700 hover:text-amber-900'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
      <div className="relative">
        <Tag className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          value={customValue}
          onChange={(e) => {
            setCustomValue(e.target.value);
            onChange(e.target.value.trim());
          }}
          placeholder="Or type your own tag (e.g. Parents' Home, Hostel)"
          maxLength={24}
          className="w-full rounded-lg border border-stone-300 bg-white py-2 pl-8 pr-8 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        {customValue && (
          <button
            type="button"
            onClick={() => {
              setCustomValue('');
              onChange('');
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-stone-400 hover:text-stone-700"
            aria-label="Clear custom tag"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
