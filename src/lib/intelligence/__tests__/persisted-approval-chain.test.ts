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
  ALLOWLISTED_ACTION_TYPE,
  createPersistedActionProposal,
  approvePersistedActionProposal,
  rejectPersistedActionProposal,
  executePersistedApprovedAction,
} from '../action-executor';
import type {
  ApproverAttribution,
  ActionPayloadSpec,
} from '../approval-policy';

describe('Phase 48: Persisted Human-Approval State Machine Verification', () => {
  const humanAdminApprover: ApproverAttribution = {
    actorId: 'admin_usr_001',
    actorEmail: 'admin@ruhvi.in',
    actorRole: 'admin',
    actorType: 'human',
    approvedAt: '2026-10-31T10:00:00.000Z',
  };

  const humanStaffApprover: ApproverAttribution = {
    actorId: 'staff_usr_002',
    actorEmail: 'staff@ruhvi.in',
    actorRole: 'staff',
    actorType: 'human',
    approvedAt: '2026-10-31T10:00:00.000Z',
  };

  const aiApprover: ApproverAttribution = {
    actorId: 'agent_co_founder',
    actorEmail: 'agent@ruhvi.internal',
    actorRole: 'super_admin',
    actorType: 'ai' as any,
    approvedAt: '2026-10-31T10:00:00.000Z',
  };

  const validPayload: ActionPayloadSpec = {
    actionType: ALLOWLISTED_ACTION_TYPE,
    targetEntity: { type: 'product', id: 'prod_necklace_gold_101' },
    parameters: {
      lowStockThreshold: 12,
      reason: 'Wedding season velocity surge',
    },
    version: 1,
  };

  let mockSupabase: any;
  let mockApprovalStore: Record<string, any>;
  let mockProductStore: Record<string, any>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockApprovalStore = {};
    mockProductStore = {
      prod_necklace_gold_101: {
        id: 'prod_necklace_gold_101',
        name: 'Bridal Heritage Gold Necklace',
        low_stock_threshold: 4,
      },
    };

    mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'co_founder_approvals') {
          return {
            insert: jest.fn((record: any) => ({
              select: jest.fn(() => ({
                single: jest.fn(async () => {
                  const id = `appr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                  const fullRecord = {
                    id,
                    ...record,
                    created_at: record.created_at || new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  };
                  mockApprovalStore[id] = fullRecord;
                  return { data: { id }, error: null };
                }),
              })),
            })),
            select: jest.fn(() => {
              let currentRows = Object.values(mockApprovalStore);
              const builder: any = {
                eq: jest.fn((col: string, val: any) => {
                  currentRows = currentRows.filter((r: any) => r[col] === val);
                  return builder;
                }),
                maybeSingle: jest.fn(async () => {
                  if (currentRows.length === 0)
                    return { data: null, error: null };
                  return { data: { ...currentRows[0] }, error: null };
                }),
                single: jest.fn(async () => {
                  if (currentRows.length === 0) {
                    return { data: null, error: { message: 'Row not found' } };
                  }
                  return { data: { ...currentRows[0] }, error: null };
                }),
              };
              return builder;
            }),
            update: jest.fn((updates: any) => ({
              eq: jest.fn(async (col: string, val: string) => {
                if (col === 'id' && mockApprovalStore[val]) {
                  mockApprovalStore[val] = {
                    ...mockApprovalStore[val],
                    ...updates,
                  };
                  return { error: null };
                }
                return { error: null };
              }),
            })),
          };
        }

        if (table === 'products') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn((col: string, val: string) => ({
                single: jest.fn(async () => {
                  if (col === 'id') {
                    const prod = mockProductStore[val];
                    if (!prod)
                      return {
                        data: null,
                        error: { message: 'Product not found' },
                      };
                    return { data: { ...prod }, error: null };
                  }
                  return { data: null, error: { message: 'Not found' } };
                }),
              })),
            })),
            update: jest.fn((updates: any) => ({
              eq: jest.fn(async (col: string, val: string) => {
                if (col === 'id' && mockProductStore[val]) {
                  mockProductStore[val] = {
                    ...mockProductStore[val],
                    ...updates,
                  };
                  return { error: null };
                }
                return { error: null };
              }),
            })),
          };
        }

        return {};
      }),
    };

    (getServiceClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('1. Proposal Creation & Strict Allowlist Protection', () => {
    it('creates and persists a valid low-risk proposal in co_founder_approvals table', async () => {
      const res = await createPersistedActionProposal({
        title: 'Adjust Bridal Necklace Buffer',
        actionType: ALLOWLISTED_ACTION_TYPE,
        productId: 'prod_necklace_gold_101',
        lowStockThreshold: 12,
        reason: 'Wedding season velocity surge',
      });

      expect(res.success).toBe(true);
      expect(res.proposalId).toBeDefined();
      expect(res.proposal?.state).toBe('proposed');

      const savedRow = mockApprovalStore[res.proposalId!];
      expect(savedRow).toBeDefined();
      expect(savedRow.action_type).toBe(ALLOWLISTED_ACTION_TYPE);
      expect(savedRow.status).toBe('pending');
      expect(savedRow.risk_level).toBe('low');
      expect(savedRow.idempotency_key).toContain(ALLOWLISTED_ACTION_TYPE);
      expect(savedRow.action_payload.payloadHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('strictly prohibits unallowlisted action types from proposal creation', async () => {
      const res = await createPersistedActionProposal({
        title: 'Run Shell Command',
        actionType: 'execute_arbitrary_shell' as any,
        productId: 'prod_necklace_gold_101',
        lowStockThreshold: 10,
        reason: 'Unsafe command attempt',
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('is not allowlisted');
      expect(Object.keys(mockApprovalStore)).toHaveLength(0);
    });

    it('rejects invalid threshold boundaries (< 1 or > 100)', async () => {
      const res = await createPersistedActionProposal({
        title: 'Invalid High Threshold',
        actionType: ALLOWLISTED_ACTION_TYPE,
        productId: 'prod_necklace_gold_101',
        lowStockThreshold: 500, // Invalid
        reason: 'Exceeds maximum cap',
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('must be an integer between 1 and 100');
    });
  });

  describe('2. Human-In-The-Loop Approval & Cryptographic Integrity Binding', () => {
    it('records valid human approval with exact payload hash binding', async () => {
      const created = await createPersistedActionProposal({
        title: 'Adjust Bridal Necklace Buffer',
        actionType: ALLOWLISTED_ACTION_TYPE,
        productId: 'prod_necklace_gold_101',
        lowStockThreshold: 12,
        reason: 'Wedding season velocity surge',
      });

      const approved = await approvePersistedActionProposal({
        approvalId: created.proposalId!,
        approver: humanAdminApprover,
        currentPayload: validPayload,
      });

      expect(approved.success).toBe(true);
      expect(approved.proposal?.state).toBe('approved');
      expect(approved.proposal?.approvedPayloadHash).toBe(
        created.proposal?.payloadHash
      );

      const savedRow = mockApprovalStore[created.proposalId!];
      expect(savedRow.status).toBe('approved');
      expect(savedRow.reviewed_by).toBe('admin_usr_001');
      expect(savedRow.action_payload.approvedPayloadHash).toBeDefined();

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'co_founder_approval_approved',
          entityId: created.proposalId,
        })
      );
    });

    it('rejects AI self-approval with HUMAN_APPROVAL_REQUIRED', async () => {
      const created = await createPersistedActionProposal({
        title: 'Adjust Bridal Necklace Buffer',
        actionType: ALLOWLISTED_ACTION_TYPE,
        productId: 'prod_necklace_gold_101',
        lowStockThreshold: 12,
        reason: 'Autonomous approval attempt',
      });

      const res = await approvePersistedActionProposal({
        approvalId: created.proposalId!,
        approver: aiApprover,
        currentPayload: validPayload,
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('HUMAN_APPROVAL_REQUIRED');

      const savedRow = mockApprovalStore[created.proposalId!];
      expect(savedRow.status).toBe('pending'); // Remains unapproved
    });

    it('rejects approval if payload was tampered after proposal (PAYLOAD_TAMPERED)', async () => {
      const created = await createPersistedActionProposal({
        title: 'Adjust Bridal Necklace Buffer',
        actionType: ALLOWLISTED_ACTION_TYPE,
        productId: 'prod_necklace_gold_101',
        lowStockThreshold: 12,
        reason: 'Initial proposal',
      });

      const tamperedPayload: ActionPayloadSpec = {
        ...validPayload,
        parameters: {
          lowStockThreshold: 99, // Tampered post-creation!
          reason: 'Sneaky modification',
        },
      };

      const res = await approvePersistedActionProposal({
        approvalId: created.proposalId!,
        approver: humanAdminApprover,
        currentPayload: tamperedPayload,
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('PAYLOAD_TAMPERED');
      expect(mockApprovalStore[created.proposalId!].status).toBe('pending');
    });

    it('rejects approver with insufficient role privileges (INSUFFICIENT_ROLE)', async () => {
      const created = await createPersistedActionProposal({
        title: 'Adjust Bridal Necklace Buffer',
        actionType: ALLOWLISTED_ACTION_TYPE,
        productId: 'prod_necklace_gold_101',
        lowStockThreshold: 12,
        reason: 'Staff authorization test',
      });

      const res = await approvePersistedActionProposal({
        approvalId: created.proposalId!,
        approver: humanStaffApprover, // Staff cannot approve inventory_operational tier
        currentPayload: validPayload,
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('INSUFFICIENT_ROLE');
    });

    it('rejects approval if proposal has already expired (EXPIRED)', async () => {
      const created = await createPersistedActionProposal({
        title: 'Expired Proposal Test',
        actionType: ALLOWLISTED_ACTION_TYPE,
        productId: 'prod_necklace_gold_101',
        lowStockThreshold: 12,
        reason: 'Testing expiration guard',
        expiresInHours: -1, // Expired 1 hour ago
      });

      const res = await approvePersistedActionProposal({
        approvalId: created.proposalId!,
        approver: humanAdminApprover,
        currentPayload: validPayload,
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('EXPIRED');
      expect(mockApprovalStore[created.proposalId!].status).toBe('expired');
    });
  });

  describe('3. Rejection Workflow', () => {
    it('records documented rejection and transitions proposal to rejected state', async () => {
      const created = await createPersistedActionProposal({
        title: 'Proposal to be Rejected',
        actionType: ALLOWLISTED_ACTION_TYPE,
        productId: 'prod_necklace_gold_101',
        lowStockThreshold: 12,
        reason: 'Staff review needed',
      });

      const res = await rejectPersistedActionProposal({
        approvalId: created.proposalId!,
        rejector: {
          actorId: 'admin_usr_001',
          actorRole: 'admin',
          reason:
            'Supplier announced 3-week factory holiday; cannot meet threshold.',
        },
      });

      expect(res.success).toBe(true);
      const savedRow = mockApprovalStore[created.proposalId!];
      expect(savedRow.status).toBe('rejected');
      expect(savedRow.rejection_reason).toContain('Supplier announced');

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'co_founder_approval_rejected',
          entityId: created.proposalId,
        })
      );
    });

    it('refuses rejection without sufficient justification (< 5 characters)', async () => {
      const created = await createPersistedActionProposal({
        title: 'Proposal to be Rejected',
        actionType: ALLOWLISTED_ACTION_TYPE,
        productId: 'prod_necklace_gold_101',
        lowStockThreshold: 12,
        reason: 'Staff review needed',
      });

      const res = await rejectPersistedActionProposal({
        approvalId: created.proposalId!,
        rejector: {
          actorId: 'admin_usr_001',
          actorRole: 'admin',
          reason: 'No', // Too short
        },
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('at least 5 characters');
    });
  });

  describe('4. Server-Side Execution Re-Authorization & Mutation', () => {
    it('blocks execution if proposal is still unapproved (status === "pending")', async () => {
      const created = await createPersistedActionProposal({
        title: 'Unapproved Execution Attempt',
        actionType: ALLOWLISTED_ACTION_TYPE,
        productId: 'prod_necklace_gold_101',
        lowStockThreshold: 12,
        reason: 'Testing unapproved block',
      });

      const execResult = await executePersistedApprovedAction({
        approvalId: created.proposalId!,
        executorActorId: 'admin_usr_001',
        executorRole: 'admin',
        executionPayload: validPayload,
      });

      expect(execResult.success).toBe(false);
      expect(execResult.error).toContain("must be 'approved'");
      expect(mockProductStore.prod_necklace_gold_101.low_stock_threshold).toBe(
        4
      ); // Untouched
    });

    it('blocks execution if payload is tampered post-approval (PAYLOAD_TAMPERED)', async () => {
      const created = await createPersistedActionProposal({
        title: 'Tamper Execution Attempt',
        actionType: ALLOWLISTED_ACTION_TYPE,
        productId: 'prod_necklace_gold_101',
        lowStockThreshold: 12,
        reason: validPayload.parameters.reason,
      });

      await approvePersistedActionProposal({
        approvalId: created.proposalId!,
        approver: humanAdminApprover,
        currentPayload: validPayload,
      });

      const tamperedExecutionPayload: ActionPayloadSpec = {
        ...validPayload,
        parameters: {
          lowStockThreshold: 88, // Discrepancy from approved 12!
          reason: 'Post-approval modification',
        },
      };

      const execResult = await executePersistedApprovedAction({
        approvalId: created.proposalId!,
        executorActorId: 'admin_usr_001',
        executorRole: 'admin',
        executionPayload: tamperedExecutionPayload,
      });

      expect(execResult.success).toBe(false);
      expect(execResult.error).toContain('PAYLOAD_TAMPERED');
      expect(mockProductStore.prod_necklace_gold_101.low_stock_threshold).toBe(
        4
      );
    });

    it('successfully executes approved proposal, updates authoritative table, and marks executed', async () => {
      const created = await createPersistedActionProposal({
        title: 'Valid Execution Flow',
        actionType: ALLOWLISTED_ACTION_TYPE,
        productId: 'prod_necklace_gold_101',
        lowStockThreshold: 12,
        reason: validPayload.parameters.reason,
      });

      await approvePersistedActionProposal({
        approvalId: created.proposalId!,
        approver: humanAdminApprover,
        currentPayload: validPayload,
      });

      const execResult = await executePersistedApprovedAction({
        approvalId: created.proposalId!,
        executorActorId: 'admin_usr_001',
        executorRole: 'admin',
        executionPayload: validPayload,
        dryRun: false,
      });

      expect(execResult.success).toBe(true);
      expect(execResult.verifiedBefore?.low_stock_threshold).toBe(4);
      expect(execResult.verifiedAfter?.low_stock_threshold).toBe(12);

      // Verify authoritative database mutation
      expect(mockProductStore.prod_necklace_gold_101.low_stock_threshold).toBe(
        12
      );

      // Verify row status transitioned to 'executed'
      const savedRow = mockApprovalStore[created.proposalId!];
      expect(savedRow.status).toBe('executed');
      expect(savedRow.execution_result).toEqual(
        expect.objectContaining({ low_stock_threshold: 12 })
      );
    });

    it('enforces idempotency: prevents double execution of already executed proposal', async () => {
      const created = await createPersistedActionProposal({
        title: 'Idempotency Double Execution Test',
        actionType: ALLOWLISTED_ACTION_TYPE,
        productId: 'prod_necklace_gold_101',
        lowStockThreshold: 12,
        reason: validPayload.parameters.reason,
      });

      await approvePersistedActionProposal({
        approvalId: created.proposalId!,
        approver: humanAdminApprover,
        currentPayload: validPayload,
      });

      // First execution succeeds
      const firstExec = await executePersistedApprovedAction({
        approvalId: created.proposalId!,
        executorActorId: 'admin_usr_001',
        executorRole: 'admin',
        executionPayload: validPayload,
      });
      expect(firstExec.success).toBe(true);

      // Second execution attempt MUST be blocked by idempotency guard
      const secondExec = await executePersistedApprovedAction({
        approvalId: created.proposalId!,
        executorActorId: 'admin_usr_001',
        executorRole: 'admin',
        executionPayload: validPayload,
      });

      expect(secondExec.success).toBe(false);
      expect(secondExec.error).toContain('already been executed');
    });
  });
});
