import {
  createOrder,
  OrderPayload,
  CreateOrderOptions,
  CreatedOrder,
  OrderError,
} from '@/lib/orders/create-order';
import {
  transitionOrder,
  TransitionOrderInput,
  TransitionResult,
  OrderStatus,
  ORDER_STATUSES,
  ORDER_TRANSITIONS,
} from '@/lib/orders/status-engine';
import {
  finalizePhonePeOrder,
  FinalizePhonePeDetails,
  FinalizePhonePeResult,
  PAYED_STATES as PHONEPE_PAYED_STATES,
  FAILED_STATES as PHONEPE_FAILED_STATES,
} from '@/lib/orders/finalize-phonepe-order';
import {
  finalizePaytmOrder,
  FinalizePaytmDetails,
  FinalizePaytmResult,
} from '@/lib/orders/finalize-paytm-order';
import {
  getCodEligibility,
  recordCodRefusal,
  resetCodEligibility,
  CodEligibilityResult,
  RecordRefusalInput,
} from '@/lib/orders/cod';
import {
  awardCoinsForDeliveredOrder,
  clawbackCoinsForCancelledOrReturnedOrder,
} from '@/lib/orders/coins';

export {
  OrderError,
  ORDER_STATUSES,
  ORDER_TRANSITIONS,
  PHONEPE_PAYED_STATES,
  PHONEPE_FAILED_STATES,
};

export type {
  OrderPayload,
  CreateOrderOptions,
  CreatedOrder,
  TransitionOrderInput,
  TransitionResult,
  OrderStatus,
  FinalizePhonePeDetails,
  FinalizePhonePeResult,
  FinalizePaytmDetails,
  FinalizePaytmResult,
  CodEligibilityResult,
  RecordRefusalInput,
};

/**
 * OrderService provides an authoritative domain interface for order creation,
 * status transitions, gateway finalizations (PhonePe, Paytm), COD eligibility,
 * and post-purchase reward coin actions.
 */
export class OrderService {
  /**
   * Authoritatively validate cart contents and create a pending or confirmed order.
   */
  public static async create(
    payload: OrderPayload,
    options?: CreateOrderOptions
  ): Promise<CreatedOrder> {
    return createOrder(payload, options);
  }

  /**
   * Validate and transition an order along the fulfillment lifecycle.
   */
  public static async transitionStatus(
    input: TransitionOrderInput
  ): Promise<TransitionResult> {
    return transitionOrder(input);
  }

  /**
   * Idempotently finalize a PhonePe payment against transaction state.
   */
  public static async finalizePhonePe(
    merchantTransactionId: string,
    details?: FinalizePhonePeDetails
  ): Promise<FinalizePhonePeResult> {
    return finalizePhonePeOrder(merchantTransactionId, details);
  }

  /**
   * Idempotently finalize a Paytm payment against order identifier or transaction.
   */
  public static async finalizePaytm(
    orderIdentifier: string,
    details?: FinalizePaytmDetails
  ): Promise<FinalizePaytmResult> {
    return finalizePaytmOrder(orderIdentifier, details);
  }

  /**
   * Check whether a customer is currently eligible for Cash on Delivery.
   */
  public static async getCodEligibility(
    customerId: string
  ): Promise<CodEligibilityResult> {
    return getCodEligibility(customerId);
  }

  /**
   * Record an uncollected or refused COD order and trigger threshold evaluation.
   */
  public static async recordCodRefusal(input: RecordRefusalInput): Promise<{
    ok: boolean;
    disabled: boolean;
    refusal_count: number;
    error?: string;
  }> {
    return recordCodRefusal(input);
  }

  /**
   * Clear COD refusal counters and re-enable COD for a customer account.
   */
  public static async resetCodEligibility(
    customerId: string
  ): Promise<{ ok: boolean; error?: string }> {
    return resetCodEligibility(customerId);
  }

  /**
   * Authoritatively award standard or 2X Privé reward coins upon order delivery.
   */
  public static async awardDeliveryCoins(orderId: string): Promise<{
    awarded: boolean;
    coins: number;
    isVip: boolean;
  }> {
    return awardCoinsForDeliveredOrder(orderId);
  }

  /**
   * Claw back earned reward coins when an order is cancelled or returned.
   */
  public static async clawbackCoins(
    orderId: string,
    reason: 'cancelled' | 'returned'
  ): Promise<{ reversed: boolean; coins: number }> {
    return clawbackCoinsForCancelledOrReturnedOrder(orderId, reason);
  }
}
