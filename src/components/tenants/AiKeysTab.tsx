import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Plus, Trash2, Key, Eye, EyeOff, Copy, Check, Sparkles } from 'lucide-react';
import { clearJwt } from '../../lib/auth';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  profile?: string;
}

interface AiKey {
  id: string;
  provider: 'openrouter' | 'anthropic';
  status: 'active' | 'disabled' | 'revoked';
  key_prefix: string;
  provider_key_id: string;
  credit_limit: number | null;
  limit_reset: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

interface AiKeysTabProps {
  tenant: Tenant;
}

export function AiKeysTab({ tenant }: AiKeysTabProps) {
  const [aiKeys, setAiKeys] = useState<AiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [provider, setProvider] = useState<'openrouter' | 'anthropic'>('openrouter');
  const [apiKey, setApiKey] = useState('');
  const [creditLimit, setCreditLimit] = useState<number | undefined>();
  const [limitReset, setLimitReset] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [decryptedKeys, setDecryptedKeys] = useState<Record<string, string>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    fetchAiKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant.id]);

  const fetchAiKeys = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_CONTROL_PLANE_URL}/v1/tenants/${tenant.id}/ai-keys`, {
        credentials: 'include',
      });

      if (response.status === 401) {
        clearJwt();
        window.location.href = '/login';
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch AI keys');
      }

      const data = await response.json();
      setAiKeys(data.data || []);
    } catch (error) {
      console.error('Error fetching AI keys:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateKey = async () => {
    try {
      const body: { provider: string; apiKey?: string; creditLimit?: number; limitReset?: string } = { provider };

      if (provider === 'anthropic') {
        body.apiKey = apiKey;
      }
      if (creditLimit !== undefined) {
        body.creditLimit = creditLimit;
      }
      if (limitReset) {
        body.limitReset = limitReset;
      }

      const response = await fetch(`${import.meta.env.VITE_CONTROL_PLANE_URL}/v1/tenants/${tenant.id}/ai-keys`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.status === 401) {
        clearJwt();
        window.location.href = '/login';
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to create AI key');
      }

      setIsCreateDialogOpen(false);
      setProvider('openrouter');
      setApiKey('');
      setCreditLimit(undefined);
      setLimitReset('monthly');
      fetchAiKeys();
    } catch (error) {
      console.error('Error creating AI key:', error);
    }
  };

  const handleDeleteKey = async (provider: string) => {
    if (!confirm(`Are you sure you want to delete the ${provider} key? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_CONTROL_PLANE_URL}/v1/tenants/${tenant.id}/ai-keys/${provider}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.status === 401) {
        clearJwt();
        window.location.href = '/login';
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to delete AI key');
      }

      fetchAiKeys();
    } catch (error) {
      console.error('Error deleting AI key:', error);
    }
  };

  const handleViewKey = async (keyId: string, provider: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_CONTROL_PLANE_URL}/v1/tenants/${tenant.id}/ai-keys/${provider}/decrypt`, {
        credentials: 'include',
      });

      if (response.status === 401) {
        clearJwt();
        window.location.href = '/login';
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to decrypt AI key');
      }

      const data = await response.json();
      setDecryptedKeys(prev => ({ ...prev, [keyId]: data.data.key }));
      setVisibleKeys(prev => ({ ...prev, [keyId]: true }));
    } catch (error) {
      console.error('Error decrypting AI key:', error);
      alert('Failed to decrypt AI key');
    }
  };

  const handleCopyKey = async (key: string, keyId: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(keyId);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (error) {
      console.error('Failed to copy key:', error);
    }
  };

  const getProviderBadgeColor = (provider: string) => {
    return provider === 'openrouter' ? 'bg-blue-500' : 'bg-purple-500';
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'disabled': return 'bg-yellow-500';
      case 'revoked': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>Loading AI keys...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-500" />
            AI Keys
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Manage AI provider keys for this tenant. 
            {tenant.profile === 'shared' ? ' Shared tenants use OpenRouter for non-PHI workloads.' : ' Dedicated tenants use Anthropic for PHI workloads under BAA.'}
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add AI Key
        </Button>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>Add AI Key</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="provider">Provider</Label>
                <select
                  id="provider"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as 'openrouter' | 'anthropic')}
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <option value="openrouter">OpenRouter</option>
                  <option value="anthropic" disabled={tenant.profile !== 'dedicated'}>
                    Anthropic {tenant.profile !== 'dedicated' ? '(dedicated only)' : ''}
                  </option>
                </select>
              </div>
              
              {provider === 'anthropic' && (
                <div>
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-ant-..."
                    className="mt-1"
                  />
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Paste the Anthropic API key from the console
                  </p>
                </div>
              )}

              {provider === 'openrouter' && (
                <>
                  <div>
                    <Label htmlFor="creditLimit">Credit Limit (optional)</Label>
                    <Input
                      id="creditLimit"
                      type="number"
                      value={creditLimit || ''}
                      onChange={(e) => setCreditLimit(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="100"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="limitReset">Limit Reset</Label>
                    <select
                      id="limitReset"
                      value={limitReset}
                      onChange={(e) => setLimitReset(e.target.value as 'daily' | 'weekly' | 'monthly')}
                      className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </>
              )}

              <Button onClick={handleCreateKey} className="w-full">
                Create Key
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      {!aiKeys || aiKeys.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <Key className="h-16 w-16 mx-auto mb-4 opacity-50" style={{ color: 'var(--text-secondary)' }} />
          <h3 className="text-lg font-semibold mb-2">No AI keys configured</h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            Add an AI key to enable AI features for this tenant
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {aiKeys.map((key) => (
            <Card key={key.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className={`${getProviderBadgeColor(key.provider)} text-white font-medium`}>
                      {key.provider === 'openrouter' ? 'OpenRouter' : 'Anthropic'}
                    </Badge>
                    <Badge className={`${getStatusBadgeColor(key.status)} text-white`}>
                      {key.status}
                    </Badge>
                  </div>
                  
                  <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 font-mono text-sm break-all">
                        {visibleKeys[key.id] ? decryptedKeys[key.id] || 'Loading...' : `${key.key_prefix}••••••••••••••••`}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          if (!visibleKeys[key.id]) {
                            handleViewKey(key.id, key.provider);
                          } else {
                            setVisibleKeys(prev => ({ ...prev, [key.id]: false }));
                          }
                        }}
                      >
                        {visibleKeys[key.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      {visibleKeys[key.id] && decryptedKeys[key.id] && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleCopyKey(decryptedKeys[key.id]!, key.id)}
                        >
                          {copiedKey === key.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    {key.credit_limit && (
                      <div>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Credit Limit</p>
                        <p className="font-semibold">${key.credit_limit}</p>
                      </div>
                    )}
                    {key.limit_reset && (
                      <div>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Reset</p>
                        <p className="font-semibold capitalize">{key.limit_reset}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Created</p>
                      <p className="font-semibold">{new Date(key.created_at).toLocaleDateString()}</p>
                    </div>
                    {key.last_used_at && (
                      <div>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Last Used</p>
                        <p className="font-semibold">{new Date(key.last_used_at).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteKey(key.provider)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
