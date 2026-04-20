/**
 * Builder Agent API client
 */

import { apiRequest } from './index';
import type { Workflow } from './apps';

export interface AgentResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface WorkflowBuilderResult {
  workflow: Workflow;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface SecretSchemaResult {
  secretSchema: Array<{
    key: string;
    type: string;
    required: boolean;
    description: string;
  }>;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface StepRecommendationResult {
  steps: Array<{
    id: string;
    name: string;
    category: string;
    description: string;
    reason: string;
  }>;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingSecrets: string[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface DryRunResult {
  success: boolean;
  steps: Array<{
    stepId: string;
    name: string;
    status: 'success' | 'failed' | 'skipped';
    input: Record<string, unknown>;
    output: Record<string, unknown> | null;
    error: string | null;
  }>;
  estimatedDuration: number;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface DebugResult {
  diagnosis: string;
  suggestedFixes: string[];
  missingConfig: string[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

// ── Builder Chat ──────────────────────────────────────────────────────────

export interface RawToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface ChatApiMessage {
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string | null;
  toolCallId?: string;
  toolCalls?: RawToolCall[];
}

export interface ToolCallProps {
  // step_picker
  title?: string;
  steps?: Array<{ id: string; name: string; category: string; description: string }>;
  multi?: boolean;
  // field_input / choice_select
  label?: string;
  placeholder?: string;
  hint?: string;
  default_value?: string;
  field_type?: 'text' | 'email' | 'phone' | 'number' | 'url' | 'cron' | 'date';
  fieldId?: string;
  options?: Array<{ value: string; label: string }>;
  // confirm_add_steps
  summary?: string;
  trigger?: { type: string; schedule?: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface ChatToolCall {
  id: string;
  tool: string;
  props: ToolCallProps;
}

export interface ChatResult {
  text: string | null;
  toolCall: ChatToolCall | null;
  rawToolCalls: RawToolCall[] | null;
  usage?: { inputTokens: number; outputTokens: number };
}

export async function chat(
  tenantId: string,
  messages: ChatApiMessage[],
  workflow: unknown,
): Promise<ChatResult> {
  return apiRequest<ChatResult>(`/v1/tenants/${tenantId}/agents/chat`, {
    method: 'POST',
    body: JSON.stringify({ messages, workflow }),
  });
}

// Build workflow from description
export async function buildWorkflow(tenantId: string, description: string): Promise<WorkflowBuilderResult> {
  return apiRequest<WorkflowBuilderResult>(`/v1/tenants/${tenantId}/agents/build-workflow`, {
    method: 'POST',
    body: JSON.stringify({ description }),
  });
}

// Generate secret schema for workflow
export async function generateSecretSchema(tenantId: string, workflow: Workflow): Promise<SecretSchemaResult> {
  return apiRequest<SecretSchemaResult>(`/v1/tenants/${tenantId}/agents/secret-schema`, {
    method: 'POST',
    body: JSON.stringify({ workflow }),
  });
}

// Get step recommendations
export async function recommendSteps(tenantId: string, context: string, category?: string): Promise<StepRecommendationResult> {
  return apiRequest<StepRecommendationResult>(`/v1/tenants/${tenantId}/agents/recommend-steps`, {
    method: 'POST',
    body: JSON.stringify({ context, category }),
  });
}

// Validate workflow
export async function validateWorkflow(tenantId: string, workflow: Workflow): Promise<ValidationResult> {
  return apiRequest<ValidationResult>(`/v1/tenants/${tenantId}/agents/validate`, {
    method: 'POST',
    body: JSON.stringify({ workflow }),
  });
}

// Dry run workflow
export async function dryRunWorkflow(tenantId: string, workflow: Workflow, input?: Record<string, unknown>): Promise<DryRunResult> {
  return apiRequest<DryRunResult>(`/v1/tenants/${tenantId}/agents/dry-run`, {
    method: 'POST',
    body: JSON.stringify({ workflow, input }),
  });
}

// Debug failed execution
export async function debugExecution(tenantId: string, executionId: string, error: string): Promise<DebugResult> {
  return apiRequest<DebugResult>(`/v1/tenants/${tenantId}/agents/debug`, {
    method: 'POST',
    body: JSON.stringify({ executionId, error }),
  });
}

// Research integration
export async function researchIntegration(tenantId: string, service: string, context?: string): Promise<AgentResponse> {
  return apiRequest<AgentResponse>(`/v1/tenants/${tenantId}/agents/research-integration`, {
    method: 'POST',
    body: JSON.stringify({ service, context }),
  });
}

// Generate code for custom step
export async function generateStepCode(tenantId: string, description: string, requirements?: string): Promise<AgentResponse> {
  return apiRequest<AgentResponse>(`/v1/tenants/${tenantId}/agents/generate-code`, {
    method: 'POST',
    body: JSON.stringify({ description, requirements }),
  });
}

// Analyze RAG optimization
export async function analyzeRAG(tenantId: string, workflow: Workflow, appContext?: string): Promise<AgentResponse> {
  return apiRequest<AgentResponse>(`/v1/tenants/${tenantId}/agents/analyze-rag`, {
    method: 'POST',
    body: JSON.stringify({ workflow, appContext }),
  });
}
