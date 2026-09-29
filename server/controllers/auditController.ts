import { Request, Response } from 'express';
import { getMariaDbPool, isMariaDbAvailable } from '../db/mariaClient';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { broadcastTenantEvent } from '../routes/syncRoutes';

const syncFile = path.resolve(process.cwd(), '.sync_data.json');

interface AuditRecord {
  id: string;
  tenant_id: string;
  user_id?: string;
  user_name: string;
  user_role?: string;
  action: string;
  module: string;
  category?: string;
  details: string;
  impact_amount?: number;
  terminal_hwid?: string;
  ip_address?: string;
  created_at: string;
}

// In-memory / file fallback store for audit logs
function getFallbackAuditLogs(tenantId?: string): AuditRecord[] {
  let logs: AuditRecord[] = [];
  try {
    if (fs.existsSync(syncFile)) {
      const fileData = JSON.parse(fs.readFileSync(syncFile, 'utf-8'));
      if (Array.isArray(fileData.mbi_audit_logs)) {
        logs = fileData.mbi_audit_logs;
      }
    }
  } catch (e) {}

  if (tenantId && tenantId !== 'all') {
    return logs.filter(l => !l.tenant_id || l.tenant_id === tenantId || l.tenant_id === 'default');
  }
  return logs;
}

function saveFallbackAuditLog(log: AuditRecord): void {
  try {
    let data: any = {};
    if (fs.existsSync(syncFile)) {
      data = JSON.parse(fs.readFileSync(syncFile, 'utf-8'));
    }
    if (!Array.isArray(data.mbi_audit_logs)) {
      data.mbi_audit_logs = [];
    }
    data.mbi_audit_logs.unshift(log);
    // Keep max 5000 logs in local sync file
    if (data.mbi_audit_logs.length > 5000) {
      data.mbi_audit_logs = data.mbi_audit_logs.slice(0, 5000);
    }
    fs.writeFileSync(syncFile, JSON.stringify(data, null, 2));
  } catch (e) {
    console.warn('[Audit Log Local Fallback Save Warning]:', e);
  }
}

/**
 * GET /api/audit-logs
 * Retrieves immutable audit records with comprehensive filtering
 */
export async function getAuditLogs(req: Request, res: Response) {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || (req.query.tenantId as string) || 'tenant_main_pharmacy';
    const { module: moduleFilter, staff, dateRange, startDate, endDate, search, limit = '200' } = req.query;
    const maxRows = Math.min(Number(limit) || 200, 1000);

    const isAvailable = await isMariaDbAvailable();
    let records: AuditRecord[] = [];

    if (isAvailable) {
      try {
        const pool = getMariaDbPool();
        let sql = `SELECT * FROM mbi_audit_logs WHERE (tenant_id = ? OR tenant_id = 'default' OR tenant_id = 'tenant_main_pharmacy')`;
        const params: any[] = [tenantId];

        if (moduleFilter && moduleFilter !== 'ALL' && moduleFilter !== 'All Modules') {
          sql += ` AND (category = ? OR details LIKE ?)`;
          params.push(moduleFilter, `%${moduleFilter}%`);
        }

        if (staff && staff !== 'ALL' && staff !== 'All Staff') {
          sql += ` AND (user_name = ? OR user_id = ?)`;
          params.push(staff, staff);
        }

        if (search) {
          sql += ` AND (action LIKE ? OR details LIKE ? OR user_name LIKE ? OR id LIKE ?)`;
          const searchTerm = `%${search}%`;
          params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        sql += ` ORDER BY created_at DESC LIMIT ?`;
        params.push(maxRows);

        const [rows] = await pool.query(sql, params) as any[];
        if (Array.isArray(rows)) {
          records = rows.map((r: any) => ({
            id: r.id,
            tenant_id: r.tenant_id,
            user_id: r.user_id,
            user_name: r.user_name || 'Staff User',
            user_role: r.user_role || 'Staff',
            action: r.action,
            module: r.category || 'General',
            category: r.category || 'SECURITY',
            details: r.details || '',
            impact_amount: r.impact_amount ? Number(r.impact_amount) : undefined,
            terminal_hwid: r.terminal_hwid || r.ip_address || 'TERM-POS-01',
            ip_address: r.ip_address || '127.0.0.1',
            created_at: r.created_at || new Date().toISOString()
          }));
        }
      } catch (dbErr) {
        console.warn('[Audit DB Read Fallback]:', dbErr);
        records = getFallbackAuditLogs(tenantId);
      }
    } else {
      records = getFallbackAuditLogs(tenantId);
    }

    // Secondary client filters if needed
    if (search && !isAvailable) {
      const q = String(search).toLowerCase();
      records = records.filter(r => 
        (r.action && r.action.toLowerCase().includes(q)) ||
        (r.details && r.details.toLowerCase().includes(q)) ||
        (r.user_name && r.user_name.toLowerCase().includes(q)) ||
        (r.terminal_hwid && r.terminal_hwid.toLowerCase().includes(q))
      );
    }

    if (moduleFilter && moduleFilter !== 'ALL' && moduleFilter !== 'All Modules' && !isAvailable) {
      records = records.filter(r => 
        (r.module && r.module.toLowerCase() === String(moduleFilter).toLowerCase()) ||
        (r.category && r.category.toLowerCase() === String(moduleFilter).toLowerCase())
      );
    }

    if (staff && staff !== 'ALL' && staff !== 'All Staff' && !isAvailable) {
      records = records.filter(r => r.user_name === staff || r.user_id === staff);
    }

    return res.json({
      success: true,
      total: records.length,
      logs: records.slice(0, maxRows)
    });
  } catch (error: any) {
    console.error('[Get Audit Logs Error]:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Failed to retrieve audit logs' });
  }
}

/**
 * POST /api/audit-logs
 * Appends an immutable audit log record (Append-Only)
 */
export async function createAuditLog(req: Request, res: Response) {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || req.body.tenant_id || req.body.tenantId || 'tenant_main_pharmacy';
    const {
      user_id,
      userId,
      user_name,
      userName,
      user_role,
      userRole,
      action,
      module: logModule,
      category,
      details,
      impact_amount,
      impactAmount,
      terminal_hwid,
      terminalHwid,
      hwid,
      timestamp
    } = req.body;

    if (!action) {
      return res.status(400).json({ success: false, error: 'Action description is required' });
    }

    const logRecord: AuditRecord = {
      id: req.body.id || `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenant_id: tenantId,
      user_id: user_id || userId || 'usr_staff',
      user_name: user_name || userName || 'Staff User',
      user_role: user_role || userRole || 'Cashier',
      action: action,
      module: logModule || category || 'Sales',
      category: category || logModule || 'SECURITY',
      details: typeof details === 'object' ? JSON.stringify(details) : (details || ''),
      impact_amount: impact_amount || impactAmount ? Number(impact_amount || impactAmount) : undefined,
      terminal_hwid: terminal_hwid || terminalHwid || hwid || 'TERM-POS-01',
      ip_address: req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1',
      created_at: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString()
    };

    // Save to MariaDB
    const isAvailable = await isMariaDbAvailable();
    if (isAvailable) {
      try {
        const pool = getMariaDbPool();
        await pool.query(
          `INSERT INTO mbi_audit_logs 
          (id, tenant_id, user_id, user_name, action, category, details, ip_address, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE created_at = created_at`,
          [
            logRecord.id,
            logRecord.tenant_id,
            logRecord.user_id,
            logRecord.user_name,
            logRecord.action,
            logRecord.category,
            logRecord.details,
            logRecord.ip_address,
            logRecord.created_at
          ]
        );
      } catch (dbErr) {
        console.warn('[Audit DB Write Notice]:', dbErr);
      }
    }

    // Always keep safe in sync file / backup
    saveFallbackAuditLog(logRecord);

    // Broadcast real-time stream event
    try {
      broadcastTenantEvent(tenantId, {
        type: 'audit_log_created',
        entity: 'mbi_audit_logs',
        payload: logRecord
      });
    } catch {}

    return res.status(201).json({
      success: true,
      log: logRecord
    });
  } catch (error: any) {
    console.error('[Create Audit Log Error]:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Failed to record audit log' });
  }
}

/**
 * STRICT IMMUTABILITY ENFORCEMENT:
 * Any DELETE or PUT call to audit logs is strictly rejected with 403 Forbidden.
 */
export function rejectAuditMutation(req: Request, res: Response) {
  return res.status(403).json({
    success: false,
    error: '403 Forbidden: Audit logs are legally immutable and permanent. Deletion, truncation, or modification of activity records is strictly prohibited by security protocol.'
  });
}
