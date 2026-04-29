import { useNavigate } from 'react-router-dom';
import { useTenantContext } from '../contexts/TenantContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { LukoutLoaderCentered } from '../components/ui/lukout-loader';

export function SelectTenant() {
  const { availableTenants, setCurrentTenant, loading } = useTenantContext();
  const navigate = useNavigate();

  if (loading) {
    return <LukoutLoaderCentered />;
  }

  if (availableTenants.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">No tenants available</h1>
          <p className="text-muted-foreground">You don't have access to any workspaces.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20">
      <div className="container max-w-md px-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Select a workspace</h1>
          <p className="text-muted-foreground">Choose the workspace you want to work in</p>
        </div>
        <div className="space-y-4">
          {availableTenants.map((tenant) => (
            <Card key={tenant.id} className="cursor-pointer hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle>{tenant.name}</CardTitle>
                <CardDescription>@{tenant.slug}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => {
                    setCurrentTenant(tenant.slug);
                    navigate(`/${tenant.slug}`);
                  }}
                  className="w-full"
                >
                  Open workspace
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
