import { useState, useEffect } from 'react';
import { getUser, handleAuthCallback, logout } from '../lib/auth';
import type { JwtPayload } from '../lib/auth';

export function useAuth() {
  const [user, setUser] = useState<JwtPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for auth callback on mount
    handleAuthCallback().then(() => {
      // Always resolve user state — if handleAuthCallback redirected,
      // the page navigates away and these calls are harmless no-ops.
      const currentUser = getUser();
      setUser(currentUser);
      setLoading(false);
    });
  }, []);

  return { user, loading, logout };
}
