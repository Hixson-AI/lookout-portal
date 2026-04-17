import { apiRequest } from './index';
import type { Tenant } from '../types';

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
