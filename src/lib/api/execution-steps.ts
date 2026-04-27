/**
 * Execution step tree API client (Slice 6.2.E).
 *
 * Fetches and streams AppStepExecution rows for a given execution.
 *
 * Endpoints:
 *   GET  /api/v1/apps/:appId/executions/:executionId/steps  — initial fetch
 *   GET  /api/v1/apps/:appId/executions/:executionId/events — SSE stream
 *
 * The API mount is tenant-scoped (tenantMiddleware enforces it via
 * `X-Tenant-Id` header), which matches the pattern the existing
 * `getExecution()` helper uses at apps.ts:121-125.
 */

import { apiRequest } from './index';

const API_URL = import.meta.env.VITE_API_URL;

export interface AppStepExecution {
  id: string;
  appExecutionId: string;
  parentStepExecutionId: string | null;
  stepInstanceId: string;
  stepId: string;
  runtime: 'native' | 'n8n' | 'inprocess';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'skipped';
  input: unknown;
  output: unknown;
  error: string | null;
  logs: unknown;
  machineId: string | null;
  machineType: string | null;
  imageRef: string | null;
  startedAt: string | null;
  completedAt: string | null;
  lastHeartbeatAt: string | null;
  durationSeconds: number | null;
  computeCostUsd: number | null;
  createdAt: string;
}

export interface StepUpdate {
  stepExecutionId: string;
  status: AppStepExecution['status'];
  error?: string;
}

export async function getExecutionSteps(
  tenantId: string,
  appId: string,
  executionId: string,
): Promise<AppStepExecution[]> {
  const envelope = await apiRequest<{ data: AppStepExecution[] }>(
    `/api/v1/apps/${appId}/executions/${executionId}/steps`,
    { headers: { 'X-Tenant-Id': tenantId } },
    API_URL,
  );
  return envelope.data;
}

/**
 * Opens a native EventSource against the api's SSE stream.
 * Returns the raw EventSource so the caller owns its lifecycle.
 *
 * The `token` param appends `?token=...` because EventSource cannot set
 * arbitrary headers (no Authorization or X-Tenant-Id). In dev where CORS
 * + cookies handle auth, the URL-only form works; the api side enforces
 * tenant scope via the existing session.
 */
export function openExecutionEvents(
  appId: string,
  executionId: string,
): EventSource {
  const url = `${API_URL}/api/v1/apps/${appId}/executions/${executionId}/events`;
  return new EventSource(url, { withCredentials: true });
}

/**
 * Cancels a running execution.
 *
 * POST /api/v1/tenants/:tenantId/apps/:appId/cancel/:executionId
 */
export async function cancelExecution(
  tenantId: string,
  appId: string,
  executionId: string,
): Promise<{ data: { executionId: string; status: string } }> {
  return apiRequest<{ data: { executionId: string; status: string } }>(
    `/api/v1/tenants/${tenantId}/apps/${appId}/cancel/${executionId}`,
    { method: 'POST' },
    API_URL,
  );
}
