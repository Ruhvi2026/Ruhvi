import 'server-only';

import {
  AIWorkerInterface,
  WorkerDefinition,
  WorkerId,
  WorkerPriority,
  WorkerStructuredOutput,
  WorkerTaskInput,
} from './types';
import {
  PerformanceDataAccess,
  ScoreEngine,
  AnomalyDetector,
  ReportBuilder,
  MemberScorecard,
  WorkforceAlert,
  PerformanceEvent,
} from './performance';
import { getAllWorkerManifests } from '../workforce/manifests';

export class PerformanceIntelligenceWorker implements AIWorkerInterface {
  readonly id: WorkerId = 'worker_performance_intelligence';
  readonly name = 'Performance Intelligence Worker';
  readonly priority: WorkerPriority = 'HIGH';

  getDefinition(): WorkerDefinition {
    return {
      id: this.id,
      name: this.name,
      role: 'Workforce Quality & Performance Auditor',
      objective:
        'Continuous deterministic measurement, audit, and reporting of AI worker and human staff performance, output quality, and SLA adherence without paid dependencies.',
      priority: this.priority,
      responsibilities: [
        'Collect and normalize task execution records across AI workers and human staff',
        'Calculate deterministic role-specific KPIs using versioned mathematical definitions',
        'Evaluate deliverable quality against standardized rubrics without paid LLM reliance',
        'Score performance (0-100) and maintain separate cumulative achievement points',
        'Audit workforce for regressions, stale tasks, repeated retries, and high rework',
        'Diagnose evidence-backed root causes separating worker faults from external blockers',
        'Generate structured executive performance briefings for the AI Co-Founder',
      ],
      requiredSkills: [
        'Deterministic KPI calculation',
        'Quality rubric evaluation',
        'Evidence confidence scoring',
        'Root cause attribution',
        'Anomaly detection',
      ],
      requiredTools: [
        'get_workforce_events',
        'calculate_member_scorecard',
        'audit_workforce_quality',
        'generate_cofounder_report',
      ],
      permissionScope: [
        'admin:workforce_performance:read',
        'admin:workforce_performance:write',
        'mcp_tools:read',
      ],
      isSystemWorker: true,
    };
  }

  async execute(input: WorkerTaskInput): Promise<WorkerStructuredOutput> {
    const timestamp = new Date().toISOString();
    const params = input.parameters || {};

    const timeframe = input.timeframe || params.timeframe || '7d';
    const toDate = new Date();
    const fromDate = new Date();
    if (timeframe === '30d') {
      fromDate.setDate(toDate.getDate() - 30);
    } else if (timeframe === '24h' || timeframe === '1d') {
      fromDate.setDate(toDate.getDate() - 1);
    } else {
      fromDate.setDate(toDate.getDate() - 7);
    }

    const period = {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
    };

    try {
      // 1. Fetch raw events within window
      const events = await PerformanceDataAccess.getEvents({
        from: period.from,
        to: period.to,
      });

      // Group events by member
      const memberEventsMap = new Map<string, PerformanceEvent[]>();
      events.forEach((ev) => {
        const list = memberEventsMap.get(ev.memberId) || [];
        list.push(ev);
        memberEventsMap.set(ev.memberId, list);
      });

      // Dynamic AI workers roster derived from Worker manifests (PERF-03 / Section 0.2)
      const standardAIWorkers: Array<{ id: WorkerId; role: string }> =
        getAllWorkerManifests().map((manifest) => ({
          id: manifest.workerId,
          role: manifest.displayName || 'Operational AI Specialist',
        }));

      const scorecards: MemberScorecard[] = [];
      const allAlerts: WorkforceAlert[] = [];

      // Calculate scorecards for AI workers
      for (const w of standardAIWorkers) {
        const wEvents = memberEventsMap.get(w.id) || [];
        const points = await PerformanceDataAccess.getMemberPoints(w.id);
        const card = ScoreEngine.calculateMemberScorecard({
          memberId: w.id,
          entityType: 'AI_WORKER',
          roleId: w.role,
          events: wEvents,
          period,
          achievementPoints: points,
        });
        scorecards.push(card);

        const memberAlerts = AnomalyDetector.detectAnomalies(card, wEvents);
        allAlerts.push(...memberAlerts);
      }

      // Calculate scorecards for any recorded human staff
      for (const [memberId, memberEvents] of memberEventsMap.entries()) {
        const firstEvent = memberEvents[0];
        if (firstEvent && firstEvent.entityType === 'HUMAN_STAFF') {
          const points = await PerformanceDataAccess.getMemberPoints(memberId);
          const card = ScoreEngine.calculateMemberScorecard({
            memberId,
            entityType: 'HUMAN_STAFF',
            roleId: firstEvent.roleId,
            events: memberEvents,
            period,
            achievementPoints: points,
          });
          scorecards.push(card);
          const memberAlerts = AnomalyDetector.detectAnomalies(
            card,
            memberEvents
          );
          allAlerts.push(...memberAlerts);
        }
      }

      // Save detected alerts
      if (allAlerts.length > 0) {
        await PerformanceDataAccess.saveAlerts(allAlerts);
      }

      // Build overall audit report
      const auditReport = ReportBuilder.buildAuditReport({
        reportType:
          timeframe === '30d'
            ? 'MONTHLY'
            : timeframe === '1d'
              ? 'DAILY'
              : 'WEEKLY',
        period,
        scorecards,
        alerts: allAlerts,
        sourcesChecked: [
          'worker_dispatcher',
          'supabase_task_manager',
          'verification_engine',
        ],
      });

      // Single member target scorecard request
      if (params.memberId) {
        const specific = scorecards.find((s) => s.memberId === params.memberId);
        if (specific) {
          return {
            workerId: this.id,
            workerName: this.name,
            task: input.task,
            findings: [
              `Member: ${specific.memberId} (${specific.entityType})`,
              `Grade: ${specific.grade} (Score: ${specific.overallScore !== null ? specific.overallScore : 'N/A'}/100)`,
              `Confidence: ${specific.confidence} (Coverage: ${Math.round(specific.weightedCoverage * 100)}%)`,
              `Completed Tasks: ${specific.taskCounts.completed}, Verified: ${specific.taskCounts.verified}`,
            ],
            evidence: specific.kpis.map(
              (k) =>
                `${k.name}: ${k.value !== null ? k.value : 'N/A'} (Weight ${Math.round(k.weight * 100)}%)`
            ),
            problems: specific.weaknesses,
            opportunities: specific.strengths,
            recommendations: [
              specific.weaknesses.length > 0
                ? `Focus on improving: ${specific.weaknesses.join('; ')}`
                : 'Performance is optimal across evaluated dimensions.',
            ],
            priority:
              specific.overallScore !== null && specific.overallScore < 60
                ? 'critical'
                : 'medium',
            expectedImpact:
              'Maintains evidence-based role accountability and prevents quality regression.',
            requiredAction:
              'Review member scorecard in Admin Performance Intelligence Center.',
            requiredApproval: false,
            executionStatus: 'executed',
            verification:
              'Scorecard verified via deterministic formula and confidence engine.',
            data: { scorecard: specific },
            executiveVoiceSummary: `Scorecard calculated for ${specific.memberId}. Current status is ${specific.grade}.`,
            timestamp,
          };
        }
      }

      // General Workforce Audit Output
      const criticalCount = allAlerts.filter(
        (a) => a.severity === 'CRITICAL'
      ).length;
      const warningCount = allAlerts.filter(
        (a) => a.severity === 'WARNING'
      ).length;

      return {
        workerId: this.id,
        workerName: this.name,
        task: input.task,
        findings: [
          `Audited ${auditReport.populationSummary.aiWorkersTotal} AI Workers and ${auditReport.populationSummary.humanStaffTotal} Human Staff members.`,
          `AI Workers with valid scores: ${auditReport.populationSummary.aiWorkersWithValidScores}/${auditReport.populationSummary.aiWorkersTotal}.`,
          `Detected ${allAlerts.length} total operational alerts (${criticalCount} Critical, ${warningCount} Warning).`,
          `Data health status: ${auditReport.dataHealth.status}.`,
        ],
        evidence: [
          `Period: ${period.from.slice(0, 10)} to ${period.to.slice(0, 10)}`,
          `Score Version: ${auditReport.scoreVersion}`,
          `Total events analyzed: ${events.length}`,
        ],
        problems: auditReport.attentionRequired,
        opportunities: auditReport.topStrengths,
        recommendations: auditReport.recommendations,
        priority:
          criticalCount > 0 ? 'critical' : warningCount > 0 ? 'high' : 'medium',
        expectedImpact:
          'Provides zero-dependency, evidence-backed performance governance for AI Co-Founder.',
        requiredAction:
          criticalCount > 0
            ? 'Address critical performance alerts.'
            : 'No immediate action required.',
        requiredApproval: false,
        executionStatus: 'executed',
        verification:
          'Audit verified across deterministic KPI ledgers without external billable API dependencies.',
        data: { report: auditReport },
        executiveVoiceSummary: `Workforce performance audit complete. Analyzed ${auditReport.populationSummary.aiWorkersTotal} workers. Overall status is ${auditReport.dataHealth.status.toLowerCase()}.`,
        timestamp,
      };
    } catch (err: any) {
      return {
        workerId: this.id,
        workerName: this.name,
        task: input.task,
        findings: [
          'Encountered unexpected error during performance intelligence audit.',
        ],
        evidence: [err?.message || 'Unknown internal error'],
        problems: [err?.message || 'Diagnostic execution failure'],
        opportunities: [],
        recommendations: [
          'Check system logs and verify database table migrations.',
        ],
        priority: 'high',
        expectedImpact:
          'Restores workforce telemetry and diagnostic capabilities.',
        requiredAction: 'Inspect database connection and error details.',
        requiredApproval: false,
        executionStatus: 'failed',
        verification: 'Failed execution recorded.',
        executiveVoiceSummary:
          'Workforce audit encountered an error while processing telemetry.',
        timestamp,
      };
    }
  }
}

export const performanceIntelligenceWorker =
  new PerformanceIntelligenceWorker();
