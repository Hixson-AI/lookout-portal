import { apiRequest } from './index';
import type { Tenant } from '../types';

export interface OperatorRole {
  id: string;
  email: string;
  role: 'admin' | 'operator' | 'viewer';
  created_at: string;
}

export function getTenants(): Promise<Tenant[]> {
  return apiRequest<Tenant[]>('/v1/tenants');
}

export function getTenant(id: string): Promise<Tenant> {
  return apiRequest<Tenant>(`/v1/tenants/${id}`);
}

export function createTenant(data: { name: string; slug: string; tier: string }): Promise<Tenant> {
  return apiRequest<Tenant>('/v1/tenants', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateTenant(id: string, data: Partial<Tenant>): Promise<Tenant> {
  return apiRequest<Tenant>(`/v1/tenants/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function getOperators(tenantId: string): Promise<OperatorRole[]> {
  return apiRequest<OperatorRole[]>(`/v1/tenants/${tenantId}/operators`);
}

export function addOperator(tenantId: string, email: string, role: string): Promise<OperatorRole> {
  return apiRequest<OperatorRole>(`/v1/tenants/${tenantId}/operators`, {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });
}

export function removeOperator(tenantId: string, operatorId: string): Promise<void> {
  return apiRequest<void>(`/v1/tenants/${tenantId}/operators/${operatorId}`, {
    method: 'DELETE',
  });
}
