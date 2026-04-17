import { getJwt } from './auth';

const CONTROL_PLANE_URL = import.meta.env.VITE_CONTROL_PLANE_URL;
const API_URL = import.meta.env.VITE_API_URL;

let onAuthError: (() => void) | null = null;

export function setOnAuthError(handler: () => void) {
  onAuthError = handler;
}

// API response wrapper type
interface ApiResponse<T> {
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

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  baseUrl: string = CONTROL_PLANE_URL
): Promise<T> {
  const token = getJwt();
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      if (onAuthError) onAuthError();
      throw new Error('Authentication failed');
    }
    const error = await response.text();
    throw new Error(error || `API error: ${response.status}`);
  }

  const json = await response.json() as unknown;
  // Unwrap data property if present (backend pattern)
  if (typeof json === 'object' && json !== null && 'data' in json) {
    return (json as ApiResponse<T>).data;
  }
  return json as T;
}

export const api = {
  // Tenants
  getTenants: (): Promise<Tenant[]> =>
    apiRequest<Tenant[]>('/v1/tenants'),

  getTenant: (id: string): Promise<Tenant> =>
    apiRequest<Tenant>(`/v1/tenants/${id}`),

  createTenant: (data: { name: string; slug: string; tier: string }): Promise<Tenant> =>
    apiRequest<Tenant>('/v1/tenants', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTenant: (id: string, data: Partial<Tenant>): Promise<Tenant> =>
    apiRequest<Tenant>(`/v1/tenants/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // API Keys
  getApiKeys: (tenantId: string): Promise<ApiKey[]> =>
    apiRequest<ApiKey[]>(`/v1/tenants/${tenantId}/api-keys`),

  createApiKey: (tenantId: string, label: string): Promise<CreateApiKeyResponse> =>
    apiRequest<CreateApiKeyResponse>(`/v1/tenants/${tenantId}/api-keys`, {
      method: 'POST',
      body: JSON.stringify({ label }),
    }),

  deleteApiKey: (tenantId: string, keyId: string): Promise<void> =>
    apiRequest<void>(`/v1/tenants/${tenantId}/api-keys/${keyId}`, {
      method: 'DELETE',
    }),

  // AI Keys
  getAiKeys: (tenantId: string): Promise<AiKey[]> =>
    apiRequest<AiKey[]>(`/v1/tenants/${tenantId}/ai-keys`),

  createAiKey: (tenantId: string, data: { provider: string; apiKey?: string; creditLimit?: number; limitReset?: string }): Promise<AiKey> =>
    apiRequest<AiKey>(`/v1/tenants/${tenantId}/ai-keys`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteAiKey: (tenantId: string, provider: string): Promise<void> =>
    apiRequest<void>(`/v1/tenants/${tenantId}/ai-keys/${provider}`, {
      method: 'DELETE',
    }),

  decryptAiKey: (tenantId: string, provider: string): Promise<{ key: string }> =>
    apiRequest<{ key: string }>(`/v1/tenants/${tenantId}/ai-keys/${provider}/decrypt`),

  // Usage (hits lookout-api, not control plane)
  getUsage: (tenantId: string, startDate: string, endDate: string): Promise<{ usage: UsageRecord[]; summary: UsageSummary[] }> =>
    apiRequest<{ usage: UsageRecord[]; summary: UsageSummary[] }>(
      `/api/v1/tenants/${tenantId}/usage?startDate=${startDate}&endDate=${endDate}`,
      {},
      API_URL
    ),
};
