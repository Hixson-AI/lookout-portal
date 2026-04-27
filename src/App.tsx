import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { TenantList } from './pages/TenantList';
import { TenantDetail } from './pages/TenantDetail';

const TenantSecrets = lazy(() => import('./pages/TenantSecrets').then(m => ({ default: m.TenantSecrets })));
const AppBuilder = lazy(() => import('./pages/AppBuilder'));
const PlatformAdmin = lazy(() => import('./pages/PlatformAdmin').then(m => ({ default: m.PlatformAdmin })));

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
    <Router>
      <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/" element={user ? <Home /> : <Navigate to="/login" />} />
        <Route path="/platform" element={user?.isSystemAdmin ? <PlatformAdmin /> : <Navigate to="/" />} />
        <Route
          path="/tenants"
          element={user ? <TenantList /> : <Navigate to="/login" />}
        />
        <Route
          path="/tenants/:id"
          element={user ? <TenantDetail /> : <Navigate to="/login" />}
        />
        <Route
          path="/tenants/:id/secrets"
          element={user ? <TenantSecrets /> : <Navigate to="/login" />}
        />
        <Route
          path="/tenants/:id/apps/new"
          element={user ? <AppBuilder /> : <Navigate to="/login" />}
        />
        <Route
          path="/tenants/:id/apps/:appId"
          element={user ? <AppBuilder /> : <Navigate to="/login" />}
        />
        <Route
          path="/tenants/:id/apps/:appId/edit"
          element={user ? <AppBuilder /> : <Navigate to="/login" />}
        />
      </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
