import { useParams, useNavigate } from 'react-router-dom';
import { useTenant } from '../hooks/useTenant';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { OverviewTab } from '../components/tenants/OverviewTab';
import { SettingsTab } from '../components/tenants/SettingsTab';
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
        <div className="text-center py-8">Loading tenant...</div>
      </Layout>
    );
  }

  if (error || !tenant) {
    return (
      <Layout>
        <div className="text-center py-8 text-destructive">
          {error?.message || 'Tenant not found'}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/tenants')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tenants
        </Button>

        <div>
          <h1 className="text-3xl font-bold">{tenant.name}</h1>
          <p className="text-muted-foreground">@{tenant.slug}</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" activeValue={activeTab}>
            <OverviewTab tenant={tenant} />
          </TabsContent>
          <TabsContent value="settings" activeValue={activeTab}>
            <SettingsTab tenant={tenant} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
