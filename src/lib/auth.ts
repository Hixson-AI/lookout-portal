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

export function isJwtExpired(token: string): boolean {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    const exp = payload.exp;
    if (!exp) return false;
    return exp * 1000 < Date.now();
  } catch (e) {
    return true;
  }
}

export function getUser(): JwtPayload | null {
  const token = getJwt();
  if (!token) return null;
  return parseJwt(token);
}

export function login(): void {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  
  // Always use main portal domain as OAuth redirect_uri (Google doesn't support wildcards)
  // Expected structure: portal.dev.client.domain or tenant.portal.dev.client.domain
  let oauthRedirectUri = window.location.origin;
  let tenantSubdomain: string | null = null;
  
  // If we're on a tenant subdomain (e.g., hixson-ai.portal.dev.client.domain),
  // remove the tenant prefix to get the base portal domain
  if (parts.length >= 4 && parts[1] === 'portal') {
    tenantSubdomain = parts[0];
    // Remove first subdomain (tenant) to get portal.dev.client.domain
    parts.shift();
    oauthRedirectUri = `${window.location.protocol}//${parts.join('.')}`;
  }

  // Pass tenant subdomain as state for redirect after OAuth
  const state = tenantSubdomain || window.location.href;
  
  const controlPlaneUrl = import.meta.env.VITE_CONTROL_PLANE_URL;
  const authUrl = `${controlPlaneUrl}/auth/google?redirect_uri=${encodeURIComponent(oauthRedirectUri)}&state=${encodeURIComponent(state)}`;
  window.location.href = authUrl;
}

export async function handleAuthCallback(): Promise<boolean> {
  // OAuth returns platform JWT in URL fragment
  const fragment = window.location.hash.substring(1); // Remove '#'
  const params = new URLSearchParams(fragment);
  const token = params.get('token');
  const state = params.get('state'); // Get the state parameter with tenant destination

  if (token) {
    setJwt(token); // Store token for current domain

    // Redirect to tenant portal if state parameter exists and is not /login
    if (state) {
      const decodedState = decodeURIComponent(state);
      // Don't redirect to /login to avoid loops
      if (!decodedState.includes('/login')) {
        // If state is a tenant slug (not a full URL), redirect back to tenant subdomain with token
        if (!decodedState.startsWith('http') && !decodedState.startsWith('/')) {
          // Reconstruct tenant subdomain URL by inserting tenant slug before "portal"
          const hostname = window.location.hostname;
          const parts = hostname.split('.');
          parts.unshift(decodedState); // Insert tenant slug at beginning
          const tenantUrl = `${window.location.protocol}//${parts.join('.')}/tenants/${decodedState}#token=${token}`;
          window.location.href = tenantUrl;
        } else {
          window.location.href = decodedState;
        }
        return true;
      }
    }

    // Clean up URL fragment after storing token
    window.history.replaceState({}, '', window.location.pathname);
    return true;
  }
  return false;
}

export function logout(): void {
  clearJwt();
  window.location.href = '/login';
}
