import 'server-only';

import { randomUUID } from 'crypto';
import { DelegationContract, WorkerId } from './types';
import { getWorkerManifest } from './manifests';
import { workforcePolicyEngine } from './policy-engine';

export interface CreateDelegationRequest {
  parentTaskId: string;
  parentWorkerId: WorkerId;
  childWorkerId: WorkerId;
  parentDepth?: number;
  objective: string;
  requestedToolIds?: string[];
  requestedScopes?: string[];
  budget?: {
    maxSteps?: number;
    maxToolCalls?: number;
    maxCostMinorUnits?: number;
  };
  correlationId?: string;
  traceId?: string;
}

export interface DelegationValidationResult {
  allowed: boolean;
  reason?: string;
  contract?: DelegationContract;
}

export class WorkforceDelegationBroker {
  private activeDelegationsByParent = new Map<string, DelegationContract[]>();

  /**
   * Validates and establishes a Parent -> Child delegation contract.
   * Enforces:
   * 1. Max depth bound = 2 (Parent is depth 1, child is depth 2; child cannot delegate further).
   * 2. Max 3 children per parent task.
   * 3. Child worker MUST be in parent manifest allowedDelegates.
   * 4. Strict permission intersection (tools & scopes).
   * 5. Budget clamping within worker limits.
   */
  createDelegation(
    request: CreateDelegationRequest
  ): DelegationValidationResult {
    const {
      parentTaskId,
      parentWorkerId,
      childWorkerId,
      parentDepth = 1,
      objective,
      requestedToolIds,
      requestedScopes,
      budget,
      correlationId = randomUUID(),
      traceId = randomUUID(),
    } = request;

    // 1. Prevent self-delegation loops
    if (parentWorkerId === childWorkerId) {
      return {
        allowed: false,
        reason: `Self-delegation is prohibited: worker '${parentWorkerId}' cannot delegate to itself.`,
      };
    }

    // 2. Enforce strict depth bound (max depth = 2)
    const childDepth = parentDepth + 1;
    if (childDepth > 2) {
      return {
        allowed: false,
        reason: `Delegation depth limit exceeded: child depth would be ${childDepth}, but maximum permitted depth is 2.`,
      };
    }

    // 3. Check child count limits for parent task (max 3 children)
    const existingChildren =
      this.activeDelegationsByParent.get(parentTaskId) || [];
    if (existingChildren.length >= 3) {
      return {
        allowed: false,
        reason: `Parent task '${parentTaskId}' already has ${existingChildren.length} child delegations (maximum allowed is 3).`,
      };
    }

    // 4. Retrieve worker manifests
    const parentManifest = getWorkerManifest(parentWorkerId);
    if (!parentManifest) {
      return {
        allowed: false,
        reason: `Parent worker '${parentWorkerId}' manifest not found.`,
      };
    }

    const childManifest = getWorkerManifest(childWorkerId);
    if (!childManifest) {
      return {
        allowed: false,
        reason: `Child worker '${childWorkerId}' manifest not found.`,
      };
    }

    // 5. Allowed delegates check
    if (!parentManifest.allowedDelegates.includes(childWorkerId)) {
      return {
        allowed: false,
        reason: `Worker '${childWorkerId}' is not an authorized delegate of '${parentWorkerId}'.`,
      };
    }

    // 6. Strict permission intersection
    const intersection = workforcePolicyEngine.intersectDelegationPermissions(
      parentManifest,
      childManifest
    );

    // If caller explicitly requested tools, intersect with allowed effective tools
    let allowedToolIds = intersection.effectiveTools;
    if (requestedToolIds && requestedToolIds.length > 0) {
      allowedToolIds = allowedToolIds.filter((t) =>
        requestedToolIds.includes(t)
      );
    }

    let allowedScopes = intersection.effectiveReadScopes;
    if (requestedScopes && requestedScopes.length > 0) {
      allowedScopes = allowedScopes.filter((s) => requestedScopes.includes(s));
    }

    // 7. Budget calculation (never exceed child worker limits)
    const effectiveBudget = {
      maxSteps: Math.min(
        budget?.maxSteps ?? childManifest.limits.maxSteps,
        childManifest.limits.maxSteps
      ),
      maxToolCalls: Math.min(
        budget?.maxToolCalls ?? childManifest.limits.maxToolCalls,
        childManifest.limits.maxToolCalls
      ),
      maxCostMinorUnits: Math.min(
        budget?.maxCostMinorUnits ?? childManifest.limits.maxCostMinorUnits,
        childManifest.limits.maxCostMinorUnits
      ),
    };

    const contract: DelegationContract = {
      parentTaskId,
      parentWorkerId,
      childWorkerId,
      depth: childDepth,
      objective,
      allowedToolIds,
      allowedScopes,
      budget: effectiveBudget,
      correlationId,
      traceId,
    };

    // Store in active tracking
    existingChildren.push(contract);
    this.activeDelegationsByParent.set(parentTaskId, existingChildren);

    return {
      allowed: true,
      contract,
    };
  }

  /**
   * Retrieves active child delegations for a given parent task.
   */
  getActiveDelegations(parentTaskId: string): DelegationContract[] {
    return this.activeDelegationsByParent.get(parentTaskId) || [];
  }

  /**
   * Releases or completes child delegation tracking for a task.
   */
  completeDelegation(parentTaskId: string, childWorkerId: WorkerId): boolean {
    const existing = this.activeDelegationsByParent.get(parentTaskId);
    if (!existing) return false;

    const filtered = existing.filter((c) => c.childWorkerId !== childWorkerId);
    if (filtered.length === 0) {
      this.activeDelegationsByParent.delete(parentTaskId);
    } else {
      this.activeDelegationsByParent.set(parentTaskId, filtered);
    }
    return true;
  }

  /**
   * Reset tracking state (used in testing).
   */
  reset(): void {
    this.activeDelegationsByParent.clear();
  }
}

export const workforceDelegationBroker = new WorkforceDelegationBroker();
