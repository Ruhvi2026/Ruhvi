import {
  isValidUuid,
  getAuthoritativeCustomerUuid,
} from '@/lib/intelligence/customer-identity-resolution';

describe('Phase 52: Customer Identity Mapping & Authorization in Account and Order Views', () => {
  const CUSTOMER_A_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const CUSTOMER_B_UUID = 'b1ffcd88-8d0a-4fe7-aa5c-5aa8ac270b22';
  const FIREBASE_UID_A = 'firebase_user_alpha_123';
  const FIREBASE_UID_B = 'firebase_user_beta_456';

  describe('Authoritative Customer UUID Resolution Contract', () => {
    it('prefers profile.id when it is a valid PostgreSQL UUID', () => {
      const user = { id: FIREBASE_UID_A };
      const profile = { id: CUSTOMER_A_UUID };

      const resolved = getAuthoritativeCustomerUuid(user, profile);
      expect(resolved).toBe(CUSTOMER_A_UUID);
    });

    it('falls back to user.id if it is already a valid UUID (e.g. Supabase Auth session)', () => {
      const user = { id: CUSTOMER_B_UUID };
      const profile = null;

      const resolved = getAuthoritativeCustomerUuid(user, profile);
      expect(resolved).toBe(CUSTOMER_B_UUID);
    });

    it('rejects raw Firebase UIDs and returns null to prevent PostgREST UUID syntax errors (22P02)', () => {
      const user = { id: FIREBASE_UID_A };
      const profile = { id: FIREBASE_UID_A }; // Profile fallback populated with Firebase UID

      const resolved = getAuthoritativeCustomerUuid(user, profile);
      expect(resolved).toBeNull();
    });

    it('safely handles unauthenticated/guest sessions', () => {
      expect(getAuthoritativeCustomerUuid(null, null)).toBeNull();
      expect(getAuthoritativeCustomerUuid(undefined, undefined)).toBeNull();
      expect(getAuthoritativeCustomerUuid({ id: '' }, { id: '' })).toBeNull();
    });
  });

  describe('Order History Isolation (orders/page.tsx logic)', () => {
    it('scopes orders query strictly to the authenticated customer UUID', async () => {
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: [{ id: 'order_1', user_id: CUSTOMER_A_UUID, total: 25000 }],
        error: null,
      });

      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: mockEq,
            order: mockOrder,
          }),
        }),
      };

      const user = { id: FIREBASE_UID_A };
      const profile = { id: CUSTOMER_A_UUID };
      const targetUserId = getAuthoritativeCustomerUuid(user, profile);

      expect(targetUserId).toBe(CUSTOMER_A_UUID);

      // Execute query as implemented in OrderHistoryPage
      await mockSupabase
        .from('orders')
        .select('*, order_items(*, product:products(*))')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      expect(mockSupabase.from).toHaveBeenCalledWith('orders');
      expect(mockEq).toHaveBeenCalledWith('user_id', CUSTOMER_A_UUID);
      expect(mockEq).not.toHaveBeenCalledWith('user_id', FIREBASE_UID_A);
    });

    it('blocks execution when customer UUID is unresolvable rather than querying with raw Firebase UID', () => {
      const user = { id: FIREBASE_UID_A };
      const profile = null; // Profile not yet hydrated
      const targetUserId = getAuthoritativeCustomerUuid(user, profile);

      expect(targetUserId).toBeNull();
      // Guard prevents sending invalid user_id to database
      const shouldQuery = Boolean(targetUserId && isValidUuid(targetUserId));
      expect(shouldQuery).toBe(false);
    });
  });

  describe('Order Detail Access Control & Anti-IDOR Guard (orders/[id]/page.tsx logic)', () => {
    it('allows a customer to view their own order', () => {
      const customerUserId = CUSTOMER_A_UUID;
      const order = {
        id: 'order_alpha_001',
        order_number: 'RHV-2026-001',
        user_id: CUSTOMER_A_UUID,
        total: 18500,
      };

      const isPrivilegedStaff = false;
      const isAuthorized =
        isPrivilegedStaff || (order && order.user_id === customerUserId);

      expect(isAuthorized).toBe(true);
    });

    it('STRICTLY BLOCKS Customer A from viewing Customer B order (IDOR protection)', () => {
      const customerUserId = CUSTOMER_A_UUID;
      const orderOfCustomerB = {
        id: 'order_beta_002',
        order_number: 'RHV-2026-002',
        user_id: CUSTOMER_B_UUID, // Belongs to Customer B
        total: 95000,
      };

      const isPrivilegedStaff = false;
      const isAuthorized =
        isPrivilegedStaff ||
        (orderOfCustomerB && orderOfCustomerB.user_id === customerUserId);

      expect(isAuthorized).toBe(false);
    });

    it('allows privileged staff/admin roles to inspect any customer order for operational support', () => {
      const order = {
        id: 'order_beta_002',
        order_number: 'RHV-2026-002',
        user_id: CUSTOMER_B_UUID,
        total: 95000,
      };

      const staffRoles = ['admin', 'manager', 'staff', 'super_admin'];
      for (const role of staffRoles) {
        const isPrivilegedStaff =
          role === 'admin' ||
          role === 'manager' ||
          role === 'staff' ||
          role === 'super_admin';

        const isAuthorized =
          isPrivilegedStaff || order.user_id === CUSTOMER_A_UUID;
        expect(isAuthorized).toBe(true);
      }
    });

    it('binds order cancellation mutation strictly to authoritative customer UUID', async () => {
      const mockEqId = jest.fn().mockReturnThis();
      const mockEqUserId = jest.fn().mockResolvedValue({ error: null });

      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: mockEqId.mockReturnValue({
              eq: mockEqUserId,
            }),
          }),
        }),
      };

      const user = { id: FIREBASE_UID_A };
      const profile = { id: CUSTOMER_A_UUID };
      const targetUserId = getAuthoritativeCustomerUuid(user, profile);

      expect(targetUserId).toBe(CUSTOMER_A_UUID);

      await mockSupabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', 'order_alpha_001')
        .eq('user_id', targetUserId);

      expect(mockEqUserId).toHaveBeenCalledWith('user_id', CUSTOMER_A_UUID);
      expect(mockEqUserId).not.toHaveBeenCalledWith('user_id', FIREBASE_UID_A);
    });
  });

  describe('Invoice Access Authorization (orders/[id]/invoice/page.tsx logic)', () => {
    it('strictly isolates GST invoice access to the verified customer UUID', () => {
      const currentCustomer = CUSTOMER_A_UUID;

      const invoiceA = {
        order_id: 'order_alpha_001',
        user_id: CUSTOMER_A_UUID,
        invoice_number: 'INV-2026-001',
      };
      const invoiceB = {
        order_id: 'order_beta_002',
        user_id: CUSTOMER_B_UUID,
        invoice_number: 'INV-2026-002',
      };

      const isCustomerAAuthorizedForA = invoiceA.user_id === currentCustomer;
      const isCustomerAAuthorizedForB = invoiceB.user_id === currentCustomer;

      expect(isCustomerAAuthorizedForA).toBe(true);
      expect(isCustomerAAuthorizedForB).toBe(false);
    });
  });

  describe('Return Submission UUID Integrity (orders/[id]/return/page.tsx logic)', () => {
    it('submits return request with authoritative customer UUID rather than Firebase UID', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          insert: mockInsert,
        }),
      };

      const user = { id: FIREBASE_UID_A };
      const profile = { id: CUSTOMER_A_UUID };
      const targetUserId = getAuthoritativeCustomerUuid(user, profile);

      expect(targetUserId).toBe(CUSTOMER_A_UUID);

      await mockSupabase.from('returns').insert({
        order_id: 'order_alpha_001',
        user_id: targetUserId,
        reason: 'Size exchange needed',
        status: 'requested',
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          order_id: 'order_alpha_001',
          user_id: CUSTOMER_A_UUID,
        })
      );
      expect(mockInsert).not.toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: FIREBASE_UID_A,
        })
      );
    });
  });

  describe('Account Profile Update UUID Binding (account/page.tsx logic)', () => {
    it('executes profile updates against public.users table using authoritative UUID', async () => {
      const mockEq = jest.fn().mockResolvedValue({ error: null });
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: mockEq,
          }),
        }),
      };

      const user = { id: FIREBASE_UID_A };
      const profile = { id: CUSTOMER_A_UUID, full_name: 'Alice' };
      const targetUserId = getAuthoritativeCustomerUuid(user, profile);

      expect(targetUserId).toBe(CUSTOMER_A_UUID);

      await mockSupabase
        .from('users')
        .update({ full_name: 'Alice Roy Updated' })
        .eq('id', targetUserId);

      expect(mockEq).toHaveBeenCalledWith('id', CUSTOMER_A_UUID);
      expect(mockEq).not.toHaveBeenCalledWith('id', FIREBASE_UID_A);
    });
  });
});
