import { Router, Request, Response } from 'express';
import { verifyJwt, UserJwtPayload } from '../auth/jwt';
import { 
  handleBatchSyncController, 
  handleSyncRecordController, 
  handleGetSyncSnapshotController, 
  handlePostSyncSnapshotController 
} from '../controllers/syncController';

export const syncRouter = Router();

/**
 * Snapshot & Single-Record Sync Endpoints for MariaDB & Multi-device Live Sync
 */
syncRouter.get('/', handleGetSyncSnapshotController);
syncRouter.post('/', handlePostSyncSnapshotController);
syncRouter.post('/record', handleSyncRecordController);


interface SseClient {
  id: string;
  tenantId: string;
  res: Response;
  connectedAt: string;
}

// Active SSE client pool partitioned by tenant_id
const tenantClients = new Map<string, Set<SseClient>>();

/**
 * Broadcast an event to all active SSE subscribers belonging to a specific tenant.
 */
export function broadcastTenantEvent(
  tenantId: string, 
  event: { type: string; entity?: string; payload?: any; timestamp?: string }
) {
  if (!tenantId) return;
  const clients = tenantClients.get(tenantId);
  if (!clients || clients.size === 0) return;

  const payload = {
    ...event,
    timestamp: event.timestamp || new Date().toISOString()
  };

  const sseData = `event: message\ndata: ${JSON.stringify(payload)}\n\n`;

  for (const client of clients) {
    try {
      client.res.write(sseData);
    } catch (err) {
      console.warn(`[SSE BROADCAST ERROR] Failed for client ${client.id}:`, err);
      clients.delete(client);
    }
  }
}

/**
 * Broadcast an event to ALL active SSE subscribers across all tenants (Master Global Broadcast).
 */
export function broadcastGlobalEvent(event: { type: string; entity?: string; payload?: any; timestamp?: string }) {
  const payload = {
    ...event,
    timestamp: event.timestamp || new Date().toISOString()
  };
  const sseData = `event: message\ndata: ${JSON.stringify(payload)}\n\n`;

  for (const [, clients] of tenantClients.entries()) {
    for (const client of clients) {
      try {
        client.res.write(sseData);
      } catch (err) {
        clients.delete(client);
      }
    }
  }
}

/**
 * Server-Sent Events channel: GET /api/sync/events
 */
syncRouter.get('/events', (req: Request, res: Response) => {
  // Extract tenantId from token or query
  let tenantId = (req.query.tenantId as string) || (req.query.tenant as string) || '';
  const token = (req.query.token as string) || req.headers.authorization?.replace('Bearer ', '');

  if (token) {
    const verified = verifyJwt<UserJwtPayload>(token);
    if (verified.valid && verified.payload && verified.payload.tenantId) {
      tenantId = verified.payload.tenantId;
    }
  }

  if (!tenantId) {
    tenantId = 'default_tenant';
  }

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const client: SseClient = {
    id: clientId,
    tenantId,
    res,
    connectedAt: new Date().toISOString()
  };

  if (!tenantClients.has(tenantId)) {
    tenantClients.set(tenantId, new Set());
  }
  tenantClients.get(tenantId)!.add(client);

  // Send initial connection handshake event
  res.write(`event: connected\ndata: ${JSON.stringify({ 
    clientId, 
    tenantId, 
    status: 'connected', 
    timestamp: new Date().toISOString() 
  })}\n\n`);

  // Send periodic keep-alive heartbeat every 20 seconds
  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat ${Date.now()}\n\n`);
    } catch (e) {
      clearInterval(heartbeat);
    }
  }, 20000);

  // Handle client disconnection
  req.on('close', () => {
    clearInterval(heartbeat);
    const pool = tenantClients.get(tenantId);
    if (pool) {
      pool.delete(client);
      if (pool.size === 0) {
        tenantClients.delete(tenantId);
      }
    }
  });
});

/**
 * Diagnostics endpoint: GET /api/sync/pool-stats
 */
syncRouter.get('/pool-stats', (req: Request, res: Response) => {
  const stats: Record<string, number> = {};
  let totalConnections = 0;

  for (const [tId, clients] of tenantClients.entries()) {
    stats[tId] = clients.size;
    totalConnections += clients.size;
  }

  res.json({
    success: true,
    totalConnections,
    tenantsCount: tenantClients.size,
    tenants: stats,
    timestamp: new Date().toISOString()
  });
});

/**
 * Batch Sync Ingestion: POST /api/sync/batch
 * Handles chunked outbox sync requests (up to 200 items per chunk) with atomic delta stock updates.
 */
syncRouter.post('/batch', handleBatchSyncController);

/**
 * Trigger Global Sync to all connected instances: POST /api/sync/trigger-all
 */
syncRouter.post('/trigger-all', (req: Request, res: Response) => {
  try {
    const { source = 'Master Server', reason = 'Admin Global Sync Pulse' } = req.body;
    broadcastGlobalEvent({
      type: 'GLOBAL_SYNC_TRIGGER',
      payload: { source, reason, timestamp: new Date().toISOString() }
    });
    res.json({
      success: true,
      message: 'Global sync pulse dispatched to all connected clients',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Error triggering sync' });
  }
});

/**
 * Trigger Tenant-specific Sync: POST /api/sync/trigger-tenant
 */
syncRouter.post('/trigger-tenant', (req: Request, res: Response) => {
  try {
    const { tenantId, source = 'Master Server' } = req.body;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'tenantId is required' });
      return;
    }
    broadcastTenantEvent(tenantId, {
      type: 'TENANT_SYNC_TRIGGER',
      payload: { tenantId, source, timestamp: new Date().toISOString() }
    });
    res.json({
      success: true,
      message: `Sync pulse dispatched to tenant ${tenantId}`,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Error triggering tenant sync' });
  }
});

/**
 * Simulate Real-Time Telemetry Event: POST /api/sync/simulate-event
 */
syncRouter.post('/simulate-event', (req: Request, res: Response) => {
  try {
    const { tenantId = 'tenant_001', type = 'BILLING', action = 'SALE_INVOICE_CREATED', user = 'Usman Cashier', amount = 1450 } = req.body;
    const eventPayload = {
      id: `evt_${Date.now()}`,
      tenantId,
      type,
      action,
      user,
      amount,
      timestamp: new Date().toISOString()
    };

    broadcastTenantEvent(tenantId, {
      type: 'TELEMETRY_EVENT',
      payload: eventPayload
    });

    broadcastGlobalEvent({
      type: 'GLOBAL_TELEMETRY_EVENT',
      payload: eventPayload
    });

    res.json({
      success: true,
      message: 'Simulated telemetry event broadcasted',
      event: eventPayload
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Error simulating event' });
  }
});

