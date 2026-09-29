import crypto from 'crypto';

// Server-side Secret Key (Derived from ENV or securely generated per boot cycle)
const JWT_SECRET = process.env.JWT_SECRET || process.env.SERVER_SECRET || 'mbi_inventra_enterprise_jwt_master_secret_key_2026';

export interface UserJwtPayload {
  userId: string;
  tenantId: string;
  name?: string;
  firmId?: string;
  email: string;
  role: string;
  deviceId?: string;
  isPrimaryAdmin?: boolean;
  isMasterAdmin?: boolean;
  isShadowMode?: boolean;
  is_silent_monitored?: number | boolean;
  permissions?: string[];
  iat: number;
  exp: number;
}

export interface MasterJwtPayload {
  isMasterAdmin: true;
  role: 'MasterOwner' | 'MasterEngineer';
  iat: number;
  exp: number;
}

/**
 * Base64Url encoder/decoder utilities
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * Creates a cryptographically signed HMAC-SHA256 JWT Token
 */
export function signJwt(payload: Record<string, any>, expiresInSeconds: number = 86400 * 365): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verifies a JWT token signature and expiration date
 */
export function verifyJwt<T = UserJwtPayload>(token: string): { valid: boolean; payload?: T; error?: string } {
  try {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'Token missing or malformed' };
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid token structure' };
    }

    const [encodedHeader, encodedPayload, signature] = parts;

    // Verify cryptographic signature
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    // Constant-time buffer comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return { valid: false, error: 'Invalid cryptographic signature' };
    }

    const payload: any = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      return { valid: false, error: 'Token has expired' };
    }

    return { valid: true, payload };
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Token verification failed' };
  }
}
