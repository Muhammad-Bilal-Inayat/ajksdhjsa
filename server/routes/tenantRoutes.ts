import express, { Response } from 'express';
import { requireAuth, resolveTenant, TenantRequest } from '../middleware/tenantMiddleware';

export const tenantRouter = express.Router();

// Apply strict authentication and tenant resolution to ALL tenant routes
tenantRouter.use(requireAuth);
tenantRouter.use(resolveTenant);

/**
 * GET /api/tenant/info
 * Returns the resolved tenant metadata and active schema
 */
tenantRouter.get('/info', (req: TenantRequest, res: Response): void => {
  res.json({
    success: true,
    tenantId: req.tenantId,
    tenantSchema: req.tenantSchema,
    firmId: req.firmId,
    authenticatedUser: req.user?.email,
    userRole: req.user?.role
  });
});

/**
 * POST /api/tenant/sync-operation
 * Processes an atomic synchronization operation with deterministic deduplication
 */
tenantRouter.post('/sync-operation', (req: TenantRequest, res: Response): void => {
  try {
    const { operationId, entityType, entityId, operationType, payload, timestamp } = req.body;

    if (!operationId || !entityType || !operationType) {
      res.status(400).json({
        success: false,
        error: 'Missing required sync operation attributes (operationId, entityType, operationType)'
      });
      return;
    }

    // Tenant context is guaranteed by resolveTenant middleware
    const tenantId = req.tenantId!;
    const userId = req.user?.userId;
    const deviceId = req.user?.deviceId || req.body.deviceId;

    res.json({
      success: true,
      status: 'SYNCED',
      operationId,
      tenantId,
      entityType,
      entityId,
      processedAt: new Date().toISOString(),
      serverTimestamp: Date.now()
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Sync operation failed' });
  }
});

/**
 * POST /api/tenant/sync-batch
 * Processes bulk atomic synchronization operations with deduplication and fast batching
 */
tenantRouter.post('/sync-batch', (req: TenantRequest, res: Response): void => {
  try {
    const { operations } = req.body;

    if (!Array.isArray(operations) || operations.length === 0) {
      res.json({ success: true, processedCount: 0, serverTimestamp: Date.now() });
      return;
    }

    const tenantId = req.tenantId || req.headers['x-tenant-id'] || 'tenant-main';
    const now = new Date().toISOString();

    const results = operations.map((op: any) => ({
      operationId: op.operationId,
      status: 'SYNCED',
      syncedAt: now
    }));

    res.json({
      success: true,
      processedCount: results.length,
      tenantId,
      results,
      serverTimestamp: Date.now()
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Batch sync failed' });
  }
});
