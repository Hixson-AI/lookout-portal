/**
 * App Secrets API client
 */

import { apiRequest } from './index';

export interface AppSecretMeta {
  id: string;
  key: string;
  created_at: string;
  updated_at: string;
}

export interface SecretSchemaEntry {
  key: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface RequiredSecretsDiff {
  required: SecretSchemaEntry[];
  present: string[];
  missing: SecretSchemaEntry[];
  extra: string[];
  unknown_step_ids: string[];
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface TenantRequiredSecretsRollup {
  by_app: Array<{
    app_id: string;
    app_name: string;
    missing: SecretSchemaEntry[];
    extra: string[];
  }>;
  by_key: Array<{
    key: string;
    apps: Array<{
      app_id: string;
      app_name: string;
    }>;
  }>;
  missing_total: number;
  extra_total: number;
}

// List secrets for an app (keys only, never values)
export async function getAppSecrets(tenantId: string, appId: string): Promise<AppSecretMeta[]> {
  return apiRequest<AppSecretMeta[]>(`/v1/tenants/${tenantId}/apps/${appId}/secrets`);
}

// Set a secret value (encrypted at rest)
export async function setAppSecret(tenantId: string, appId: string, key: string, value: string): Promise<void> {
  await apiRequest<unknown>(`/v1/tenants/${tenantId}/apps/${appId}/secrets/${key}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });
}

// Delete a secret
export async function deleteAppSecret(tenantId: string, appId: string, key: string): Promise<void> {
  await apiRequest<void>(`/v1/tenants/${tenantId}/apps/${appId}/secrets/${key}`, {
    method: 'DELETE',
  });
}

// Generate required secrets schema from a workflow definition (deterministic, reads step catalog)
export async function generateRequiredSecrets(tenantId: string, workflowJson: unknown): Promise<SecretSchemaEntry[]> {
  return apiRequest<SecretSchemaEntry[]>(`/v1/tenants/${tenantId}/apps/generate-secret-schema`, {
    method: 'POST',
    body: JSON.stringify({ workflowJson }),
  });
}

// Get required secrets diff for an app
export async function getAppRequiredSecrets(tenantId: string, appId: string): Promise<RequiredSecretsDiff> {
  return apiRequest<RequiredSecretsDiff>(`/v1/tenants/${tenantId}/apps/${appId}/required-secrets`);
}

// Augment required secrets with LLM analysis
export async function augmentAppRequiredSecrets(tenantId: string, appId: string): Promise<RequiredSecretsDiff> {
  return apiRequest<RequiredSecretsDiff>(`/v1/tenants/${tenantId}/apps/${appId}/required-secrets/augment`, {
    method: 'POST',
  });
}

// Get tenant-wide required secrets rollup
export async function getTenantRequiredSecrets(tenantId: string): Promise<TenantRequiredSecretsRollup> {
  return apiRequest<TenantRequiredSecretsRollup>(`/v1/tenants/${tenantId}/required-secrets`);
}
