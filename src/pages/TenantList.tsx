import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTenants, useCreateTenant } from '../hooks/useTenants';
import { Layout } from '../components/layout/Layout';
import { TenantCard } from '../components/tenants/TenantCard';
import { TenantCreateDialog } from '../components/tenants/TenantCreateDialog';
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
        <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>Loading tenants...</div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="text-center py-8" style={{ color: 'var(--accent)' }}>
          Error loading tenants: {error.message}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gradient">Tenants</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Manage your platform tenants</p>
          </div>
          {user?.isSystemAdmin && (
            <Button className="btn-gradient" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Tenant
            </Button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
          <Input
            placeholder="Search tenants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {filteredTenants.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
            {searchQuery ? 'No tenants match your search.' : 'No tenants found.'}
          </div>
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
