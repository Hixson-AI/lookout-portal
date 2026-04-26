/**
 * Platform Jobs API client (Slice 6.x).
 *
 * Executions list/detail for the platform tenant's admin apps. Backed by
 * lookout-control's /v1/platform/apps/:appId/executions proxy which in turn
 * queries lookout-api's internal executions endpoint.
 */

import { apiRequest } from './index';

export interface PlatformExecution {
  id: string;
  appId: string;
  tenantId: string;
  triggerType: 'api' | 'cron' | 'webhook' | 'manual';
  status: 'queued' | 'running' | 'cancelling' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt: string | null;
  currentStepIndex: number;
  totalSteps: number;
  currentStepName: string | null;
  lastHeartbeatAt: string | null;
  machineId: string | null;
  machineType: string | null;
  imageRef: string | null;
  durationSeconds: number | null;
  computeCostUsd: number | null;
  llmCostUsd?: number;
  error: string | null;
  output?: unknown;
  input?: unknown;
  logs?: unknown;
}

export function listPlatformExecutions(appId: string, limit = 50): Promise<PlatformExecution[]> {
  return apiRequest<PlatformExecution[]>(
    `/v1/platform/apps/${appId}/executions?limit=${limit}`,
  );
}

export function getPlatformExecution(appId: string, executionId: string): Promise<PlatformExecution> {
  return apiRequest<PlatformExecution>(
    `/v1/platform/apps/${appId}/executions/${executionId}`,
  );
}
