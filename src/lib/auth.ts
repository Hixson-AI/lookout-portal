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
  // Extract tenant name from subdomain for tenant portal access
  const hostname = window.location.hostname;
  const subdomain = hostname.split('.')[0]; // First subdomain segment (e.g., "hixson-ai" from "hixson-ai.portal.dev.client.cumberlandstrategygroup.com")
  const state = subdomain || window.location.href; // Use tenant name from subdomain if available, otherwise full URL
  const controlPlaneUrl = import.meta.env.VITE_CONTROL_PLANE_URL;
  const authUrl = `${controlPlaneUrl}/auth/google?redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
  window.location.href = authUrl;
}

export async function handleAuthCallback(): Promise<boolean> {
  // OAuth returns platform JWT in URL fragment
  const fragment = window.location.hash.substring(1); // Remove '#'
  const params = new URLSearchParams(fragment);
  const token = params.get('token');
  const state = params.get('state'); // Get the state parameter with tenant destination

  if (token) {
    setJwt(token);

    // Redirect to tenant portal if state parameter exists and is not /login
    if (state) {
      const decodedState = decodeURIComponent(state);
      // Don't redirect to /login to avoid loops
      if (!decodedState.includes('/login')) {
        window.location.href = decodedState;
        return true;
      }
    }

    window.history.replaceState({}, '', window.location.pathname);
    return true;
  }
  return false;
}

export function logout(): void {
  clearJwt();
  window.location.href = '/login';
}
