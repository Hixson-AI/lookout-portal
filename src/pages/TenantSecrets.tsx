/**
 * TenantSecrets page - tenant-wide rollup of required secrets
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getTenantRequiredSecrets, type TenantRequiredSecretsRollup } from '../lib/api/app-secrets';
import { RequiredSecretsPanel } from '../components/secrets/RequiredSecretsPanel';

export function TenantSecrets() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [rollup, setRollup] = useState<TenantRequiredSecretsRollup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      <div className="grid grid-cols-2 gap-4">
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

      <Tabs defaultValue="by-key">
        <TabsList>
          <TabsTrigger value="by-key">By Key</TabsTrigger>
          <TabsTrigger value="by-app">By App</TabsTrigger>
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
          {(rollup.by_app ?? []).map(app => (
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
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
