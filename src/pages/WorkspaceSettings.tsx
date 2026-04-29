import { Outlet, useParams } from 'react-router-dom';
import { Settings, Users, CreditCard, Key, Plug, Shield } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { SideNav } from '../components/layout/SideNav';
import { useTenantContext } from '../contexts/TenantContext';

export function WorkspaceSettings() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { currentTenant } = useTenantContext();

  if (!tenantSlug) {
    return <div className="min-h-screen flex items-center justify-center">Invalid workspace</div>;
  }

  const sideNavItems = [
    { to: `/${tenantSlug}/settings`, label: 'General', icon: <Settings className="h-4 w-4" /> },
    { to: `/${tenantSlug}/settings/members`, label: 'Members', icon: <Users className="h-4 w-4" /> },
    { to: `/${tenantSlug}/settings/billing`, label: 'Billing', icon: <CreditCard className="h-4 w-4" /> },
    { to: `/${tenantSlug}/settings/secrets`, label: 'Secrets', icon: <Key className="h-4 w-4" /> },
    { to: `/${tenantSlug}/settings/api-keys`, label: 'API Keys', icon: <Shield className="h-4 w-4" /> },
    { to: `/${tenantSlug}/settings/integrations`, label: 'Integrations', icon: <Plug className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        breadcrumbs={[
          { label: currentTenant?.name || 'Workspace', to: `/${tenantSlug}` },
          { label: 'Settings' },
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
