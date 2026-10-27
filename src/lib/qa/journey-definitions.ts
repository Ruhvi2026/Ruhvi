/**
 * ============================================================================
 * CRITICAL USER & STAFF REGRESSION JOURNEYS REGISTRY (TRACK H - PHASE 39)
 * ============================================================================
 * Canonical programmatic registry of critical regression journeys for
 * automated QA Guardian probes, Playwright E2E suites, and release readiness.
 */

export type JourneyId =
  | 'J-GUEST-01'
  | 'J-GUEST-02'
  | 'J-CUST-01'
  | 'J-CUST-02'
  | 'J-CUST-03'
  | 'J-CUST-04'
  | 'J-CUST-05'
  | 'J-STAFF-01'
  | 'J-STAFF-02'
  | 'J-STAFF-03'
  | 'J-STAFF-04'
  | 'J-STAFF-05'
  | 'J-STAFF-06'
  | 'J-STAFF-07';

export type JourneyCategory = 'guest' | 'customer' | 'staff' | 'admin';

export type AutomationType =
  'synthetic_probe' | 'playwright_e2e' | 'hybrid' | 'manual_audit';

export interface JourneyStep {
  stepNumber: number;
  description: string;
  targetRoute: string;
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  expectedStatusCode?: number;
  expectedSelectorOrAssertion: string;
}

export interface JourneyInvariant {
  id: string;
  description: string;
  criticality: 'BLOCKER' | 'MAJOR' | 'WARNING';
}

export interface FailureThresholds {
  maxResponseTimeMs: number;
  allowedErrorCodes: number[];
  disallowedErrorCodes: number[];
  customFailureCondition?: string;
}

export interface JourneyDefinition {
  id: JourneyId;
  title: string;
  category: JourneyCategory;
  actor: string;
  description: string;
  automationType: AutomationType;
  primaryRoutes: string[];
  preconditions: string[];
  steps: JourneyStep[];
  invariants: JourneyInvariant[];
  failureThresholds: FailureThresholds;
}

export const CRITICAL_JOURNEYS: JourneyDefinition[] = [
  {
    id: 'J-GUEST-01',
    title: 'Catalog Browsing & Filter/Search',
    category: 'guest',
    actor: 'Guest (Unauthenticated)',
    description:
      'Verify guest visitors can browse hero banners, filter by category/price, and perform text search.',
    automationType: 'hybrid',
    primaryRoutes: ['/', '/products', '/categories'],
    preconditions: [
      'Active network connection',
      'Products seeded in database with status active',
    ],
    steps: [
      {
        stepNumber: 1,
        description:
          'Navigate to root homepage and verify hero and category carousel.',
        targetRoute: '/',
        httpMethod: 'GET',
        expectedStatusCode: 200,
        expectedSelectorOrAssertion: 'Hero banner and category links render',
      },
      {
        stepNumber: 2,
        description: 'Navigate to products catalog and apply category filter.',
        targetRoute: '/products?category=necklaces',
        httpMethod: 'GET',
        expectedStatusCode: 200,
        expectedSelectorOrAssertion: 'Product cards list matching necklaces',
      },
      {
        stepNumber: 3,
        description: 'Execute keyword search.',
        targetRoute: '/products?search=Gold',
        httpMethod: 'GET',
        expectedStatusCode: 200,
        expectedSelectorOrAssertion:
          'Results render with Indian Rupee formatting',
      },
    ],
    invariants: [
      {
        id: 'INV-CAT-01',
        description:
          'Inactive products must never appear in catalog or search results.',
        criticality: 'BLOCKER',
      },
      {
        id: 'INV-CAT-02',
        description:
          'Product prices must render in INR (₹) with valid numbering conventions.',
        criticality: 'MAJOR',
      },
    ],
    failureThresholds: {
      maxResponseTimeMs: 2500,
      allowedErrorCodes: [200, 304],
      disallowedErrorCodes: [404, 500, 502, 503],
    },
  },
  {
    id: 'J-GUEST-02',
    title: 'PDP & Variant Selection',
    category: 'guest',
    actor: 'Guest / Customer',
    description:
      'Verify product detail page image gallery, variant switching, hallmark badges, and stock responsiveness.',
    automationType: 'hybrid',
    primaryRoutes: ['/products/[slug]'],
    preconditions: ['Active product with valid variants and stock exists'],
    steps: [
      {
        stepNumber: 1,
        description: 'Load Product Detail Page by slug.',
        targetRoute: '/products/[slug]',
        httpMethod: 'GET',
        expectedStatusCode: 200,
        expectedSelectorOrAssertion: 'h1 title and pricing visible',
      },
      {
        stepNumber: 2,
        description:
          'Switch variant option and observe price/SKU synchronization.',
        targetRoute: '/products/[slug]',
        expectedSelectorOrAssertion:
          'Price and stock indicator update synchronously',
      },
    ],
    invariants: [
      {
        id: 'INV-PDP-01',
        description:
          'Supplier costs, wholesale margins, or private metadata must never leak in DOM or JSON.',
        criticality: 'BLOCKER',
      },
      {
        id: 'INV-PDP-02',
        description:
          'Out-of-stock variants must disable the Add to Cart button.',
        criticality: 'BLOCKER',
      },
    ],
    failureThresholds: {
      maxResponseTimeMs: 2000,
      allowedErrorCodes: [200],
      disallowedErrorCodes: [404, 500],
    },
  },
  {
    id: 'J-CUST-01',
    title: 'Cart Mutations & Persistence',
    category: 'customer',
    actor: 'Customer / Guest',
    description:
      'Verify adding items to cart, modifying quantities, removing items, and local/remote state persistence.',
    automationType: 'playwright_e2e',
    primaryRoutes: ['/cart', '/api/cart'],
    preconditions: ['Product has available sellable inventory'],
    steps: [
      {
        stepNumber: 1,
        description: 'Add product to cart from PDP.',
        targetRoute: '/api/cart',
        httpMethod: 'POST',
        expectedStatusCode: 200,
        expectedSelectorOrAssertion: 'Cart count increments',
      },
      {
        stepNumber: 2,
        description: 'Mutate item quantity on cart page.',
        targetRoute: '/cart',
        expectedSelectorOrAssertion: 'Subtotal updates mathematically',
      },
    ],
    invariants: [
      {
        id: 'INV-CART-01',
        description: 'Cart quantity cannot exceed available stock.',
        criticality: 'BLOCKER',
      },
      {
        id: 'INV-CART-02',
        description:
          'Cart total must mathematically equal the sum of item line totals.',
        criticality: 'BLOCKER',
      },
    ],
    failureThresholds: {
      maxResponseTimeMs: 1500,
      allowedErrorCodes: [200],
      disallowedErrorCodes: [400, 500],
    },
  },
  {
    id: 'J-CUST-02',
    title: 'Checkout, Coupon & Payment',
    category: 'customer',
    actor: 'Customer',
    description:
      'Verify checkout address entry, coupon discount validation, wallet redemption, and payment initiation.',
    automationType: 'playwright_e2e',
    primaryRoutes: ['/checkout', '/api/checkout'],
    preconditions: ['Items present in cart', 'Valid test customer profile'],
    steps: [
      {
        stepNumber: 1,
        description: 'Load checkout page and input delivery address.',
        targetRoute: '/checkout',
        httpMethod: 'GET',
        expectedStatusCode: 200,
        expectedSelectorOrAssertion: 'Address form renders with PIN validation',
      },
      {
        stepNumber: 2,
        description: 'Apply coupon code and observe subtotal recalculation.',
        targetRoute: '/api/checkout/apply-coupon',
        httpMethod: 'POST',
        expectedStatusCode: 200,
        expectedSelectorOrAssertion: 'Discount amount subtracted from total',
      },
      {
        stepNumber: 3,
        description: 'Submit order via payment gateway or COD.',
        targetRoute: '/api/checkout',
        httpMethod: 'POST',
        expectedStatusCode: 200,
        expectedSelectorOrAssertion: 'Returns order token or redirect URL',
      },
    ],
    invariants: [
      {
        id: 'INV-CHK-01',
        description: 'Coupon discounts cannot exceed order subtotal.',
        criticality: 'BLOCKER',
      },
      {
        id: 'INV-CHK-02',
        description:
          'Orders cannot be finalized without valid address and verified payment intent.',
        criticality: 'BLOCKER',
      },
    ],
    failureThresholds: {
      maxResponseTimeMs: 3000,
      allowedErrorCodes: [200],
      disallowedErrorCodes: [500, 502, 504],
    },
  },
  {
    id: 'J-CUST-03',
    title: 'Order Confirmation & Tracking',
    category: 'customer',
    actor: 'Customer',
    description:
      'Verify post-purchase success confirmation, invoice generation, and order lifecycle tracking.',
    automationType: 'hybrid',
    primaryRoutes: ['/order-success/[orderId]', '/orders/[id]'],
    preconditions: ['Valid order created in database'],
    steps: [
      {
        stepNumber: 1,
        description: 'View order success confirmation.',
        targetRoute: '/order-success/[orderId]',
        httpMethod: 'GET',
        expectedStatusCode: 200,
        expectedSelectorOrAssertion: 'Order number and summary rendered',
      },
      {
        stepNumber: 2,
        description: 'View order history details and invoice.',
        targetRoute: '/orders/[id]',
        httpMethod: 'GET',
        expectedStatusCode: 200,
        expectedSelectorOrAssertion:
          'Order status progress bar and invoice action visible',
      },
    ],
    invariants: [
      {
        id: 'INV-ORD-01',
        description:
          'Customers can only access their own orders (strict user_id isolation).',
        criticality: 'BLOCKER',
      },
      {
        id: 'INV-ORD-02',
        description:
          'Invoices must reflect exact amount paid, GST breakdown, and company details.',
        criticality: 'MAJOR',
      },
    ],
    failureThresholds: {
      maxResponseTimeMs: 2000,
      allowedErrorCodes: [200],
      disallowedErrorCodes: [403, 404, 500],
    },
  },
  {
    id: 'J-CUST-04',
    title: 'Return & Cancellation Lifecycle',
    category: 'customer',
    actor: 'Customer',
    description:
      'Verify customer initiation of item return requests, cancellation checks, and reason capture.',
    automationType: 'playwright_e2e',
    primaryRoutes: ['/orders/[id]/return', '/portal-orders'],
    preconditions: ['Delivered order within return policy window'],
    steps: [
      {
        stepNumber: 1,
        description: 'Open return request form for eligible delivered order.',
        targetRoute: '/orders/[id]/return',
        httpMethod: 'GET',
        expectedStatusCode: 200,
        expectedSelectorOrAssertion:
          'Item selector and reason dropdown rendered',
      },
      {
        stepNumber: 2,
        description: 'Submit return request with reason.',
        targetRoute: '/orders/[id]/return',
        httpMethod: 'POST',
        expectedStatusCode: 200,
        expectedSelectorOrAssertion: 'Return confirmation ID displayed',
      },
    ],
    invariants: [
      {
        id: 'INV-RET-01',
        description:
          'Returns cannot be submitted past statutory policy return window.',
        criticality: 'BLOCKER',
      },
      {
        id: 'INV-RET-02',
        description:
          'Cancelled order quantities must be safely returned to sellable inventory.',
        criticality: 'BLOCKER',
      },
    ],
    failureThresholds: {
      maxResponseTimeMs: 2500,
      allowedErrorCodes: [200],
      disallowedErrorCodes: [400, 500],
    },
  },
  {
    id: 'J-CUST-05',
    title: 'GIA Shopping Concierge AI',
    category: 'customer',
    actor: 'Customer / Guest',
    description:
      'Verify GIA shopping assistant queries, product recommendations, and polite conversational safety.',
    automationType: 'synthetic_probe',
    primaryRoutes: ['/api/support/chat'],
    preconditions: ['AI support chat API route active'],
    steps: [
      {
        stepNumber: 1,
        description: 'Send jewellery inquiry to GIA concierge.',
        targetRoute: '/api/support/chat',
        httpMethod: 'POST',
        expectedStatusCode: 200,
        expectedSelectorOrAssertion:
          'Helpful answer with relevant product links emitted',
      },
    ],
    invariants: [
      {
        id: 'INV-GIA-01',
        description:
          'GIA must never invent non-existent products or promise unapproved discounts.',
        criticality: 'BLOCKER',
      },
      {
        id: 'INV-GIA-02',
        description:
          'No sensitive customer inferences (religion, income) may be recorded without consent.',
        criticality: 'MAJOR',
      },
    ],
    failureThresholds: {
      maxResponseTimeMs: 3500,
      allowedErrorCodes: [200],
      disallowedErrorCodes: [500, 502],
    },
  },
  {
    id: 'J-STAFF-01',
    title: 'Admin Authentication & RBAC',
    category: 'admin',
    actor: 'Staff / Admin',
    description:
      'Verify admin authentication gates, role-governed page rendering, and access denial for unauthenticated visitors.',
    automationType: 'playwright_e2e',
    primaryRoutes: ['/admin/login', '/admin/dashboard'],
    preconditions: ['Valid staff and admin test credentials'],
    steps: [
      {
        stepNumber: 1,
        description:
          'Unauthenticated user navigates to /admin/dashboard and is redirected.',
        targetRoute: '/admin/dashboard',
        httpMethod: 'GET',
        expectedStatusCode: 307,
        expectedSelectorOrAssertion: 'Redirects to /admin/login',
      },
      {
        stepNumber: 2,
        description: 'Admin logs in and successfully loads admin dashboard.',
        targetRoute: '/admin/dashboard',
        httpMethod: 'GET',
        expectedStatusCode: 200,
        expectedSelectorOrAssertion:
          'Admin sidebar and dashboard metrics render',
      },
    ],
    invariants: [
      {
        id: 'INV-SEC-01',
        description:
          'Zero admin component HTML may leak to unauthenticated users.',
        criticality: 'BLOCKER',
      },
      {
        id: 'INV-SEC-02',
        description:
          'Staff role cannot execute super-admin mutations (strict RBAC enforcement).',
        criticality: 'BLOCKER',
      },
    ],
    failureThresholds: {
      maxResponseTimeMs: 2000,
      allowedErrorCodes: [200, 307],
      disallowedErrorCodes: [401, 500],
    },
  },
  {
    id: 'J-STAFF-02',
    title: 'Executive Dashboard & Radar',
    category: 'admin',
    actor: 'Admin',
    description:
      'Verify executive KPI aggregation, sales summaries, and Business Radar anomaly indicators.',
    automationType: 'hybrid',
    primaryRoutes: ['/admin/dashboard', '/admin/business-radar'],
    preconditions: [
      'Admin authentication active',
      'Authoritative orders populated',
    ],
    steps: [
      {
        stepNumber: 1,
        description: 'Load dashboard and inspect sales, orders, and AOV cards.',
        targetRoute: '/admin/dashboard',
        httpMethod: 'GET',
        expectedStatusCode: 200,
        expectedSelectorOrAssertion:
          'KPI cards render with valid non-null figures',
      },
      {
        stepNumber: 2,
        description: 'Navigate to Business Radar and inspect active anomalies.',
        targetRoute: '/admin/business-radar',
        httpMethod: 'GET',
        expectedStatusCode: 200,
        expectedSelectorOrAssertion: 'Anomaly list and severity badges render',
      },
    ],
    invariants: [
      {
        id: 'INV-RAD-01',
        description:
          'Financial KPIs must reconcile to authoritative Supabase ledgers without fabricated figures.',
        criticality: 'BLOCKER',
      },
    ],
    failureThresholds: {
      maxResponseTimeMs: 2500,
      allowedErrorCodes: [200],
      disallowedErrorCodes: [500],
    },
  },
  {
    id: 'J-STAFF-03',
    title: 'Order Fulfillment State Progression',
    category: 'staff',
    actor: 'Operations Staff',
    description:
      'Verify order triage, shipping label generation, courier tracking assignment, and status transitions.',
    automationType: 'playwright_e2e',
    primaryRoutes: ['/admin/orders', '/admin/orders/[id]'],
    preconditions: ['Confirmed orders awaiting shipment'],
    steps: [
      {
        stepNumber: 1,
        description:
          'Open order detail and advance status to processing/shipped.',
        targetRoute: '/admin/orders/[id]',
        httpMethod: 'PATCH',
        expectedStatusCode: 200,
        expectedSelectorOrAssertion:
          'Status badge updates and audit log entry created',
      },
    ],
    invariants: [
      {
        id: 'INV-FUL-01',
        description:
          'Orders cannot skip logical lifecycle steps (e.g. pending directly to delivered).',
        criticality: 'MAJOR',
      },
    ],
    failureThresholds: {
      maxResponseTimeMs: 2000,
      allowedErrorCodes: [200],
      disallowedErrorCodes: [400, 500],
    },
  },
  {
    id: 'J-STAFF-04',
    title: 'Return Inspection & Refund Authorization',
    category: 'admin',
    actor: 'Manager / Admin',
    description:
      'Verify staff inspection of returned items and authorized gateway/wallet refund execution.',
    automationType: 'playwright_e2e',
    primaryRoutes: ['/admin/orders/[id]', '/api/orders/refund'],
    preconditions: ['Return requested order with item receipt verification'],
    steps: [
      {
        stepNumber: 1,
        description: 'Authorize refund for verified return.',
        targetRoute: '/api/orders/refund',
        httpMethod: 'POST',
        expectedStatusCode: 200,
        expectedSelectorOrAssertion: 'Refund confirmation and ledger update',
      },
    ],
    invariants: [
      {
        id: 'INV-REF-01',
        description: 'Refund amount cannot exceed original amount paid.',
        criticality: 'BLOCKER',
      },
      {
        id: 'INV-REF-02',
        description:
          'Refund actions must be strictly idempotent to prevent double-refunds.',
        criticality: 'BLOCKER',
      },
    ],
    failureThresholds: {
      maxResponseTimeMs: 3000,
      allowedErrorCodes: [200],
      disallowedErrorCodes: [403, 500],
    },
  },
  {
    id: 'J-STAFF-05',
    title: 'Action Center Proposal Approval',
    category: 'admin',
    actor: 'Super Admin',
    description:
      'Verify review, cryptographic approval, and allowlisted execution of Action Center proposals.',
    automationType: 'playwright_e2e',
    primaryRoutes: [
      '/admin/action-center',
      '/api/action-center/approve',
      '/api/action-center/execute',
    ],
    preconditions: ['Pending proposal in Action Center'],
    steps: [
      {
        stepNumber: 1,
        description: 'Approve pending proposal with actor signature.',
        targetRoute: '/api/action-center/approve',
        httpMethod: 'POST',
        expectedStatusCode: 200,
        expectedSelectorOrAssertion: 'Proposal moves to approved state',
      },
      {
        stepNumber: 2,
        description: 'Execute approved allowlisted action.',
        targetRoute: '/api/action-center/execute',
        httpMethod: 'POST',
        expectedStatusCode: 200,
        expectedSelectorOrAssertion:
          'Action executed, readback verified, and logged',
      },
    ],
    invariants: [
      {
        id: 'INV-ACT-01',
        description:
          'Unallowlisted actions, modified payloads, or unauthorized roles are blocked.',
        criticality: 'BLOCKER',
      },
    ],
    failureThresholds: {
      maxResponseTimeMs: 2500,
      allowedErrorCodes: [200],
      disallowedErrorCodes: [403, 500],
    },
  },
  {
    id: 'J-STAFF-06',
    title: 'Customer 360 & Support Triage',
    category: 'staff',
    actor: 'Staff / Admin',
    description:
      'Verify Customer 360 timeline search, category filtering, and role-based PII masking.',
    automationType: 'playwright_e2e',
    primaryRoutes: ['/admin/customer-360', '/api/customer-360/[id]'],
    preconditions: ['Customer record exists with orders and support cases'],
    steps: [
      {
        stepNumber: 1,
        description:
          'Search customer and inspect chronological activity stream.',
        targetRoute: '/admin/customer-360',
        httpMethod: 'GET',
        expectedStatusCode: 200,
        expectedSelectorOrAssertion:
          'Customer summary card and activity stream render',
      },
    ],
    invariants: [
      {
        id: 'INV-C360-01',
        description:
          'Staff views must strictly mask PII (email, phone, recipient name) and exclude street address.',
        criticality: 'BLOCKER',
      },
      {
        id: 'INV-C360-02',
        description:
          'Commercial spend totals must be hidden from frontline staff.',
        criticality: 'MAJOR',
      },
    ],
    failureThresholds: {
      maxResponseTimeMs: 2000,
      allowedErrorCodes: [200],
      disallowedErrorCodes: [403, 500],
    },
  },
  {
    id: 'J-STAFF-07',
    title: 'Inventory Restock & Safety Buffer',
    category: 'staff',
    actor: 'Operations / Store Manager',
    description:
      'Verify inventory stockout risk projections, dead stock findings, and review-only restock drafts.',
    automationType: 'playwright_e2e',
    primaryRoutes: ['/admin/inventory'],
    preconditions: ['Product catalog seeded with inventory counts'],
    steps: [
      {
        stepNumber: 1,
        description: 'Inspect restock recommendations and stockout risk tiers.',
        targetRoute: '/admin/inventory',
        httpMethod: 'GET',
        expectedStatusCode: 200,
        expectedSelectorOrAssertion:
          'Restock quantity draft and urgency badges render',
      },
    ],
    invariants: [
      {
        id: 'INV-INV-01',
        description:
          'Restock recommendations must be review-only drafts; zero automated purchase orders or mutations.',
        criticality: 'BLOCKER',
      },
    ],
    failureThresholds: {
      maxResponseTimeMs: 2500,
      allowedErrorCodes: [200],
      disallowedErrorCodes: [500],
    },
  },
];

/**
 * Lookup journey by ID.
 */
export function getJourneyById(id: string): JourneyDefinition | undefined {
  return CRITICAL_JOURNEYS.find((j) => j.id === id);
}

/**
 * Filter journeys by category.
 */
export function getJourneysByCategory(
  category: JourneyCategory
): JourneyDefinition[] {
  return CRITICAL_JOURNEYS.filter((j) => j.category === category);
}

/**
 * Validates integrity of a journey definition contract.
 */
export function validateJourneyContract(journey: JourneyDefinition): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!journey.id || !journey.id.startsWith('J-')) {
    errors.push(`Invalid journey ID format: ${journey.id}`);
  }

  if (!journey.title || journey.title.trim().length === 0) {
    errors.push('Journey title cannot be empty.');
  }

  if (!journey.steps || journey.steps.length === 0) {
    errors.push('Journey must define at least one step.');
  }

  if (!journey.invariants || journey.invariants.length === 0) {
    errors.push('Journey must define at least one invariant.');
  }

  if (
    !journey.failureThresholds ||
    journey.failureThresholds.maxResponseTimeMs <= 0
  ) {
    errors.push(
      'Journey must define positive maxResponseTimeMs failure threshold.'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
