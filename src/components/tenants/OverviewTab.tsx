import type { Tenant } from '../../lib/types';
import { useApiKeys, useCreateApiKey, useDeleteApiKey } from '../../hooks/useTenant';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { ApiKeyList } from './ApiKeyList';
import { ApiKeyCreateDialog } from './ApiKeyCreateDialog';
import { useState } from 'react';
import { Plus, Globe, Calendar, Building2, BadgeCheck } from 'lucide-react';
import { formatDate } from '../../lib/utils/formatters';
import { PageState } from '../ui/page-state';

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
        <Card>
        <CardHeader>
          <CardTitle>Tenant Information</CardTitle>
          <CardDescription>Overview of tenant details</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <dt className="text-sm font-medium text-muted-foreground">Name</dt>
              <dd className="text-base font-semibold text-foreground">{tenant.name}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm font-medium text-muted-foreground">Slug</dt>
              <dd className="text-base font-semibold text-foreground">@{tenant.slug}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm font-medium text-muted-foreground">Status</dt>
              <dd className="flex items-center gap-2 text-foreground">
                <BadgeCheck className="h-4 w-4 text-primary" />
                <span className="capitalize">{tenant.status}</span>
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm font-medium text-muted-foreground">Tier</dt>
              <dd className="flex items-center gap-2 text-foreground">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="capitalize">{tenant.tier}</span>
              </dd>
            </div>
            {tenant.profile && (
              <div className="space-y-1">
                <dt className="text-sm font-medium text-muted-foreground">Profile</dt>
                <dd className="flex items-center gap-2 text-foreground">
                  <span className="capitalize">{tenant.profile}</span>
                </dd>
              </div>
            )}
            <div className="space-y-1">
              <dt className="text-sm font-medium text-muted-foreground">Created</dt>
              <dd className="flex items-center gap-2 text-foreground">
                <Calendar className="h-4 w-4 text-primary" />
                <span>{formatDate(tenant.createdAt)}</span>
              </dd>
            </div>
            <div className="space-y-1 md:col-span-2">
              <dt className="text-sm font-medium text-muted-foreground">API Endpoint</dt>
              <dd className="flex items-center gap-2 text-foreground">
                <Globe className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm font-mono break-all">{controlPlaneUrl}</span>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>Manage API keys for this tenant</CardDescription>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <PageState variant="loading" title="Loading API keys..." />
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
