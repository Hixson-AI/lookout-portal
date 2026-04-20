/**
 * Agent Action API client
 */

import { apiRequest } from './index';

export interface AgentAction {
  id: string;
  parentId: string | null;
  name: string;
  description: string;
  category: string;
  actionType: string | null;
  secretSchema: Array<{
    key: string;
    type: string;
    required: boolean;
    description: string;
  }>;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  configSchema: Record<string, unknown> | null;
  isSystem: boolean;
  isReusable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ActionTest {
  id: string;
  actionId: string;
  name: string;
  input: Record<string, unknown>;
  expectedOutput: Record<string, unknown>;
  createdAt: string;
}

// Get all actions (admin)
export async function getActions(): Promise<AgentAction[]> {
  return apiRequest<AgentAction[]>('/v1/agent-actions');
}

// Get the public action catalog (any authenticated operator, for builder UI)
export async function getCatalog(category?: string): Promise<AgentAction[]> {
  const qs = category ? `?category=${category}` : '';
  return apiRequest<AgentAction[]>(`/v1/catalog/actions${qs}`);
}

// Get actions by category
export async function getActionsByCategory(category: string): Promise<AgentAction[]> {
  return apiRequest<AgentAction[]>(`/v1/agent-actions?category=${category}`);
}

// Get a specific action
export async function getAction(actionId: string): Promise<AgentAction> {
  return apiRequest<AgentAction>(`/v1/agent-actions/${actionId}`);
}

// Create a new action (admin only)
export async function createAction(action: Omit<AgentAction, 'id' | 'createdAt' | 'updatedAt'>): Promise<AgentAction> {
  return apiRequest<AgentAction>('/v1/agent-actions', {
    method: 'POST',
    body: JSON.stringify(action),
  });
}

// Update an action (admin only)
export async function updateAction(actionId: string, action: Partial<Omit<AgentAction, 'id' | 'createdAt' | 'updatedAt'>>): Promise<AgentAction> {
  return apiRequest<AgentAction>(`/v1/agent-actions/${actionId}`, {
    method: 'PATCH',
    body: JSON.stringify(action),
  });
}

// Delete an action (admin only)
export async function deleteAction(actionId: string): Promise<void> {
  return apiRequest<void>(`/v1/agent-actions/${actionId}`, {
    method: 'DELETE',
  });
}

// Get tests for an action
export async function getActionTests(actionId: string): Promise<ActionTest[]> {
  return apiRequest<ActionTest[]>(`/v1/agent-actions/${actionId}/tests`);
}

// Create a test for an action
export async function createActionTest(actionId: string, test: Omit<ActionTest, 'id' | 'actionId' | 'createdAt'>): Promise<ActionTest> {
  return apiRequest<ActionTest>(`/v1/agent-actions/${actionId}/tests`, {
    method: 'POST',
    body: JSON.stringify(test),
  });
}
