/**
 * Agent Step API client
 */

import { apiRequest } from './index';

export interface AgentStep {
  id: string;
  parentId: string | null;
  name: string;
  description: string;
  category: string;
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

export interface StepTest {
  id: string;
  stepId: string;
  name: string;
  input: Record<string, unknown>;
  expectedOutput: Record<string, unknown>;
  createdAt: string;
}

// Get all steps
export async function getSteps(): Promise<AgentStep[]> {
  return apiRequest<AgentStep[]>('/v1/agent-steps');
}

// Get steps by category
export async function getStepsByCategory(category: string): Promise<AgentStep[]> {
  return apiRequest<AgentStep[]>(`/v1/agent-steps?category=${category}`);
}

// Get a specific step
export async function getStep(stepId: string): Promise<AgentStep> {
  return apiRequest<AgentStep>(`/v1/agent-steps/${stepId}`);
}

// Create a new step (admin only)
export async function createStep(step: Omit<AgentStep, 'id' | 'createdAt' | 'updatedAt'>): Promise<AgentStep> {
  return apiRequest<AgentStep>('/v1/agent-steps', {
    method: 'POST',
    body: JSON.stringify(step),
  });
}

// Update a step (admin only)
export async function updateStep(stepId: string, step: Partial<Omit<AgentStep, 'id' | 'createdAt' | 'updatedAt'>>): Promise<AgentStep> {
  return apiRequest<AgentStep>(`/v1/agent-steps/${stepId}`, {
    method: 'PATCH',
    body: JSON.stringify(step),
  });
}

// Delete a step (admin only)
export async function deleteStep(stepId: string): Promise<void> {
  return apiRequest<void>(`/v1/agent-steps/${stepId}`, {
    method: 'DELETE',
  });
}

// Get tests for a step
export async function getStepTests(stepId: string): Promise<StepTest[]> {
  return apiRequest<StepTest[]>(`/v1/agent-steps/${stepId}/tests`);
}

// Create a test for a step
export async function createStepTest(stepId: string, test: Omit<StepTest, 'id' | 'stepId' | 'createdAt'>): Promise<StepTest> {
  return apiRequest<StepTest>(`/v1/agent-steps/${stepId}/tests`, {
    method: 'POST',
    body: JSON.stringify(test),
  });
}
