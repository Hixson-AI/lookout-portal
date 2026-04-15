import { useNavigate } from 'react-router-dom';
import { useTenants } from '../hooks/useTenants';
import { Layout } from '../components/layout/Layout';
import { TenantCard } from '../components/tenants/TenantCard';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Search, Plus } from 'lucide-react';
import { useState } from 'react';

export function TenantList() {
  const navigate = useNavigate();
  const { data: tenants, isLoading, error } = useTenants();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTenants = tenants?.filter(
    (tenant) =>
      tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.slug.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <Layout>
        <div className="text-center py-8">Loading tenants...</div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="text-center py-8 text-destructive">
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
            <p className="text-muted-foreground">Manage your platform tenants</p>
          </div>
          <Button className="btn-gradient">
            <Plus className="h-4 w-4 mr-2" />
            Create Tenant
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tenants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {filteredTenants.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
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
    </Layout>
  );
}
