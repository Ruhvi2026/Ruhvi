jest.mock('server-only', () => ({}));

jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(),
}));

jest.mock('@/lib/audit', () => ({
  logAuditEvent: jest.fn().mockResolvedValue(undefined),
}));

import { getServiceClient } from '@/lib/supabase/service';
import { logAuditEvent } from '@/lib/audit';
import {
  executeApprovedAction,
  ALLOWLISTED_ACTION_TYPE,
  type ExecuteActionOptions,
} from '../action-executor';
import {
  createActionProposal,
  approveActionProposal,
  type ActionPayloadSpec,
  type ApproverAttribution,
} from '../approval-policy';

describe('Narrowly Allowlisted Action Executor (Track E - Phase 30)', () => {
  const humanAdminApprover: ApproverAttribution = {
    actorId: 'admin_usr_001',
    actorEmail: 'admin@ruhvi.in',
    actorRole: 'admin',
    actorType: 'human',
    approvedAt: '2026-10-26T12:00:00.000Z',
  };

  const validPayload: ActionPayloadSpec = {
    actionType: ALLOWLISTED_ACTION_TYPE,
    targetEntity: { type: 'product', id: 'prod_bangles_999' },
    parameters: {
      lowStockThreshold: 15,
      reason: 'Festive season demand spike observed in regional clusters',
    },
    version: 1,
  };

  const createApprovedProposal = (
    payload = validPayload,
    approver = humanAdminApprover
  ) => {
    const proposal = createActionProposal({
      recommendationId: 'rec_diwali_buffer_01',
      title: 'Adjust buffer for safety stock',
      category: 'inventory',
      impactTier: 'inventory_operational',
      actionType: payload.actionType,
      targetEntity: payload.targetEntity,
      parameters: payload.parameters,
    });

    return approveActionProposal(proposal, approver, payload);
  };

  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn(),
    };
    (getServiceClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('Strict Allowlist & Parameter Verification', () => {
    it('rejects unallowlisted arbitrary action types immediately', async () => {
      const unallowlistedPayload: ActionPayloadSpec = {
        actionType: 'execute_arbitrary_shell_command',
        targetEntity: { type: 'system', id: 'host' },
        parameters: { command: 'rm -rf /' },
        version: 1,
      };

      const proposal = createApprovedProposal(unallowlistedPayload);

      const result = await executeApprovedAction({
        proposal,
        executorActorId: 'admin_usr_001',
        executorRole: 'admin',
        executionPayload: unallowlistedPayload,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain(
        'is not in the approved executor allowlist'
      );
      expect(mockSupabase.from).not.toHaveBeenCalled();
      expect(logAuditEvent).not.toHaveBeenCalled();
    });

    it('rejects invalid lowStockThreshold values outside 1-100 range', async () => {
      const invalidThresholdPayload: ActionPayloadSpec = {
        actionType: ALLOWLISTED_ACTION_TYPE,
        targetEntity: { type: 'product', id: 'prod_ring_123' },
        parameters: { lowStockThreshold: 150 }, // Exceeds 100
        version: 1,
      };

      const proposal = createApprovedProposal(invalidThresholdPayload);

      const result = await executeApprovedAction({
        proposal,
        executorActorId: 'admin_usr_001',
        executorRole: 'admin',
        executionPayload: invalidThresholdPayload,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain(
        'Invalid lowStockThreshold: must be an integer between 1 and 100'
      );
      expect(result.proposal.state).toBe('failed');
    });

    it('rejects non-integer lowStockThreshold values', async () => {
      const floatPayload: ActionPayloadSpec = {
        actionType: ALLOWLISTED_ACTION_TYPE,
        targetEntity: { type: 'product', id: 'prod_ring_123' },
        parameters: { lowStockThreshold: 12.5 },
        version: 1,
      };

      const proposal = createApprovedProposal(floatPayload);

      const result = await executeApprovedAction({
        proposal,
        executorActorId: 'admin_usr_001',
        executorRole: 'admin',
        executionPayload: floatPayload,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid lowStockThreshold');
      expect(result.proposal.state).toBe('failed');
    });

    it('rejects missing or empty productId target entity', async () => {
      const emptyEntityPayload: ActionPayloadSpec = {
        actionType: ALLOWLISTED_ACTION_TYPE,
        targetEntity: { type: 'product', id: '' },
        parameters: { lowStockThreshold: 10 },
        version: 1,
      };

      const proposal = createApprovedProposal(emptyEntityPayload);

      const result = await executeApprovedAction({
        proposal,
        executorActorId: 'admin_usr_001',
        executorRole: 'admin',
        executionPayload: emptyEntityPayload,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain(
        'Invalid targetEntity: productId must be a non-empty string'
      );
      expect(result.proposal.state).toBe('failed');
    });
  });

  describe('Server-Side Policy Recheck & Security Guards', () => {
    it('rejects execution if the proposal is still in "proposed" state', async () => {
      const unapprovedProposal = createActionProposal({
        recommendationId: 'rec_pending_01',
        title: 'Pending buffer change',
        category: 'inventory',
        impactTier: 'inventory_operational',
        actionType: validPayload.actionType,
        targetEntity: validPayload.targetEntity,
        parameters: validPayload.parameters,
      });

      const result = await executeApprovedAction({
        proposal: unapprovedProposal,
        executorActorId: 'admin_usr_001',
        executorRole: 'admin',
        executionPayload: validPayload,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("must be 'approved'");
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('rejects execution if execution payload has been tampered with compared to approval hash', async () => {
      const proposal = createApprovedProposal();

      // Tampered payload with different threshold
      const tamperedPayload: ActionPayloadSpec = {
        ...validPayload,
        parameters: {
          ...validPayload.parameters,
          lowStockThreshold: 50, // Modified after approval!
        },
      };

      const result = await executeApprovedAction({
        proposal,
        executorActorId: 'admin_usr_001',
        executorRole: 'admin',
        executionPayload: tamperedPayload,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('PAYLOAD_TAMPERED');
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('rejects execution if executor has insufficient role privileges', async () => {
      const proposal = createApprovedProposal();

      const result = await executeApprovedAction({
        proposal,
        executorActorId: 'staff_usr_123',
        executorRole: 'staff', // Staff cannot execute inventory_operational tier
        executionPayload: validPayload,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('INSUFFICIENT_ROLE');
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });

  describe('Authoritative Database Operations & Readback Verification', () => {
    it('executes dry-run without mutating database or altering authoritative table', async () => {
      const proposal = createApprovedProposal();

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'prod_bangles_999',
              name: 'Royal Gold Bangle',
              low_stock_threshold: 5,
            },
            error: null,
          }),
        }),
      });

      const mockUpdate = jest.fn();

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: mockSelect,
            update: mockUpdate,
          };
        }
        return {};
      });

      const result = await executeApprovedAction({
        proposal,
        executorActorId: 'admin_usr_001',
        executorEmail: 'admin@ruhvi.in',
        executorRole: 'admin',
        executionPayload: validPayload,
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.verifiedBefore).toEqual({
        id: 'prod_bangles_999',
        name: 'Royal Gold Bangle',
        low_stock_threshold: 5,
      });
      expect(result.verifiedAfter).toEqual({
        id: 'prod_bangles_999',
        name: 'Royal Gold Bangle',
        low_stock_threshold: 15,
        simulated: true,
      });
      expect(result.proposal.state).toBe('completed');
      expect(result.proposal.executionHistory.sanitizedResultSummary).toContain(
        '[DRY-RUN]'
      );

      // Crucial: update must NOT be called in dry run
      expect(mockUpdate).not.toHaveBeenCalled();

      // Audit must record dry-run
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'dry_run_update_inventory_safety_buffer',
          entityId: 'prod_bangles_999',
        })
      );
    });

    it('performs live mutation and verifies authoritative readback', async () => {
      const proposal = createApprovedProposal();

      let callCount = 0;
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockImplementation(async () => {
            callCount++;
            if (callCount === 1) {
              // Initial read before mutation
              return {
                data: {
                  id: 'prod_bangles_999',
                  name: 'Royal Gold Bangle',
                  low_stock_threshold: 5,
                },
                error: null,
              };
            }
            // Readback after mutation
            return {
              data: {
                id: 'prod_bangles_999',
                name: 'Royal Gold Bangle',
                low_stock_threshold: 15,
              },
              error: null,
            };
          }),
        }),
      });

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: mockSelect,
            update: mockUpdate,
          };
        }
        return {};
      });

      const result = await executeApprovedAction({
        proposal,
        executorActorId: 'admin_usr_001',
        executorEmail: 'admin@ruhvi.in',
        executorRole: 'admin',
        executionPayload: validPayload,
        dryRun: false,
      });

      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(false);
      expect(result.verifiedBefore?.low_stock_threshold).toBe(5);
      expect(result.verifiedAfter?.low_stock_threshold).toBe(15);
      expect(result.proposal.state).toBe('completed');
      expect(result.proposal.executionHistory.sanitizedResultSummary).toContain(
        'Successfully updated product'
      );

      // Verified live mutation occurred
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          low_stock_threshold: 15,
        })
      );

      // Verified immutable audit event was logged
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          portal: 'operations',
          action: 'update_inventory_safety_buffer',
          entityType: 'product',
          entityId: 'prod_bangles_999',
          changes: expect.objectContaining({
            before: expect.objectContaining({ low_stock_threshold: 5 }),
            after: expect.objectContaining({ low_stock_threshold: 15 }),
          }),
        })
      );
    });

    it('fails if target product does not exist in authoritative catalog', async () => {
      const proposal = createApprovedProposal();

      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Row not found' },
            }),
          }),
        }),
      }));

      const result = await executeApprovedAction({
        proposal,
        executorActorId: 'admin_usr_001',
        executorRole: 'admin',
        executionPayload: validPayload,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Authoritative product lookup failed');
      expect(result.proposal.state).toBe('failed');
    });

    it('fails and transitions proposal to "failed" if readback value mismatches', async () => {
      const proposal = createApprovedProposal();

      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockImplementation(async () => {
                  callCount++;
                  if (callCount === 1) {
                    return {
                      data: {
                        id: 'prod_bangles_999',
                        name: 'Royal Gold Bangle',
                        low_stock_threshold: 5,
                      },
                      error: null,
                    };
                  }
                  // Corrupted or rolled-back readback
                  return {
                    data: {
                      id: 'prod_bangles_999',
                      name: 'Royal Gold Bangle',
                      low_stock_threshold: 5,
                    }, // Stale!
                    error: null,
                  };
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return {};
      });

      const result = await executeApprovedAction({
        proposal,
        executorActorId: 'admin_usr_001',
        executorRole: 'admin',
        executionPayload: validPayload,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Authoritative verification mismatch');
      expect(result.proposal.state).toBe('failed');
    });

    it('handles database timeout guard gracefully', async () => {
      const proposal = createApprovedProposal();

      // Simulate a hung database query
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: () => new Promise((resolve) => setTimeout(resolve, 500)),
          }),
        }),
      }));

      const result = await executeApprovedAction({
        proposal,
        executorActorId: 'admin_usr_001',
        executorRole: 'admin',
        executionPayload: validPayload,
        timeoutMs: 50, // 50ms timeout
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Action execution timed out after 50ms');
      expect(result.proposal.state).toBe('failed');
    });
  });
});
