import { apiRequest } from './index';
import type { ApiKey, CreateApiKeyResponse } from '../types';

export function getApiKeys(tenantId: string): Promise<ApiKey[]> {
  return apiRequest<ApiKey[]>(`/v1/tenants/${tenantId}/api-keys`);
}

export function createApiKey(tenantId: string, label: string): Promise<CreateApiKeyResponse> {
  return apiRequest<CreateApiKeyResponse>(`/v1/tenants/${tenantId}/api-keys`, {
    method: 'POST',
    body: JSON.stringify({ label }),
  });
}

export function deleteApiKey(tenantId: string, keyId: string): Promise<void> {
  return apiRequest<void>(`/v1/tenants/${tenantId}/api-keys/${keyId}`, {
    method: 'DELETE',
  });
}
