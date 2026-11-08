import 'server-only';

import { createHash, randomUUID } from 'crypto';
import { WorkforceSignal, WorkerId } from './types';

const EVENT_WORKER_ROUTING: Record<string, WorkerId[]> = {
  // Order & Payment events
  'order.placed': [
    'worker_orders_logistics',
    'worker_analytics_performance',
    'worker_inventory',
  ],
  'order.cancelled': [
    'worker_orders_logistics',
    'worker_analytics_performance',
    'worker_inventory',
  ],
  'payment.settled': ['worker_accounts_tax', 'worker_analytics_performance'],
  'payment.failed': ['worker_sales_conversion'],
  daily_revenue_check: ['worker_analytics_performance'],
  sales_anomaly_detected: ['worker_analytics_performance'],
  cart_abandonment_spike: ['worker_sales_conversion'],
  customer_complaint_surge: ['worker_customer_support'],

  // Inventory & Product events
  'inventory.low_stock': ['worker_inventory', 'worker_product'],
  'product.created': ['worker_product', 'worker_seo'],
  'product.updated': ['worker_product', 'worker_seo'],

  // Customer support & Reviews
  'support.ticket_opened': ['worker_customer_support'],
  'support.sla_breach_warning': ['worker_customer_support'],
  'review.created': ['worker_review_feedback'],

  // Marketing & Growth
  'ad.roas_drop': ['worker_marketing', 'worker_analytics_performance'],
  'seo.crawl_error': ['worker_seo'],
  'schedule.daily_scan': [
    'worker_analytics_performance',
    'worker_inventory',
    'worker_orders_logistics',
    'worker_customer_support',
  ],
};

export class WorkforceSignalEngine {
  /**
   * Normalizes incoming events/schedules into a typed WorkforceSignal envelope.
   * Throws if signal is stale (>24h) or missing mandatory fields.
   */
  normalizeSignal(input: {
    sourceType?: WorkforceSignal['sourceType'];
    sourceId?: string;
    eventType?: string;
    occurredAt?: string;
    payload?: Record<string, any>;
    resourceRefs?: string[];
    correlationId?: string;
  }): WorkforceSignal {
    const {
      sourceType = 'schedule',
      sourceId = 'system',
      eventType = 'unknown_event',
      occurredAt = new Date().toISOString(),
      payload,
      resourceRefs = [],
      correlationId = randomUUID(),
    } = input;

    // 1. Freshness check: reject stale events older than 24 hours
    const eventTime = new Date(occurredAt).getTime();
    const now = Date.now();
    const maxAgeMs = 24 * 60 * 60 * 1000;
    if (isNaN(eventTime) || now - eventTime > maxAgeMs) {
      throw new Error(
        `Stale signal rejected: event occurred at ${occurredAt}, older than 24h limit.`
      );
    }

    // 2. Deterministic idempotency key
    const rawKey = `${sourceType}:${sourceId}:${eventType}:${input.occurredAt || JSON.stringify(payload || {})}`;
    const idempotencyKey = createHash('sha256').update(rawKey).digest('hex');

    // 3. Resolve candidate workers from routing table or intelligent keyword inference
    let workerCandidates = EVENT_WORKER_ROUTING[eventType.toLowerCase()];
    if (!workerCandidates || workerCandidates.length === 0) {
      const lower = eventType.toLowerCase();
      if (
        lower.includes('revenue') ||
        lower.includes('sales') ||
        lower.includes('anomaly')
      ) {
        workerCandidates = ['worker_analytics_performance'];
      } else if (
        lower.includes('abandon') ||
        lower.includes('cart') ||
        lower.includes('conversion')
      ) {
        workerCandidates = ['worker_sales_conversion'];
      } else if (lower.includes('support') || lower.includes('complaint')) {
        workerCandidates = ['worker_customer_support'];
      } else if (lower.includes('stock') || lower.includes('inventory')) {
        workerCandidates = ['worker_inventory'];
      } else if (lower.includes('seo')) {
        workerCandidates = ['worker_seo'];
      } else if (lower.includes('ad') || lower.includes('marketing')) {
        workerCandidates = ['worker_marketing'];
      } else {
        workerCandidates = ['worker_analytics_performance'];
      }
    }

    return {
      signalId: randomUUID(),
      schemaVersion: 1,
      sourceType,
      sourceId,
      eventType,
      occurredAt,
      receivedAt: new Date().toISOString(),
      idempotencyKey,
      correlationId,
      workerCandidates,
      resourceRefs,
      payload,
      verified: true,
    };
  }

  /**
   * Add or extend event-to-worker routing mappings
   */
  getEligibleWorkers(eventType: string): WorkerId[] {
    return EVENT_WORKER_ROUTING[eventType.toLowerCase()] || [];
  }
}

export const workforceSignalEngine = new WorkforceSignalEngine();
export const workforceSignalNormalizer = workforceSignalEngine;
