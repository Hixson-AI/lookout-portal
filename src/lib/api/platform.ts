/**
 * Platform admin API client — system admin only
 */

import { apiRequest } from './index';

export interface PlatformSetting {
  key: string;
  isSet: boolean;
  preview: string | null;
  updatedAt: string | null;
}

export interface CatalogAction {
  id: string;
  name: string;
  description: string;
  category: string;
  actionType: string | null;
  executionMode: string;
  isSystem: boolean;
  hasEmbedding: boolean;
}

export interface SyncResult {
  message: string;
  output: string;
}

export interface ReindexResult {
  indexed: number;
  failed: number;
}

export async function getPlatformSettings(): Promise<PlatformSetting[]> {
  return apiRequest<PlatformSetting[]>('/v1/platform/settings');
}

export async function setPlatformSetting(key: string, value: string): Promise<{ key: string; isSet: boolean }> {
  return apiRequest<{ key: string; isSet: boolean }>(`/v1/platform/settings/${key}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });
}

export async function clearPlatformSetting(key: string): Promise<void> {
  return apiRequest<void>(`/v1/platform/settings/${key}`, { method: 'DELETE' });
}

export async function triggerN8nSync(node?: string): Promise<SyncResult> {
  return apiRequest<SyncResult>('/v1/catalog/actions/sync-n8n', {
    method: 'POST',
    body: node ? JSON.stringify({ node }) : undefined,
  });
}

export async function triggerReindex(): Promise<ReindexResult> {
  return apiRequest<ReindexResult>('/v1/catalog/actions/reindex', { method: 'POST' });
}
