import { Outlet, useParams } from 'react-router-dom';
import { Play, Settings2, Key, History } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { SideNav } from '../components/layout/SideNav';
import { useTenantContext } from '../contexts/TenantContext';

export function AppPage() {
  const { tenantSlug, appId } = useParams<{ tenantSlug: string; appId: string }>();
  const { currentTenant } = useTenantContext();

  if (!tenantSlug || !appId) {
    return <div className="min-h-screen flex items-center justify-center">Invalid app</div>;
  }

  // Placeholder app data
  const appName = 'My App';

  const sideNavItems = [
    { to: `/${tenantSlug}/apps/${appId}/builder`, label: 'Builder', icon: <Play className="h-4 w-4" /> },
    { to: `/${tenantSlug}/apps/${appId}/runs`, label: 'Runs', icon: <History className="h-4 w-4" /> },
    { to: `/${tenantSlug}/apps/${appId}/secrets`, label: 'Secrets', icon: <Key className="h-4 w-4" /> },
    { to: `/${tenantSlug}/apps/${appId}/settings`, label: 'Settings', icon: <Settings2 className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={appName}
        breadcrumbs={[
          { label: currentTenant?.name || 'Workspace', to: `/${tenantSlug}` },
          { label: 'Apps', to: `/${tenantSlug}` },
          { label: appName },
        ]}
      />

      <div className="flex flex-col lg:flex-row gap-6">
        <SideNav items={sideNavItems} />
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
