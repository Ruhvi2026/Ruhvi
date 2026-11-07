export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<{ success: boolean; meta: any; results?: T[] }>;
  all<T = unknown>(): Promise<{ success: boolean; meta: any; results: T[] }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(
    statements: D1PreparedStatement[]
  ): Promise<{ success: boolean; meta: any; results?: T[] }[]>;
  exec<T = unknown>(
    query: string
  ): Promise<{ count: number; duration: number }>;
}

export interface R2Bucket {
  get(key: string): Promise<any>;
  put(key: string, value: any, options?: any): Promise<any>;
  delete(key: string): Promise<void>;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

export interface Env {
  DB: D1Database;
  ARTIFACTS: R2Bucket;
  ENVIRONMENT: string;
  ACCESS_CLIENT_ID?: string;
  ACCESS_CLIENT_SECRET?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: Record<string, any>;
}

export interface MemoryItem {
  id: string;
  memory_type:
    | 'user_instruction'
    | 'user_preference'
    | 'project_memory'
    | 'episodic_memory'
    | 'candidate_lesson'
    | 'verified_lesson'
    | 'research_memory';
  scope: string;
  content: string;
  normalized_key?: string;
  source: string;
  confidence: number;
  status: 'active' | 'archived' | 'deprecated' | 'expired';
  priority: number;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AgentRun {
  id: string;
  task_type: string;
  started_at: string;
  ended_at?: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  model_route?: string;
  correlation_id: string;
  outcome_summary?: string;
}
