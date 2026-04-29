import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Login } from './pages/Login';
import { TenantList } from './pages/TenantList';
import { SelectTenant } from './pages/SelectTenant';
import { CommandPaletteProvider } from './components/palette/CommandPalette';
import { Toaster } from './components/ui/toaster';
import { TenantProvider } from './contexts/TenantContext';
import { RootRedirect } from './components/routing/RootRedirect';
import { LegacyTenantRedirect } from './components/routing/LegacyTenantRedirect';
import { LegacyAppRedirect } from './components/routing/LegacyAppRedirect';
import { WorkspaceShell } from './pages/workspace/WorkspaceShell';

const AppBuilder = lazy(() => import('./pages/AppBuilder'));
const PlatformAdmin = lazy(() => import('./pages/PlatformAdmin').then(m => ({ default: m.PlatformAdmin })));
const AppsDashboard = lazy(() => import('./pages/AppsDashboard').then(m => ({ default: m.AppsDashboard })));
const AppPage = lazy(() => import('./pages/AppPage').then(m => ({ default: m.AppPage })));
const WorkspaceSettings = lazy(() => import('./pages/WorkspaceSettings').then(m => ({ default: m.WorkspaceSettings })));
const ActivityFeed = lazy(() => import('./pages/ActivityFeed').then(m => ({ default: m.ActivityFeed })));
const AppRuns = lazy(() => import('./pages/AppRuns').then(m => ({ default: m.AppRuns })));
const AppSecrets = lazy(() => import('./pages/AppSecrets').then(m => ({ default: m.AppSecrets })));
const AppSettings = lazy(() => import('./pages/AppSettings').then(m => ({ default: m.AppSettings })));

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-muted-foreground">Loading...</div>
  </div>
);

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <CommandPaletteProvider>
      <Router>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
            <Route path="/" element={user ? <RootRedirect /> : <Navigate to="/login" />} />
            <Route path="/select-tenant" element={user ? <SelectTenant /> : <Navigate to="/login" />} />
            <Route path="/platform" element={user?.isSystemAdmin ? <PlatformAdmin /> : <Navigate to="/" />} />
            <Route
              path="/tenants"
              element={user ? <TenantList /> : <Navigate to="/login" />}
            />
            {/* Legacy tenant redirects */}
            <Route
              path="/tenants/:id"
              element={user ? <LegacyTenantRedirect /> : <Navigate to="/login" />}
            />
            <Route
              path="/tenants/:id/secrets"
              element={user ? <LegacyTenantRedirect to="settings/secrets" /> : <Navigate to="/login" />}
            />
            <Route
              path="/tenants/:id/apps/new"
              element={user ? <LegacyAppRedirect /> : <Navigate to="/login" />}
            />
            <Route
              path="/tenants/:id/apps/:appId"
              element={user ? <LegacyAppRedirect /> : <Navigate to="/login" />}
            />
            <Route
              path="/tenants/:id/apps/:appId/edit"
              element={user ? <LegacyAppRedirect /> : <Navigate to="/login" />}
            />
            {/* New slug-based workspace routes */}
            <Route
              path="/:tenantSlug"
              element={
                user ? (
                  <TenantProvider>
                    <WorkspaceShell />
                  </TenantProvider>
                ) : (
                  <Navigate to="/login" />
                )
              }
            >
              <Route index element={<AppsDashboard />} />
              <Route path="settings" element={<WorkspaceSettings />} />
              <Route path="activity" element={<ActivityFeed />} />
              <Route path="apps/:appId" element={<AppPage />} />
              <Route path="apps/:appId/builder" element={<AppBuilder />} />
              <Route path="apps/:appId/runs" element={<AppRuns />} />
              <Route path="apps/:appId/secrets" element={<AppSecrets />} />
              <Route path="apps/:appId/settings" element={<AppSettings />} />
            </Route>
          </Routes>
        </Suspense>
      </Router>
      <Toaster />
    </CommandPaletteProvider>
  );
}

export default App;
