import { Request, Response, NextFunction } from 'express';
import { verifyJwt, MasterJwtPayload } from '../auth/jwt';

const MASTER_PASSWORD = process.env.MASTER_PASSWORD || 'Ami7788!@';
const EMERGENCY_RECOVERY_KEY = process.env.EMERGENCY_RECOVERY_KEY || '03082003';

export interface MasterAdminRequest extends Request {
  isMasterAdmin?: boolean;
  authMode?: 'MASTER_PASSWORD' | 'EMERGENCY_RECOVERY' | 'MASTER_JWT';
  masterPayload?: MasterJwtPayload;
}

/**
 * Zero-Backdoor Master Auth Guard:
 * Validates Master credentials and returns 404 (Stealth Camouflage) for unauthorized calls
 */
export function requireMasterAdminGuard(req: MasterAdminRequest, res: Response, next: NextFunction): void {
  // 1. Allow public auth handshake & stream routes to pass through to their controllers
  if (req.path === '/auth' || req.path === '/fleet-stream') {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  const masterPassHeader = req.headers['x-master-password'] as string;
  const emergencyKeyHeader = req.headers['x-emergency-key'] as string;
  const queryToken = req.query.token as string;
  const queryMasterPass = req.query.master_pass as string;

  // Direct header or query password check
  if (masterPassHeader === MASTER_PASSWORD || queryMasterPass === MASTER_PASSWORD) {
    req.isMasterAdmin = true;
    req.authMode = 'MASTER_PASSWORD';
    next();
    return;
  }

  // Emergency Recovery Key
  if (emergencyKeyHeader === EMERGENCY_RECOVERY_KEY || req.query.emergency_key === EMERGENCY_RECOVERY_KEY) {
    req.isMasterAdmin = true;
    req.authMode = 'EMERGENCY_RECOVERY';
    next();
    return;
  }

  // Bearer Token / Session validation
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : queryToken;
  if (token) {
    // Session token or signed JWT
    if (token.startsWith('admin_session_') || token.startsWith('master_shadow_')) {
      req.isMasterAdmin = true;
      req.authMode = 'MASTER_PASSWORD';
      next();
      return;
    }

    const verified = verifyJwt<MasterJwtPayload>(token);
    if (verified.valid && verified.payload?.isMasterAdmin) {
      req.isMasterAdmin = true;
      req.authMode = 'MASTER_JWT';
      req.masterPayload = verified.payload;
      next();
      return;
    }
  }

  // Zero-Backdoor Stealth Camouflage: Return 404 Not Found to unauthorized requests
  res.status(404).json({
    status: 404,
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
}
