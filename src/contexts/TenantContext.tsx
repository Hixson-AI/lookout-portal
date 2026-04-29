/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
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
  const location = useLocation();

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

  // Resolve current tenant from URL, then localStorage, then first tenant.
  // Re-runs on every navigation so that client-side routes like
  // /tenants/:id -> /:slug (via LegacyTenantRedirect) update the header.
  useEffect(() => {
    if (availableTenants.length === 0) return;

    const savedSlug = localStorage.getItem(STORAGE_KEY);
    const urlSlug = location.pathname.split('/')[1];

    // Try URL slug first — this takes precedence so SPA navigation
    // to a different tenant updates the active tenant.
    const fromUrl = availableTenants.find((t) => t.slug === urlSlug);
    if (fromUrl) {
      if (fromUrl.id !== currentTenant?.id) {
        setCurrentTenantState(fromUrl);
        localStorage.setItem(STORAGE_KEY, fromUrl.slug);
      }
      return;
    }

    // If we already have a selected tenant and the URL isn't pointing at
    // a specific tenant (e.g. /tenants, /platform, /select-tenant), keep it.
    if (currentTenant) return;

    // Try localStorage
    const fromStorage = availableTenants.find((t) => t.slug === savedSlug);
    if (fromStorage) {
      setCurrentTenantState(fromStorage);
      return;
    }

    // Fallback to first tenant
    setCurrentTenantState(availableTenants[0]);
  }, [availableTenants, location.pathname, currentTenant]);

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
