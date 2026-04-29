/**
 * TenantSecrets page - tenant-wide rollup of required secrets
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ArrowLeft, AlertCircle, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { getTenantRequiredSecrets, getTenantSecrets, setTenantSecret, deleteTenantSecret, type TenantRequiredSecretsRollup, type TenantSecretMeta } from '../lib/api/app-secrets';
import { RequiredSecretsPanel } from '../components/secrets/RequiredSecretsPanel';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export function TenantSecrets() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [rollup, setRollup] = useState<TenantRequiredSecretsRollup | null>(null);
  const [tenantSecrets, setTenantSecrets] = useState<TenantSecretMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (!id) return;
    const loadRollup = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getTenantRequiredSecrets(id);
        setRollup(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load tenant secrets');
      } finally {
        setLoading(false);
      }
    };
    loadRollup();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const loadTenantSecrets = async () => {
      try {
        const secrets = await getTenantSecrets(id);
        setTenantSecrets(secrets);
      } catch (err: unknown) {
        console.error('Failed to load tenant secrets', err);
      }
    };
    loadTenantSecrets();
  }, [id]);

  const handleAddTenantSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newKey || !newValue) return;

    try {
      await setTenantSecret(id, newKey, newValue);
      setNewKey('');
      setNewValue('');
      setShowAddForm(false);
      const secrets = await getTenantSecrets(id);
      setTenantSecrets(secrets);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add tenant secret');
    }
  };

  const handleDeleteTenantSecret = async (key: string) => {
    if (!id) return;
    if (!confirm(`Are you sure you want to delete the tenant secret "${key}"?`)) return;

    try {
      await deleteTenantSecret(id, key);
      const secrets = await getTenantSecrets(id);
      setTenantSecrets(secrets);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete tenant secret');
    }
  };

  if (!id) {
    return <div>Tenant ID required</div>;
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-muted-foreground">Loading tenant secrets...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!rollup) {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Tenant Secrets</h1>
          <p className="text-muted-foreground">Manage required secrets across all apps</p>
        </div>
      </div>

      {rollup.missing_total === 0 && rollup.extra_total === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-600" />
            <p className="text-lg font-medium">All secrets are in sync</p>
            <p className="text-sm mt-1">No missing or extra secrets across all apps</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Missing Secrets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <span className="text-2xl font-bold">{rollup.missing_total}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Extra Secrets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-yellow-600" />
                <span className="text-2xl font-bold">{rollup.extra_total}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="by-key">
        <TabsList>
          <TabsTrigger value="by-key">By Key</TabsTrigger>
          <TabsTrigger value="by-app">By App</TabsTrigger>
          <TabsTrigger value="tenant-wide">Tenant-Wide</TabsTrigger>
        </TabsList>

        <TabsContent value="by-key" className="space-y-4">
          {(rollup.by_key?.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No missing secrets across all apps
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {rollup.by_key.map(({ key, apps }) => (
                <Card key={key}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{key}</div>
                        <div className="text-sm text-muted-foreground">Used by {apps.length} app{apps.length > 1 ? 's' : ''}</div>
                      </div>
                      <div className="space-y-1">
                        {apps.map(app => (
                          <Link
                            key={app.app_id}
                            to={`/tenants/${id}/apps/${app.app_id}`}
                            className="block text-sm text-primary hover:underline"
                          >
                            {app.app_name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="by-app" className="space-y-4">
          {(rollup.by_app?.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No apps with secret issues
              </CardContent>
            </Card>
          ) : (
            (rollup.by_app ?? []).map(app => (
              <Card key={app.app_id}>
                <CardHeader>
                  <CardTitle className="text-base">{app.app_name}</CardTitle>
                  <CardDescription>
                    {app.missing.length} missing, {app.extra.length} extra
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RequiredSecretsPanel
                    tenantId={id}
                    appId={app.app_id}
                  />
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="tenant-wide" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tenant-Wide Secrets</CardTitle>
              <CardDescription>
                Secrets that can be reused across all apps in this tenant
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowAddForm(true)} className="mb-4">
                <Plus className="h-4 w-4 mr-2" />
                Add Tenant Secret
              </Button>

              {showAddForm && (
                <form onSubmit={handleAddTenantSecret} className="mb-4 space-y-3 p-4 border rounded-lg">
                  <div>
                    <Label htmlFor="newKey">Key</Label>
                    <Input
                      id="newKey"
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      placeholder="e.g., SHARED_API_KEY"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newValue">Value</Label>
                    <Input
                      id="newValue"
                      type="password"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      placeholder="Secret value"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit">Save</Button>
                    <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {tenantSecrets.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No tenant-wide secrets configured</p>
              ) : (
                <div className="space-y-2">
                  {tenantSecrets.map((secret) => (
                    <div key={secret.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{secret.key}</div>
                        <div className="text-sm text-muted-foreground">
                          Created {new Date(secret.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTenantSecret(secret.key)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
