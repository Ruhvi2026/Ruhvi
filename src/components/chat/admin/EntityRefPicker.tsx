'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';

export function EntityRefPicker({
  onAdd,
  onClose,
}: {
  onAdd: (ref: {
    entity_type: string;
    entity_id: string;
    display_label: string;
  }) => void;
  onClose: () => void;
}) {
  const [entityType, setEntityType] = useState<
    'order' | 'support_ticket' | 'product'
  >('order');
  const [entityId, setEntityId] = useState('');

  const labelMap: Record<string, string> = {
    order: 'Order ID (e.g. RUH12345)',
    support_ticket: 'Ticket ID',
    product: 'Product Slug / ID',
  };
  const prefixMap: Record<string, string> = {
    order: 'Order',
    support_ticket: 'Ticket',
    product: 'Product',
  };

  return (
    <div className="absolute bottom-full left-0 z-50 mb-1 w-72 rounded-xl border border-white/10 bg-[#1a1e2e] p-4 shadow-2xl">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold text-white">Add Reference</p>
        <button onClick={onClose}>
          <X className="h-4 w-4 text-slate-400" />
        </button>
      </div>
      <div className="mb-3 flex gap-1.5">
        {(['order', 'support_ticket', 'product'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setEntityType(t)}
            className={`flex-1 rounded-lg py-1.5 text-[10px] font-medium transition-colors ${entityType === t ? 'bg-emerald-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
          >
            {t === 'support_ticket'
              ? 'Ticket'
              : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <input
        autoFocus
        value={entityId}
        onChange={(e) => setEntityId(e.target.value)}
        placeholder={labelMap[entityType]}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && entityId.trim()) {
            if (e.isComposing || e.keyCode === 229) return;
            e.preventDefault();
            onAdd({
              entity_type: entityType,
              entity_id: entityId.trim(),
              display_label: `${prefixMap[entityType]} ${entityId.trim()}`,
            });
            setEntityId('');
            onClose();
          }
        }}
      />
      <button
        disabled={!entityId.trim()}
        onClick={() => {
          if (entityId.trim()) {
            onAdd({
              entity_type: entityType,
              entity_id: entityId.trim(),
              display_label: `${prefixMap[entityType]} ${entityId.trim()}`,
            });
            setEntityId('');
            onClose();
          }
        }}
        className="mt-2.5 w-full rounded-lg bg-emerald-600 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
      >
        Add Reference
      </button>
    </div>
  );
}
