export type { WorkflowStep, Workflow, App, AppExecution } from './api/apps';
export type { AppSecretMeta } from './api/app-secrets';

// API response wrapper type
export interface ApiResponse<T> {
  data: T;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended';
  tier: string;
  profile?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKey {
  id: string;
  prefix: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface CreateApiKeyResponse {
  key: string;
  apiKey: ApiKey;
}

export interface AiKey {
  id: string;
  provider: 'openrouter' | 'anthropic';
  status: 'active' | 'disabled' | 'revoked';
  key_prefix: string;
  provider_key_id: string;
  credit_limit: number | null;
  limit_reset: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UsageSummary {
  provider: string;
  model: string;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  request_count: number;
}

export interface UsageRecord {
  id: string;
  tenant_id: string;
  provider: 'openrouter' | 'anthropic';
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  request_id: string;
  created_at: string;
}
