jest.mock('server-only', () => ({}));

const mockOrders = [
  {
    id: 'ord_1',
    order_number: 'RHV-1001',
    status: 'shipped',
    shipping_address: { city: 'Kolkata' },
    created_at: new Date().toISOString(),
  },
  {
    id: 'ord_2',
    order_number: 'RHV-1002',
    status: 'delivery_failed',
    shipping_address: { city: 'Mumbai' },
    created_at: new Date().toISOString(),
  },
  {
    id: 'ord_3',
    order_number: 'RHV-1003',
    status: 'delivered',
    shipping_address: { city: 'Bengaluru' },
    created_at: new Date().toISOString(),
  },
];

const mockReturns = [
  {
    id: 'ret_1',
    order_id: 'ord_4',
    reason: 'Size mismatch',
    status: 'requested',
    created_at: new Date().toISOString(),
  },
];

const mockCallRemarks = [
  {
    id: 'rem_1',
    order_id: 'ord_2',
    staff_name: 'Priya Mukherjee',
    department: 'support',
    call_status: 'rescheduled',
    remark_text: 'Customer requested delivery tomorrow evening.',
    created_at: new Date().toISOString(),
  },
];

const mockTrackingUpdates = [
  {
    id: 'trk_1',
    order_id: 'ord_1',
    awb_code: 'SR_AWB_1001',
    status: 'In Transit',
    location: 'Kolkata Hub',
    activity: 'Dispatched to delivery center',
    timestamp: new Date().toISOString(),
  },
  {
    id: 'trk_2',
    order_id: 'ord_3',
    awb_code: 'SR_AWB_1003',
    status: 'Delivered',
    location: 'Bengaluru West',
    activity: 'Delivered to customer',
    timestamp: new Date().toISOString(),
  },
];

const mockFrom = jest.fn((table: string) => {
  if (table === 'orders') {
    return {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: mockOrders, error: null }),
    };
  }
  if (table === 'returns') {
    return {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: mockReturns, error: null }),
    };
  }
  if (table === 'order_call_remarks') {
    return {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest
        .fn()
        .mockResolvedValue({ data: mockCallRemarks, error: null }),
    };
  }
  if (table === 'tracking_updates') {
    return {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest
        .fn()
        .mockResolvedValue({ data: mockTrackingUpdates, error: null }),
    };
  }
  return {
    select: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({ data: [], error: null }),
  };
});

jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

import { OrdersLogisticsWorker } from '../worker-13-orders-logistics';

describe('Worker 13: Orders & Logistics Worker', () => {
  let worker: OrdersLogisticsWorker;

  beforeEach(() => {
    worker = new OrdersLogisticsWorker();
    jest.clearAllMocks();
  });

  it('correctly declares worker identity and logistics focus', () => {
    expect(worker.id).toBe('worker_orders_logistics');
    expect(worker.name).toBe('Orders & Logistics Worker');
    expect(worker.priority).toBe('HIGH');

    const def = worker.getDefinition();
    expect(def.role).toContain('Fulfillment & Logistics');
    expect(def.responsibilities).toContain(
      'Strict financial secrecy: Gross sales, revenue values, and margins are strictly excluded'
    );
  });

  it('audits order pipeline, handles call collision, and reconciles Shiprocket courier tracking', async () => {
    const output = await worker.execute({
      task: 'Audit active fulfillment pipeline and courier tracking status',
    });

    expect(output.workerId).toBe('worker_orders_logistics');
    expect(output.findings.length).toBeGreaterThan(0);
    expect(output.data?.totalMonitoredOrders).toBe(3);
    expect(output.data?.activeReturnsCount).toBe(1);

    // Shiprocket tracking reconciliation
    const recon = output.data?.shiprocketReconciliation;
    expect(recon).toBeDefined();
    expect(recon?.reconciledTrackingCount).toBe(2);
    expect(recon?.recentTrackingAudits.length).toBe(2);
    expect(recon?.recentTrackingAudits[0].reconciled).toBe(true);

    expect(
      output.findings.some((f) =>
        f.includes('Shiprocket Tracking Reconciliation')
      )
    ).toBe(true);
    expect(
      output.evidence.some((e) =>
        e.includes('Shiprocket webhook updates ingested')
      )
    ).toBe(true);

    // Call remarks check: ord_2 was rescheduled, so unhandled count is 0
    expect(output.data?.unhandledFailedDeliveries.length).toBe(0);
    expect(output.executiveVoiceSummary).toContain(
      'Fulfillment pipeline status'
    );
  });

  it('handles database exception gracefully without leaking unhandled exceptions', async () => {
    mockFrom.mockImplementationOnce(() => {
      throw new Error('Database connection failed');
    });

    const output = await worker.execute({
      task: 'Check orders pipeline',
    });

    expect(output.executionStatus).toBe('failed');
    expect(output.evidence[0]).toContain('Database connection failed');
  });
});
