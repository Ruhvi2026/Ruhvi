import 'server-only';

export type WorkerId =
  | 'worker_analytics_performance'
  | 'worker_marketing'
  | 'worker_seo'
  | 'worker_product'
  | 'worker_competitor_research'
  | 'worker_sales_conversion'
  | 'worker_customer_support'
  | 'worker_content_blog'
  | 'worker_inventory'
  | 'worker_review_feedback'
  | 'worker_execution'
  | 'worker_monitoring_verification';

export type WorkerPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type WorkerExecutionStatus =
  | 'not_required'
  | 'pending_approval'
  | 'approved'
  | 'executed'
  | 'failed';

export interface WorkerDefinition {
  id: WorkerId;
  name: string;
  role: string;
  objective: string;
  priority: WorkerPriority;
  responsibilities: string[];
  requiredSkills: string[];
  requiredTools: string[];
  permissionScope: string[];
  isSystemWorker: boolean;
}

export interface WorkerTaskInput {
  task: string;
  timeframe?: string;
  parameters?: Record<string, any>;
  userId?: string;
  userRole?: string;
  channel?: 'voice' | 'text';
  dryRun?: boolean;
}

export interface WorkerStructuredOutput {
  workerId: WorkerId;
  workerName: string;
  task: string;
  findings: string[];
  evidence: string[];
  problems: string[];
  opportunities: string[];
  recommendations: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  expectedImpact: string;
  requiredAction: string;
  requiredApproval: boolean;
  executionStatus: WorkerExecutionStatus;
  verification: string;
  missingCapabilities?: string[];
  data?: Record<string, any>;
  executiveVoiceSummary: string;
  timestamp: string;
}

export interface AIWorkerInterface {
  readonly id: WorkerId;
  readonly name: string;
  readonly priority: WorkerPriority;
  getDefinition(): WorkerDefinition;
  execute(input: WorkerTaskInput): Promise<WorkerStructuredOutput>;
}
