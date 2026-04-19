import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { getUser, handleAuthCallback, clearJwt } from '../lib/auth';
import { setOnAuthError } from '../lib/api';
import type { JwtPayload } from '../lib/auth';
import { AuthContext } from './authContextValue';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<JwtPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    clearJwt();
    setUser(null);
  }, []);

  useEffect(() => {
    // Register 401 handler so api.ts can clear auth state without hard redirect
    setOnAuthError(() => {
      console.warn('[auth] 401 received from API — session may be invalid');
    });

    // Handle OAuth callback on mount, then resolve user state
    handleAuthCallback().then(() => {
      const currentUser = getUser();
      setUser(currentUser);
      setLoading(false);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
