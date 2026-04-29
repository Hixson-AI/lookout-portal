import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenantContext } from '../../contexts/TenantContext';

export function RootRedirect() {
  const navigate = useNavigate();
  const { currentTenant, availableTenants, loading } = useTenantContext();

  useEffect(() => {
    if (loading) return;

    if (currentTenant) {
      navigate(`/${currentTenant.slug}`, { replace: true });
    } else if (availableTenants.length === 1) {
      navigate(`/${availableTenants[0].slug}`, { replace: true });
    } else if (availableTenants.length > 1) {
      navigate('/select-tenant', { replace: true });
    }
  }, [currentTenant, availableTenants, loading, navigate]);

  return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
}
