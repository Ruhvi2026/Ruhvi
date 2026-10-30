import { POST } from '../route';
import crypto from 'crypto';

jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(),
}));

jest.mock('@/lib/orders/status-engine', () => ({
  transitionOrder: jest.fn(),
}));

jest.mock('@/lib/intelligence/order-lifecycle', () => ({
  observeOrderLifecycleTransition: jest.fn(),
}));

import { getServiceClient } from '@/lib/supabase/service';
import { transitionOrder } from '@/lib/orders/status-engine';
import { observeOrderLifecycleTransition } from '@/lib/intelligence/order-lifecycle';

describe('Shiprocket Webhook Endpoint (P1.4 Canonical Observer Wiring)', () => {
  const SECRET = 'test_sr_webhook_secret_12345';
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SHIPROCKET_WEBHOOK_SECRET = SECRET;

    mockSupabase = {
      from: jest.fn(),
    };
    (getServiceClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    delete process.env.SHIPROCKET_WEBHOOK_SECRET;
  });

  it('fails closed when SHIPROCKET_WEBHOOK_SECRET is not configured', async () => {
    delete process.env.SHIPROCKET_WEBHOOK_SECRET;

    const req = new Request('http://localhost:3000/api/webhooks/shiprocket', {
      method: 'POST',
      body: JSON.stringify({ awb: 'SR_AWB_001' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toMatch(/not configured/i);
  });

  it('rejects requests with missing signature header', async () => {
    const req = new Request('http://localhost:3000/api/webhooks/shiprocket', {
      method: 'POST',
      body: JSON.stringify({ awb: 'SR_AWB_001' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/missing shiprocket signature/i);
  });

  it('rejects requests with forged/invalid HMAC signature', async () => {
    const rawBody = JSON.stringify({
      awb: 'SR_AWB_001',
      current_status: 'DELIVERED',
    });
    const req = new Request('http://localhost:3000/api/webhooks/shiprocket', {
      method: 'POST',
      headers: {
        'x-shiprocket-signature': 'forged_invalid_signature',
      },
      body: rawBody,
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/invalid webhook signature/i);
  });

  it('processes verified webhook, transitions order status, and calls canonical lifecycle observer', async () => {
    const payload = {
      awb: 'SR_AWB_99999',
      order_id: 'RUV-2026-9001',
      current_status: 'DELIVERED',
      courier_name: 'BlueDart Express',
    };
    const rawBody = JSON.stringify(payload);
    const validHmac = crypto
      .createHmac('sha256', SECRET)
      .update(rawBody)
      .digest('hex');

    const mockSelect = jest.fn().mockReturnThis();
    const mockOr = jest.fn().mockReturnThis();
    const mockMaybeSingle = jest.fn().mockResolvedValue({
      data: {
        id: 'ord_99999',
        order_number: 'RUV-2026-9001',
        status: 'shipped',
      },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
      or: mockOr,
      maybeSingle: mockMaybeSingle,
    });
    mockSelect.mockReturnValue({ or: mockOr });
    mockOr.mockReturnValue({ maybeSingle: mockMaybeSingle });

    (transitionOrder as jest.Mock).mockResolvedValue({
      ok: true,
      status: 'delivered',
    });
    (observeOrderLifecycleTransition as jest.Mock).mockResolvedValue({
      observed: true,
      isDuplicate: false,
      persistedToEventLog: true,
    });

    const req = new Request('http://localhost:3000/api/webhooks/shiprocket', {
      method: 'POST',
      headers: {
        'x-shiprocket-signature': validHmac,
      },
      body: rawBody,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    // Verify transitionOrder was called to move order to delivered
    expect(transitionOrder).toHaveBeenCalledWith({
      orderId: 'ord_99999',
      newStatus: 'delivered',
      metadata: {
        courier_name: 'BlueDart Express',
        awb_code: 'SR_AWB_99999',
        shiprocket_status: 'DELIVERED',
      },
    });

    // Verify canonical lifecycle observer was called with webhook_shiprocket source
    expect(observeOrderLifecycleTransition).toHaveBeenCalledWith({
      orderId: 'ord_99999',
      orderNumber: 'RUV-2026-9001',
      fromStatus: 'shipped',
      toStatus: 'delivered',
      actor: { type: 'webhook', id: 'shiprocket' },
      source: 'webhook_shiprocket',
      metadata: {
        courier_name: 'BlueDart Express',
        awb_code: 'SR_AWB_99999',
        shiprocket_status: 'DELIVERED',
      },
    });
  });
});
