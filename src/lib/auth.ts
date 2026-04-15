const JWT_KEY = 'jwt';

export interface JwtPayload {
  id: string;
  email: string;
  name: string;
  picture?: string;
  isSystemAdmin: boolean;
  tenants: Array<{
    id: string;
    role: string;
  }>;
}

export function getJwt(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(JWT_KEY);
}

export function setJwt(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(JWT_KEY, token);
}

export function clearJwt(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(JWT_KEY);
}

export function parseJwt(token: string): JwtPayload | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export function getUser(): JwtPayload | null {
  const token = getJwt();
  if (!token) return null;
  return parseJwt(token);
}

export function login(): void {
  const redirectUri = window.location.origin;
  const state = window.location.href; // Store current URL (tenant portal) as state
  const controlPlaneUrl = import.meta.env.VITE_CONTROL_PLANE_URL;
  const authUrl = `${controlPlaneUrl}/auth/google?redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
  window.location.href = authUrl;
}

export async function handleAuthCallback(): Promise<boolean> {
  console.log('[handleAuthCallback] Starting callback processing');
  console.log('[handleAuthCallback] Current URL:', window.location.href);
  console.log('[handleAuthCallback] Hash:', window.location.hash);

  // Google OAuth returns token in URL fragment
  const fragment = window.location.hash.substring(1); // Remove '#'
  console.log('[handleAuthCallback] Fragment:', fragment);

  const params = new URLSearchParams(fragment);
  const googleToken = params.get('id_token');
  const state = params.get('state'); // Get the state parameter with tenant destination

  console.log('[handleAuthCallback] Google token present:', !!googleToken);
  console.log('[handleAuthCallback] State present:', !!state);

  if (googleToken) {
    try {
      const controlPlaneUrl = import.meta.env.VITE_CONTROL_PLANE_URL;
      console.log('[handleAuthCallback] Control plane URL:', controlPlaneUrl);
      console.log('[handleAuthCallback] Exchanging token...');

      const response = await fetch(`${controlPlaneUrl}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${googleToken}`,
        },
      });

      console.log('[handleAuthCallback] Response status:', response.status);

      if (!response.ok) {
        console.error('[handleAuthCallback] Failed to exchange Google token for JWT');
        const errorText = await response.text();
        console.error('[handleAuthCallback] Error response:', errorText);
        return false;
      }

      const data = await response.json();
      console.log('[handleAuthCallback] Response data:', data);

      if (data.data?.token) {
        setJwt(data.data.token);
        console.log('[handleAuthCallback] JWT stored successfully');

        // Redirect to tenant portal if state parameter exists and is not /login
        if (state) {
          const decodedState = decodeURIComponent(state);
          console.log('[handleAuthCallback] State:', decodedState);
          // Don't redirect to /login to avoid loops
          if (!decodedState.includes('/login')) {
            console.log('[handleAuthCallback] Redirecting to state:', decodedState);
            window.location.href = decodedState;
            return true;
          }
        }

        console.log('[handleAuthCallback] Clearing hash and returning success');
        window.history.replaceState({}, '', window.location.pathname);
        return true;
      }
    } catch (error) {
      console.error('[handleAuthCallback] Error exchanging Google token for JWT:', error);
      return false;
    }
  } else {
    console.log('[handleAuthCallback] No Google token found in URL');
  }
  return false;
}

export function logout(): void {
  clearJwt();
  window.location.href = '/login';
}
