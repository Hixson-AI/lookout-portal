import { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTenantContext } from '../../contexts/TenantContext';

export function LegacyAppRedirect() {
  // NOTE: when this component is mounted via the route
  //   /tenants/:id/apps/new
  // `new` is a literal path segment, not a param — so `useParams` only
  // returns `id`. We detect the "new" case from the URL itself.
  const { id, appId } = useParams<{ id: string; appId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { availableTenants } = useTenantContext();

  useEffect(() => {
    if (!id) return;

    const tenant = availableTenants.find((t) => t.id === id);
    if (!tenant) return;

    // Handle "new" app creation case (literal /apps/new segment)
    if (appId === 'new' || location.pathname.endsWith('/apps/new')) {
      navigate(`/${tenant.slug}/apps/new`, { replace: true });
      return;
    }

    // Handle existing app redirect
    if (appId) {
      navigate(`/${tenant.slug}/apps/${appId}`, { replace: true });
    }
  }, [id, appId, availableTenants, navigate, location.pathname]);

  return <div className="min-h-screen flex items-center justify-center">Redirecting...</div>;
}
