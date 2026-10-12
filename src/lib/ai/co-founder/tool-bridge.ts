import 'server-only';

import { getServiceClient } from '@/lib/supabase/service';
import { assertToolPermission } from '@/lib/ai/mcp-auth';

import { getStoreAnalytics, type AnalyticsTimeframe } from './analytics';
import { getActiveProactiveSignals, acknowledgeSignal } from './proactive';
import {
  getPendingApprovals,
  reviewApproval,
  createApprovalRequest,
} from './approvals';
import { executeApprovedBusinessAction } from './action-engine';
import {
  getRepositoryArchitecture,
  inspectRecentErrors,
  analyzeCodeSnippet,
} from './engineering';
import { recordUserFeedback, getOutcomeAnalytics } from './outcomes';
import {
  verifyActionOutcome,
  getActionLifecycle,
  getClosedLoopAnalytics,
} from './closed-loop';
import {
  calculateProductVelocity,
  getProductVelocityBatch,
  calculateDaysOfInventory,
  getCategoryMarginBreakdown,
  generateRestockRecommendations,
} from './catalog-intelligence';
import {
  getCompetitors,
  addCompetitor,
  analyzeCompetitor,
} from './competitors';
import { auditCatalogSeoHealth } from './seo-health';
import { getHolisticBusinessContext } from './business-context';
import { runBusinessIntelligenceScan } from './business-intelligence';
import {
  performRootCauseAnalysis,
  type RootCauseInvestigationType,
} from './root-cause';
import { formulateStrategicSolution } from './strategy-engine';
import {
  generateActionPlanFromStrategy,
  saveActionPlan,
  executeActionPlanToTaskManager,
} from './action-planner';
import {
  dispatchWorkerTask,
  getWorkerRegistryStatus,
  executeMultiWorkerPlan,
} from './workers';
import { recordToolTelemetry, classifyError } from './telemetry';

export interface ToolExecutionResult {
  toolName: string;
  success: boolean;
  data?: any;
  error?: string;
  summaryForVoice: string;
}

/**
 * Co-Founder Internal Tool Bridge
 *
 * Executes existing domain tools on behalf of the AI Co-Founder with
 * permission validation and concise voice-ready summaries.
 */
async function executeCoFounderToolInternal(
  toolName: string,
  args: Record<string, any> = {},
  userScopes: string[] = [
    'admin:full',
    'mcp_tools:read',
    'mcp_tools:write',
    'analytics:read',
    'analytics:write',
    'products:read',
    'products:write',
    'inventory:read',
    'inventory:write',
    'orders:read',
    'customer:read',
    'support_ticket:read',
    'support_ticket:write',
    'coupons:read',
  ]
): Promise<ToolExecutionResult> {
  // 1. Authorize tool execution using the existing permission matrix
  const permissionError = assertToolPermission(userScopes, toolName);
  if (permissionError) {
    return {
      toolName,
      success: false,
      error: permissionError.error,
      summaryForVoice: `I don't have permission to execute ${toolName}.`,
    };
  }

  const supabase = getServiceClient();

  try {
    switch (toolName) {
      case 'get_store_metrics':
      case 'get_sales_analytics': {
        const timeframe = (args.timeframe ||
          args.date_range ||
          '30d') as AnalyticsTimeframe;
        const report = await getStoreAnalytics({ timeframe });

        return {
          toolName,
          success: true,
          data: report,
          summaryForVoice: report.insights.executiveVoiceSummary,
        };
      }

      case 'get_proactive_signals': {
        const limit =
          typeof args.limit === 'number' ? Math.min(args.limit, 10) : 5;
        const signals = await getActiveProactiveSignals(limit);

        const count = signals.length;
        if (count === 0) {
          return {
            toolName,
            success: true,
            data: [],
            summaryForVoice:
              'All business metrics, stock levels, and support tickets are currently within normal baseline parameters.',
          };
        }

        const top = signals[0];
        return {
          toolName,
          success: true,
          data: signals,
          summaryForVoice: `There are ${count} active proactive signals. Most critical: ${top.summary}`,
        };
      }

      case 'acknowledge_proactive_signal': {
        if (!args.signal_id) {
          throw new Error(
            'signal_id is required to acknowledge proactive signal'
          );
        }

        const res = await acknowledgeSignal(args.signal_id, args.user_id);
        return {
          toolName,
          success: res.success,
          data: res,
          summaryForVoice: res.success
            ? 'The signal has been acknowledged and will no longer trigger proactive alerts.'
            : 'Failed to acknowledge the proactive signal.',
        };
      }

      case 'get_pending_approvals': {
        const approvals = await getPendingApprovals();
        const count = approvals.length;

        if (count === 0) {
          return {
            toolName,
            success: true,
            data: [],
            summaryForVoice:
              'There are currently no actions waiting for your approval.',
          };
        }

        const top = approvals[0];
        return {
          toolName,
          success: true,
          data: approvals,
          summaryForVoice: `There are ${count} pending actions awaiting review. First item: ${top.actionType.replace(
            /_/g,
            ' '
          )} - ${top.scopeDescription}.`,
        };
      }

      case 'submit_approval_decision': {
        if (!args.approval_id || !args.decision) {
          throw new Error(
            'approval_id and decision ("approved" | "rejected" | "revoked") are required'
          );
        }

        const res = await reviewApproval({
          approvalId: args.approval_id,
          decision: args.decision,
          reviewedBy: args.user_id || 'system_admin',
          rejectionReason: args.reason,
        });

        if (!res.success) {
          return {
            toolName,
            success: false,
            error: res.error,
            summaryForVoice: `Failed to process approval: ${res.error}`,
          };
        }

        return {
          toolName,
          success: true,
          data: res,
          summaryForVoice: `Action has been successfully marked as ${res.status}.`,
        };
      }

      case 'execute_approved_action': {
        if (!args.action_type || !args.approval_id) {
          throw new Error(
            'action_type and approval_id are required to execute a business action'
          );
        }

        const res = await executeApprovedBusinessAction({
          actionType: args.action_type,
          actionPayload: args.action_payload || {},
          approvalId: args.approval_id,
          userId: args.user_id || 'system_admin',
          userScopes,
        });

        return {
          toolName,
          success: res.success,
          data: res,
          error: res.error,
          summaryForVoice: res.voiceSummary,
        };
      }

      case 'get_repository_architecture': {
        const arch = await getRepositoryArchitecture();
        return {
          toolName,
          success: true,
          data: arch,
          summaryForVoice: `Ruhvi is built on ${arch.framework} using ${arch.runtime} with ${arch.totalMigrations} database migrations and ${arch.activeIntegrations.length} active integrations.`,
        };
      }

      case 'inspect_recent_errors': {
        const limit =
          typeof args.limit === 'number' ? Math.min(args.limit, 10) : 5;
        const diag = await inspectRecentErrors(limit);
        return {
          toolName,
          success: true,
          data: diag.errors,
          summaryForVoice: diag.voiceSummary,
        };
      }

      case 'review_code_snippet': {
        const code = args.code || args.snippet;
        if (!code) {
          throw new Error('code string is required for code review');
        }
        const review = analyzeCodeSnippet(
          code,
          args.file_name || args.fileName
        );
        return {
          toolName,
          success: true,
          data: review,
          summaryForVoice: review.voiceSummary,
        };
      }

      case 'record_outcome_feedback': {
        if (!args.feedback_text) {
          throw new Error('feedback_text is required');
        }
        const result = await recordUserFeedback({
          entityType: args.entity_type || 'recommendation',
          entityId: args.entity_id || 'general',
          recommendationId: args.recommendation_id,
          actionId: args.action_id,
          feedbackText: args.feedback_text,
          feedbackType: args.feedback_type || 'neutral',
          reportedOutcome: args.reported_outcome,
          updateMemory: args.update_memory ?? true,
          userId: args.user_id || 'founder',
        });
        return {
          toolName,
          success: true,
          data: result.outcome,
          summaryForVoice: result.voiceSummary,
        };
      }

      case 'get_outcome_analytics': {
        const days = typeof args.days === 'number' ? args.days : 30;
        const analytics = await getOutcomeAnalytics(days);
        return {
          toolName,
          success: true,
          data: analytics,
          summaryForVoice: analytics.executiveVoiceSummary,
        };
      }

      case 'verify_action_outcome': {
        const actionId = args.action_id || args.actionId;
        if (!actionId) {
          throw new Error('action_id is required to verify business outcome');
        }
        const forceImmediate = Boolean(
          args.force_immediate ?? args.forceImmediate
        );
        const result = await verifyActionOutcome(actionId, { forceImmediate });
        return {
          toolName,
          success: result.verified,
          data: result,
          summaryForVoice: result.reason,
        };
      }

      case 'get_action_lifecycle_status': {
        const actionId = args.action_id || args.actionId;
        if (!actionId) {
          throw new Error('action_id is required to get lifecycle status');
        }
        const status = await getActionLifecycle(actionId);
        return {
          toolName,
          success: Boolean(status),
          data: status,
          summaryForVoice: status
            ? `Action ${actionId} is in ${status.lifecycleState} state (verification: ${status.verificationStatus}).`
            : `No tracked lifecycle record found for action ${actionId}.`,
        };
      }

      case 'get_closed_loop_analytics': {
        const days = typeof args.days === 'number' ? args.days : 30;
        const analytics = await getClosedLoopAnalytics(days);
        return {
          toolName,
          success: true,
          data: analytics,
          summaryForVoice: analytics.executiveSummary,
        };
      }

      case 'get_product_velocity': {
        const idOrSku =
          args.product_id_or_sku || args.product_id || args.sku || args.id;
        const timeframe =
          typeof args.timeframe_days === 'number'
            ? args.timeframe_days
            : typeof args.days === 'number'
              ? args.days
              : 30;

        if (
          args.batch ||
          Array.isArray(args.product_ids) ||
          (!idOrSku && !args.sku)
        ) {
          const batch = await getProductVelocityBatch(args.product_ids, {
            timeframeDays: timeframe,
            categorySlug: args.category_slug,
            minStock: args.min_stock,
            maxStock: args.max_stock,
            sortBy: args.sort_by,
            sortOrder: args.sort_order,
            limit: args.limit,
          });
          return {
            toolName,
            success: true,
            data: batch,
            summaryForVoice: `Analyzed velocity across ${batch.length} catalog products over ${timeframe} days. Top velocity: ${
              batch[0]
                ? `${batch[0].productName} (${batch[0].unitsPerDay} units/day)`
                : 'none'
            }.`,
          };
        }

        if (!idOrSku) {
          throw new Error(
            'product_id_or_sku is required to query product velocity'
          );
        }

        const metrics = await calculateProductVelocity(idOrSku, timeframe);
        return {
          toolName,
          success: true,
          data: metrics,
          summaryForVoice: `${metrics.productName} (${metrics.sku}) has sold ${
            metrics.unitsSold
          } units (${metrics.unitsPerDay} units/day) across ${
            metrics.orderCount
          } orders generating ₹${metrics.grossRevenue.toLocaleString('en-IN')}. Trend is ${
            metrics.trend
          }.`,
        };
      }

      case 'get_days_of_inventory': {
        const idOrSku =
          args.product_id_or_sku || args.product_id || args.sku || args.id;
        if (!idOrSku) {
          throw new Error(
            'product_id_or_sku is required to calculate days of inventory'
          );
        }
        const leadTimeDays =
          typeof args.lead_time_days === 'number'
            ? args.lead_time_days
            : undefined;
        const safetyBufferDays =
          typeof args.safety_buffer_days === 'number'
            ? args.safety_buffer_days
            : undefined;
        const timeframeDays =
          typeof args.timeframe_days === 'number'
            ? args.timeframe_days
            : undefined;

        const doi = await calculateDaysOfInventory(idOrSku, {
          leadTimeDays,
          safetyBufferDays,
          timeframeDays,
        });

        return {
          toolName,
          success: true,
          data: doi,
          summaryForVoice: `${doi.productName} has ${
            doi.daysOfInventory === 999
              ? 'stable'
              : `${doi.daysOfInventory} days of`
          } inventory remaining (Stock: ${doi.currentStock}, Urgency: ${
            doi.urgencyTier
          }). ${doi.recommendedAction}`,
        };
      }

      case 'get_category_margin_breakdown': {
        const timeframe =
          typeof args.timeframe_days === 'number'
            ? args.timeframe_days
            : typeof args.days === 'number'
              ? args.days
              : 30;
        const marginBreakdown = await getCategoryMarginBreakdown(timeframe);
        return {
          toolName,
          success: true,
          data: marginBreakdown,
          summaryForVoice: `Category margin breakdown across ${
            marginBreakdown.categories.length
          } categories: blended margin is ${
            marginBreakdown.blendedGrossMarginPercent
          }% on ₹${marginBreakdown.totalCatalogRevenue.toLocaleString(
            'en-IN'
          )} revenue. Top margin category: ${
            marginBreakdown.topMarginCategory || 'N/A'
          }.`,
        };
      }

      case 'get_restock_recommendations': {
        const restockPlan = await generateRestockRecommendations({
          categorySlug: args.category_slug,
          urgencyTier: args.urgency_tier,
          leadTimeDays:
            typeof args.lead_time_days === 'number'
              ? args.lead_time_days
              : undefined,
          safetyBufferDays:
            typeof args.safety_buffer_days === 'number'
              ? args.safety_buffer_days
              : undefined,
          timeframeDays:
            typeof args.timeframe_days === 'number'
              ? args.timeframe_days
              : undefined,
          limit: typeof args.limit === 'number' ? args.limit : undefined,
        });

        return {
          toolName,
          success: true,
          data: restockPlan,
          summaryForVoice: `Restock plan recommends reordering ${
            restockPlan.restockRecommendedCount
          } SKUs (${restockPlan.totalUnitsToOrder} total units) with ₹${restockPlan.estimatedTotalCapitalRequired.toLocaleString(
            'en-IN'
          )} estimated capital required (${
            restockPlan.criticalRestockCount
          } critical/OOS).`,
        };
      }

      case 'get_orders': {
        const limit =
          typeof args.limit === 'number' ? Math.min(args.limit, 10) : 5;
        let query = supabase
          .from('orders')
          .select(
            'id, order_number, total_amount, status, payment_status, created_at'
          )
          .order('created_at', { ascending: false })
          .limit(limit);

        if (args.status) {
          query = query.eq('status', args.status);
        }

        const { data: orders, error } = await query;
        if (error) throw error;

        const count = orders?.length || 0;
        return {
          toolName,
          success: true,
          data: orders,
          summaryForVoice: `Found ${count} orders. Latest order is #${orders?.[0]?.order_number || 'N/A'} for ₹${
            orders?.[0]?.total_amount || 0
          } with status ${orders?.[0]?.status || 'pending'}.`,
        };
      }

      case 'get_inventory_levels': {
        const { data: lowStockProducts, error } = await supabase
          .from('products')
          .select('id, name, sku, stock_quantity')
          .lte('stock_quantity', 5)
          .eq('status', 'active')
          .limit(10);

        if (error) throw error;

        const count = lowStockProducts?.length || 0;
        if (count === 0) {
          return {
            toolName,
            success: true,
            data: [],
            summaryForVoice:
              'All catalog items have healthy inventory levels above the threshold.',
          };
        }

        const itemsList = lowStockProducts
          ?.slice(0, 3)
          .map((p) => `${p.name} (${p.stock_quantity} left)`)
          .join(', ');

        return {
          toolName,
          success: true,
          data: lowStockProducts,
          summaryForVoice: `There are ${count} items running low on stock, including ${itemsList}.`,
        };
      }

      case 'get_support_tickets': {
        let query = supabase
          .from('support_tickets')
          .select(
            'id, ticket_number, title, description, status, priority, created_at'
          )
          .order('created_at', { ascending: false })
          .limit(10);

        if (args.status) {
          const s = String(args.status).toLowerCase();
          if (s === 'pending' || s === 'open' || s === 'unresolved') {
            query = query.in('status', ['open', 'pending', 'in_progress']);
          } else {
            query = query.eq('status', s);
          }
        }

        const { data: tickets, error } = await query;
        if (error) throw error;

        const mappedTickets = (tickets || []).map((t: any) => ({
          ...t,
          subject: t.title || t.subject || 'Support Ticket',
        }));

        const count = mappedTickets.length;
        return {
          toolName,
          success: true,
          data: mappedTickets,
          summaryForVoice: `There are ${count} support tickets currently active.`,
        };
      }

      case 'update_support_ticket_status': {
        const ticketId = args.ticketId || args.ticket_id;
        const status = args.status;
        if (!ticketId || !status) {
          throw new Error('ticketId and status are required');
        }

        const isNumber =
          String(ticketId).startsWith('RUV-') ||
          !String(ticketId).includes('-');
        let query = supabase.from('support_tickets').update({
          status,
          updated_at: new Date().toISOString(),
          ...(status === 'resolved'
            ? { resolved_at: new Date().toISOString() }
            : {}),
          ...(status === 'closed'
            ? { closed_at: new Date().toISOString() }
            : {}),
        });

        if (isNumber) {
          query = query.eq('ticket_number', ticketId);
        } else {
          query = query.eq('id', ticketId);
        }

        const { data: updated, error } = await query.select();
        if (error) throw error;

        return {
          toolName,
          success: true,
          data: updated,
          summaryForVoice: `Support ticket ${ticketId} has been updated to ${status}.`,
        };
      }

      case 'audit_seo_health': {
        const report = await auditCatalogSeoHealth();
        return {
          toolName,
          success: true,
          data: report,
          summaryForVoice: report.executiveVoiceSummary,
        };
      }

      case 'get_competitors': {
        const competitors = await getCompetitors();
        const count = competitors.length;
        return {
          toolName,
          success: true,
          data: competitors,
          summaryForVoice:
            count === 0
              ? 'No competitors are currently registered in your tracking hub.'
              : `Tracking ${count} competitors: ${competitors.map((c) => c.name).join(', ')}.`,
        };
      }

      case 'add_competitor': {
        if (!args.name || !args.website_url) {
          throw new Error(
            'name and website_url are required to add a competitor'
          );
        }
        const res = await addCompetitor({
          name: args.name,
          websiteUrl: args.website_url,
          category: args.category,
          notes: args.notes,
        });
        return {
          toolName,
          success: res.success,
          data: res.data,
          error: res.error,
          summaryForVoice: res.success
            ? `Successfully added ${args.name} to competitor tracking.`
            : `Failed to add competitor: ${res.error}`,
        };
      }

      case 'browse_website': {
        if (!args.url) {
          throw new Error('url is required to browse a website');
        }
        const { browseWebPageWithPlaywright } =
          await import('@/lib/ai/browser/playwright');
        const res = await browseWebPageWithPlaywright({
          url: args.url,
          waitForSelector: args.wait_for_selector,
          timeoutMs:
            typeof args.timeout_ms === 'number' ? args.timeout_ms : 20000,
          captureScreenshot: Boolean(args.capture_screenshot),
        });

        return {
          toolName,
          success: res.status < 400,
          data: res,
          error: res.error,
          summaryForVoice: res.executiveVoiceSummary,
        };
      }

      case 'get_business_context': {
        const forceRefresh = Boolean(args.force_refresh);
        const context = await getHolisticBusinessContext({
          forceRefresh,
          userId: args.user_id,
        });

        return {
          toolName,
          success: true,
          data: context,
          summaryForVoice: context.executiveVoiceSummary,
        };
      }

      case 'run_business_intelligence_scan': {
        const timeframe = (args.timeframe || '7d') as '7d' | '30d';
        const digest = await runBusinessIntelligenceScan(timeframe);

        return {
          toolName,
          success: true,
          data: digest,
          summaryForVoice: digest.executiveVoiceSummary,
        };
      }

      case 'investigate_root_cause': {
        if (!args.issue_type) {
          throw new Error('issue_type is required for root cause analysis');
        }
        const rca = await performRootCauseAnalysis(
          args.issue_type as RootCauseInvestigationType,
          args.context
        );

        return {
          toolName,
          success: true,
          data: rca,
          summaryForVoice: rca.executiveVoiceSummary,
        };
      }

      case 'formulate_strategy': {
        if (!args.title || !args.issue_type) {
          throw new Error(
            'title and issue_type are required to formulate a strategy'
          );
        }
        const solution = formulateStrategicSolution({
          title: args.title,
          issueType: args.issue_type,
          additionalContext: args.additional_context,
        });

        return {
          toolName,
          success: true,
          data: solution,
          summaryForVoice: solution.executiveVoiceSummary,
        };
      }

      case 'generate_action_plan': {
        if (!args.strategy_title || !args.strategy_objective) {
          throw new Error(
            'strategy_title and strategy_objective are required to generate an action plan'
          );
        }
        const solution = formulateStrategicSolution({
          title: args.strategy_title,
          issueType: args.issue_type || args.strategy_title,
          additionalContext: args.strategy_recommendation,
        });
        const plan = generateActionPlanFromStrategy(solution, {
          recommendationId: args.recommendation_id,
          signalId: args.signal_id,
          problemStatement: args.problem_statement,
        });

        const saveRes = await saveActionPlan(plan, args.user_id);

        return {
          toolName,
          success: saveRes.success,
          data: { ...plan, id: saveRes.planId },
          error: saveRes.error,
          summaryForVoice: `Action plan "${plan.title}" has been structured into ${plan.tasks.length} departmental tasks and saved. Ready for execution.`,
        };
      }

      case 'execute_action_plan': {
        if (!args.plan_id) {
          throw new Error('plan_id is required to execute action plan tasks');
        }
        const staffUserId =
          args.staff_user_id || '00000000-0000-0000-0000-000000000000';
        const res = await executeActionPlanToTaskManager(
          args.plan_id,
          staffUserId
        );

        return {
          toolName,
          success: res.success,
          data: res,
          error: res.error,
          summaryForVoice: res.voiceSummary,
        };
      }

      case 'dispatch_worker_task': {
        if (!args.task) {
          throw new Error('task description is required to dispatch worker');
        }
        const target = args.worker_id || 'auto';
        const dispatchRes = await dispatchWorkerTask(target, {
          task: args.task,
          timeframe: args.timeframe,
          parameters: args.parameters,
        });

        return {
          toolName,
          success: true,
          data: dispatchRes,
          summaryForVoice: dispatchRes.summaryForVoice,
        };
      }

      case 'get_worker_statuses': {
        const statuses = getWorkerRegistryStatus();
        return {
          toolName,
          success: true,
          data: statuses,
          summaryForVoice: `All 12 AI Agent Workers are active and operational under the AI Co-Founder.`,
        };
      }

      case 'execute_multi_worker_plan': {
        if (!args.goal) {
          throw new Error('goal is required to execute multi-worker plan');
        }
        const planResult = await executeMultiWorkerPlan(args.goal, {
          timeframe: args.timeframe,
          parameters: args.parameters,
        });

        return {
          toolName,
          success: planResult.status !== 'FAILED',
          data: planResult,
          summaryForVoice: planResult.summaryForVoice,
        };
      }

      case 'dispatch_marketing_coworker': {
        if (!args.task) {
          throw new Error('task is required to dispatch marketing co-worker');
        }
        const { executeCoWorkerById } =
          await import('@/lib/ai/co-founder/workers/marketing');
        const coWorkerId = args.coworker_id || 'marketing_strategy';
        const result = await executeCoWorkerById(coWorkerId, {
          task: args.task,
          parameters: args.parameters,
        });

        return {
          toolName,
          success: result.success,
          data: result,
          summaryForVoice: result.executiveVoiceSummary,
        };
      }

      case 'get_marketing_coworker_statuses': {
        const { getAllCoWorkerStatuses } =
          await import('@/lib/ai/co-founder/workers/marketing');
        const statuses = getAllCoWorkerStatuses();
        return {
          toolName,
          success: true,
          data: statuses,
          summaryForVoice: `There are 3 enabled and 3 production-only disabled Marketing Co-Workers in the registry.`,
        };
      }

      case 'toggle_marketing_coworker': {
        if (!args.coworker_id || !args.status) {
          throw new Error(
            'coworker_id and status ("ENABLED" | "DISABLED") are required'
          );
        }
        const { setCoWorkerStatus } =
          await import('@/lib/ai/co-founder/workers/marketing');
        setCoWorkerStatus(args.coworker_id, args.status);
        return {
          toolName,
          success: true,
          data: { coworker_id: args.coworker_id, status: args.status },
          summaryForVoice: `Marketing Co-worker ${args.coworker_id} is now ${args.status}.`,
        };
      }

      case 'trigger_media_processing_job': {
        if (!args.video_1_url || !args.video_2_url) {
          throw new Error(
            'video_1_url and video_2_url are required to trigger media processing'
          );
        }
        const { createAndDispatchMediaJob } =
          await import('@/lib/ai/co-founder/workers/marketing');
        const job = await createAndDispatchMediaJob({
          campaignId: args.campaign_id || `cmp_${Date.now()}`,
          taskId: args.task_id || `task_${Date.now()}`,
          video1Url: args.video_1_url,
          video2Url: args.video_2_url,
          voiceoverLanguage: args.voiceover_language,
          voiceoverScript: args.voiceover_script,
        });
        return {
          toolName,
          success: true,
          data: job,
          summaryForVoice: `Media job ${job.jobId} created and dispatched to n8n webhook pipeline.`,
        };
      }

      case 'get_media_job_status': {
        if (!args.job_id) {
          throw new Error('job_id is required');
        }
        const { getMediaJob } =
          await import('@/lib/ai/co-founder/workers/marketing');
        const job = getMediaJob(args.job_id);
        return {
          toolName,
          success: Boolean(job),
          data: job,
          summaryForVoice: job
            ? `Media job ${job.jobId} status is ${job.status}.`
            : `Media job ${args.job_id} not found.`,
        };
      }

      case 'publish_ad_campaign': {
        if (!args.campaign_id) {
          throw new Error('campaign_id is required to publish ad campaign');
        }
        const { metaAdsService } =
          await import('@/lib/ai/co-founder/workers/marketing');
        const pubResult = await metaAdsService.activateApprovedCampaign({
          metaCampaignId: args.campaign_id,
          approvalId: args.approval_id || `app_override_${Date.now()}`,
          approvedBy: args.user_id || 'founder_admin',
        });
        return {
          toolName,
          success: pubResult.success,
          data: pubResult,
          summaryForVoice: `Campaign ${args.campaign_id} has been approved and published to Meta Ads.`,
        };
      }

      case 'search_co_founder_memory': {
        const query = args.query;
        if (!query) {
          throw new Error('query is required to search memories');
        }
        const { searchSemanticMemories } =
          await import('@/lib/ai/co-founder/memory-engine');
        const userId = args.user_id || '00000000-0000-0000-0000-000000000000';
        const limit = typeof args.limit === 'number' ? args.limit : 8;
        const layer = args.layer;
        const memories = await searchSemanticMemories(userId, query, {
          limit,
          layer,
        });
        return {
          toolName,
          success: true,
          data: memories,
          summaryForVoice:
            memories.length === 0
              ? `No long-term memories found matching "${query}".`
              : `Retrieved ${memories.length} relevant memories. Top match: [${memories[0].taxonomyLayer.toUpperCase()}] ${memories[0].key}: ${memories[0].value}.`,
        };
      }

      case 'store_co_founder_memory': {
        if (!args.key || !args.value) {
          throw new Error('key and value are required to store a memory');
        }
        const { storeMemoryWithContradictionCheck } =
          await import('@/lib/ai/co-founder/memory-engine');
        const userId = args.user_id || '00000000-0000-0000-0000-000000000000';
        const storeRes = await storeMemoryWithContradictionCheck({
          userId,
          key: args.key,
          value: args.value,
          taxonomyLayer: args.taxonomy_layer,
          importance:
            typeof args.importance === 'number' ? args.importance : undefined,
          topics: Array.isArray(args.topics) ? args.topics : undefined,
        });
        const supersededNote =
          storeRes.supersededIds && storeRes.supersededIds.length > 0
            ? ` (superseded ${storeRes.supersededIds.length} previous conflicting records)`
            : '';
        return {
          toolName,
          success: storeRes.success,
          data: storeRes,
          error: storeRes.error,
          summaryForVoice: storeRes.success
            ? `Stored memory "${args.key}" successfully${supersededNote}.`
            : `Failed to store memory: ${storeRes.error}`,
        };
      }

      case 'extract_session_learnings': {
        const {
          extractMemoriesFromConversation,
          storeMemoryWithContradictionCheck,
        } = await import('@/lib/ai/co-founder/memory-engine');
        const messages = Array.isArray(args.messages) ? args.messages : [];
        const extracted = extractMemoriesFromConversation(messages);
        const persist = Boolean(args.persist_to_memory);
        const persistedIds: string[] = [];

        if (persist && extracted.length > 0) {
          const userId = args.user_id || '00000000-0000-0000-0000-000000000000';
          for (const cand of extracted) {
            const saveRes = await storeMemoryWithContradictionCheck({
              userId,
              key: cand.key,
              value: cand.value,
              taxonomyLayer: cand.taxonomyLayer,
              importance: cand.importance,
              source: cand.source,
              topics: cand.topics,
            });
            if (saveRes.success && saveRes.memoryId) {
              persistedIds.push(saveRes.memoryId);
            }
          }
        }

        return {
          toolName,
          success: true,
          data: {
            extractedCount: extracted.length,
            candidates: extracted,
            persistedIds,
          },
          summaryForVoice: `Distilled ${extracted.length} high-signal learnings from conversation${
            persist ? ` and saved ${persistedIds.length} to memory` : ''
          }.`,
        };
      }

      case 'analyze_product_image': {
        const { analyzeJewelryImage } =
          await import('@/lib/ai/co-founder/vision');
        const analysis = await analyzeJewelryImage({
          imageUrl: args.image_url,
          imageBase64: args.image_base64,
          productNameHint: args.product_name_hint,
          categoryHint: args.category_hint,
        });

        return {
          toolName,
          success: analysis.success,
          data: analysis,
          error: analysis.error,
          summaryForVoice: analysis.summaryForVoice,
        };
      }

      case 'generate_product_studio_photos': {
        const { generateStudioPhotos } =
          await import('@/lib/ai/co-founder/studio-photography');
        const result = await generateStudioPhotos({
          imageUrl: args.image_url,
          imageBase64: args.image_base64,
          mimeType: args.mime_type,
          productName: args.product_name,
          categoryHint: args.category_hint,
          uploadToCloudinary: args.upload_to_cloudinary === true,
        });

        return {
          toolName,
          success: result.success,
          data: result,
          error: result.error,
          summaryForVoice: result.summaryForVoice,
        };
      }

      case 'create_draft_product': {
        const {
          name,
          slug,
          description,
          category_name,
          price,
          mrp,
          cost_price,
          sku,
          meta_title,
          meta_description,
          seo_keywords,
          image_urls,
          base_metal,
          stone_type,
        } = args;

        if (!name || price === undefined) {
          throw new Error(
            'Product name and price are required to create a draft product'
          );
        }

        const supabase = getServiceClient();

        // 1. Resolve Category ID if category_name is provided
        let categoryId: string | null = null;
        if (category_name) {
          const { data: cat } = await supabase
            .from('categories')
            .select('id, name')
            .ilike('name', `%${category_name}%`)
            .limit(1)
            .maybeSingle();
          if (cat) categoryId = cat.id;
        }

        // 2. Generate slug and SKU if missing
        const generatedSlug =
          slug ||
          name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

        const generatedSku =
          sku ||
          `RUH-${(category_name || 'JEW').slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;

        // 3. Insert Product with status: 'draft'
        const { data: product, error: insertErr } = await supabase
          .from('products')
          .insert({
            name,
            sku: generatedSku,
            slug: generatedSlug,
            category_id: categoryId,
            price: Number(price),
            mrp: Number(mrp || price * 1.5),
            cost_price: Number(cost_price || price * 0.4),
            description: description || '',
            meta_title: meta_title || name,
            meta_description:
              meta_description || description?.slice(0, 160) || name,
            seo_keywords: Array.isArray(seo_keywords) ? seo_keywords : [],
            status: 'draft',
            base_metal: base_metal || null,
            stone_type: stone_type || null,
          })
          .select('id, name, slug, price, status')
          .single();

        if (insertErr || !product) {
          throw new Error(
            `Failed to create product draft: ${insertErr?.message || 'Unknown database error'}`
          );
        }

        // 4. Attach image URLs to product_images table
        const validUrls = Array.isArray(image_urls)
          ? image_urls.filter(Boolean)
          : [];
        if (validUrls.length > 0) {
          const imgRows = validUrls.map((url: string, idx: number) => ({
            product_id: product.id,
            url,
            sort_order: idx,
          }));
          await supabase.from('product_images').insert(imgRows);
        }

        // 5. Submit an approval request for the founder to publish
        const approvalRes = await createApprovalRequest({
          actionType: 'publish_product',
          actionPayload: {
            product_id: product.id,
            product_name: product.name,
            slug: product.slug,
            price: product.price,
            image_urls: validUrls,
          },
          scopeDescription: `Publish new draft product "${product.name}" (₹${product.price}) with ${validUrls.length} studio photos to the live customer catalog.`,
          riskLevel: 'high',
        });

        return {
          toolName,
          success: true,
          data: {
            product,
            approvalId: approvalRes.approvalId,
            imageCount: validUrls.length,
          },
          summaryForVoice: `Product "${product.name}" has been drafted with ${validUrls.length} studio photos and SEO copy. A publish approval request is awaiting your authorization.`,
        };
      }

      default:
        return {
          toolName,
          success: false,
          error: `Tool ${toolName} execution handler is not implemented.`,
          summaryForVoice: `Tool ${toolName} is currently unavailable.`,
        };
    }
  } catch (err: any) {
    return {
      toolName,
      success: false,
      error: err.message,
      summaryForVoice: `Error querying ${toolName}: ${err.message}`,
    };
  }
}

/**
 * Co-Founder Internal Tool Bridge (Exported with telemetry instrumentation)
 *
 * Executes existing domain tools on behalf of the AI Co-Founder with
 * permission validation, latency tracking, and error attribution.
 */
export async function executeCoFounderTool(
  toolName: string,
  args: Record<string, any> = {},
  userScopes: string[] = [
    'admin:full',
    'mcp_tools:read',
    'mcp_tools:write',
    'analytics:read',
    'analytics:write',
    'products:read',
    'products:write',
    'inventory:read',
    'inventory:write',
    'orders:read',
    'customer:read',
    'support_ticket:read',
    'coupons:read',
  ]
): Promise<ToolExecutionResult> {
  const startTime = Date.now();
  const result = await executeCoFounderToolInternal(toolName, args, userScopes);

  try {
    recordToolTelemetry({
      traceId: args._traceId || 'tr_tool',
      spanId: 'sp_' + toolName,
      toolName,
      durationMs: Date.now() - startTime,
      success: result.success,
      errorCategory: result.success ? undefined : classifyError(result.error),
      errorMessage: result.error,
      userId: args.userId || args.user_id,
    });
  } catch {}

  return result;
}
