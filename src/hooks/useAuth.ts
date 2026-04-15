import { useState, useEffect } from 'react';
import { getUser, handleAuthCallback, logout } from '../lib/auth';
import type { JwtPayload } from '../lib/auth';

export function useAuth() {
  const [user, setUser] = useState<JwtPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for auth callback on mount
    handleAuthCallback().then((hasCallback) => {
      if (hasCallback) {
        // handleAuthCallback already performed the redirect, don't reload
        return;
      }

      // Get current user
      const currentUser = getUser();
      setUser(currentUser);
      setLoading(false);
    });
  }, []);

  return { user, loading, logout };
}
