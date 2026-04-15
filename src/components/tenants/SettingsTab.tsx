import { useState } from 'react';
import { Tenant } from '../../lib/api';
import { useUpdateTenant } from '../../hooks/useTenants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Save, X } from 'lucide-react';

interface SettingsTabProps {
  tenant: Tenant;
}

export function SettingsTab({ tenant }: SettingsTabProps) {
  const [name, setName] = useState(tenant.name);
  const [slug, setSlug] = useState(tenant.slug);
  const [status, setStatus] = useState<'active' | 'suspended'>(tenant.status);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState(false);

  const updateTenant = useUpdateTenant();

  const handleSave = async () => {
    setError(undefined);
    setSuccess(false);

    try {
      await updateTenant.mutateAsync({
        id: tenant.id,
        data: { name, slug, status },
      });
      setSuccess(true);
      setHasChanges(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tenant');
    }
  };

  const handleCancel = () => {
    setName(tenant.name);
    setSlug(tenant.slug);
    setStatus(tenant.status);
    setHasChanges(false);
    setError(undefined);
  };

  const handleNameChange = (value: string) => {
    setName(value);
    setHasChanges(true);
  };

  const handleSlugChange = (value: string) => {
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
    setHasChanges(true);
  };

  const handleStatusChange = (value: 'active' | 'suspended') => {
    setStatus(value);
    setHasChanges(true);
  };

  return (
    <div className="space-y-6">
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="text-gradient">Tenant Settings</CardTitle>
          <CardDescription>Update tenant configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert>
              <AlertDescription style={{ color: 'var(--accent)' }}>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription style={{ color: 'var(--accent)' }}>
                Tenant updated successfully
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Tenant name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="tenant-slug"
            />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Used in URLs and API key prefixes. Lowercase, alphanumeric, and hyphens only.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={status}
              onChange={(e) => handleStatusChange(e.target.value as 'active' | 'suspended')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Tier</Label>
            <Input value={tenant.tier} disabled className="bg-muted" />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Tier cannot be changed. Contact support to upgrade.
            </p>
          </div>

          {hasChanges && (
            <div className="flex gap-2 pt-4">
              <Button className="btn-gradient" onClick={handleSave} disabled={updateTenant.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={updateTenant.isPending}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
