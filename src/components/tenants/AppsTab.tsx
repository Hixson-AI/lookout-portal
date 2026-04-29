import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Tenant, App, AppExecution } from '../../lib/types';
import { api } from '../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Plus, Play, Eye, Trash2, Clock, CheckCircle, XCircle, Key, Settings2 } from 'lucide-react';
import { LukoutSpinner } from '../ui/lukout-loader';
import { PageState } from '../ui/page-state';
import { ExecutionDetailDrawer } from '../platform/ExecutionDetailDrawer';
import { RequiredSecretsPanel } from '../secrets/RequiredSecretsPanel';
import { getAppRequiredSecrets } from '../../lib/api/app-secrets';

interface AppsTabProps {
  tenant: Tenant;
}

export function AppsTab({ tenant }: AppsTabProps) {
  const navigate = useNavigate();
  const [apps, setApps] = useState<App[]>([]);
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [executions, setExecutions] = useState<AppExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [execLoading, setExecLoading] = useState(false);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSecretsFor, setShowSecretsFor] = useState<string | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<AppExecution | null>(null);
  const [missingCounts, setMissingCounts] = useState<Map<string, number>>(new Map());

  const loadApps = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getApps(tenant.id);
      setApps(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load apps');
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, [tenant.id]);

  useEffect(() => {
    loadApps();
  }, [loadApps]);

  // Lazily fetch missing-secret counts per app so we can render a badge.
  useEffect(() => {
    if (apps.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        apps.map(async (app) => {
          try {
            const diff = await getAppRequiredSecrets(tenant.id, app.id);
            return [app.id, diff.missing.length] as const;
          } catch {
            return [app.id, 0] as const;
          }
        }),
      );
      if (!cancelled) setMissingCounts(new Map(entries));
    })();
    return () => { cancelled = true; };
  }, [apps, tenant.id]);

  const loadExecutions = useCallback(async (appId: string) => {
    try {
      setExecLoading(true);
      const data = await api.getAppExecutions(tenant.id, appId);
      setExecutions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load executions:', err);
      setExecutions([]);
    } finally {
      setExecLoading(false);
    }
  }, [tenant.id]);

  useEffect(() => {
    if (selectedApp) {
      loadExecutions(selectedApp.id);
    }
  }, [selectedApp, loadExecutions]);

  const handleShowSecrets = (appId: string) => {
    if (showSecretsFor === appId) {
      setShowSecretsFor(null);
    } else {
      setShowSecretsFor(appId);
    }
  };

  const handleTrigger = async (appId: string) => {
    try {
      setTriggering(appId);
      await api.triggerApp(tenant.id, appId, {});
      if (selectedApp?.id === appId) {
        await loadExecutions(appId);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to trigger app');
    } finally {
      setTriggering(null);
    }
  };

  const handleDelete = async (appId: string) => {
    if (!confirm('Are you sure you want to delete this app? This action cannot be undone.')) return;
    try {
      await api.deleteApp(tenant.id, appId);
      setApps(apps.filter(a => a.id !== appId));
      if (selectedApp?.id === appId) {
        setSelectedApp(null);
        setExecutions([]);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete app');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">{status}</Badge>;
      case 'running':
        return <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">{status}</Badge>;
      case 'draft':
      case 'paused':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800 border-yellow-200">{status}</Badge>;
      case 'failed':
        return <Badge variant="default" className="bg-red-100 text-red-800 border-red-200">{status}</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'running': return <LukoutSpinner size={16} />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  if (loading) {
    return <PageState variant="loading" title="Loading apps..." />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <p className="text-destructive font-medium">{error}</p>
        <Button variant="outline" onClick={loadApps} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Apps</h2>
          <p className="text-sm text-muted-foreground">{apps.length} app{apps.length !== 1 ? 's' : ''} configured</p>
        </div>
        <Button
          onClick={() => {
            localStorage.setItem('currentTenantId', tenant.id);
            navigate(`/${tenant.slug}/apps/new`);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          New App
        </Button>
      </div>

      {apps.length === 0 ? (
        <Card className="py-16 text-center border-dashed">
          <CardContent>
            <Settings2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              No apps yet. Create your first app to get started.
            </p>
            <Button
              onClick={() => {
                localStorage.setItem('currentTenantId', tenant.id);
                navigate(`/${tenant.slug}/apps/new`);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create App
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* App List */}
          <div className="space-y-3">
            {apps.map((app) => (
              <Card
                key={app.id}
                className={`cursor-pointer transition-all ${selectedApp?.id === app.id ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}
                onClick={() => setSelectedApp(app)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate text-foreground">{app.name}</h3>
                        {(missingCounts.get(app.id) ?? 0) > 0 && (
                          <Badge variant="destructive" className="text-xs flex-shrink-0">
                            {missingCounts.get(app.id)} missing
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm truncate mt-1 text-muted-foreground">
                        {app.description || 'No description'}
                      </p>
                    </div>
                    {getStatusBadge(app.status)}
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">
                      {app.triggerConfig?.type || 'manual'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      v{app.version}
                    </span>
                  </div>
                  <div className="flex gap-1 mt-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); handleTrigger(app.id); }}
                      disabled={triggering === app.id || app.status === 'archived'}
                      title="Trigger"
                    >
                      {triggering === app.id ? <LukoutSpinner size={14} /> : <Play className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        localStorage.setItem('currentTenantId', tenant.id);
                        navigate(`/tenants/${tenant.id}/apps/${app.id}/edit`);
                      }}
                      title="Edit"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); handleShowSecrets(app.id); }}
                      title="Secrets"
                    >
                      <Key className={`h-3.5 w-3.5 ${showSecretsFor === app.id ? 'text-primary' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); handleDelete(app.id); }}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Execution History */}
          <div className="lg:col-span-2">
            {selectedApp ? (
              <Card>
                <CardHeader>
                  <CardTitle>{selectedApp.name} — Executions</CardTitle>
                  <CardDescription>
                    {executions.length} execution{executions.length !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {execLoading ? (
                    <PageState variant="loading" title="Loading executions..." />
                  ) : executions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No executions yet. Trigger the app to see results.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="p-3 rounded-lg bg-muted">
                          <div className="text-xs text-muted-foreground">Total</div>
                          <div className="text-xl font-bold">{executions.length}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-muted">
                          <div className="text-xs text-emerald-600">Completed</div>
                          <div className="text-xl font-bold text-emerald-600">
                            {Array.isArray(executions) ? executions.filter(e => e.status === 'completed').length : 0}
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-muted">
                          <div className="text-xs text-red-600">Failed</div>
                          <div className="text-xl font-bold text-red-600">
                            {Array.isArray(executions) ? executions.filter(e => e.status === 'failed').length : 0}
                          </div>
                        </div>
                      </div>
                      {/* Execution list */}
                      {Array.isArray(executions) && executions.map((exec) => (
                        <div
                          key={exec.id}
                          className="p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => setSelectedExecution(exec)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(exec.status)}
                              {getStatusBadge(exec.status)}
                              <span className="text-xs text-muted-foreground">
                                {exec.triggerType}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(exec.startedAt).toLocaleString()}
                            </span>
                          </div>
                          {exec.error && (
                            <p className="text-sm text-destructive mt-2 truncate">{exec.error}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">Select an app to view executions</p>
                </CardContent>
              </Card>
            )}

            {/* Secrets Panel */}
            {showSecretsFor && selectedApp && showSecretsFor === selectedApp.id && (
              <RequiredSecretsPanel
                tenantId={tenant.id}
                appId={selectedApp.id}
                onClose={() => setShowSecretsFor(null)}
              />
            )}
          </div>
        </div>
      )}

      {/* Execution Detail Drawer */}
      {selectedExecution && selectedApp && (
        <ExecutionDetailDrawer
          execution={selectedExecution}
          tenantId={tenant.id}
          appId={selectedApp.id}
          onClose={() => setSelectedExecution(null)}
          onToast={(msg, kind) => {
            // Simple toast implementation using alert for now
            if (kind === 'error') {
              alert(msg);
            } else {
              console.log(`[${kind}] ${msg}`);
            }
          }}
        />
      )}
    </div>
  );
}
