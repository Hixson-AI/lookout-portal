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
  output?: string;
  executionId?: string;
  status?: string;
}

/**
 * Reindex API response — discriminated by which path the control plane took:
 *
 * - Selective reindex (`ids` provided): runs in-process and returns counts.
 * - Full reindex: dispatched asynchronously through the Machine Runner and
 *   returns an `executionId` + status. `indexed` / `failed` are NOT yet
 *   known — the worker will publish them via the execution lifecycle.
 *   Local-dev fallback (no machine runner wired) still returns counts.
 */
export type ReindexResult =
  | { indexed: number; failed: number }
  | { message: string; executionId: string; status: string };

export function isReindexCounts(
  r: ReindexResult,
): r is { indexed: number; failed: number } {
  return typeof (r as { indexed?: unknown }).indexed === 'number';
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

export async function triggerN8nSync(node?: string, force = false): Promise<SyncResult> {
  const body: Record<string, unknown> = { incremental: !force, force };
  if (node) body.node = node;
  return apiRequest<SyncResult>('/v1/catalog/actions/sync-n8n', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function triggerReindex(ids?: string[]): Promise<ReindexResult> {
  return apiRequest<ReindexResult>('/v1/catalog/actions/reindex', {
    method: 'POST',
    body: ids ? JSON.stringify({ ids }) : undefined,
  });
}
