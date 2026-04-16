import { getJwt, isJwtExpired, clearJwt } from './auth';

const CONTROL_PLANE_URL = import.meta.env.VITE_CONTROL_PLANE_URL;

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

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getJwt();
  if (!token) {
    clearJwt();
    window.location.href = '/login';
    throw new Error('No authentication token');
  }

  // Check if token is expired before making request
  if (isJwtExpired(token)) {
    clearJwt();
    window.location.href = '/login';
    throw new Error('Token expired');
  }

  const response = await fetch(`${CONTROL_PLANE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    // Handle 401 Unauthorized - token expired or invalid
    if (response.status === 401) {
      clearJwt();
      window.location.href = '/login';
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
};
