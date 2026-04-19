/**
 * App/Workflow API client
 */

import { apiRequest } from './index';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface WorkflowStep {
  id: string;
  stepId: string;
  name: string;
  config: Record<string, unknown>;
  next?: string[];
}

export interface Workflow {
  version: string;
  name: string;
  description: string;
  trigger: {
    type: 'cron' | 'webhook' | 'api' | 'manual';
    config: Record<string, unknown>;
  };
  steps: WorkflowStep[];
}

export interface App {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  workflowJson: Workflow;
  triggerConfig: {
    type: string;
    config: Record<string, unknown>;
  };
  status: 'draft' | 'active' | 'paused' | 'archived';
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface AppExecution {
  id: string;
  appId: string;
  tenantId: string;
  triggerType: string;
  status: 'running' | 'completed' | 'failed';
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  logs: Record<string, unknown> | null;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
}

export interface CreateAppInput {
  tenantId: string;
  name: string;
  description: string;
  workflowJson: Workflow;
  triggerConfig: {
    type: string;
    config: Record<string, unknown>;
  };
}

export interface UpdateAppInput {
  name?: string;
  description?: string;
  workflowJson?: Workflow;
  triggerConfig?: {
    type: string;
    config: Record<string, unknown>;
  };
  status?: 'draft' | 'active' | 'paused' | 'archived';
}

// Get all apps for a tenant
export async function getApps(tenantId: string): Promise<App[]> {
  return apiRequest<App[]>(`/v1/tenants/${tenantId}/apps`);
}

// Get a specific app
export async function getApp(tenantId: string, appId: string): Promise<App> {
  return apiRequest<App>(`/v1/tenants/${tenantId}/apps/${appId}`);
}

// Create a new app
export async function createApp(input: CreateAppInput): Promise<App> {
  return apiRequest<App>(`/v1/tenants/${input.tenantId}/apps`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// Update an app
export async function updateApp(tenantId: string, appId: string, input: UpdateAppInput): Promise<App> {
  return apiRequest<App>(`/v1/tenants/${tenantId}/apps/${appId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

// Delete an app
export async function deleteApp(tenantId: string, appId: string): Promise<void> {
  return apiRequest<void>(`/v1/tenants/${tenantId}/apps/${appId}`, {
    method: 'DELETE',
  });
}

// Get executions for an app
export async function getAppExecutions(tenantId: string, appId: string): Promise<AppExecution[]> {
  return apiRequest<AppExecution[]>(`/api/v1/apps/${appId}/executions`, {
    headers: { 'X-Tenant-Id': tenantId },
  }, API_BASE_URL);
}

// Get a specific execution
export async function getExecution(tenantId: string, appId: string, executionId: string): Promise<AppExecution> {
  return apiRequest<AppExecution>(`/api/v1/apps/${appId}/executions/${executionId}`, {
    headers: { 'X-Tenant-Id': tenantId },
  }, API_BASE_URL);
}

// Trigger an app execution
export async function triggerApp(_tenantId: string, appId: string, input?: Record<string, unknown>): Promise<AppExecution> {
  return apiRequest<AppExecution>(`/v1/webhooks/${appId}`, {
    method: 'POST',
    body: JSON.stringify(input || {}),
  }, API_BASE_URL);
}

// Test a workflow step
export async function testStep(tenantId: string, appId: string, step: WorkflowStep): Promise<Record<string, unknown>> {
  return apiRequest<Record<string, unknown>>(`/v1/tenants/${tenantId}/apps/${appId}/steps/${step.id}/test`, {
    method: 'POST',
    body: JSON.stringify(step),
  });
}
