import { apiRequest } from './index';
import type { UsageRecord, UsageSummary } from '../types';

const API_URL = import.meta.env.VITE_API_URL;

export function getUsage(tenantId: string, startDate: string, endDate: string): Promise<{ usage: UsageRecord[]; summary: UsageSummary[] }> {
  return apiRequest<{ usage: UsageRecord[]; summary: UsageSummary[] }>(
    `/api/v1/tenants/${tenantId}/usage?startDate=${startDate}&endDate=${endDate}`,
    {},
    API_URL
  );
}
