jest.mock('server-only', () => ({}));

jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(),
}));

import { getServiceClient } from '@/lib/supabase/service';
import {
  getCustomer360Profile,
  Customer360ForbiddenError,
  Customer360NotFoundError,
} from '../customer-360-service';

describe('Customer 360 Read Service (Track F - Phase 32)', () => {
  const targetCustomerId = 'usr_alice_001';

  const mockUserRow = {
    id: targetCustomerId,
    full_name: 'Alice Roy',
    email: 'alice@example.com',
    phone: '+919830111111',
    email_verified: true,
    phone_verified: true,
    role: 'customer',
    wallet_balance: 150.0,
    reward_coins: 350,
    dob: '1995-08-15',
    anniversary_date: '2022-12-04',
    referral_code: 'ALICE2026',
    created_at: '2026-01-10T10:00:00.000Z',
    account_status: 'active',
  };

  const mockAddressRow = {
    city: 'Kolkata',
    state: 'West Bengal',
    pincode: '700034',
    is_default: true,
  };

  const mockOrdersRows = [
    {
      id: 'ord_101',
      order_number: 'RHV-2026-1001',
      status: 'delivered',
      total: 12500.0,
      payment_method: 'upi',
      created_at: '2026-03-01T12:00:00.000Z',
    },
    {
      id: 'ord_102',
      order_number: 'RHV-2026-1002',
      status: 'processing',
      total: 8200.0,
      payment_method: 'card',
      created_at: '2026-04-15T14:30:00.000Z',
    },
  ];

  const mockWishlistRows = [
    {
      product_id: 'prod_solitaire_ring',
      created_at: '2026-04-10T09:00:00.000Z',
      products: {
        id: 'prod_solitaire_ring',
        name: 'Solitaire Gold Ring',
        price: 24000.0,
      },
    },
  ];

  const mockCartRow = {
    id: 'cart_001',
    updated_at: '2026-04-20T16:00:00.000Z',
    cart_items: [
      { quantity: 2, price_at_add: 4500.0 },
      { quantity: 1, price_at_add: 12000.0 },
    ],
  };

  const mockSupportRows = [
    {
      id: 'tick_001',
      ticket_number: 'TCK-2026-001',
      title: 'Ring sizing query',
      priority: 'normal',
      status: 'open',
      created_at: '2026-04-18T10:00:00.000Z',
      updated_at: '2026-04-18T11:00:00.000Z',
    },
    {
      id: 'tick_002',
      ticket_number: 'TCK-2026-002',
      title: 'Packaging feedback',
      priority: 'low',
      status: 'resolved',
      created_at: '2026-02-12T10:00:00.000Z',
      updated_at: '2026-02-13T12:00:00.000Z',
    },
  ];

  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn((table: string) => {
        switch (table) {
          case 'users':
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest
                    .fn()
                    .mockResolvedValue({ data: mockUserRow, error: null }),
                }),
              }),
            };
          case 'addresses':
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                      maybeSingle: jest
                        .fn()
                        .mockResolvedValue({
                          data: mockAddressRow,
                          error: null,
                        }),
                    }),
                  }),
                }),
              }),
            };
          case 'orders':
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    limit: jest
                      .fn()
                      .mockResolvedValue({ data: mockOrdersRows, error: null }),
                  }),
                }),
              }),
            };
          case 'wishlists':
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    limit: jest
                      .fn()
                      .mockResolvedValue({
                        data: mockWishlistRows,
                        error: null,
                      }),
                  }),
                }),
              }),
            };
          case 'carts':
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest
                    .fn()
                    .mockResolvedValue({ data: mockCartRow, error: null }),
                }),
              }),
            };
          case 'support_tickets':
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    limit: jest
                      .fn()
                      .mockResolvedValue({
                        data: mockSupportRows,
                        error: null,
                      }),
                  }),
                }),
              }),
            };
          default:
            return {};
        }
      }),
    };

    (getServiceClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('Server-Side Role-Based Access Control', () => {
    it('blocks customer from querying another customer profile', async () => {
      await expect(
        getCustomer360Profile({
          targetCustomerId: 'usr_alice_001',
          requestedByActor: {
            actorId: 'usr_bob_002', // Bob trying to view Alice!
            role: 'customer',
          },
        })
      ).rejects.toThrow(Customer360ForbiddenError);

      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('allows customer to query their own Customer 360 profile with unmasked data', async () => {
      const result = await getCustomer360Profile({
        targetCustomerId: 'usr_alice_001',
        requestedByActor: {
          actorId: 'usr_alice_001', // Alice viewing self
          role: 'customer',
        },
      });

      expect(result.profile.id).toBe('usr_alice_001');
      expect(result.profile.fullName).toBe('Alice Roy');
      expect(result.profile.email).toBe('alice@example.com');
      expect(result.profile.phone).toBe('+919830111111');
      expect(result.metadata.piiMasked).toBe(false);
      expect(result.orderSummary.totalLifetimeSpend).toBe(20700.0);
    });

    it('allows frontline staff lookup with mandatory PII masking and hidden financial margins', async () => {
      const result = await getCustomer360Profile({
        targetCustomerId: 'usr_alice_001',
        requestedByActor: {
          actorId: 'staff_usr_88',
          role: 'staff',
        },
      });

      // PII must be masked
      expect(result.profile.fullName).toBe('Alice R.');
      expect(result.profile.email).toBe('a•••@example.com');
      expect(result.profile.phone).toBe('+919830••••11');
      expect(result.metadata.piiMasked).toBe(true);

      // Commercial totals must be withheld for staff
      expect(result.orderSummary.totalLifetimeSpend).toBeUndefined();
      expect(result.orderSummary.averageOrderValue).toBeUndefined();

      // Basic operational order count remains visible
      expect(result.orderSummary.totalOrders).toBe(2);
    });

    it('allows administrator full unmasked access and commercial totals', async () => {
      const result = await getCustomer360Profile({
        targetCustomerId: 'usr_alice_001',
        requestedByActor: {
          actorId: 'admin_usr_01',
          role: 'admin',
        },
      });

      expect(result.profile.fullName).toBe('Alice Roy');
      expect(result.profile.email).toBe('alice@example.com');
      expect(result.profile.phone).toBe('+919830111111');
      expect(result.metadata.piiMasked).toBe(false);
      expect(result.orderSummary.totalLifetimeSpend).toBe(20700.0);
      expect(result.orderSummary.averageOrderValue).toBe(10350.0);
    });
  });

  describe('Authoritative Field Assembly & Privacy Guards', () => {
    it('assembles delivery region without exposing street address line1/line2', async () => {
      const result = await getCustomer360Profile({
        targetCustomerId: 'usr_alice_001',
        requestedByActor: {
          actorId: 'admin_usr_01',
          role: 'admin',
        },
      });

      expect(result.preferences.primaryRegion).toEqual({
        city: 'Kolkata',
        state: 'West Bengal',
        pincode: '700034',
      });
      // Verification: street house lines are not present in preferences
      expect((result.preferences.primaryRegion as any).line1).toBeUndefined();
    });

    it('assembles wishlist items and cart totals accurately', async () => {
      const result = await getCustomer360Profile({
        targetCustomerId: 'usr_alice_001',
        requestedByActor: {
          actorId: 'admin_usr_01',
          role: 'admin',
        },
      });

      expect(result.wishlist.count).toBe(1);
      expect(result.wishlist.items[0]).toEqual({
        productId: 'prod_solitaire_ring',
        productName: 'Solitaire Gold Ring',
        price: 24000.0,
        addedAt: '2026-04-10T09:00:00.000Z',
      });

      expect(result.cart.hasActiveCart).toBe(true);
      expect(result.cart.itemsCount).toBe(3); // 2 + 1
      expect(result.cart.cartTotal).toBe(21000.0); // (2 * 4500) + (1 * 12000)
    });

    it('assembles support tickets with open tickets count', async () => {
      const result = await getCustomer360Profile({
        targetCustomerId: 'usr_alice_001',
        requestedByActor: {
          actorId: 'admin_usr_01',
          role: 'admin',
        },
      });

      expect(result.support.totalTicketsCount).toBe(2);
      expect(result.support.openTicketsCount).toBe(1); // 'open' ticket
      expect(result.support.recentTickets[0].ticketNumber).toBe('TCK-2026-001');
    });

    it('provides data freshness timestamps across all queried surfaces', async () => {
      const result = await getCustomer360Profile({
        targetCustomerId: 'usr_alice_001',
        requestedByActor: {
          actorId: 'admin_usr_01',
          role: 'admin',
        },
      });

      expect(result.metadata.freshness.profileFetchedAt).toBeDefined();
      expect(result.metadata.freshness.ordersFetchedAt).toBeDefined();
      expect(result.metadata.freshness.wishlistFetchedAt).toBeDefined();
      expect(result.metadata.freshness.cartFetchedAt).toBeDefined();
      expect(result.metadata.freshness.supportFetchedAt).toBeDefined();
    });

    it('throws Customer360NotFoundError if customer does not exist in users table', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest
                  .fn()
                  .mockResolvedValue({ data: null, error: null }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  maybeSingle: jest
                    .fn()
                    .mockResolvedValue({ data: null, error: null }),
                }),
              }),
              maybeSingle: jest
                .fn()
                .mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      });

      await expect(
        getCustomer360Profile({
          targetCustomerId: 'usr_non_existent',
          requestedByActor: {
            actorId: 'admin_usr_01',
            role: 'admin',
          },
        })
      ).rejects.toThrow(Customer360NotFoundError);
    });
  });
});
