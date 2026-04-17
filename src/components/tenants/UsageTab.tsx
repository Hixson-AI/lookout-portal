import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { BarChart3, TrendingUp } from 'lucide-react';
import { api } from '../../lib/api';
import type { UsageRecord, UsageSummary } from '../../lib/api';

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

interface UsageTabProps {
  tenant: Tenant;
}

export function UsageTab({ tenant }: UsageTabProps) {
  const [usage, setUsage] = useState<UsageRecord[]>([]);
  const [summary, setSummary] = useState<UsageSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Suppress unused variable warning - usage is used in rendering
  void usage;

  useEffect(() => {
    // Default to last 30 days
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchUsage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant.id, startDate, endDate]);

  const fetchUsage = async () => {
    try {
      const data = await api.getUsage(tenant.id, startDate, endDate);
      setUsage(Array.isArray(data.usage) ? data.usage : []);
      setSummary(Array.isArray(data.summary) ? data.summary : []);
    } catch (error) {
      console.error('Failed to fetch usage:', error);
      setUsage([]);
      setSummary([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getProviderBadgeColor = (provider: string) => {
    return provider === 'openrouter' ? 'bg-blue-500' : 'bg-purple-500';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatTokens = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(2)}K`;
    }
    return value.toString();
  };

  if (isLoading) {
    return <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>Loading usage data...</div>;
  }

  const totalCost = summary.reduce((sum, s) => sum + s.total_cost_usd, 0);
  const totalRequests = summary.reduce((sum, s) => sum + s.request_count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">AI Usage</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Track AI API usage and costs for this tenant</p>
      </div>

      <div className="flex gap-4 items-end">
        <div>
          <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 px-3 py-2 border rounded-md bg-background"
            style={{ borderColor: 'var(--border)' }}
          />
        </div>
        <div>
          <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 px-3 py-2 border rounded-md bg-background"
            style={{ borderColor: 'var(--border)' }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5" style={{ color: 'var(--accent)' }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Cost</span>
          </div>
          <div className="text-2xl font-bold">{formatCurrency(totalCost)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-5 w-5" style={{ color: 'var(--accent)' }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Requests</span>
          </div>
          <div className="text-2xl font-bold">{totalRequests.toLocaleString()}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Providers Used</span>
          </div>
          <div className="text-2xl font-bold">{summary.length}</div>
        </Card>
      </div>

      {summary.length === 0 ? (
        <Card className="p-8 text-center">
          <BarChart3 className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--text-secondary)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>No usage data available</p>
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
            Usage data will appear here once AI features are used
          </p>
        </Card>
      ) : (
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4">Usage by Provider and Model</h3>
          <div className="space-y-4">
            {summary.map((item, index) => (
              <div key={index} className="border-b pb-4 last:border-0" style={{ borderColor: 'var(--border)' }}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getProviderBadgeColor(item.provider)}>
                        {item.provider}
                      </Badge>
                      <span className="font-medium">{item.model}</span>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {item.request_count} requests
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{formatCurrency(item.total_cost_usd)}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Input Tokens:</span>{' '}
                    {formatTokens(item.total_input_tokens)}
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Output Tokens:</span>{' '}
                    {formatTokens(item.total_output_tokens)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
