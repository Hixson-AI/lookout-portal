import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { BarChart3, TrendingUp } from 'lucide-react';
import { useUsage } from '../../hooks/useUsage';
import { formatCurrency, formatTokens } from '../../lib/utils/formatters';
import { getProviderBadgeColor } from '../../lib/utils/badge-colors';

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

interface UsageTabProps {
  tenant: Tenant;
}

export function UsageTab({ tenant }: UsageTabProps) {
  const { summary, isLoading, startDate, endDate, setStartDate, setEndDate } = useUsage(tenant.id);


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
