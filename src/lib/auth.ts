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
  // Google OAuth returns token in URL fragment
  const fragment = window.location.hash.substring(1); // Remove '#'
  const params = new URLSearchParams(fragment);
  const googleToken = params.get('access_token');
  const state = params.get('state'); // Get the state parameter with tenant destination

  if (googleToken) {
    try {
      const controlPlaneUrl = import.meta.env.VITE_CONTROL_PLANE_URL;
      const response = await fetch(`${controlPlaneUrl}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${googleToken}`,
        },
      });

      if (!response.ok) {
        console.error('Failed to exchange Google token for JWT');
        return false;
      }

      const data = await response.json();
      if (data.data?.token) {
        setJwt(data.data.token);

        // Redirect to tenant portal if state parameter exists
        if (state) {
          window.location.href = decodeURIComponent(state);
          return true;
        }

        window.history.replaceState({}, '', window.location.pathname);
        return true;
      }
    } catch (error) {
      console.error('Error exchanging Google token for JWT:', error);
      return false;
    }
  }
  return false;
}

export function logout(): void {
  clearJwt();
  window.location.href = '/login';
}
