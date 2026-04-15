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
  const controlPlaneUrl = import.meta.env.VITE_CONTROL_PLANE_URL;
  const authUrl = `${controlPlaneUrl}/auth/google?redirect_uri=${encodeURIComponent(redirectUri)}`;
  window.location.href = authUrl;
}

export function handleAuthCallback(): boolean {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  if (token) {
    setJwt(token);
    window.history.replaceState({}, '', window.location.pathname);
    return true;
  }
  return false;
}

export function logout(): void {
  clearJwt();
  window.location.href = '/login';
}
