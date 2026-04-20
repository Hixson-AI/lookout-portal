/**
 * n8n workflow import/export API client
 */

import { apiRequest } from './index';

export interface N8nImportResult {
  workflow: Record<string, unknown>;
  unresolved: string[];
}

export async function importN8nWorkflow(workflowJson: object): Promise<N8nImportResult> {
  return apiRequest<N8nImportResult>('/v1/n8n/import', {
    method: 'POST',
    body: JSON.stringify({ workflowJson }),
  });
}

export async function exportN8nWorkflow(appId: string): Promise<{ n8nJson: object }> {
  return apiRequest<{ n8nJson: object }>('/v1/n8n/export', {
    method: 'POST',
    body: JSON.stringify({ appId }),
  });
}
