'use client';

import React from 'react';
import { X } from 'lucide-react';
import OrderCallRemarksPanel from './OrderCallRemarksPanel';

interface OrderCallRemarksModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber?: string;
  customerPhone?: string | null;
  customerName?: string | null;
  returnId?: string | null;
  onRemarkLogged?: () => void;
}

export default function OrderCallRemarksModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  customerPhone,
  customerName,
  returnId,
  onRemarkLogged,
}: OrderCallRemarksModalProps) {
  if (!isOpen) return null;

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm duration-200">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-[#0d101c] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0d101c]/95 px-6 py-4 backdrop-blur-md">
          <div>
            <h2 className="font-serif text-lg font-bold text-white">
              Customer Call Activity {orderNumber ? `· #${orderNumber}` : ''}
            </h2>
            <p className="text-xs text-slate-400">
              {customerName ? `${customerName} · ` : ''}Anti-Collision Staff
              Call Center
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <OrderCallRemarksPanel
            orderId={orderId}
            customerPhone={customerPhone}
            customerName={customerName}
            returnId={returnId}
            onRemarkLogged={() => {
              if (onRemarkLogged) onRemarkLogged();
            }}
          />
        </div>
      </div>
    </div>
  );
}
