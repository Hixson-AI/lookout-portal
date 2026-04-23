import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTenants, useCreateTenant } from '../hooks/useTenants';
import { Layout } from '../components/layout/Layout';
import { TenantCard } from '../components/tenants/TenantCard';
import { TenantCreateDialog } from '../components/tenants/TenantCreateDialog';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Search, Plus } from 'lucide-react';
import { useState } from 'react';

export function TenantList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: tenants, isLoading, error } = useTenants();
  const createTenant = useCreateTenant();
  const [searchQuery, setSearchQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const filteredTenants = tenants?.filter(
    (tenant) =>
      tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.slug.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <Layout>
        <div className="text-center py-12 text-muted-foreground animate-pulse">
          Loading tenants...
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-destructive">
          <p className="font-medium">Error loading tenants</p>
          <p className="text-sm mt-1">{error.message}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tenants</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your platform tenants</p>
          </div>
          {user?.isSystemAdmin && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Tenant
            </Button>
          )}
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tenants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {filteredTenants.length === 0 ? (
          <Card className="py-16 text-center border-dashed">
            <CardContent>
              <p className="text-muted-foreground">
                {searchQuery ? 'No tenants match your search.' : 'No tenants found.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTenants.map((tenant) => (
              <TenantCard
                key={tenant.id}
                tenant={tenant}
                onClick={() => navigate(`/tenants/${tenant.id}`)}
              />
            ))}
          </div>
        )}
      </div>
      <TenantCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        isPending={createTenant.isPending}
        onCreate={(data) =>
          createTenant.mutate(data, { onSuccess: () => setCreateOpen(false) })
        }
      />
    </Layout>
  );
}
