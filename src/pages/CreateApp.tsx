import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenantContext } from '../contexts/TenantContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { api } from '../lib/api';
import { PageHeader } from '../components/layout/PageHeader';
import { ArrowLeft } from 'lucide-react';

export function CreateApp() {
  const { currentTenant } = useTenantContext();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tenant = currentTenant;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !name.trim()) return;

    try {
      setLoading(true);
      setError(null);

      // Create a minimal default workflow
      const workflowJson = {
        version: '1.0.0',
        name: name.trim(),
        description: description.trim() || '',
        trigger: {
          type: 'manual' as const,
          config: {},
        },
        steps: [],
      };

      const newApp = await api.createApp({
        tenantId: tenant.id,
        name: name.trim(),
        description: description.trim(),
        workflowJson,
        triggerConfig: {
          type: 'manual',
          config: {},
        },
      });

      // Redirect to the app builder with the new app ID
      navigate(`/${tenant.slug}/apps/${newApp.id}/builder`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create app');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (tenant) {
      navigate(`/${tenant.slug}`);
    }
  };

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading workspace...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create New App"
        breadcrumbs={[{ label: tenant.name, to: `/${tenant.slug}` }, { label: 'Apps' }, { label: 'Create New App' }]}
        actions={
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        }
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>App Details</CardTitle>
          <CardDescription>
            Enter the basic information for your new app. You can configure the workflow after creation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">App Name *</Label>
              <Input
                id="name"
                placeholder="My Awesome App"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                placeholder="What does this app do?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                rows={3}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !name.trim()}>
                {loading ? 'Creating...' : 'Create App'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
