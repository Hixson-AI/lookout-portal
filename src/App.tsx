import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { TenantList } from './pages/TenantList';
import { TenantDetail } from './pages/TenantDetail';

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
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/" element={user ? <Home /> : <Navigate to="/login" />} />
        <Route
          path="/tenants"
          element={user ? <TenantList /> : <Navigate to="/login" />}
        />
        <Route
          path="/tenants/:id"
          element={user ? <TenantDetail /> : <Navigate to="/login" />}
        />
      </Routes>
    </Router>
  );
}

export default App;
