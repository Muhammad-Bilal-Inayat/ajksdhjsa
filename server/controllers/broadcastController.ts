import { Request, Response } from 'express';
import { getMariaDbPool } from '../db/mariaClient';
import { broadcastTenantEvent } from '../routes/syncRoutes';
import { broadcastFleetActivity, broadcastAdminEvent } from '../routes/adminRoutes';
import fs from 'fs';
import path from 'path';

const syncFile = path.resolve(process.cwd(), '.sync_data.json');

export interface BroadcastReceipt {
  id: string;
  broadcastId: string;
  tenantId: string;
  storeName: string;
  ownerName: string;
  city: string;
  userId?: string;
  userName?: string;
  hwid: string;
  status: 'READ' | 'UNREAD';
  seenAt: string;
}

export interface BroadcastRecord {
  id: string;
  title: string;
  subtitle?: string;
  body: string;
  imageUrl?: string;
  type: 'info' | 'success' | 'urgent';
  priority?: 'feature_update' | 'special_offer' | 'critical_notice' | 'info' | 'success' | 'urgent';
  targetType: 'global' | 'store' | 'user' | 'plan';
  targetPlan?: string;
  targetStoreId?: string;
  targetStoreName?: string;
  targetUserId?: string;
  targetUserName?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  author: string;
  dispatchedAt: string;
  deliveredCount: number;
  readCount: number;
  readPercentage: number;
  receipts?: BroadcastReceipt[];
}

/**
 * Helper to get local fallback sync data
 */
function getLocalData(): any {
  try {
    if (fs.existsSync(syncFile)) {
      return JSON.parse(fs.readFileSync(syncFile, 'utf-8'));
    }
  } catch (e) {}
  return {};
}

function saveLocalData(data: any) {
  try {
    fs.writeFileSync(syncFile, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[Broadcast Controller] Failed to write local fallback data:', e);
  }
}

/**
 * Initialize notification tables in MariaDB
 */
async function initTablesIfNecessary() {
  try {
    const pool = getMariaDbPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mbi_notifications (
        id VARCHAR(64) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        subtitle VARCHAR(255),
        body TEXT NOT NULL,
        image_url TEXT,
        type VARCHAR(32) NOT NULL DEFAULT 'info',
        priority VARCHAR(32) NOT NULL DEFAULT 'feature_update',
        target_type VARCHAR(32) NOT NULL DEFAULT 'global',
        target_plan VARCHAR(64),
        target_store_id VARCHAR(64),
        target_store_name VARCHAR(255),
        target_user_id VARCHAR(64),
        target_user_name VARCHAR(255),
        cta_label VARCHAR(128),
        cta_url VARCHAR(512),
        author VARCHAR(128) NOT NULL DEFAULT 'Super Admin',
        dispatched_at DATETIME NOT NULL,
        delivered_count INT NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `).catch(() => {});

    // Ensure image_url column exists if table was already created earlier
    await pool.query(`
      ALTER TABLE mbi_notifications ADD COLUMN IF NOT EXISTS image_url TEXT;
    `).catch(() => {});

    await pool.query(`
      CREATE TABLE IF NOT EXISTS mbi_notification_receipts (
        id VARCHAR(64) PRIMARY KEY,
        notification_id VARCHAR(64) NOT NULL,
        tenant_id VARCHAR(64) NOT NULL,
        store_name VARCHAR(255),
        owner_name VARCHAR(255),
        city VARCHAR(128),
        user_id VARCHAR(64),
        user_name VARCHAR(255),
        hwid VARCHAR(128),
        seen_at DATETIME NOT NULL,
        CONSTRAINT uq_notif_receipt UNIQUE (notification_id, tenant_id, hwid)
      );
    `).catch(() => {});

    // Clean up any internal permission records from public notifications
    await pool.query(`
      DELETE FROM mbi_notifications 
      WHERE id LIKE 'perm_%' 
         OR id LIKE 'security_%' 
         OR id LIKE 'toggle_%' 
         OR type = 'permission_update' 
         OR title LIKE '%Security & Access Permissions%'
         OR title LIKE '%Permissions Updated%';
    `).catch(() => {});
  } catch (err) {}
}

initTablesIfNecessary().catch(() => {});

/**
 * GET /api/admin/broadcasts/history & /api/admin/broadcast/history
 * Fetch broadcast history with aggregated read metrics
 */
export async function getBroadcastHistoryController(req: Request, res: Response): Promise<void> {
  try {
    const fallback = getLocalData();
    let broadcasts: BroadcastRecord[] = [];
    let receipts: BroadcastReceipt[] = fallback.broadcast_receipts || [];

    try {
      const pool = getMariaDbPool();
      const rows: any = await pool.query(
        `SELECT * FROM mbi_notifications 
         WHERE id NOT LIKE 'perm_%' 
           AND id NOT LIKE 'security_%' 
           AND id NOT LIKE 'toggle_%' 
           AND (type IS NULL OR type != 'permission_update')
           AND title NOT LIKE '%Security & Access Permissions%'
           AND title NOT LIKE '%Permissions Updated%'
         ORDER BY dispatched_at DESC LIMIT 100;`
      );

      if (Array.isArray(rows) && rows.length > 0) {
        const rcptRows: any = await pool.query(
          'SELECT * FROM mbi_notification_receipts ORDER BY seen_at DESC LIMIT 500;'
        ).catch(() => []);

        const dbReceipts: BroadcastReceipt[] = Array.isArray(rcptRows) ? rcptRows.map((r: any) => ({
          id: r.id,
          broadcastId: r.notification_id,
          tenantId: r.tenant_id,
          storeName: r.store_name || 'Store',
          ownerName: r.owner_name || 'Owner',
          city: r.city || 'Pakistan',
          userId: r.user_id,
          userName: r.user_name,
          hwid: r.hwid || 'DEV-HWID',
          status: 'READ',
          seenAt: r.seen_at ? new Date(r.seen_at).toISOString() : new Date().toISOString()
        })) : [];

        receipts = [...dbReceipts, ...receipts];

        broadcasts = rows.map((r: any) => {
          const matchingReceipts = receipts.filter(rc => rc.broadcastId === r.id);
          const readCount = matchingReceipts.length;
          const deliveredCount = r.delivered_count || Math.max(1, readCount + 3);
          const readPercentage = deliveredCount > 0 ? Math.min(100, Math.round((readCount / deliveredCount) * 100)) : 0;

          return {
            id: r.id,
            title: r.title,
            subtitle: r.subtitle,
            body: r.body,
            imageUrl: r.image_url || r.imageUrl || undefined,
            type: r.type || 'info',
            priority: r.priority || 'feature_update',
            targetType: r.target_type || 'global',
            targetPlan: r.target_plan,
            targetStoreId: r.target_store_id,
            targetStoreName: r.target_store_name,
            targetUserId: r.target_user_id,
            targetUserName: r.target_user_name,
            ctaLabel: r.cta_label,
            ctaUrl: r.cta_url,
            author: r.author || 'Super Admin',
            dispatchedAt: r.dispatched_at ? new Date(r.dispatched_at).toISOString() : new Date().toISOString(),
            deliveredCount,
            readCount,
            readPercentage,
            receipts: matchingReceipts
          };
        });
      }
    } catch (dbErr) {}

    // Fallback if empty
    if (broadcasts.length === 0) {
      const localBc: BroadcastRecord[] = fallback.broadcasts || [
        {
          id: 'bc_init_1',
          title: '🎉 MBI INVENTRA v4.2.2 Released',
          subtitle: 'High Performance POS & Offline Telemetry',
          body: '**What\'s New in this Release:**\n- ⚡ **0.2s POS Engine**: Instant barcode detection & sub-second cash billing\n- 🔄 **Zero-Conflict Bulk Sync**: Reliable offline queue syncing for weak connections\n- 🛡️ **Multi-Role Security**: Primary Admin exclusive backup & staff permissions\n\n*No app restart required. Enjoy seamless automated updates!*',
          imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
          type: 'success',
          priority: 'feature_update',
          targetType: 'global',
          ctaLabel: 'Explore New Features',
          ctaUrl: '/utilities',
          dispatchedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
          author: 'Super Admin',
          deliveredCount: 48,
          readCount: 42,
          readPercentage: 88,
          receipts: [
            {
              id: 'rc_1',
              broadcastId: 'bc_init_1',
              tenantId: 'tenant_alshifa',
              storeName: 'Al-Shifa Medicine Hub',
              ownerName: 'Dr. Tariq Mahmood',
              city: 'Lahore',
              hwid: 'HWID-PK-9821-X',
              status: 'READ',
              seenAt: new Date(Date.now() - 3600000 * 22).toISOString()
            },
            {
              id: 'rc_2',
              broadcastId: 'bc_init_1',
              tenantId: 'tenant_main',
              storeName: 'Central Inventra Pharmacy',
              ownerName: 'Hassan Raza',
              city: 'Karachi',
              hwid: 'HWID-PK-1044-B',
              status: 'READ',
              seenAt: new Date(Date.now() - 3600000 * 20).toISOString()
            }
          ]
        }
      ];
      broadcasts = localBc;
    }

    res.json({
      success: true,
      broadcasts
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch broadcast history' });
  }
}

/**
 * POST /api/admin/broadcast
 * Create and dispatch a new broadcast announcement via SSE & MariaDB
 */
export async function dispatchBroadcastController(req: Request, res: Response): Promise<void> {
  try {
    const {
      title,
      subtitle,
      body,
      imageUrl,
      type = 'info',
      priority = 'feature_update',
      targetType = 'global',
      targetPlan,
      targetStoreId,
      targetStoreName,
      targetUserId,
      targetUserName,
      ctaLabel,
      ctaUrl,
      author = 'Super Admin'
    } = req.body || {};

    if (!title || !body) {
      res.status(400).json({ success: false, error: 'Title and body are required' });
      return;
    }

    // Determine deliveredCount estimate based on target
    const fallback = getLocalData();
    const allTenants = fallback.tenants || [];
    let deliveredCount = Math.max(1, allTenants.length || 15);
    if (targetType === 'store') deliveredCount = 1;
    if (targetType === 'user') deliveredCount = 1;

    const broadcastRecord: BroadcastRecord = {
      id: `bc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: String(title).trim(),
      subtitle: subtitle ? String(subtitle).trim() : undefined,
      body: String(body).trim(),
      imageUrl: imageUrl ? String(imageUrl).trim() : undefined,
      type: ['info', 'success', 'urgent'].includes(type) ? type : 'info',
      priority: ['feature_update', 'special_offer', 'critical_notice', 'info', 'success', 'urgent'].includes(priority) ? priority : 'feature_update',
      targetType: ['global', 'store', 'user', 'plan'].includes(targetType) ? targetType : 'global',
      targetPlan: targetPlan || undefined,
      targetStoreId: targetStoreId || undefined,
      targetStoreName: targetStoreName || undefined,
      targetUserId: targetUserId || undefined,
      targetUserName: targetUserName || undefined,
      ctaLabel: ctaLabel ? String(ctaLabel).trim() : undefined,
      ctaUrl: ctaUrl ? String(ctaUrl).trim() : undefined,
      dispatchedAt: new Date().toISOString(),
      author: String(author || 'Super Admin'),
      deliveredCount,
      readCount: 0,
      readPercentage: 0,
      receipts: []
    };

    // 1. Save to MariaDB
    try {
      const pool = getMariaDbPool();
      await pool.query(
        `INSERT INTO mbi_notifications (
          id, title, subtitle, body, image_url, type, priority, target_type, target_plan, 
          target_store_id, target_store_name, target_user_id, target_user_name, 
          cta_label, cta_url, author, dispatched_at, delivered_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE title = VALUES(title), image_url = VALUES(image_url);`,
        [
          broadcastRecord.id,
          broadcastRecord.title,
          broadcastRecord.subtitle || null,
          broadcastRecord.body,
          broadcastRecord.imageUrl || null,
          broadcastRecord.type,
          broadcastRecord.priority,
          broadcastRecord.targetType,
          broadcastRecord.targetPlan || null,
          broadcastRecord.targetStoreId || null,
          broadcastRecord.targetStoreName || null,
          broadcastRecord.targetUserId || null,
          broadcastRecord.targetUserName || null,
          broadcastRecord.ctaLabel || null,
          broadcastRecord.ctaUrl || null,
          broadcastRecord.author,
          broadcastRecord.dispatchedAt,
          broadcastRecord.deliveredCount
        ]
      ).catch(() => {});
    } catch (dbErr) {}

    // 2. Save to local fallback cache
    if (!fallback.broadcasts) fallback.broadcasts = [];
    fallback.broadcasts.unshift(broadcastRecord);
    if (fallback.broadcasts.length > 100) fallback.broadcasts = fallback.broadcasts.slice(0, 100);
    saveLocalData(fallback);

    // 3. Emit SSE Event to target channels
    const targetChannel = targetType === 'store' && targetStoreId ? targetStoreId : 'global';
    try {
      broadcastTenantEvent(targetChannel, {
        type: 'NEW_BROADCAST_ANNOUNCEMENT',
        entity: 'broadcast',
        payload: broadcastRecord
      });
    } catch (sseErr) {}

    // 4. Record Fleet Activity Stream
    try {
      broadcastFleetActivity({
        id: `act_${Date.now()}`,
        tenantId: targetStoreId || 'global',
        storeName: targetStoreName || (targetType === 'global' ? 'Global Fleet (All Stores)' : targetType.toUpperCase()),
        city: 'System',
        userName: 'Super Admin',
        userRole: 'Master Cloud',
        actionType: 'SYSTEM',
        actionDetails: `📢 Dispatched Broadcast Announcement: "${broadcastRecord.title}" [${(broadcastRecord.priority || broadcastRecord.type).toUpperCase()}]`,
        ipAddress: req.ip || '127.0.0.1',
        deviceInfo: 'Master Broadcast Hub',
        timestamp: new Date().toISOString(),
        relativeTime: 'Just now'
      });
    } catch (e) {}

    res.json({
      success: true,
      message: 'Broadcast announcement dispatched live successfully!',
      broadcast: broadcastRecord
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to dispatch broadcast' });
  }
}

/**
 * POST /api/notifications/:id/mark-seen & /api/admin/broadcasts/:id/seen
 * Client calls this on modal open or dismiss to record read receipt
 */
export async function markBroadcastSeenController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const {
      tenantId = 'unknown_tenant',
      storeName = 'Store Terminal',
      ownerName = 'Store Owner',
      city = 'Pakistan',
      userId,
      userName,
      hwid = 'HWID-CLIENT-DEFAULT'
    } = req.body || {};

    const receiptId = `rc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const seenAt = new Date().toISOString();

    const receipt: BroadcastReceipt = {
      id: receiptId,
      broadcastId: id,
      tenantId,
      storeName,
      ownerName,
      city,
      userId,
      userName,
      hwid,
      status: 'READ',
      seenAt
    };

    // 1. Save to MariaDB
    try {
      const pool = getMariaDbPool();
      await pool.query(
        `INSERT INTO mbi_notification_receipts (
          id, notification_id, tenant_id, store_name, owner_name, city, user_id, user_name, hwid, seen_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE seen_at = VALUES(seen_at);`,
        [receiptId, id, tenantId, storeName, ownerName, city, userId || null, userName || null, hwid, seenAt]
      ).catch(() => {});
    } catch (dbErr) {}

    // 2. Save to local fallback cache
    const fallback = getLocalData();
    if (!fallback.broadcast_receipts) fallback.broadcast_receipts = [];
    const existingIdx = fallback.broadcast_receipts.findIndex(
      (r: any) => r.broadcastId === id && r.tenantId === tenantId && r.hwid === hwid
    );
    if (existingIdx >= 0) {
      fallback.broadcast_receipts[existingIdx].seenAt = seenAt;
    } else {
      fallback.broadcast_receipts.unshift(receipt);
    }
    saveLocalData(fallback);

    // 3. Broadcast real-time read receipt to Master Command Center
    try {
      broadcastAdminEvent({
        type: 'BROADCAST_RECEIPT_RECEIVED',
        broadcastId: id,
        receipt,
        timestamp: seenAt
      });
    } catch (e) {}

    res.json({
      success: true,
      message: 'Read receipt recorded successfully',
      receipt
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to record read receipt' });
  }
}

/**
 * GET /api/admin/broadcasts/:id/receipts
 * Fetch specific read receipts for a broadcast
 */
export async function getBroadcastReceiptsController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const fallback = getLocalData();
    let receipts: BroadcastReceipt[] = (fallback.broadcast_receipts || []).filter(
      (r: any) => r.broadcastId === id
    );

    try {
      const pool = getMariaDbPool();
      const rows: any = await pool.query(
        'SELECT * FROM mbi_notification_receipts WHERE notification_id = ? ORDER BY seen_at DESC;',
        [id]
      );
      if (Array.isArray(rows) && rows.length > 0) {
        receipts = rows.map((r: any) => ({
          id: r.id,
          broadcastId: r.notification_id,
          tenantId: r.tenant_id,
          storeName: r.store_name || 'Store',
          ownerName: r.owner_name || 'Owner',
          city: r.city || 'Pakistan',
          userId: r.user_id,
          userName: r.user_name,
          hwid: r.hwid || 'DEV-HWID',
          status: 'READ',
          seenAt: r.seen_at ? new Date(r.seen_at).toISOString() : new Date().toISOString()
        }));
      }
    } catch (dbErr) {}

    res.json({
      success: true,
      broadcastId: id,
      receipts,
      totalReadCount: receipts.length
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch receipts' });
  }
}

/**
 * POST /api/admin/broadcast/:id/resend
 * Resend a past broadcast announcement
 */
export async function resendBroadcastController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const fallback = getLocalData();
    let broadcast = (fallback.broadcasts || []).find((b: any) => b.id === id);

    if (!broadcast) {
      try {
        const pool = getMariaDbPool();
        const rows: any = await pool.query('SELECT * FROM mbi_notifications WHERE id = ?;', [id]);
        if (Array.isArray(rows) && rows.length > 0) {
          const r = rows[0];
          broadcast = {
            id: r.id,
            title: r.title,
            subtitle: r.subtitle,
            body: r.body,
            imageUrl: r.image_url || r.imageUrl || undefined,
            type: r.type,
            priority: r.priority,
            targetType: r.target_type,
            targetPlan: r.target_plan,
            targetStoreId: r.target_store_id,
            targetStoreName: r.target_store_name,
            targetUserId: r.target_user_id,
            targetUserName: r.target_user_name,
            ctaLabel: r.cta_label,
            ctaUrl: r.cta_url,
            author: r.author,
            dispatchedAt: new Date().toISOString(),
            deliveredCount: r.delivered_count || 10,
            readCount: 0,
            readPercentage: 0
          };
        }
      } catch (dbErr) {}
    }

    if (!broadcast) {
      res.status(404).json({ success: false, error: 'Broadcast not found' });
      return;
    }

    broadcast.dispatchedAt = new Date().toISOString();

    const targetChannel = broadcast.targetType === 'store' && broadcast.targetStoreId ? broadcast.targetStoreId : 'global';
    try {
      broadcastTenantEvent(targetChannel, {
        type: 'NEW_BROADCAST_ANNOUNCEMENT',
        entity: 'broadcast',
        payload: broadcast
      });
    } catch (e) {}

    res.json({
      success: true,
      message: `Broadcast "${broadcast.title}" re-dispatched successfully!`,
      broadcast
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to resend broadcast' });
  }
}

/**
 * DELETE /api/admin/broadcast/:id
 */
export async function deleteBroadcastController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    try {
      const pool = getMariaDbPool();
      await pool.query('DELETE FROM mbi_notifications WHERE id = ?;', [id]).catch(() => {});
      await pool.query('DELETE FROM mbi_notification_receipts WHERE notification_id = ?;', [id]).catch(() => {});
    } catch (dbErr) {}

    const fallback = getLocalData();
    if (fallback.broadcasts) {
      fallback.broadcasts = fallback.broadcasts.filter((b: any) => b.id !== id);
    }
    if (fallback.broadcast_receipts) {
      fallback.broadcast_receipts = fallback.broadcast_receipts.filter((r: any) => r.broadcastId !== id);
    }
    saveLocalData(fallback);

    res.json({ success: true, message: 'Broadcast deleted from history' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to delete broadcast' });
  }
}
