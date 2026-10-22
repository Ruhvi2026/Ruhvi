export interface TaskTemplate {
  id: string;
  name: string;
  icon: string;
  departmentName: string;
  title: string;
  description: string;
  priority: string;
  tags: string[];
  checklists: string[];
}

export const OPERATION_TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: 'clear-platforms-9am',
    name: 'Clear All Platforms at 9 AM EST',
    icon: '🚚',
    departmentName: 'Shipping',
    title: 'Clear ALL PLATFORMS at 9AM EST',
    description:
      'Check all sales channels (Depop, Vinted, Shopify, 4seller), process overnight queues, and sync tracking info.',
    priority: 'High',
    tags: ['shipping', 'daily-sweep', 'cross-platform'],
    checklists: [
      'Log into Depop, check new sales & generate manifests',
      'Log into Vinted & download packing labels',
      'Verify Shopify pending fulfillment orders',
      'Cross-check 4seller inventory counts',
    ],
  },
  {
    id: 'clear-platforms-330pm',
    name: 'Clear All Platforms at 3:30 PM EST',
    icon: '📦',
    departmentName: 'Shipping',
    title: 'CLEAR ALL PLATFORMS at 3:30PM EST',
    description:
      'Afternoon fulfillment sweep before courier cutoff time. Ensure all ready orders are dispatched.',
    priority: 'High',
    tags: ['shipping', 'afternoon-cutoff', 'courier-dispatch'],
    checklists: [
      'Print afternoon courier pickup manifests',
      'Verify label barcodes with physical packages',
      'Hand over packages to delivery carrier',
      'Mark courier pickup confirmed in system',
    ],
  },
  {
    id: 'label-query-sheet',
    name: 'Fill Label Sent Query Sheet',
    icon: '📝',
    departmentName: 'Shipping',
    title: 'Please fillup the LABEL SENT QUERY sheet',
    description:
      'Fill in tracking numbers, weight discrepancies, and pending shipping queries for carrier resolution.',
    priority: 'Normal',
    tags: ['shipping', 'manifest', 'tracking-log'],
    checklists: [
      'Review pending carrier scan exceptions',
      'Log tracking numbers on dispute spreadsheet',
      'Notify customer support team for delayed shipments',
    ],
  },
  {
    id: 'update-orders-shopify',
    name: 'Update Orders to Shopify',
    icon: '🛍️',
    departmentName: 'Operations',
    title: 'Update orders to Shopify & sync tracking',
    description:
      'Export all marketplace orders and mark corresponding fulfillments inside Shopify admin.',
    priority: 'Normal',
    tags: ['shopify', 'operations', 'order-sync'],
    checklists: [
      'Sync multi-channel sales into Shopify admin',
      'Verify customer shipping addresses',
      'Dispatch automated shipping email notifications',
    ],
  },
  {
    id: 'inventory-audit',
    name: 'Weekly Low Stock Audit',
    icon: '🔍',
    departmentName: 'Inventory',
    title: 'Weekly Low Stock & Warehouse Physical Audit',
    description:
      'Audit items showing less than 5 units in stock. Reconcile warehouse physical bins with Ruhvi system stock.',
    priority: 'Important',
    tags: ['inventory', 'audit', 'stock-reconcile'],
    checklists: [
      'Export low stock report from inventory dashboard',
      'Physical count in warehouse shelves',
      'Adjust discrepancies in inventory management',
      'Notify procurement team for fast-moving items re-order',
    ],
  },
  {
    id: 'support-ticket-sweep',
    name: 'Daily Support Ticket Sweep',
    icon: '💬',
    departmentName: 'Support',
    title: 'Resolve pending customer support tickets',
    description:
      'Address all inquiries, size exchanges, order status queries, and delivery updates under 4-hour SLA.',
    priority: 'High',
    tags: ['customer-support', 'sla-sweep', 'returns'],
    checklists: [
      'Check VIP & Priya WhatsApp customer queries',
      'Resolve refund / return requests older than 24 hours',
      'Follow up on unresolved shipping address changes',
    ],
  },
];
