import 'server-only';

import {
  AIWorkerInterface,
  WorkerDefinition,
  WorkerId,
} from './types';

import { analyticsWorker } from './worker-1-analytics';
import { marketingWorker } from './worker-2-marketing';
import { seoWorker } from './worker-3-seo';
import { productWorker } from './worker-4-product';
import { competitorWorker } from './worker-5-competitor';
import { salesConversionWorker } from './worker-6-sales';
import { customerSupportWorker } from './worker-7-support';
import { contentWorker } from './worker-8-content';
import { inventoryWorker } from './worker-9-inventory';
import { reviewWorker } from './worker-10-review';
import { executionWorker } from './worker-11-execution';
import { monitoringWorker } from './worker-12-monitoring';

export class WorkerRegistry {
  private workers: Map<WorkerId, AIWorkerInterface> = new Map();

  constructor() {
    this.register(analyticsWorker);
    this.register(marketingWorker);
    this.register(seoWorker);
    this.register(productWorker);
    this.register(competitorWorker);
    this.register(salesConversionWorker);
    this.register(customerSupportWorker);
    this.register(contentWorker);
    this.register(inventoryWorker);
    this.register(reviewWorker);
    this.register(executionWorker);
    this.register(monitoringWorker);
  }

  register(worker: AIWorkerInterface): void {
    this.workers.set(worker.id, worker);
  }

  getWorker(id: WorkerId): AIWorkerInterface | undefined {
    return this.workers.get(id);
  }

  getAllWorkers(): AIWorkerInterface[] {
    return Array.from(this.workers.values());
  }

  getAllDefinitions(): WorkerDefinition[] {
    return this.getAllWorkers().map((w) => w.getDefinition());
  }

  /**
   * Dynamically routes natural language task requests to the most appropriate Worker
   */
  findWorkerForTask(taskText: string): AIWorkerInterface {
    const text = taskText.toLowerCase();

    // System worker keywords
    if (
      text.includes('execute approved') ||
      text.includes('run approval') ||
      text.includes('apply change')
    ) {
      return executionWorker;
    }

    if (
      text.includes('verify outcome') ||
      text.includes('check regression') ||
      text.includes('measure result') ||
      text.includes('monitor change')
    ) {
      return monitoringWorker;
    }

    // Domain worker keywords
    if (
      text.includes('competitor') ||
      text.includes('competition') ||
      text.includes('giva') ||
      text.includes('palmonas') ||
      text.includes('http://') ||
      text.includes('https://')
    ) {
      return competitorWorker;
    }

    if (
      text.includes('seo') ||
      text.includes('meta description') ||
      text.includes('keyword') ||
      text.includes('schema') ||
      text.includes('google search')
    ) {
      return seoWorker;
    }

    if (
      text.includes('stock') ||
      text.includes('inventory') ||
      text.includes('reorder') ||
      text.includes('warehouse') ||
      text.includes('out of stock')
    ) {
      return inventoryWorker;
    }

    if (
      text.includes('support') ||
      text.includes('ticket') ||
      text.includes('complaint') ||
      text.includes('customer query') ||
      text.includes('tracking delay')
    ) {
      return customerSupportWorker;
    }

    if (
      text.includes('review') ||
      text.includes('rating') ||
      text.includes('feedback') ||
      text.includes('star') ||
      text.includes('defect')
    ) {
      return reviewWorker;
    }

    if (
      text.includes('blog') ||
      text.includes('article') ||
      text.includes('editorial') ||
      text.includes('write post')
    ) {
      return contentWorker;
    }

    // Analytics & storewide telemetry
    if (
      text.includes('analytics') ||
      text.includes('metrics') ||
      text.includes('store performance') ||
      text.includes('traffic and') ||
      text.includes('revenue and') ||
      text.includes('sales volume')
    ) {
      return analyticsWorker;
    }

    if (
      text.includes('funnel') ||
      text.includes('checkout drop') ||
      text.includes('cart abandonment') ||
      text.includes('conversion rate') ||
      text.includes('cro')
    ) {
      return salesConversionWorker;
    }

    if (
      text.includes('ad copy') ||
      text.includes('campaign') ||
      text.includes('marketing') ||
      text.includes('creative') ||
      text.includes('video reel') ||
      text.includes('hook')
    ) {
      return marketingWorker;
    }

    if (
      text.includes('catalog') ||
      text.includes('description') ||
      text.includes('product detail') ||
      text.includes('merchandis') ||
      text.includes('sku')
    ) {
      return productWorker;
    }

    // Default to store analytics & performance
    return analyticsWorker;
  }
}

export const workerRegistry = new WorkerRegistry();
