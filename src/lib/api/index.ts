import { getJwt } from '../auth';
import type { ApiResponse } from '../types';
import * as tenants from './tenants';
import * as apiKeys from './api-keys';
import * as aiKeys from './ai-keys';
import * as usage from './usage';
import * as apps from './apps';
import * as appSecrets from './app-secrets';
import * as actions from './actions';
import * as agents from './agents';

/**
 * Convert snake_case keys to camelCase — shallow only (does not recurse into
 * nested objects, preserving user-defined schema property names).
 */
function shallowCamelize<T>(data: T): T {
  if (Array.isArray(data)) {
    return data.map(shallowCamelize) as T;
  }
  if (data !== null && typeof data === 'object' && !(data instanceof Date)) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const camel = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
      result[camel] = value;
    }
    return result as T;
  }
  return data;
}

const CONTROL_PLANE_URL = import.meta.env.VITE_CONTROL_PLANE_URL;

let onAuthError: (() => void) | null = null;

export function setOnAuthError(handler: () => void) {
  onAuthError = handler;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  baseUrl: string = CONTROL_PLANE_URL
): Promise<T> {
  const token = getJwt();
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      if (onAuthError) onAuthError();
      throw new Error('Authentication failed');
    }
    const error = await response.text();
    throw new Error(error || `API error: ${response.status}`);
  }

  const json = await response.json() as unknown;
  // Unwrap data property if present (backend pattern)
  const raw = (typeof json === 'object' && json !== null && 'data' in json)
    ? (json as ApiResponse<T>).data
    : json as T;
  return shallowCamelize(raw);
}

export const api = {
  ...tenants,
  ...apiKeys,
  ...aiKeys,
  ...usage,
  ...apps,
  ...appSecrets,
  ...actions,
  ...agents,
};

export * from './tenants';
export * from './api-keys';
export * from './ai-keys';
export * from './usage';
export * from './apps';
export * from './app-secrets';
export * from './actions';
export * from './agents';
