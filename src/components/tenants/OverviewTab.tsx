import { Tenant } from '../../lib/api';
import { useApiKeys, useCreateApiKey, useDeleteApiKey } from '../../hooks/useTenant';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { ApiKeyList } from './ApiKeyList';
import { ApiKeyCreateDialog } from './ApiKeyCreateDialog';
import { useState } from 'react';
import { Plus, Globe, Calendar, Building2, BadgeCheck } from 'lucide-react';

interface OverviewTabProps {
  tenant: Tenant;
}

export function OverviewTab({ tenant }: OverviewTabProps) {
  const { data: apiKeys, isLoading } = useApiKeys(tenant.id);
  const createApiKey = useCreateApiKey();
  const deleteApiKey = useDeleteApiKey();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState<string>();

  const handleCreateKey = async (label: string) => {
    try {
      const result = await createApiKey.mutateAsync({ tenantId: tenant.id, label });
      setCreatedKey(result.key);
    } catch (error) {
      console.error('Failed to create API key:', error);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      try {
        await deleteApiKey.mutateAsync({ tenantId: tenant.id, keyId });
      } catch (error) {
        console.error('Failed to revoke API key:', error);
      }
    }
  };

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false);
    setCreatedKey(undefined);
  };

  const controlPlaneUrl = import.meta.env.VITE_CONTROL_PLANE_URL;

  return (
    <div className="space-y-6">
      {/* Tenant Info */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="text-gradient">Tenant Information</CardTitle>
          <CardDescription>Overview of tenant details</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <dt className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Name</dt>
              <dd className="text-lg font-semibold">{tenant.name}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Slug</dt>
              <dd className="text-lg font-semibold">@{tenant.slug}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Status</dt>
              <dd className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4" />
                <span className="capitalize">{tenant.status}</span>
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Tier</dt>
              <dd className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span className="capitalize">{tenant.tier}</span>
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Created</dt>
              <dd className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{new Date(tenant.createdAt).toLocaleDateString()}</span>
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>API Endpoint</dt>
              <dd className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span className="text-sm font-mono">{controlPlaneUrl}</span>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card className="card-elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-gradient">API Keys</CardTitle>
              <CardDescription>Manage API keys for this tenant</CardDescription>
            </div>
            <Button className="btn-gradient" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading API keys...</div>
          ) : (
            <ApiKeyList
              apiKeys={apiKeys || []}
              onRevoke={handleRevokeKey}
            />
          )}
        </CardContent>
      </Card>

      <ApiKeyCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={handleCloseDialog}
        onCreate={handleCreateKey}
        createdKey={createdKey}
      />
    </div>
  );
}
