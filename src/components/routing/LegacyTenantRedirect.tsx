import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTenantContext } from '../../contexts/TenantContext';

interface LegacyTenantRedirectProps {
  to?: string;
}

export function LegacyTenantRedirect({ to }: LegacyTenantRedirectProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { availableTenants } = useTenantContext();

  useEffect(() => {
    if (!id) return;

    const tenant = availableTenants.find((t) => t.id === id);
    if (tenant) {
      const path = to ? `/${tenant.slug}/${to}` : `/${tenant.slug}`;
      navigate(path, { replace: true });
    }
  }, [id, availableTenants, to, navigate]);

  return <div className="min-h-screen flex items-center justify-center">Redirecting...</div>;
}
