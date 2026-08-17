export interface ProviderCredential {
  id: string;
  provider_id: string;
  display_name: string;
  priority: number;
  is_enabled: boolean;
  health_status:
    | 'healthy'
    | 'rate_limited'
    | 'quota_exhausted'
    | 'cooldown'
    | 'invalid'
    | 'unknown';
  failure_count: number;
  success_count: number;
  total_requests: number;
  rate_limit_count: number;
  quota_exhaustion_count: number;
  cooldown_until: string | null;
  last_used_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_error: string | null;
  has_key: boolean;
  masked_key: string;
  created_at: string;
  updated_at: string;
}

export interface ModelHealthRecord {
  id: string;
  provider_id: string;
  model_id: string;
  status:
    | 'active'
    | 'degraded'
    | 'rate_limited'
    | 'unavailable'
    | 'deprecated'
    | 'invalid'
    | 'unknown';
  capabilities: Record<string, any>;
  last_checked_at: string | null;
  is_default: boolean;
  priority: number;
  is_enabled: boolean;
}

export interface AiComponentProps {
  providers: any[];
  setProviders: (p: any[]) => void;
  features: any;
  setFeatures: (f: any) => void;
  prompts: any;
  setPrompts: (p: any) => void;
  globalConfig: any;
  setGlobalConfig: (g: any) => void;
  logs: any[];
  saveSettings: () => void;
  isSaving: boolean;
  PREDEFINED_PROVIDERS: Record<string, any>;
}
