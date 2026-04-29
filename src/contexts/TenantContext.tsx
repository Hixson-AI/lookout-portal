/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../lib/api';
import type { Tenant } from '../lib/types';

interface TenantContextValue {
  currentTenant: Tenant | null;
  availableTenants: Tenant[];
  setCurrentTenant: (slug: string) => void;
  loading: boolean;
}

const TenantContext = createContext<TenantContextValue | null>(null);

const STORAGE_KEY = 'lookout:tenantSlug';

export function TenantProvider({ children }: { children: ReactNode }) {
  const [currentTenant, setCurrentTenantState] = useState<Tenant | null>(null);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  // Load available tenants on mount
  useEffect(() => {
    const loadTenants = async () => {
      try {
        const tenants = await api.getTenants();
        setAvailableTenants(Array.isArray(tenants) ? tenants : []);
      } catch (err) {
        console.error('Failed to load tenants:', err);
        setAvailableTenants([]);
      } finally {
        setLoading(false);
      }
    };
    loadTenants();
  }, []);

  // Resolve current tenant from localStorage or URL or first tenant
  useEffect(() => {
    if (availableTenants.length === 0) return;

    const savedSlug = localStorage.getItem(STORAGE_KEY);
    const urlSlug = window.location.pathname.split('/')[1];

    // Try URL slug first
    const fromUrl = availableTenants.find((t) => t.slug === urlSlug);
    if (fromUrl) {
      setCurrentTenantState(fromUrl);
      return;
    }

    // Try localStorage
    const fromStorage = availableTenants.find((t) => t.slug === savedSlug);
    if (fromStorage) {
      setCurrentTenantState(fromStorage);
      return;
    }

    // Fallback to first tenant
    setCurrentTenantState(availableTenants[0]);
  }, [availableTenants]);

  const setCurrentTenant = (slug: string) => {
    const tenant = availableTenants.find((t) => t.slug === slug);
    if (tenant) {
      setCurrentTenantState(tenant);
      localStorage.setItem(STORAGE_KEY, slug);
      window.location.pathname = `/${slug}`;
    }
  };

  return (
    <TenantContext.Provider value={{ currentTenant, availableTenants, setCurrentTenant, loading }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenantContext() {
  const context = useContext(TenantContext);
  if (!context) {
    return { currentTenant: null, availableTenants: [], setCurrentTenant: () => {}, loading: false };
  }
  return context;
}
