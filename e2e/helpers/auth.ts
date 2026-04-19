/**
 * Auth helpers — mint a test JWT and inject it into localStorage
 * so tests can skip the Google OAuth flow entirely.
 *
 * Uses the same JWT_SECRET as lookout-control so the token validates
 * against all real API endpoints.
 */

import { Page } from '@playwright/test';
import { createHmac } from 'crypto';

// ── Minimal JWT implementation (HS256) ───────────────────────────────

function base64url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function mintTestJwt(opts: {
  secret: string;
  userId?: string;
  email?: string;
  name?: string;
  tenantId?: string;
  role?: string;
  isSystemAdmin?: boolean;
  expiresInSeconds?: number;
}): string {
  const {
    secret,
    userId = 'test-user-id',
    email = 'test@hixson.ai',
    name = 'Test User',
    tenantId = '00000000-0000-0000-0000-000000000001',
    role = 'admin',
    isSystemAdmin = true,
    expiresInSeconds = 3600,
  } = opts;

  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({
      id: userId,
      email,
      name,
      isSystemAdmin,
      tenants: [{ id: tenantId, role }],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    })
  );

  const sig = base64url(
    createHmac('sha256', secret)
      .update(`${header}.${payload}`)
      .digest()
  );

  return `${header}.${payload}.${sig}`;
}

/**
 * Navigate to the base URL, inject a test JWT into localStorage,
 * then navigate to the target path. This bypasses Google OAuth.
 */
export async function authenticateAs(
  page: Page,
  targetPath: string,
  opts: {
    jwtSecret: string;
    tenantId?: string;
    role?: string;
    isSystemAdmin?: boolean;
  }
): Promise<void> {
  // Load the app first so localStorage is on the right origin
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const token = mintTestJwt({
    secret: opts.jwtSecret,
    tenantId: opts.tenantId,
    role: opts.role,
    isSystemAdmin: opts.isSystemAdmin,
  });

  await page.evaluate((jwt) => {
    localStorage.setItem('jwt', jwt);
  }, token);

  await page.goto(targetPath, { waitUntil: 'networkidle' });
}
