import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Tenant, App, AppExecution, AppSecretMeta } from '../../lib/types';
import { api } from '../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Plus, Play, Eye, Trash2, Clock, CheckCircle, XCircle, Loader2, Key, Lock, X } from 'lucide-react';

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
  const [appSecrets, setAppSecrets] = useState<AppSecretMeta[]>([]);
  const [secretsLoading, setSecretsLoading] = useState(false);
  const [newSecretKey, setNewSecretKey] = useState('');
  const [newSecretValue, setNewSecretValue] = useState('');
  const [savingSecret, setSavingSecret] = useState(false);

  const loadApps = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getApps(tenant.id);
      setApps(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load apps');
    } finally {
      setLoading(false);
    }
  }, [tenant.id]);

  useEffect(() => {
    loadApps();
  }, [loadApps]);

  const loadExecutions = useCallback(async (appId: string) => {
    try {
      setExecLoading(true);
      const data = await api.getAppExecutions(tenant.id, appId);
      setExecutions(data);
    } catch (err) {
      console.error('Failed to load executions:', err);
    } finally {
      setExecLoading(false);
    }
  }, [tenant.id]);

  useEffect(() => {
    if (selectedApp) {
      loadExecutions(selectedApp.id);
    }
  }, [selectedApp, loadExecutions]);

  const loadSecrets = useCallback(async (appId: string) => {
    try {
      setSecretsLoading(true);
      const data = await api.getAppSecrets(tenant.id, appId);
      setAppSecrets(data);
    } catch (err) {
      console.error('Failed to load secrets:', err);
    } finally {
      setSecretsLoading(false);
    }
  }, [tenant.id]);

  const handleShowSecrets = (appId: string) => {
    if (showSecretsFor === appId) {
      setShowSecretsFor(null);
    } else {
      setShowSecretsFor(appId);
      loadSecrets(appId);
    }
  };

  const handleAddSecret = async () => {
    if (!showSecretsFor || !newSecretKey || !newSecretValue) return;
    try {
      setSavingSecret(true);
      await api.setAppSecret(tenant.id, showSecretsFor, newSecretKey, newSecretValue);
      setNewSecretKey('');
      setNewSecretValue('');
      await loadSecrets(showSecretsFor);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save secret');
    } finally {
      setSavingSecret(false);
    }
  };

  const handleDeleteSecret = async (appId: string, key: string) => {
    if (!confirm(`Delete secret ${key}?`)) return;
    try {
      await api.deleteAppSecret(tenant.id, appId, key);
      await loadSecrets(appId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete secret');
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
      case 'running': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  if (loading) {
    return <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>Loading apps...</div>;
  }

  if (error) {
    return (
      <div className="rounded-md p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--accent)' }}>
        <p style={{ color: 'var(--accent)' }}>{error}</p>
        <Button variant="ghost" onClick={loadApps} className="mt-2">Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="card-elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-gradient">Apps</CardTitle>
              <CardDescription>{apps.length} app{apps.length !== 1 ? 's' : ''} configured</CardDescription>
            </div>
            <Button
              className="btn-gradient"
              onClick={() => {
                localStorage.setItem('currentTenantId', tenant.id);
                navigate(`/tenants/${tenant.id}/apps/new`);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              New App
            </Button>
          </div>
        </CardHeader>
      </Card>

      {apps.length === 0 ? (
        <Card className="card-elevated">
          <CardContent className="py-12 text-center">
            <p style={{ color: 'var(--text-secondary)' }} className="mb-4">
              No apps yet. Create your first app to get started.
            </p>
            <Button
              className="btn-gradient"
              onClick={() => {
                localStorage.setItem('currentTenantId', tenant.id);
                navigate(`/tenants/${tenant.id}/apps/new`);
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
                className={`card-elevated cursor-pointer transition-all ${selectedApp?.id === app.id ? 'ring-2 ring-blue-500' : 'hover:shadow-md'}`}
                onClick={() => setSelectedApp(app)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{app.name}</h3>
                      <p className="text-sm truncate mt-1" style={{ color: 'var(--text-secondary)' }}>
                        {app.description || 'No description'}
                      </p>
                    </div>
                    {getStatusBadge(app.status)}
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {app.triggerConfig?.type || 'manual'}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      v{app.version}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleTrigger(app.id); }}
                      disabled={triggering === app.id || app.status === 'archived'}
                      title="Trigger"
                    >
                      {triggering === app.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        localStorage.setItem('currentTenantId', tenant.id);
                        navigate(`/tenants/${tenant.id}/apps/${app.id}/edit`);
                      }}
                      title="Edit"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleShowSecrets(app.id); }}
                      title="Secrets"
                    >
                      <Key className={`h-3 w-3 ${showSecretsFor === app.id ? 'text-blue-500' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleDelete(app.id); }}
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Execution History */}
          <div className="lg:col-span-2">
            {selectedApp ? (
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle className="text-gradient">{selectedApp.name} — Executions</CardTitle>
                  <CardDescription>
                    {executions.length} execution{executions.length !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {execLoading ? (
                    <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>Loading executions...</div>
                  ) : executions.length === 0 ? (
                    <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                      No executions yet. Trigger the app to see results.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-body)' }}>
                          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Total</div>
                          <div className="text-xl font-bold">{executions.length}</div>
                        </div>
                        <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-body)' }}>
                          <div className="text-xs text-green-600">Completed</div>
                          <div className="text-xl font-bold text-green-600">
                            {executions.filter(e => e.status === 'completed').length}
                          </div>
                        </div>
                        <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-body)' }}>
                          <div className="text-xs text-red-600">Failed</div>
                          <div className="text-xl font-bold text-red-600">
                            {executions.filter(e => e.status === 'failed').length}
                          </div>
                        </div>
                      </div>
                      {/* Execution list */}
                      {executions.map((exec) => (
                        <div key={exec.id} className="p-3 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(exec.status)}
                              {getStatusBadge(exec.status)}
                              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                {exec.triggerType}
                              </span>
                            </div>
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              {new Date(exec.startedAt).toLocaleString()}
                            </span>
                          </div>
                          {exec.error && (
                            <p className="text-sm text-red-600 mt-2 truncate">{exec.error}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="card-elevated">
                <CardContent className="py-12 text-center">
                  <p style={{ color: 'var(--text-secondary)' }}>Select an app to view executions</p>
                </CardContent>
              </Card>
            )}

            {/* Secrets Panel */}
            {showSecretsFor && selectedApp && showSecretsFor === selectedApp.id && (
              <Card className="card-elevated mt-4">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      <CardTitle className="text-sm">Secrets — {selectedApp.name}</CardTitle>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setShowSecretsFor(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {secretsLoading ? (
                    <div className="text-center py-4" style={{ color: 'var(--text-secondary)' }}>Loading...</div>
                  ) : (
                    <>
                      {appSecrets.length === 0 ? (
                        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>No secrets configured yet.</p>
                      ) : (
                        <div className="space-y-2 mb-4">
                          {appSecrets.map((s) => (
                            <div key={s.id} className="flex items-center justify-between p-2 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
                              <div className="flex items-center gap-2">
                                <Lock className="h-3 w-3" style={{ color: 'var(--text-secondary)' }} />
                                <span className="font-mono text-sm">{s.key}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                  {new Date(s.created_at).toLocaleDateString()}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteSecret(showSecretsFor!, s.key)}
                                >
                                  <Trash2 className="h-3 w-3 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newSecretKey}
                          onChange={(e) => setNewSecretKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                          className="flex-1 px-3 py-2 border rounded-lg text-sm font-mono"
                          placeholder="SECRET_KEY"
                        />
                        <input
                          type="password"
                          value={newSecretValue}
                          onChange={(e) => setNewSecretValue(e.target.value)}
                          className="flex-1 px-3 py-2 border rounded-lg text-sm font-mono"
                          placeholder="value"
                        />
                        <Button
                          className="btn-gradient"
                          onClick={handleAddSecret}
                          disabled={savingSecret || !newSecretKey || !newSecretValue}
                        >
                          {savingSecret ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
