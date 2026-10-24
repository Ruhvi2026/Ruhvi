import {
  OrderService,
  CreatedOrder,
  TransitionResult,
  FinalizePhonePeResult,
  FinalizePaytmResult,
  CodEligibilityResult,
  OrderPayload,
  TransitionOrderInput,
} from '../order.service';

jest.mock('@/lib/orders/create-order', () => ({
  createOrder: jest.fn(),
  OrderError: class OrderError extends Error {
    status: number;
    constructor(msg: string, status = 500) {
      super(msg);
      this.status = status;
    }
  },
}));

jest.mock('@/lib/orders/status-engine', () => ({
  transitionOrder: jest.fn(),
  ORDER_STATUSES: ['pending', 'confirmed'],
  ORDER_TRANSITIONS: { pending: ['confirmed'] },
}));

jest.mock('@/lib/orders/finalize-phonepe-order', () => ({
  finalizePhonePeOrder: jest.fn(),
  PAYED_STATES: ['COMPLETED', 'SUCCESS'],
  FAILED_STATES: ['FAILED', 'REJECTED'],
}));

jest.mock('@/lib/orders/finalize-paytm-order', () => ({
  finalizePaytmOrder: jest.fn(),
}));

jest.mock('@/lib/orders/cod', () => ({
  getCodEligibility: jest.fn(),
  recordCodRefusal: jest.fn(),
  resetCodEligibility: jest.fn(),
}));

jest.mock('@/lib/orders/coins', () => ({
  awardCoinsForDeliveredOrder: jest.fn(),
  clawbackCoinsForCancelledOrReturnedOrder: jest.fn(),
}));

import { createOrder } from '@/lib/orders/create-order';
import { transitionOrder } from '@/lib/orders/status-engine';
import { finalizePhonePeOrder } from '@/lib/orders/finalize-phonepe-order';
import { finalizePaytmOrder } from '@/lib/orders/finalize-paytm-order';
import {
  getCodEligibility,
  recordCodRefusal,
  resetCodEligibility,
} from '@/lib/orders/cod';
import {
  awardCoinsForDeliveredOrder,
  clawbackCoinsForCancelledOrReturnedOrder,
} from '@/lib/orders/coins';

describe('OrderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('delegates order creation to createOrder', async () => {
      const mockResult: CreatedOrder = {
        orderId: 'ord-123',
        orderNumber: 'RHV-2026-9999',
        gstAmount: 30,
        user: { id: 'usr-1' },
        newOrder: { id: 'ord-123', total: 1030 },
      };
      (createOrder as jest.Mock).mockResolvedValue(mockResult);

      const payload: OrderPayload = {
        items: [{ product_id: 'p1', quantity: 1 }],
        address: { phone: '9876543210' },
        paymentMethod: 'cod',
        subtotal: 1000,
        shippingCharge: 0,
        codCharge: 0,
        total: 1000,
      };

      const result = await OrderService.create(payload);
      expect(createOrder).toHaveBeenCalledWith(payload, undefined);
      expect(result).toBe(mockResult);
    });
  });

  describe('transitionStatus', () => {
    it('delegates status transitions to transitionOrder', async () => {
      const mockResult: TransitionResult = {
        ok: true,
        status: 'confirmed',
      };
      (transitionOrder as jest.Mock).mockResolvedValue(mockResult);

      const input: TransitionOrderInput = {
        orderId: 'ord-123',
        newStatus: 'confirmed',
        performedBy: 'admin-1',
      };

      const result = await OrderService.transitionStatus(input);
      expect(transitionOrder).toHaveBeenCalledWith(input);
      expect(result).toBe(mockResult);
    });
  });

  describe('finalizePhonePe', () => {
    it('delegates PhonePe finalization', async () => {
      const mockResult: FinalizePhonePeResult = {
        status: 'paid',
        order: { id: 'ord-123' },
      };
      (finalizePhonePeOrder as jest.Mock).mockResolvedValue(mockResult);

      const result = await OrderService.finalizePhonePe('TX_123', {
        phonepePaymentState: 'COMPLETED',
      });
      expect(finalizePhonePeOrder).toHaveBeenCalledWith('TX_123', {
        phonepePaymentState: 'COMPLETED',
      });
      expect(result).toBe(mockResult);
    });
  });

  describe('finalizePaytm', () => {
    it('delegates Paytm finalization', async () => {
      const mockResult: FinalizePaytmResult = {
        status: 'paid',
        order: { id: 'ord-456' },
      };
      (finalizePaytmOrder as jest.Mock).mockResolvedValue(mockResult);

      const result = await OrderService.finalizePaytm('PAYTM_ORDER_1');
      expect(finalizePaytmOrder).toHaveBeenCalledWith(
        'PAYTM_ORDER_1',
        undefined
      );
      expect(result).toBe(mockResult);
    });
  });

  describe('COD Eligibility', () => {
    it('delegates getCodEligibility', async () => {
      const mockResult: CodEligibilityResult = {
        cod_disabled: false,
        cod_refusal_count: 0,
        last_refusal_at: null,
      };
      (getCodEligibility as jest.Mock).mockResolvedValue(mockResult);

      const result = await OrderService.getCodEligibility('cust-1');
      expect(getCodEligibility).toHaveBeenCalledWith('cust-1');
      expect(result).toBe(mockResult);
    });

    it('delegates recordCodRefusal', async () => {
      const mockResult = {
        ok: true,
        disabled: false,
        refusal_count: 1,
      };
      (recordCodRefusal as jest.Mock).mockResolvedValue(mockResult);

      const input = {
        customerId: 'cust-1',
        orderId: 'ord-1',
        result: 'refused',
      };
      const result = await OrderService.recordCodRefusal(input);
      expect(recordCodRefusal).toHaveBeenCalledWith(input);
      expect(result).toBe(mockResult);
    });

    it('delegates resetCodEligibility', async () => {
      const mockResult = { ok: true };
      (resetCodEligibility as jest.Mock).mockResolvedValue(mockResult);

      const result = await OrderService.resetCodEligibility('cust-1');
      expect(resetCodEligibility).toHaveBeenCalledWith('cust-1');
      expect(result).toBe(mockResult);
    });
  });

  describe('Reward Coins', () => {
    it('delegates awardDeliveryCoins', async () => {
      const mockResult = { awarded: true, coins: 5000, isVip: false };
      (awardCoinsForDeliveredOrder as jest.Mock).mockResolvedValue(mockResult);

      const result = await OrderService.awardDeliveryCoins('ord-1');
      expect(awardCoinsForDeliveredOrder).toHaveBeenCalledWith('ord-1');
      expect(result).toBe(mockResult);
    });

    it('delegates clawbackCoins', async () => {
      const mockResult = { reversed: true, coins: 5000 };
      (clawbackCoinsForCancelledOrReturnedOrder as jest.Mock).mockResolvedValue(
        mockResult
      );

      const result = await OrderService.clawbackCoins('ord-1', 'returned');
      expect(clawbackCoinsForCancelledOrReturnedOrder).toHaveBeenCalledWith(
        'ord-1',
        'returned'
      );
      expect(result).toBe(mockResult);
    });
  });
});
