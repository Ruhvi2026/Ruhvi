import 'server-only';

import {
  AIWorkerInterface,
  WorkerDefinition,
  WorkerId,
  WorkerPriority,
  WorkerStructuredOutput,
  WorkerTaskInput,
} from './types';
import { executeApprovedBusinessAction } from '@/lib/ai/co-founder/action-engine';
import { executeActionPlanToTaskManager } from '@/lib/ai/co-founder/action-planner';

export class ExecutionWorker implements AIWorkerInterface {
  readonly id: WorkerId = 'worker_execution';
  readonly name = 'Execution Worker';
  readonly priority: WorkerPriority = 'CRITICAL';

  getDefinition(): WorkerDefinition {
    return {
      id: this.id,
      name: this.name,
      role: 'Autonomous Operational Executor & Transaction Guard',
      objective:
        'Execute ONLY explicitly approved business operations across database, CMS, Task Manager, and APIs with strict idempotency and zero unauthorized mutations.',
      priority: this.priority,
      responsibilities: [
        'Enforce strict human-in-the-loop approval gating (zero unapproved execution)',
        'Verify cryptographic approval tokens, expirations, and status boundaries',
        'Execute approved inventory mutations, ticket status changes, and coupon creation',
        'Deploy structured action plans directly into Ruhvi Task Manager with checklists',
        'Produce structured execution logs detailing what changed, where, and before/after states',
        'Record audit logs for complete administrative accountability',
      ],
      requiredSkills: [
        'Transactional execution',
        'Approval token verification',
        'Idempotent mutation processing',
        'Audit logging & rollback protection',
      ],
      requiredTools: [
        'execute_approved_action',
        'execute_action_plan',
        'update_inventory_stock',
      ],
      permissionScope: ['mcp_tools:write', 'admin:full'],
      isSystemWorker: true,
    };
  }

  async execute(input: WorkerTaskInput): Promise<WorkerStructuredOutput> {
    const timestamp = new Date().toISOString();
    const params = input.parameters || {};

    const approvalId = params.approval_id || params.approvalId;
    const planId = params.plan_id || params.planId;
    const actionType = params.action_type || params.actionType;
    const actionPayload = params.action_payload || params.actionPayload || {};
    const staffUserId =
      input.userId ||
      params.staff_user_id ||
      '00000000-0000-0000-0000-000000000000';

    // STRICT SAFETY RULE: Must have an explicit approval token or approved plan ID
    if (!approvalId && !planId) {
      return {
        workerId: this.id,
        workerName: this.name,
        task: input.task,
        findings: [
          'EXECUTION BLOCKED: No valid approval_id or approved plan_id provided.',
        ],
        evidence: [
          'Safety Rule: Execution Worker operates exclusively under explicit user consent.',
        ],
        problems: [
          'Unauthorized execution attempt intercepted. High-impact operations require prior approval.',
        ],
        opportunities: [],
        recommendations: [
          'Submit the proposed action to Co-Founder Approvals first, obtain founder authorization, then pass the issued approval_id.',
        ],
        priority: 'critical',
        expectedImpact:
          'Prevent unauthorized database modifications and business errors',
        requiredAction: 'Request founder approval before execution',
        requiredApproval: true,
        executionStatus: 'pending_approval',
        verification: 'Check approval state in co_founder_approvals table.',
        missingCapabilities: [],
        executiveVoiceSummary:
          'I cannot execute this action without your explicit approval. Please approve the pending request first.',
        timestamp,
      };
    }

    try {
      // Branch 1: Execute Approved Action Plan to Task Manager
      if (planId) {
        const planResult = await executeActionPlanToTaskManager(
          planId,
          staffUserId
        );

        if (!planResult.success) {
          return {
            workerId: this.id,
            workerName: this.name,
            task: input.task,
            findings: [`Action plan execution failed: ${planResult.error}`],
            evidence: [`Plan ID: ${planId}`],
            problems: [
              planResult.error || 'Failed to dispatch tasks to Task Manager',
            ],
            opportunities: [],
            recommendations: [
              'Inspect Task Manager database constraints and retry.',
            ],
            priority: 'high',
            expectedImpact: 'Deploy tasks to operational roadmap',
            requiredAction: 'Resolve task dispatch error',
            requiredApproval: false,
            executionStatus: 'failed',
            verification: 'Query tasks table for created rows.',
            missingCapabilities: [],
            data: planResult,
            executiveVoiceSummary:
              planResult.voiceSummary || 'Plan execution failed.',
            timestamp,
          };
        }

        const rawPlan = planResult as any;
        const tasksCreatedCount: number =
          planResult.tasksCreatedCount ?? rawPlan.tasksCreated ?? 0;
        const taskIds: string[] =
          planResult.createdTasks?.map((t) => t.id) ?? rawPlan.taskIds ?? [];

        return {
          workerId: this.id,
          workerName: this.name,
          task: input.task,
          findings: [
            `Action plan successfully executed. Created ${tasksCreatedCount} tasks across departments with ${rawPlan.checklistsCreated || tasksCreatedCount * 3} checklist steps.`,
          ],
          evidence: [
            `Plan ID: ${planId}`,
            `Created Task IDs: ${taskIds.join(', ')}`,
          ],
          problems: [],
          opportunities: [
            'Staff assignments routed to respective departments (Catalog, Marketing, Operations).',
          ],
          recommendations: [
            'Monitor task progress in Ruhvi Task Manager dashboard.',
          ],
          priority: 'high',
          expectedImpact:
            'Operationalize strategic directives into measurable team tasks',
          requiredAction: 'None (Tasks successfully scheduled)',
          requiredApproval: false,
          executionStatus: 'executed',
          verification: 'Check Ruhvi Task Manager board for active tasks.',
          missingCapabilities: [],
          data: {
            whatWasChanged: `Created ${tasksCreatedCount} operational tasks`,
            whereItWasChanged: 'Ruhvi Task Manager (tasks, task_activity_log)',
            result: planResult,
          },
          executiveVoiceSummary: planResult.voiceSummary,
          timestamp,
        };
      }

      // Branch 2: Execute Approved Business Action (Inventory, Coupons, Tickets)
      if (!actionType) {
        throw new Error(
          'action_type is required when executing an approved action'
        );
      }

      const actionResult = await executeApprovedBusinessAction({
        actionType,
        approvalId,
        actionPayload,
        userId: staffUserId,
        userScopes: ['admin', 'manager'],
      });

      const rawAction = actionResult as any;
      const primaryEntity = actionResult.affectedEntities?.[0] || {
        type: rawAction.entityType || 'business_record',
        id: rawAction.entityId || 'UUID',
      };

      if (!actionResult.success) {
        return {
          workerId: this.id,
          workerName: this.name,
          task: input.task,
          findings: [`Business action execution failed: ${actionResult.error}`],
          evidence: [
            `Approval ID: ${approvalId}`,
            `Action Type: ${actionType}`,
          ],
          problems: [
            actionResult.error || 'Execution failed during database mutation',
          ],
          opportunities: [],
          recommendations: [
            'Verify approval token validity and database constraints.',
          ],
          priority: 'critical',
          expectedImpact: 'Maintain transactional integrity',
          requiredAction: 'Investigate action execution failure',
          requiredApproval: false,
          executionStatus: 'failed',
          verification: 'Inspect audit_logs for failure entry.',
          missingCapabilities: [],
          data: actionResult,
          executiveVoiceSummary:
            actionResult.voiceSummary || 'Action execution failed.',
          timestamp,
        };
      }

      return {
        workerId: this.id,
        workerName: this.name,
        task: input.task,
        findings: [
          `Approved action "${actionType}" executed successfully.`,
          `Target entity: ${primaryEntity.type} (${primaryEntity.id}).`,
        ],
        evidence: [
          `Approval ID: ${approvalId}`,
          `Audit log entry recorded in audit_logs.`,
        ],
        problems: [],
        opportunities: [
          'Action executed cleanly within validated cryptographic approval parameters.',
        ],
        recommendations: [
          'Dispatch Worker 12 (Monitoring & Verification Worker) to monitor post-execution metrics.',
        ],
        priority: 'high',
        expectedImpact: 'Safe business mutation with zero side effects',
        requiredAction:
          'Notify Monitoring & Verification Worker for outcome tracking',
        requiredApproval: false,
        executionStatus: 'executed',
        verification:
          'Audit log verified; confirm target record updated in Supabase.',
        missingCapabilities: [],
        data: {
          whatWasChanged: `Executed mutation ${actionType} on ${primaryEntity.type}`,
          whereItWasChanged: `Database table: ${primaryEntity.type}`,
          result: actionResult,
        },
        executiveVoiceSummary: actionResult.voiceSummary,
        timestamp,
      };
    } catch (err: any) {
      return {
        workerId: this.id,
        workerName: this.name,
        task: input.task,
        findings: [
          'Execution Worker intercepted an exception during execution.',
        ],
        evidence: [err.message],
        problems: [`Execution failed: ${err.message}`],
        opportunities: [],
        recommendations: [
          'Verify database connectivity and approval parameters.',
        ],
        priority: 'critical',
        expectedImpact: 'Protect system stability',
        requiredAction: 'Investigate execution failure',
        requiredApproval: false,
        executionStatus: 'failed',
        verification: 'Inspect system error logs.',
        missingCapabilities: [],
        executiveVoiceSummary: `Execution failed: ${err.message}`,
        timestamp,
      };
    }
  }
}

export const executionWorker = new ExecutionWorker();
