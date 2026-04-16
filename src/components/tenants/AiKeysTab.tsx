import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Plus, Trash2, Key } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  profile?: string;
}

interface AiKey {
  id: string;
  provider: 'openrouter' | 'anthropic';
  key_prefix: string;
  provider_key_id: string;
  credit_limit: number | null;
  limit_reset: string | null;
  status: 'active' | 'disabled' | 'revoked';
  last_used_at: string | null;
  created_at: string;
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

  useEffect(() => {
    fetchAiKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant.id]);

  const fetchAiKeys = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_CONTROL_PLANE_URL}/tenants/${tenant.id}/ai-keys`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setAiKeys(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch AI keys:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateKey = async () => {
    try {
      const token = localStorage.getItem('token');
      const body: { provider: string; apiKey?: string; creditLimit?: number; limitReset?: string } = { provider };
      
      if (provider === 'anthropic') {
        if (!apiKey) {
          alert('API key is required for Anthropic');
          return;
        }
        body.apiKey = apiKey;
      } else {
        if (creditLimit) body.creditLimit = creditLimit;
        body.limitReset = limitReset;
      }

      const response = await fetch(`${import.meta.env.VITE_CONTROL_PLANE_URL}/tenants/${tenant.id}/ai-keys`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setIsCreateDialogOpen(false);
        setApiKey('');
        setCreditLimit(undefined);
        fetchAiKeys();
      } else {
        const error = await response.json();
        alert(error.error?.message || 'Failed to create AI key');
      }
    } catch (error) {
      console.error('Failed to create AI key:', error);
      alert('Failed to create AI key');
    }
  };

  const handleDeleteKey = async (provider: string) => {
    if (!confirm(`Are you sure you want to delete the ${provider} key?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_CONTROL_PLANE_URL}/tenants/${tenant.id}/ai-keys/${provider}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchAiKeys();
      } else {
        alert('Failed to delete AI key');
      }
    } catch (error) {
      console.error('Failed to delete AI key:', error);
      alert('Failed to delete AI key');
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
          <h2 className="text-2xl font-bold">AI Keys</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Manage AI provider keys for this tenant. 
            {tenant.profile === 'shared' ? ' Shared tenants use OpenRouter.' : ' Dedicated tenants use Anthropic.'}
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add AI Key
            </Button>
          </DialogTrigger>
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
      </div>

      {aiKeys.length === 0 ? (
        <Card className="p-8 text-center">
          <Key className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--text-secondary)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>No AI keys configured</p>
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
            Add an AI key to enable AI features for this tenant
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {aiKeys.map((key) => (
            <Card key={key.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getProviderBadgeColor(key.provider)}>
                      {key.provider}
                    </Badge>
                    <Badge className={getStatusBadgeColor(key.status)}>
                      {key.status}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span style={{ color: 'var(--text-secondary)' }}>Key Prefix:</span>{' '}
                      <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        {key.key_prefix}
                      </code>
                    </p>
                    {key.credit_limit && (
                      <p>
                        <span style={{ color: 'var(--text-secondary)' }}>Credit Limit:</span>{' '}
                        ${key.credit_limit}
                      </p>
                    )}
                    {key.limit_reset && (
                      <p>
                        <span style={{ color: 'var(--text-secondary)' }}>Reset:</span>{' '}
                        {key.limit_reset}
                      </p>
                    )}
                    <p>
                      <span style={{ color: 'var(--text-secondary)' }}>Created:</span>{' '}
                      {new Date(key.created_at).toLocaleDateString()}
                    </p>
                    {key.last_used_at && (
                      <p>
                        <span style={{ color: 'var(--text-secondary)' }}>Last Used:</span>{' '}
                        {new Date(key.last_used_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteKey(key.provider)}
                  className="text-red-500 hover:text-red-700"
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
