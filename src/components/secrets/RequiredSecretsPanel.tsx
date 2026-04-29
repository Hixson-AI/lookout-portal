/**
 * RequiredSecretsPanel component
 * Displays missing, configured, and extra secrets for an app with inline editing.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { getAppRequiredSecrets, augmentAppRequiredSecrets, setAppSecret, deleteAppSecret, getTenantSecrets, type RequiredSecretsDiff, type TenantSecretMeta } from '../../lib/api/app-secrets';
import { AlertCircle, CheckCircle2, XCircle, RefreshCw, Globe } from 'lucide-react';
import { LukoutSpinner } from '../ui/lukout-loader';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';

interface RequiredSecretsPanelProps {
  tenantId: string;
  appId: string;
  onClose?: () => void;
  message?: string;
}

export function RequiredSecretsPanel({ tenantId, appId, onClose, message }: RequiredSecretsPanelProps) {
  const [diff, setDiff] = useState<RequiredSecretsDiff | null>(null);
  const [tenantSecrets, setTenantSecrets] = useState<TenantSecretMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [augmenting, setAugmenting] = useState(false);
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [newSecrets, setNewSecrets] = useState<Record<string, string>>({});
  const [selectedSecretKey, setSelectedSecretKey] = useState<string | null>(null);
  const [showTenantSecretDialog, setShowTenantSecretDialog] = useState(false);

  const loadDiff = useCallback(async (useAugment = false) => {
    try {
      setError(null);
      if (useAugment) {
        setAugmenting(true);
        const result = await augmentAppRequiredSecrets(tenantId, appId);
        setDiff(result);
        setAugmenting(false);
      } else {
        const result = await getAppRequiredSecrets(tenantId, appId);
        setDiff(result);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load required secrets');
      setAugmenting(false);
    } finally {
      setLoading(false);
    }
  }, [tenantId, appId]);

  useEffect(() => {
    loadDiff();
  }, [loadDiff]);

  useEffect(() => {
    const loadTenantSecrets = async () => {
      try {
        const secrets = await getTenantSecrets(tenantId);
        setTenantSecrets(secrets);
      } catch (err: unknown) {
        console.error('Failed to load tenant secrets', err);
      }
    };
    loadTenantSecrets();
  }, [tenantId]);

  const handleSaveSecret = async (key: string, value: string) => {
    try {
      setSaving(prev => new Set(prev).add(key));
      await setAppSecret(tenantId, appId, key, value);
      setNewSecrets(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      await loadDiff();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save secret');
    } finally {
      setSaving(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleDeleteSecret = async (key: string) => {
    try {
      setSaving(prev => new Set(prev).add(key));
      await deleteAppSecret(tenantId, appId, key);
      await loadDiff();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete secret');
    } finally {
      setSaving(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleUseTenantSecret = (key: string) => {
    setNewSecrets(prev => ({ ...prev, [selectedSecretKey!]: key }));
    setShowTenantSecretDialog(false);
    setSelectedSecretKey(null);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading required secrets...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert className="border-destructive text-destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!diff) {
    return null;
  }

  const hasMissing = diff.missing.length > 0;
  const hasExtra = diff.extra.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Required Secrets</CardTitle>
            {message && <CardDescription>{message}</CardDescription>}
            {!message && (
              <CardDescription>
                {hasMissing
                  ? `${diff.missing.length} secret${diff.missing.length > 1 ? 's' : ''} required`
                  : 'All required secrets configured'}
              </CardDescription>
            )}
          </div>
          <div className="flex gap-2">
            {diff.unknown_step_ids.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadDiff(true)}
                disabled={augmenting}
              >
                {augmenting ? (
                  <>
                    <LukoutSpinner size={16} className="mr-2" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Re-analyze with AI
                  </>
                )}
              </Button>
            )}
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {diff.unknown_step_ids.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {diff.unknown_step_ids.length} unknown step{diff.unknown_step_ids.length > 1 ? 's' : ''}: {diff.unknown_step_ids.join(', ')}
            </AlertDescription>
          </Alert>
        )}

        {hasMissing && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              Missing Secrets ({diff.missing.length})
            </h4>
            {diff.missing.map((secret: { key: string; description?: string; type: string; required: boolean }) => (
              <div key={secret.key} className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="font-medium">{secret.key}</div>
                    {secret.description && (
                      <div className="text-sm text-muted-foreground">{secret.description}</div>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {secret.type}
                      {secret.required && ' • required'}
                    </Badge>
                  </div>
                  {tenantSecrets.length > 0 && (
                    <Dialog open={showTenantSecretDialog && selectedSecretKey === secret.key} onOpenChange={(open) => {
                      setShowTenantSecretDialog(open);
                      if (!open) setSelectedSecretKey(null);
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedSecretKey(secret.key);
                            setShowTenantSecretDialog(true);
                          }}
                        >
                          <Globe className="h-4 w-4 mr-2" />
                          Use Tenant Secret
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Select Tenant Secret</DialogTitle>
                          <DialogDescription>Choose a tenant secret to use for this app secret.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2">
                          {tenantSecrets.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No tenant secrets available</p>
                          ) : (
                            tenantSecrets.map(ts => (
                              <Button
                                key={ts.id}
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => handleUseTenantSecret(ts.key)}
                              >
                                <Globe className="h-4 w-4 mr-2" />
                                {ts.key}
                              </Button>
                            ))
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder={`Enter ${secret.key}`}
                    value={newSecrets[secret.key] || ''}
                    onChange={e => setNewSecrets(prev => ({ ...prev, [secret.key]: (e.target as HTMLInputElement).value }))}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newSecrets[secret.key]) {
                        handleSaveSecret(secret.key, newSecrets[secret.key]);
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => handleSaveSecret(secret.key, newSecrets[secret.key])}
                    disabled={!newSecrets[secret.key] || saving.has(secret.key)}
                  >
                    {saving.has(secret.key) ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {diff.present.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Configured Secrets ({diff.present.length})
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {diff.present.map(key => (
                <div key={key} className="flex items-center justify-between p-2 rounded-md bg-muted">
                  <span className="text-sm font-medium">{key}</span>
                  <Badge variant="secondary" className="text-xs">Set</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasExtra && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              No Longer Required ({diff.extra.length})
            </h4>
            <p className="text-sm text-muted-foreground">
              These secrets are configured but not required by the current workflow. You can remove them to clean up.
            </p>
            <div className="space-y-2">
              {diff.extra.map(key => (
                <div key={key} className="flex items-center justify-between p-2 rounded-md bg-muted">
                  <span className="text-sm font-medium">{key}</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteSecret(key)}
                    disabled={saving.has(key)}
                  >
                    {saving.has(key) ? 'Removing...' : 'Remove'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!hasMissing && !hasExtra && diff.present.length > 0 && (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">All required secrets are configured</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
