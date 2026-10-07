import { Request, Response } from 'express';
import { getMasterVault } from '../db/sqliteVaultManager';
import { getMariaDbPool } from '../db/mariaClient';
import { broadcastTenantEvent, broadcastGlobalEvent } from '../routes/syncRoutes';
import { broadcastFleetActivity, broadcastAdminEvent } from '../routes/adminRoutes';
import { sendCustomTenantEmail } from '../services/emailService';
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
 * GET /api/admin/broadcasts/history & /api/admin/broadcast/history
 * Fetch broadcast history with aggregated read metrics
 */
export async function getBroadcastHistoryController(req: Request, res: Response): Promise<void> {
  try {
    const fallback = getLocalData();
    let broadcasts: BroadcastRecord[] = [];
    let receipts: BroadcastReceipt[] = fallback.broadcast_receipts || [];

    // 1. Primary Engine: Native SQLite Master Vault
    try {
      const masterDb = getMasterVault();
      const rows: any[] = masterDb.prepare(`
        SELECT * FROM mbi_notifications 
        WHERE id NOT LIKE 'perm_%' 
          AND id NOT LIKE 'security_%' 
          AND id NOT LIKE 'toggle_%' 
          AND (type IS NULL OR type != 'permission_update')
          AND title NOT LIKE '%Security & Access Permissions%'
          AND title NOT LIKE '%Permissions Updated%'
        ORDER BY dispatched_at DESC LIMIT 100;
      `).all();

      const rcptRows: any[] = masterDb.prepare(`
        SELECT * FROM mbi_notification_receipts ORDER BY seen_at DESC LIMIT 500;
      `).all();

      if (Array.isArray(rcptRows)) {
        const sqliteReceipts: BroadcastReceipt[] = rcptRows.map((r: any) => ({
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
          seenAt: r.seen_at || new Date().toISOString()
        }));
        receipts = [...sqliteReceipts, ...receipts];
      }

      if (Array.isArray(rows) && rows.length > 0) {
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
            dispatchedAt: r.dispatched_at || new Date().toISOString(),
            deliveredCount,
            readCount,
            readPercentage,
            receipts: matchingReceipts
          };
        });
      }
    } catch (sqliteErr) {}

    // 2. Secondary fallback if SQLite had no records
    if (broadcasts.length === 0) {
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
    }

    // 3. Fallback if still empty
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
          receipts: []
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
 * Create and dispatch a new broadcast announcement via SSE & SQLite Master Vault
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

    // 1. Primary Engine: Save to SQLite Master Vault
    try {
      const masterDb = getMasterVault();
      masterDb.prepare(`
        INSERT INTO mbi_notifications (
          id, title, subtitle, body, image_url, type, priority, target_type, target_plan, 
          target_store_id, target_store_name, target_user_id, target_user_name, 
          cta_label, cta_url, author, dispatched_at, delivered_count, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET title = excluded.title, image_url = excluded.image_url;
      `).run(
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
      );
    } catch (sqliteErr) {
      console.warn('[SQLite Vault notification save warning]:', sqliteErr);
    }

    // 2. Save to local fallback cache
    if (!fallback.broadcasts) fallback.broadcasts = [];
    fallback.broadcasts.unshift(broadcastRecord);
    if (fallback.broadcasts.length > 100) fallback.broadcasts = fallback.broadcasts.slice(0, 100);
    saveLocalData(fallback);

    // 3. Emit SSE Event to target channels (Global or Specific Tenant)
    try {
      if (targetType === 'store' && targetStoreId) {
        broadcastTenantEvent(targetStoreId, {
          type: 'NEW_BROADCAST_ANNOUNCEMENT',
          entity: 'broadcast',
          payload: broadcastRecord
        });
      } else {
        broadcastGlobalEvent({
          type: 'NEW_BROADCAST_ANNOUNCEMENT',
          entity: 'broadcast',
          payload: broadcastRecord
        });
      }
    } catch (sseErr) {
      console.warn('[SSE Broadcast Error]:', sseErr);
    }

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

    // 5. Automated Plan-Wise & Tenant Email Dispatch (Strictly excluding /server internal master routes)
    try {
      let recipientEmails: string[] = [];
      const masterDb = getMasterVault();

      if (targetType === 'plan' && targetPlan) {
        // Query active tenants matching target plan
        const rows: any[] = masterDb.prepare(`
          SELECT owner_email FROM mbi_tenants 
          WHERE LOWER(plan) = LOWER(?) AND status = 'Active' AND owner_email IS NOT NULL AND owner_email != ''
        `).all(targetPlan);
        recipientEmails = rows.map((r: any) => r.owner_email).filter((e: string) => e && e.includes('@'));

        if (recipientEmails.length === 0) {
          const tenants = fallback.tenants || [];
          recipientEmails = tenants
            .filter((t: any) => (t.plan || '').toLowerCase() === targetPlan.toLowerCase() && t.ownerEmail)
            .map((t: any) => t.ownerEmail);
        }
      } else if (targetType === 'store' && targetStoreId) {
        // Specific store
        const tenantRow: any = masterDb.prepare(`
          SELECT owner_email FROM mbi_tenants WHERE id = ? OR tenant_id = ?
        `).get(targetStoreId, targetStoreId);
        if (tenantRow?.owner_email && tenantRow.owner_email.includes('@')) {
          recipientEmails = [tenantRow.owner_email];
        }
        if (recipientEmails.length === 0) {
          const tenants = fallback.tenants || [];
          const t = tenants.find((x: any) => x.id === targetStoreId || x.tenant_id === targetStoreId);
          if (t?.ownerEmail) recipientEmails = [t.ownerEmail];
        }
      } else if (targetType === 'user' && targetUserId) {
        const userRow: any = masterDb.prepare(`
          SELECT email FROM mbi_users WHERE id = ?
        `).get(targetUserId);
        if (userRow?.email && userRow.email.includes('@')) {
          recipientEmails = [userRow.email];
        }
      } else {
        // Global tenant update: send to all active stores (never internal /server admin)
        const rows: any[] = masterDb.prepare(`
          SELECT owner_email FROM mbi_tenants 
          WHERE status = 'Active' AND owner_email IS NOT NULL AND owner_email != ''
        `).all();
        const tenantEmails = rows.map((r: any) => r.owner_email).filter((e: string) => e && e.includes('@'));

        const fallbackTenants = fallback.tenants || [];
        const fallbackEmails = fallbackTenants
          .filter((t: any) => t.ownerEmail && t.ownerEmail.includes('@'))
          .map((t: any) => t.ownerEmail);

        recipientEmails = Array.from(new Set([...tenantEmails, ...fallbackEmails]));
      }

      // Sanitize and ensure no duplicates
      recipientEmails = Array.from(new Set(recipientEmails.filter(e => e && e.includes('@') && !e.toLowerCase().includes('master_internal'))));

      if (recipientEmails.length > 0) {
        const emailPriority = broadcastRecord.type === 'urgent' ? 'urgent' : (broadcastRecord.type === 'success' ? 'high' : 'normal');
        const planBadge = broadcastRecord.targetPlan ? `🎯 ${broadcastRecord.targetPlan.toUpperCase()} PLAN UPDATE` : '🚀 MBI INVENTRA UPDATE';

        sendCustomTenantEmail({
          toEmail: recipientEmails,
          subject: `📢 ${broadcastRecord.title}`,
          message: `${broadcastRecord.subtitle ? broadcastRecord.subtitle + '\n\n' : ''}${broadcastRecord.body}`,
          priority: emailPriority,
          badgeText: planBadge,
          actionButtonText: broadcastRecord.ctaLabel || 'Open MBI INVENTRA Portal',
          actionButtonUrl: broadcastRecord.ctaUrl ? (broadcastRecord.ctaUrl.startsWith('http') ? broadcastRecord.ctaUrl : `https://mbiinventra.com${broadcastRecord.ctaUrl}`) : 'https://mbiinventra.com'
        }).catch((err) => {
          console.warn('[Broadcast Email Dispatch Warning]:', err?.message || err);
        });
      }
    } catch (emailErr) {
      console.warn('[Broadcast Email Dispatch Failed]:', emailErr);
    }

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

    // 1. Save to SQLite Master Vault
    try {
      const masterDb = getMasterVault();
      masterDb.prepare(`
        INSERT INTO mbi_notification_receipts (
          id, notification_id, tenant_id, store_name, owner_name, city, user_id, user_name, hwid, seen_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(notification_id, tenant_id, hwid) DO UPDATE SET seen_at = excluded.seen_at;
      `).run(receiptId, id, tenantId, storeName, ownerName, city, userId || null, userName || null, hwid, seenAt);
    } catch (sqliteErr) {}

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
      const masterDb = getMasterVault();
      const rows: any[] = masterDb.prepare(`
        SELECT * FROM mbi_notification_receipts WHERE notification_id = ? ORDER BY seen_at DESC;
      `).all(id);
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
          seenAt: r.seen_at || new Date().toISOString()
        }));
      }
    } catch (sqliteErr) {}

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
        const masterDb = getMasterVault();
        const r: any = masterDb.prepare('SELECT * FROM mbi_notifications WHERE id = ?;').get(id);
        if (r) {
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
      } catch (sqliteErr) {}
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
      const masterDb = getMasterVault();
      masterDb.prepare('DELETE FROM mbi_notifications WHERE id = ?;').run(id);
      masterDb.prepare('DELETE FROM mbi_notification_receipts WHERE notification_id = ?;').run(id);
    } catch (sqliteErr) {}

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

/**
 * GET /api/homepage-popup & /api/master/homepage-popup
 * Fetch dedicated Home Page / Landing Page Popup configuration
 */
export async function getHomePagePopupController(req: Request, res: Response): Promise<void> {
  try {
    let popupConfig: any = null;

    // 1. Check SQLite Master Hub
    try {
      const masterDb = getMasterVault();
      const row: any = masterDb.prepare('SELECT * FROM mbi_homepage_popup ORDER BY updated_at DESC LIMIT 1;').get();
      if (row) {
        let featureTags = [];
        try {
          featureTags = row.feature_tags ? JSON.parse(row.feature_tags) : [];
        } catch (e) {}

        popupConfig = {
          id: row.id,
          enabled: Boolean(row.enabled),
          title: row.title,
          subtitle: row.subtitle || '',
          body: row.body,
          badgeText: row.badge_text || 'SPECIAL ANNOUNCEMENT',
          imageUrl: row.image_url || '',
          ctaLabel: row.cta_label || 'Claim 10-Day Free Trial',
          ctaUrl: row.cta_url || '/register',
          ctaStyle: row.cta_style || 'gradient_indigo',
          secondaryCtaLabel: row.secondary_cta_label || 'Maybe Later',
          secondaryCtaUrl: row.secondary_cta_url || '',
          secondaryCtaType: row.secondary_cta_type || 'dismiss',
          themePreset: row.theme_preset || 'electric_indigo',
          gradientFrom: row.gradient_from || '#4338ca',
          gradientTo: row.gradient_to || '#7e22ce',
          badgeColor: row.badge_color || '#fbbf24',
          showCountdown: Boolean(row.show_countdown),
          countdownLabel: row.countdown_label || '⚡ FLASH SALE ENDS IN:',
          countdownTarget: row.countdown_target || '',
          featureTags: Array.isArray(featureTags) && featureTags.length > 0 ? featureTags : [
            '100% Free Full Access',
            '0ms Offline POS Sync',
            'No Card Required',
            'Thermal & A4 Print'
          ],
          animationStyle: row.animation_style || 'zoom_bounce',
          frequency: row.frequency || 'every_visit',
          autoDismissSeconds: Number(row.auto_dismiss_seconds) || 0,
          soundEffect: Boolean(row.sound_effect),
          type: row.type || 'special_offer',
          autoShowDelayMs: Number(row.auto_show_delay_ms) || 1200,
          updatedAt: row.updated_at
        };
      }
    } catch (e) {}

    // 2. Fallback to local sync data
    if (!popupConfig) {
      const fallback = getLocalData();
      if (fallback.homepage_popup) {
        popupConfig = fallback.homepage_popup;
      }
    }

    // Default configuration if none set yet
    if (!popupConfig) {
      popupConfig = {
        id: 'hp_default_notice',
        enabled: true,
        title: 'Welcome to MBI INVENTRA Cloud POS',
        subtitle: 'Experience 0ms Ultra-Fast Pharmacy Billing & Management',
        body: 'Start your 10-day full access free trial with automated FEFO batching, thermal printing, and 100% offline desktop sync mode.',
        badgeText: 'FREE 10-DAY TRIAL',
        imageUrl: '',
        ctaLabel: 'Claim 10-Day Free Trial',
        ctaUrl: '/register',
        ctaStyle: 'gradient_indigo',
        secondaryCtaLabel: 'Maybe Later',
        secondaryCtaUrl: '',
        secondaryCtaType: 'dismiss',
        themePreset: 'electric_indigo',
        gradientFrom: '#4338ca',
        gradientTo: '#7e22ce',
        badgeColor: '#fbbf24',
        showCountdown: false,
        countdownLabel: '⚡ FLASH SALE ENDS IN:',
        countdownTarget: '',
        featureTags: [
          '100% Free Full Access',
          '0ms Offline POS Sync',
          'No Card Required',
          'Thermal & A4 Print'
        ],
        animationStyle: 'zoom_bounce',
        frequency: 'every_visit',
        autoDismissSeconds: 0,
        soundEffect: false,
        type: 'special_offer',
        autoShowDelayMs: 1500,
        updatedAt: new Date().toISOString()
      };
    }

    res.json({
      success: true,
      popup: popupConfig
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch homepage popup' });
  }
}

/**
 * POST /api/master/homepage-popup & /api/admin/homepage-popup
 * Save / Update dedicated Home Page / Landing Page Popup configuration
 */
export async function saveHomePagePopupController(req: Request, res: Response): Promise<void> {
  try {
    const { 
      id,
      enabled = true, 
      title, 
      subtitle = '', 
      body, 
      badgeText = 'SPECIAL ANNOUNCEMENT',
      imageUrl = '', 
      ctaLabel = 'Get Started Now', 
      ctaUrl = '/register', 
      ctaStyle = 'gradient_indigo',
      secondaryCtaLabel = 'Maybe Later',
      secondaryCtaUrl = '',
      secondaryCtaType = 'dismiss',
      themePreset = 'electric_indigo',
      gradientFrom = '#4338ca',
      gradientTo = '#7e22ce',
      badgeColor = '#fbbf24',
      showCountdown = false,
      countdownLabel = '⚡ FLASH SALE ENDS IN:',
      countdownTarget = '',
      featureTags,
      animationStyle = 'zoom_bounce',
      frequency = 'every_visit',
      autoDismissSeconds = 0,
      soundEffect = false,
      type = 'special_offer',
      autoShowDelayMs = 1200
    } = req.body || {};

    if (!title || !body) {
      res.status(400).json({ success: false, error: 'Title and body are required for Home Page popup' });
      return;
    }

    const popupId = id || `hp_pop_${Date.now()}`;
    const cleanEnabled = enabled === true || enabled === 1 || enabled === 'true' ? 1 : 0;
    const updatedAt = new Date().toISOString();

    const cleanFeatureTags = Array.isArray(featureTags) ? featureTags : [
      '100% Free Full Access',
      '0ms Offline POS Sync',
      'No Card Required',
      'Thermal & A4 Print'
    ];

    const popupRecord = {
      id: popupId,
      enabled: Boolean(cleanEnabled),
      title: String(title).trim(),
      subtitle: String(subtitle || '').trim(),
      body: String(body).trim(),
      badgeText: String(badgeText || 'SPECIAL ANNOUNCEMENT').trim(),
      imageUrl: String(imageUrl || '').trim(),
      ctaLabel: String(ctaLabel || 'Get Started Now').trim(),
      ctaUrl: String(ctaUrl || '/register').trim(),
      ctaStyle: String(ctaStyle || 'gradient_indigo'),
      secondaryCtaLabel: String(secondaryCtaLabel || 'Maybe Later').trim(),
      secondaryCtaUrl: String(secondaryCtaUrl || '').trim(),
      secondaryCtaType: String(secondaryCtaType || 'dismiss'),
      themePreset: String(themePreset || 'electric_indigo'),
      gradientFrom: String(gradientFrom || '#4338ca'),
      gradientTo: String(gradientTo || '#7e22ce'),
      badgeColor: String(badgeColor || '#fbbf24'),
      showCountdown: Boolean(showCountdown),
      countdownLabel: String(countdownLabel || '⚡ FLASH SALE ENDS IN:').trim(),
      countdownTarget: String(countdownTarget || ''),
      featureTags: cleanFeatureTags,
      animationStyle: String(animationStyle || 'zoom_bounce'),
      frequency: String(frequency || 'every_visit'),
      autoDismissSeconds: Number(autoDismissSeconds) || 0,
      soundEffect: Boolean(soundEffect),
      type: String(type || 'special_offer'),
      autoShowDelayMs: Number(autoShowDelayMs) || 1200,
      updatedAt
    };

    // 1. Save to SQLite Master Vault
    try {
      const masterDb = getMasterVault();
      masterDb.prepare(`
        INSERT INTO mbi_homepage_popup (
          id, enabled, title, subtitle, body, badge_text, image_url, cta_label, cta_url, cta_style,
          secondary_cta_label, secondary_cta_url, secondary_cta_type, theme_preset, gradient_from,
          gradient_to, badge_color, show_countdown, countdown_label, countdown_target, feature_tags,
          animation_style, frequency, auto_dismiss_seconds, sound_effect, type, auto_show_delay_ms, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, datetime('now')
        )
        ON CONFLICT(id) DO UPDATE SET
          enabled = excluded.enabled,
          title = excluded.title,
          subtitle = excluded.subtitle,
          body = excluded.body,
          badge_text = excluded.badge_text,
          image_url = excluded.image_url,
          cta_label = excluded.cta_label,
          cta_url = excluded.cta_url,
          cta_style = excluded.cta_style,
          secondary_cta_label = excluded.secondary_cta_label,
          secondary_cta_url = excluded.secondary_cta_url,
          secondary_cta_type = excluded.secondary_cta_type,
          theme_preset = excluded.theme_preset,
          gradient_from = excluded.gradient_from,
          gradient_to = excluded.gradient_to,
          badge_color = excluded.badge_color,
          show_countdown = excluded.show_countdown,
          countdown_label = excluded.countdown_label,
          countdown_target = excluded.countdown_target,
          feature_tags = excluded.feature_tags,
          animation_style = excluded.animation_style,
          frequency = excluded.frequency,
          auto_dismiss_seconds = excluded.auto_dismiss_seconds,
          sound_effect = excluded.sound_effect,
          type = excluded.type,
          auto_show_delay_ms = excluded.auto_show_delay_ms,
          updated_at = datetime('now');
      `).run(
        popupRecord.id,
        cleanEnabled,
        popupRecord.title,
        popupRecord.subtitle,
        popupRecord.body,
        popupRecord.badgeText,
        popupRecord.imageUrl,
        popupRecord.ctaLabel,
        popupRecord.ctaUrl,
        popupRecord.ctaStyle,
        popupRecord.secondaryCtaLabel,
        popupRecord.secondaryCtaUrl,
        popupRecord.secondaryCtaType,
        popupRecord.themePreset,
        popupRecord.gradientFrom,
        popupRecord.gradientTo,
        popupRecord.badgeColor,
        popupRecord.showCountdown ? 1 : 0,
        popupRecord.countdownLabel,
        popupRecord.countdownTarget,
        JSON.stringify(popupRecord.featureTags),
        popupRecord.animationStyle,
        popupRecord.frequency,
        popupRecord.autoDismissSeconds,
        popupRecord.soundEffect ? 1 : 0,
        popupRecord.type,
        popupRecord.autoShowDelayMs
      );
    } catch (sqliteErr) {
      console.warn('[SQLite Vault save homepage popup warning]:', sqliteErr);
    }

    // 2. Save to local sync fallback
    const fallback = getLocalData();
    fallback.homepage_popup = popupRecord;
    saveLocalData(fallback);

    // 3. Broadcast real-time SSE update specifically for homepage listeners
    try {
      broadcastGlobalEvent({
        type: 'HOMEPAGE_POPUP_UPDATED',
        entity: 'homepage_popup',
        payload: popupRecord
      });
    } catch (e) {}

    res.json({
      success: true,
      message: 'Home Page Public Popup saved & published successfully!',
      popup: popupRecord
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to save homepage popup' });
  }
}
