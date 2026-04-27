import { useParams, useNavigate } from 'react-router-dom';
import { useTenant } from '../hooks/useTenant';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { OverviewTab } from '../components/tenants/OverviewTab';
import { SettingsTab } from '../components/tenants/SettingsTab';
import { AiKeysTab } from '../components/tenants/AiKeysTab';
import { UsageTab } from '../components/tenants/UsageTab';
import { AppsTab } from '../components/tenants/AppsTab';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';

export function TenantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: tenant, isLoading, error } = useTenant(id || '');
  const [activeTab, setActiveTab] = useState('overview');

  if (isLoading) {
    return (
      <Layout>
        <div className="text-center py-12 text-muted-foreground animate-pulse">
          Loading tenant...
        </div>
      </Layout>
    );
  }

  if (error || !tenant) {
    return (
      <Layout>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-destructive">
          <p className="font-medium">{error?.message || 'Tenant not found'}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/tenants')} className="-ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Tenants
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{tenant.name}</h1>
            <p className="text-sm text-muted-foreground">@{tenant.slug}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate(`/tenants/${id}/secrets`)}>
              Manage Secrets
            </Button>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Status</p>
              <p className="text-sm font-semibold capitalize">{tenant.status}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Tier</p>
              <p className="text-sm font-semibold capitalize">{tenant.tier}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Created</p>
              <p className="text-sm font-semibold">{new Date(tenant.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="ai-keys">AI Keys</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
            <TabsTrigger value="apps">Apps</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" activeValue={activeTab} className="animate-fade-in">
            <OverviewTab tenant={tenant} />
          </TabsContent>
          <TabsContent value="ai-keys" activeValue={activeTab} className="animate-fade-in">
            <AiKeysTab tenant={tenant} />
          </TabsContent>
          <TabsContent value="usage" activeValue={activeTab} className="animate-fade-in">
            <UsageTab tenant={tenant} />
          </TabsContent>
          <TabsContent value="apps" activeValue={activeTab} className="animate-fade-in">
            <AppsTab tenant={tenant} />
          </TabsContent>
          <TabsContent value="settings" activeValue={activeTab} className="animate-fade-in">
            <SettingsTab tenant={tenant} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
