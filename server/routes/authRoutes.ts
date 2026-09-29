import express, { Response } from 'express';
import { requireAuth, requireMasterAuth, TenantRequest } from '../middleware/tenantMiddleware';
import { loginController, registerTrialController } from '../controllers/authController';
import { signJwt } from '../auth/jwt';

export const authRouter = express.Router();

/**
 * POST /api/auth/login
 * Authenticates user credentials directly from mbi_users MariaDB table and issues a JWT with device tracking & SSE broadcast
 */
authRouter.post('/login', loginController);

/**
 * GET /api/auth/me
 * Returns the currently authenticated user profile and resolved tenant isolation scope
 */
authRouter.get('/me', requireAuth, (req: TenantRequest, res: Response): void => {
  res.json({
    success: true,
    user: req.user,
    resolvedTenantId: req.user?.tenantId
  });
});

/**
 * POST /api/auth/register & /api/auth/register-trial
 * Registers a new tenant for a 10-day free trial, auto-binds Device #1 as primary terminal, and records lead in mbi_registration_leads
 */
authRouter.post('/register', registerTrialController);
authRouter.post('/register-trial', registerTrialController);

/**
 * POST /api/auth/master-login
 * Issues a Master Admin Session Token for protected /server /master governance
 */
authRouter.post('/master-login', requireMasterAuth, (req: TenantRequest, res: Response): void => {
  const masterToken = signJwt({
    isMasterAdmin: true,
    role: req.masterAdmin?.role || 'MasterOwner'
  }, 3600 * 12);

  res.json({
    success: true,
    token: masterToken,
    role: req.masterAdmin?.role || 'MasterOwner',
    expiresIn: '12h'
  });
});
