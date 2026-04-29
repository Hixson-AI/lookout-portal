import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTenantContext } from '../../contexts/TenantContext';

export function LegacyAppRedirect() {
  const { id, appId } = useParams<{ id: string; appId?: string }>();
  const navigate = useNavigate();
  const { availableTenants } = useTenantContext();

  useEffect(() => {
    if (!id) return;

    const tenant = availableTenants.find((t) => t.id === id);
    if (!tenant) return;

    // Handle "new" app creation case
    if (appId === 'new') {
      navigate(`/${tenant.slug}/apps/new`, { replace: true });
      return;
    }

    // Handle existing app redirect
    if (appId) {
      navigate(`/${tenant.slug}/apps/${appId}`, { replace: true });
    }
  }, [id, appId, availableTenants, navigate]);

  return <div className="min-h-screen flex items-center justify-center">Redirecting...</div>;
}
