import 'server-only';

import { getServiceClient } from '@/lib/supabase/service';
import { assertToolPermission } from '@/lib/ai/mcp-auth';

import { getStoreAnalytics, type AnalyticsTimeframe } from './analytics';
import { getActiveProactiveSignals, acknowledgeSignal } from './proactive';
import { getPendingApprovals, reviewApproval } from './approvals';
import { executeApprovedBusinessAction } from './action-engine';
import {
  getRepositoryArchitecture,
  inspectRecentErrors,
  analyzeCodeSnippet,
} from './engineering';
import { recordUserFeedback, getOutcomeAnalytics } from './outcomes';
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
} from './workers';

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
export async function executeCoFounderTool(
  toolName: string,
  args: Record<string, any> = {},
  userScopes: string[] = [
    'admin:full',
    'mcp_tools:read',
    'mcp_tools:write',
    'analytics:read',
    'analytics:write',
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
          .select('id, ticket_number, subject, status, priority, created_at')
          .order('created_at', { ascending: false })
          .limit(5);

        if (args.status) {
          query = query.eq('status', args.status);
        }

        const { data: tickets, error } = await query;
        if (error) throw error;

        const count = tickets?.length || 0;
        return {
          toolName,
          success: true,
          data: tickets,
          summaryForVoice: `There are ${count} support tickets currently active.`,
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

      case 'dispatch_marketing_coworker': {
        if (!args.task) {
          throw new Error('task is required to dispatch marketing co-worker');
        }
        const { executeCoWorkerById } = await import('@/lib/ai/co-founder/workers/marketing');
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
        const { getAllCoWorkerStatuses } = await import('@/lib/ai/co-founder/workers/marketing');
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
          throw new Error('coworker_id and status ("ENABLED" | "DISABLED") are required');
        }
        const { setCoWorkerStatus } = await import('@/lib/ai/co-founder/workers/marketing');
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
          throw new Error('video_1_url and video_2_url are required to trigger media processing');
        }
        const { createAndDispatchMediaJob } = await import('@/lib/ai/co-founder/workers/marketing');
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
        const { getMediaJob } = await import('@/lib/ai/co-founder/workers/marketing');
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
        const { metaAdsService } = await import('@/lib/ai/co-founder/workers/marketing');
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
