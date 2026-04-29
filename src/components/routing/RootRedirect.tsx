import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenantContext } from '../../contexts/TenantContext';
import { LukoutLoaderCentered } from '../ui/lukout-loader';

export function RootRedirect() {
  const navigate = useNavigate();
  const { currentTenant, availableTenants, loading } = useTenantContext();

  useEffect(() => {
    if (loading) return;

    if (currentTenant) {
      navigate(`/${currentTenant.slug}`, { replace: true });
    } else if (availableTenants.length === 1) {
      navigate(`/${availableTenants[0].slug}`, { replace: true });
    } else {
      // 0 or >1 tenants: route to selection screen (which handles the empty case).
      navigate('/select-tenant', { replace: true });
    }
  }, [currentTenant, availableTenants, loading, navigate]);

  return <LukoutLoaderCentered />;
}
