import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleAuthCallback, getUser } from '../lib/auth';
import { Loader2 } from 'lucide-react';

export function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Handle OAuth callback with token in URL fragment (#token=...)
    const processAuth = async () => {
      try {
        // Check if we have a token in the fragment
        const hasToken = window.location.hash.includes('token=');
        
        if (hasToken) {
          const success = await handleAuthCallback();
          if (success) {
            // handleAuthCallback already redirects, so we don't need to do anything
            return;
          }
        }

        // If no token in fragment, check if user is already authenticated
        const user = getUser();
        if (user) {
          navigate('/', { replace: true });
          return;
        }

        // No token and not authenticated - redirect to login
        navigate('/login', { replace: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setTimeout(() => navigate('/login', { replace: true }), 3000);
      }
    };

    processAuth();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-2">Authentication failed</p>
          <p className="text-sm text-gray-500">{error}</p>
          <p className="text-xs text-gray-400 mt-4">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-emerald-600" />
        <p className="text-gray-600">Completing sign-in...</p>
      </div>
    </div>
  );
}
