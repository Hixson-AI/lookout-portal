import { apiRequest } from './index';
import type { AiKey } from '../types';

export function getAiKeys(tenantId: string): Promise<AiKey[]> {
  return apiRequest<AiKey[]>(`/v1/tenants/${tenantId}/ai-keys`);
}

export function createAiKey(tenantId: string, data: { provider: string; apiKey?: string; creditLimit?: number; limitReset?: string }): Promise<AiKey> {
  return apiRequest<AiKey>(`/v1/tenants/${tenantId}/ai-keys`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteAiKey(tenantId: string, provider: string): Promise<void> {
  return apiRequest<void>(`/v1/tenants/${tenantId}/ai-keys/${provider}`, {
    method: 'DELETE',
  });
}

export function decryptAiKey(tenantId: string, provider: string): Promise<{ key: string }> {
  return apiRequest<{ key: string }>(`/v1/tenants/${tenantId}/ai-keys/${provider}/decrypt`);
}
