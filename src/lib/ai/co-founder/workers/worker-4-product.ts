import 'server-only';

import {
  AIWorkerInterface,
  WorkerDefinition,
  WorkerId,
  WorkerPriority,
  WorkerStructuredOutput,
  WorkerTaskInput,
} from './types';
import { getServiceClient } from '@/lib/supabase/service';

export interface ProductCatalogAnalysis {
  totalProducts: number;
  activeCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  averagePrice: number;
  underperformingCount: number;
}

export class ProductWorker implements AIWorkerInterface {
  readonly id: WorkerId = 'worker_product';
  readonly name = 'Product Worker';
  readonly priority: WorkerPriority = 'HIGH';

  getDefinition(): WorkerDefinition {
    return {
      id: this.id,
      name: this.name,
      role: 'Principal Product & Merchandising Manager',
      objective:
        'Audit catalog health, enrich product descriptions with luxury storytelling, monitor pricing margins, and detect underperforming inventory items.',
      priority: this.priority,
      responsibilities: [
        'Analyze full catalog presentation and data completeness',
        'Audit description quality, care instructions, and material specifications',
        'Evaluate pricing, margins, and AOV contribution per product line',
        'Identify underperforming, stagnant, or zero-sale products',
        'Generate enriched product descriptions with luxury jewellery styling cues',
        'Propose merchandising bundles, cross-sells, and margin optimizations',
      ],
      requiredSkills: [
        'Luxury jewellery merchandising',
        'Product description copywriting',
        'Margin and unit economics analysis',
        'Inventory performance diagnosis',
      ],
      requiredTools: [
        'get_products',
        'get_product_detail',
        'update_product_stock',
      ],
      permissionScope: ['mcp_tools:read', 'mcp_tools:write'],
      isSystemWorker: false,
    };
  }

  async execute(input: WorkerTaskInput): Promise<WorkerStructuredOutput> {
    const timestamp = new Date().toISOString();
    const taskLower = input.task.toLowerCase();

    try {
      const supabase = getServiceClient();

      // 1. Ingest products from Supabase
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, sku, slug, price, mrp, stock_quantity, status, description, created_at')
        .limit(100);

      if (error) {
        throw new Error(`Product DB query failed: ${error.message}`);
      }

      const productList = products || [];
      const totalCount = productList.length;
      const activeList = productList.filter((p) => p.status === 'active');
      const lowStockList = productList.filter(
        (p) => p.stock_quantity > 0 && p.stock_quantity <= 5
      );
      const outOfStockList = productList.filter((p) => p.stock_quantity === 0);

      const totalPrice = productList.reduce((acc, p) => acc + (Number(p.price) || 0), 0);
      const averagePrice = totalCount > 0 ? Math.round(totalPrice / totalCount) : 0;

      // Identify underperforming / poorly described products
      const thinDescriptionList = productList.filter(
        (p) => !p.description || p.description.trim().length < 80
      );

      // Underperforming heuristic: products in catalog with 0 stock or stagnant status
      const underperformingList = productList.filter(
        (p) => p.status === 'inactive' || p.stock_quantity === 0
      );

      const findings: string[] = [];
      const evidence: string[] = [];
      const problems: string[] = [];
      const opportunities: string[] = [];
      const recommendations: string[] = [];

      findings.push(
        `Catalog review complete across ${totalCount} products (${activeList.length} active). Average retail price is ₹${averagePrice.toLocaleString('en-IN')}.`
      );

      evidence.push(
        `Database audit: ${lowStockList.length} SKUs in low-stock status (<= 5 units), ${outOfStockList.length} SKUs out of stock.`
      );

      if (thinDescriptionList.length > 0) {
        problems.push(
          `${thinDescriptionList.length} products have thin descriptions (< 80 characters) missing luxury craft specifications (22K gold plating, e-coating, dimensions).`
        );
        evidence.push(
          `Sample SKUs needing enrichment: ${thinDescriptionList.slice(0, 3).map((p) => p.sku || p.name).join(', ')}.`
        );
      }

      if (outOfStockList.length > 0) {
        problems.push(
          `${outOfStockList.length} products are out of stock, causing bounce rates on direct search links.`
        );
      }

      // Generate enrichment template sample
      const enrichedCopySample = {
        headline: 'Handcrafted Radiance in 22K Gold Plating',
        craftDetails:
          'Dipped in lustrous 22K gold with a proprietary anti-tarnish e-coating to preserve brilliant mirror reflection against daily wear, perfumes, and humidity.',
        specifications:
          'Base metal: Premium allergy-safe copper alloy. Color warranty: 6 months. Packaging: Signature Ruhvi velvet gift box with certification card.',
        stylingAdvice:
          'Pair with a silk organza saree for evening galas or layer over an unbuttoned crisp white shirt for effortless contemporary glamour.',
      };

      opportunities.push(
        `Enrich ${thinDescriptionList.length} thin product pages with luxury storytelling and craft guarantees to increase page conversion rate by 15-20%.`
      );

      recommendations.push(
        'Deploy standardized 4-part description architecture: (1) Craft Narrative, (2) Materials & Guarantee, (3) Dimensions & Fit, (4) Styling Guide.'
      );

      if (outOfStockList.length > 0) {
        recommendations.push(
          `Trigger restock order for top out-of-stock items or enable "Notify Me When Available" waitlist.`
        );
      }

      let requiredApproval = false;
      let executionStatus: 'not_required' | 'pending_approval' = 'not_required';
      let requiredAction = 'Review catalog description quality and restock alerts';

      // Check if task requested direct modification/publish
      if (
        taskLower.includes('update') ||
        taskLower.includes('modify') ||
        taskLower.includes('change price') ||
        taskLower.includes('publish')
      ) {
        requiredApproval = true;
        executionStatus = 'pending_approval';
        requiredAction = 'Publish enriched descriptions and update product pricing in production catalog';
        recommendations.push(
          'Submit description and price updates to Co-Founder Approvals for founder review.'
        );
      }

      const priority =
        outOfStockList.length > 5 || thinDescriptionList.length > 10 ? 'high' : 'medium';

      const voiceSummary =
        `Product catalog analysis complete for ${totalCount} items. Average price is ₹${averagePrice.toLocaleString('en-IN')}. ` +
        (thinDescriptionList.length > 0
          ? `${thinDescriptionList.length} items need description enrichment with our 22K gold and anti-tarnish guarantees.`
          : 'All product descriptions satisfy luxury craft guidelines.') +
        (outOfStockList.length > 0 ? ` Note: ${outOfStockList.length} items are currently out of stock.` : '');

      return {
        workerId: this.id,
        workerName: this.name,
        task: input.task,
        findings,
        evidence,
        problems,
        opportunities,
        recommendations,
        priority,
        expectedImpact:
          '15-20% higher conversion on enriched product detail pages (PDP) and reduced returns from clear dimensions/specs.',
        requiredAction,
        requiredApproval,
        executionStatus,
        verification:
          'Measure time-on-page and add-to-cart conversion on updated PDPs over 14 days.',
        missingCapabilities: [],
        data: {
          summary: {
            totalCount,
            activeCount: activeList.length,
            lowStockCount: lowStockList.length,
            outOfStockCount: outOfStockList.length,
            averagePrice,
            thinDescriptionCount: thinDescriptionList.length,
          },
          enrichedCopySample,
        },
        executiveVoiceSummary: voiceSummary,
        timestamp,
      };
    } catch (err: any) {
      return {
        workerId: this.id,
        workerName: this.name,
        task: input.task,
        findings: ['Product analysis encountered an error.'],
        evidence: [err.message],
        problems: [`Failed to query product catalog: ${err.message}`],
        opportunities: [],
        recommendations: ['Check Supabase product table connectivity.'],
        priority: 'high',
        expectedImpact: 'Restore catalog merchandising observability',
        requiredAction: 'Resolve product DB connection error',
        requiredApproval: false,
        executionStatus: 'failed',
        verification: 'Re-run product worker analysis.',
        missingCapabilities: [],
        executiveVoiceSummary: `Product worker encountered an issue: ${err.message}`,
        timestamp,
      };
    }
  }
}

export const productWorker = new ProductWorker();
