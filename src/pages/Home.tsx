import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Layout } from '../components/layout/Layout';
import { Cpu } from 'lucide-react';

export function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <Layout>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gradient mb-2 break-words">
          Welcome, {user.name || user.email}
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          {user.isSystemAdmin ? 'System Administrator' : 'Operator'}
        </p>
      </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {user.isSystemAdmin ? (
            <>
              <Card className="card-hover cursor-pointer" onClick={() => navigate('/tenants')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    All Tenants
                  </CardTitle>
                  <CardDescription>
                    Manage all tenants in the system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>View and manage all tenant configurations</p>
                </CardContent>
              </Card>

              <Card className="card-hover cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    System Stats
                  </CardTitle>
                  <CardDescription>
                    View system-wide metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Monitor platform performance and usage</p>
                </CardContent>
              </Card>

              <Card className="card-hover cursor-pointer" onClick={() => navigate('/platform')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cpu className="w-5 h-5" />
                    Platform Admin
                  </CardTitle>
                  <CardDescription>
                    Action catalog, embeddings &amp; AI settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Manage the action library, sync n8n catalog, configure OpenAI key</p>
                </CardContent>
              </Card>

              <Card className="card-hover cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    Operators
                  </CardTitle>
                  <CardDescription>
                    Manage platform operators
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Add and manage operator access</p>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card className="card-hover cursor-pointer" onClick={() => navigate('/tenants')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    My Tenants
                  </CardTitle>
                  <CardDescription>
                    Manage your assigned tenants
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    You have access to {user.tenants.length} tenant{user.tenants.length !== 1 ? 's' : ''}
                  </p>
                </CardContent>
              </Card>

              {user.tenants.map((tenant) => (
                <Card key={tenant.id} className="card-hover cursor-pointer" onClick={() => navigate(`/tenants/${tenant.id}`)}>
                  <CardHeader>
                    <CardTitle className="text-lg">Tenant {tenant.id}</CardTitle>
                    <CardDescription>Role: {tenant.role}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" size="sm">View Details</Button>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
    </Layout>
  );
}
