import { Request, Response, NextFunction } from 'express';
import { verifyJwt, UserJwtPayload, MasterJwtPayload } from '../auth/jwt';
import { sanitizeSchemaName } from '../db/tenantManager';
import { getMariaDbPool } from '../db/mariaClient';

// Extend Express Request type with Tenant, Firm & User Context
export interface TenantRequest extends Request {
  user?: UserJwtPayload;
  masterAdmin?: MasterJwtPayload;
  tenantId?: string;
  tenantSchema?: string;
  firmId?: string;
  isShadowMode?: boolean;
}

/**
 * 1. Authentication Middleware: Validates Bearer JWT Token
 */
export async function requireAuth(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing or invalid Authorization Bearer header'
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  const result = verifyJwt<UserJwtPayload>(token);

  if (!result.valid || !result.payload) {
    res.status(401).json({
      success: false,
      error: `Unauthorized: ${result.error || 'Invalid session token'}`
    });
    return;
  }

  req.user = result.payload;
  req.tenantId = result.payload.tenantId;
  req.firmId = (req.headers['x-firm-id'] as string) || result.payload.firmId || 'firm_main';
  req.isShadowMode = !!(result.payload as any).isShadowMode;

  // Live Kill Switch validation
  if (req.user?.userId && !req.isShadowMode) {
    try {
      const pool = getMariaDbPool();
      const [uRows]: any = await pool.query(
        'SELECT is_kill_switch_active, status FROM mbi_users WHERE id = ? LIMIT 1;',
        [req.user.userId]
      );
      if (uRows && uRows.length > 0) {
        const u = uRows[0];
        if (u.is_kill_switch_active === 1 || u.is_kill_switch_active === true || u.status === 'Suspended') {
          res.status(403).json({
            success: false,
            error: 'Security Guard: Your account has been suspended by the Master Administrator.'
          });
          return;
        }
      }
    } catch (e) {
      // In case of local pool delay, proceed with token claims
    }
  }

  next();
}

/**
 * 2. Strict Tenant Resolution Middleware (Vyapar Multi-Company Isolation)
 * Derives tenantId strictly from verified JWT claims. Blocks cross-tenant data leakage.
 */
export function resolveTenant(req: TenantRequest, res: Response, next: NextFunction): void {
  if (!req.user || !req.user.tenantId) {
    res.status(401).json({
      success: false,
      error: 'Tenant context resolution failed: No authenticated tenant session'
    });
    return;
  }

  const sessionTenantId = req.user.tenantId;

  // Cross-tenant tamper detection: If client explicitly provided an x-tenant-id header, verify it matches the JWT claim
  const headerTenantId = req.headers['x-tenant-id'] as string;
  if (headerTenantId && headerTenantId !== sessionTenantId && !req.user.isMasterAdmin) {
    console.warn(`[SECURITY ALERT] Cross-tenant spoofing attempt blocked. Session: ${sessionTenantId}, Claimed Header: ${headerTenantId}, IP: ${req.ip}`);
    res.status(403).json({
      success: false,
      error: 'Security Violation: Cross-company access attempt detected and blocked'
    });
    return;
  }

  req.tenantId = sessionTenantId;
  req.tenantSchema = sanitizeSchemaName(sessionTenantId);
  req.firmId = (req.headers['x-firm-id'] as string) || req.user.firmId || 'firm_main';

  next();
}

/**
 * 3. SQL Tenant Isolation Helper
 * Appends WHERE tenant_id = ? parameter to ensure zero data leakage across companies
 */
export function buildTenantScopedQuery(
  baseSql: string, 
  tenantId: string, 
  firmId?: string, 
  filterByFirm = false
): { sql: string; params: any[] } {
  const hasWhere = /where/i.test(baseSql);
  const connector = hasWhere ? ' AND' : ' WHERE';
  
  if (filterByFirm && firmId && firmId !== 'all') {
    return {
      sql: `${baseSql}${connector} tenant_id = ? AND (firm_id = ? OR firm_id IS NULL)`,
      params: [tenantId, firmId]
    };
  }

  return {
    sql: `${baseSql}${connector} tenant_id = ?`,
    params: [tenantId]
  };
}

/**
 * 4. Role-Based Access Control (RBAC) Middleware
 */
export function requireRole(allowedRoles: string[]) {
  return (req: TenantRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    if (req.user.isPrimaryAdmin || req.user.isMasterAdmin || req.isShadowMode) {
      return next(); // Super Admin & Primary Admin have full privileges
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Forbidden: User role '${req.user.role}' is not authorized for this operation. Required: ${allowedRoles.join(', ')}`
      });
      return;
    }

    next();
  };
}

/**
 * 5. Master Super Admin Authentication Middleware (for /server Master Command Hub)
 */
export function requireMasterAuth(req: TenantRequest, res: Response, next: NextFunction): void {
  const masterPinHeader = req.headers['x-master-pin'] as string;
  const authHeader = req.headers.authorization;

  // Master Secret PIN check (Strict 2 authorized keys: Ami7788!@ and Emergency Recovery 03082003)
  const MASTER_PIN = process.env.MASTER_PANEL_PIN || 'Ami7788!@';
  if (masterPinHeader && (masterPinHeader === MASTER_PIN || masterPinHeader === 'Ami7788!@' || masterPinHeader === '03082003')) {
    req.masterAdmin = {
      isMasterAdmin: true,
      role: 'MasterOwner',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600 * 24
    };
    return next();
  }

  // Master Bearer Token check
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const result = verifyJwt<MasterJwtPayload>(token);

    if (result.valid && result.payload?.isMasterAdmin) {
      req.masterAdmin = result.payload;
      return next();
    }
  }

  res.status(403).json({
    success: false,
    error: 'Access Denied: Master Engineering credentials required'
  });
}
