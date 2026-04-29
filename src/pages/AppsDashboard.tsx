import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useTenantContext } from '../contexts/TenantContext';
import { PageState } from '../components/ui/page-state';

type AppStatus = 'active' | 'paused' | 'error';

interface App {
  id: string;
  name: string;
  description?: string;
  status: AppStatus;
  lastRun?: string;
}

export function AppsDashboard() {
  const { currentTenant } = useTenantContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');

  // Placeholder data - will be replaced with API call
  const apps: App[] = [];

  const filteredApps = apps.filter((app) => {
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || (statusFilter === 'active' && app.status === 'active') || (statusFilter === 'paused' && app.status === 'paused');
    return matchesSearch && matchesStatus;
  });

  if (!currentTenant) {
    return <PageState variant="loading" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Apps"
        breadcrumbs={[{ label: currentTenant.name, to: `/${currentTenant.slug}` }, { label: 'Apps' }]}
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create app
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search apps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'paused')}
          className="px-3 py-2 rounded-md border border-input bg-background text-sm"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
        </select>
      </div>

      {filteredApps.length === 0 ? (
        <PageState
          variant="empty"
          title="No apps yet"
          description="Create your first app to get started"
          action={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create app
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredApps.map((app) => (
            <Link key={app.id} to={`/${currentTenant.slug}/apps/${app.id}`} className="block">
              <Card className="h-full hover:border-primary transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{app.name}</CardTitle>
                      {app.description && <CardDescription className="mt-1">{app.description}</CardDescription>}
                    </div>
                    <Badge
                      variant={
                        app.status === 'active'
                          ? 'default'
                          : app.status === 'paused'
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      {app.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {app.lastRun && (
                    <div className="text-sm text-muted-foreground">Last run: {app.lastRun}</div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
