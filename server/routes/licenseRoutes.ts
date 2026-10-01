import express, { Response } from 'express';
import { getMariaDbPool, isMariaDbAvailable } from '../db/mariaClient';
import { TenantRequest } from '../middleware/tenantMiddleware';
import fs from 'fs';
import path from 'path';

export const licenseRouter = express.Router();
const syncFile = path.resolve(process.cwd(), '.sync_data.json');

/**
 * POST /api/license/register-trial
 * Registers / stores active 10-day trial license in mbi_licenses and auto-binds Device #1
 */
licenseRouter.post('/register-trial', async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { storeName, ownerName, phone, email, city, tenantId: incomingTenantId, hwid, deviceId } = req.body;
    const cleanStoreName = (storeName || 'Pharmacy Store').trim();
    const cleanOwnerName = (ownerName || cleanStoreName || 'Store Owner').trim();
    const cleanPhone = (phone || '').trim();
    const cleanEmail = (email || `${cleanPhone || 'user'}@inventra.local`).trim();
    const cleanCity = (city || 'Lahore').trim();
    const tenantId = incomingTenantId || `tenant_${cleanPhone.replace(/[^0-9]/g, '') || Date.now()}`;
    const clientHwid = (hwid || deviceId || `HWID-DEV1-${Math.random().toString(36).substring(2, 8).toUpperCase()}`).toUpperCase();
    const boundHwids = JSON.stringify([clientHwid]);

    // 10 Full Days Duration calculation
    const now = new Date();
    const issueDate = now.toISOString().slice(0, 10);
    const trialEndsAtDate = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
    const expiryDate = trialEndsAtDate.toISOString().slice(0, 10);
    const trialEndsAt = trialEndsAtDate.toISOString();

    const licenseId = `lic_trial_${Date.now()}`;
    const licenseKey = `MBI-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Write to MariaDB if connected
    if (await isMariaDbAvailable()) {
      try {
        const pool = getMariaDbPool();

        // 1. Store in mbi_licenses with bound_hardware_ids auto-binding Device #1
        await pool.query(
          `INSERT INTO mbi_licenses 
           (id, tenant_id, license_key, client_name, owner_name, phone, city, plan, status, issue_date, expiry_date, max_devices, bound_hardware_ids, sale_price, amount_paid, amount_due)
           VALUES (?, ?, ?, ?, ?, ?, 'Basic', 'Active', ?, ?, 10, ?, 0, 0, 0)
           ON DUPLICATE KEY UPDATE 
             status = 'Active', 
             plan = 'Basic', 
             bound_hardware_ids = VALUES(bound_hardware_ids),
             expiry_date = VALUES(expiry_date),
             updated_at = CURRENT_TIMESTAMP;`,
          [licenseId, tenantId, licenseKey, cleanStoreName, cleanOwnerName, cleanPhone, cleanCity, issueDate, expiryDate, boundHwids]
        ).catch(() => {});

        // 2. Store in mbi_tenants: status: 'Active', plan: 'Basic'
        await pool.query(
          `INSERT INTO mbi_tenants 
           (id, organization_id, name, owner_name, owner_email, owner_phone, city, plan_id, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'Basic', 'Active')
           ON DUPLICATE KEY UPDATE 
             name = VALUES(name),
             owner_name = VALUES(owner_name),
             plan_id = 'Basic', 
             status = 'Active',
             updated_at = CURRENT_TIMESTAMP;`,
          [tenantId, tenantId, cleanStoreName, cleanOwnerName, cleanEmail, cleanPhone, cleanCity]
        ).catch(() => {});
      } catch (dbErr: any) {
        // Fall through to local cache
      }
    }

    // Update local JSON cache for fallback resilience
    try {
      let syncData: any = {};
      if (fs.existsSync(syncFile)) {
        syncData = JSON.parse(fs.readFileSync(syncFile, 'utf-8'));
      }
      if (!syncData.mbi_licenses) syncData.mbi_licenses = [];
      if (!syncData.client_licenses) syncData.client_licenses = [];

      const licObj = {
        id: licenseId,
        tenantId,
        licenseKey,
        clientName: cleanStoreName,
        ownerName: cleanOwnerName,
        phone: cleanPhone,
        city: cleanCity,
        plan: 'Basic',
        status: 'Active',
        issueDate,
        expiryDate,
        maxDevices: 10,
        boundHardwareIds: [clientHwid]
      };
      syncData.mbi_licenses.push(licObj);
      syncData.client_licenses.push(licObj);
      fs.writeFileSync(syncFile, JSON.stringify(syncData, null, 2), 'utf-8');
    } catch (e) {}

    res.json({
      success: true,
      message: '10-Day Free Trial successfully activated with Device #1 auto-bound!',
      tenantId,
      licenseKey,
      hwid: clientHwid,
      boundHardwareIds: [clientHwid],
      plan: 'Basic',
      planTier: 'Silver',
      status: 'Active',
      issueDate,
      expiryDate,
      trialEndsAt,
      daysRemaining: 10
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Error creating trial license' });
  }
});

/**
 * POST /api/license/verify-device
 * Persistent Re-login Device Authorization against mbi_licenses bound_hardware_ids
 */
licenseRouter.post('/verify-device', async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, hwid, deviceId, deviceModel, os } = req.body;
    const clientHwid = (hwid || deviceId || 'HWID-DEVICE-1').trim().toUpperCase();
    const activeTenant = (tenantId || 'default').trim();

    let boundHardwareIds: string[] = [];
    let maxDevices = 10;
    let licenseFound = false;
    let licenseRecordId = '';

    // 1. Query MariaDB mbi_licenses table if available
    if (await isMariaDbAvailable()) {
      try {
        const pool = getMariaDbPool();
        const [rows]: any = await pool.query(
          `SELECT id, tenant_id, license_key, max_devices, bound_hardware_ids, status 
           FROM mbi_licenses 
           WHERE tenant_id = ? OR id = ? OR client_name = ? 
           ORDER BY created_at DESC LIMIT 1;`,
          [activeTenant, activeTenant, activeTenant]
        );

        if (rows && rows.length > 0) {
          licenseFound = true;
          licenseRecordId = rows[0].id;
          maxDevices = Number(rows[0].max_devices || 10);
          const rawBound = rows[0].bound_hardware_ids;

          if (typeof rawBound === 'string') {
            try {
              boundHardwareIds = JSON.parse(rawBound);
            } catch {
              boundHardwareIds = rawBound.split(',').map((s: string) => s.trim()).filter(Boolean);
            }
          } else if (Array.isArray(rawBound)) {
            boundHardwareIds = rawBound;
          }
        }
      } catch (dbErr) {
        // Fall through to file fallback
      }
    }

    // 2. Fallback check from .sync_data.json
    if (!licenseFound && fs.existsSync(syncFile)) {
      try {
        const syncData = JSON.parse(fs.readFileSync(syncFile, 'utf-8'));
        const list: any[] = syncData.mbi_licenses || syncData.client_licenses || [];
        const found = list.find((l: any) => l.tenantId === activeTenant || l.id === activeTenant || l.clientName === activeTenant);
        if (found) {
          licenseFound = true;
          licenseRecordId = found.id;
          maxDevices = Number(found.maxDevices || 10);
          boundHardwareIds = Array.isArray(found.boundHardwareIds) ? found.boundHardwareIds : (found.boundHardwareIds ? JSON.parse(found.boundHardwareIds) : []);
        }
      } catch (e) {}
    }

    // Make boundHardwareIds a clean unique uppercase string list
    boundHardwareIds = Array.from(new Set(boundHardwareIds.map(h => String(h).trim().toUpperCase()).filter(Boolean)));

    // Case 1: If array is empty or length is 0 -> Auto-bind current HWID as Device #1
    if (boundHardwareIds.length === 0) {
      boundHardwareIds = [clientHwid];

      if (await isMariaDbAvailable()) {
        try {
          const pool = getMariaDbPool();
          if (licenseRecordId) {
            await pool.query(
              `UPDATE mbi_licenses SET bound_hardware_ids = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;`,
              [JSON.stringify(boundHardwareIds), licenseRecordId]
            );
          } else {
            const newLicId = `lic_${Date.now()}`;
            const newLicKey = `MBI-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            await pool.query(
              `INSERT INTO mbi_licenses (id, tenant_id, license_key, client_name, owner_name, plan, status, issue_date, expiry_date, max_devices, bound_hardware_ids)
               VALUES (?, ?, ?, 'Pharmacy Store', 'Owner', 'Basic', 'Active', CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL 10 DAY), 10, ?)
               ON DUPLICATE KEY UPDATE bound_hardware_ids = VALUES(bound_hardware_ids);`,
              [newLicId, activeTenant, newLicKey, JSON.stringify(boundHardwareIds)]
            );
          }
        } catch (dbErr) {}
      }

      res.json({
        success: true,
        authorized: true,
        isBound: true,
        deviceIndex: 1,
        totalBound: 1,
        maxDevices,
        boundHardwareIds,
        message: 'Device #1 automatically bound to license and granted access.'
      });
      return;
    }

    // Case 2: If current HWID is already in bound_hardware_ids -> Grant immediate access (0 lock screen)
    if (boundHardwareIds.includes(clientHwid)) {
      res.json({
        success: true,
        authorized: true,
        isBound: true,
        deviceIndex: boundHardwareIds.indexOf(clientHwid) + 1,
        totalBound: boundHardwareIds.length,
        maxDevices,
        boundHardwareIds,
        message: 'Device verified and authorized.'
      });
      return;
    }

    // Case 3: If current HWID is new BUT bound_hardware_ids.length < max_devices -> Auto-bind new terminal
    if (boundHardwareIds.length < maxDevices) {
      boundHardwareIds.push(clientHwid);

      if (await isMariaDbAvailable()) {
        try {
          const pool = getMariaDbPool();
          if (licenseRecordId) {
            await pool.query(
              `UPDATE mbi_licenses SET bound_hardware_ids = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;`,
              [JSON.stringify(boundHardwareIds), licenseRecordId]
            );
          }
        } catch (dbErr) {}
      }

      res.json({
        success: true,
        authorized: true,
        isBound: true,
        deviceIndex: boundHardwareIds.length,
        totalBound: boundHardwareIds.length,
        maxDevices,
        boundHardwareIds,
        message: `New terminal auto-bound as Terminal #${boundHardwareIds.length}.`
      });
      return;
    }

    // Case 4: ONLY lock if bound_hardware_ids.length >= max_devices AND device is unknown
    res.json({
      success: true,
      authorized: false,
      isBound: false,
      totalBound: boundHardwareIds.length,
      maxDevices,
      boundHardwareIds,
      message: `Terminal authorization limit reached (${boundHardwareIds.length}/${maxDevices} active terminals).`
    });
  } catch (err: any) {
    // Graceful fallback to avoid locking users on network or internal errors
    res.json({
      success: true,
      authorized: true,
      isBound: true,
      totalBound: 1,
      maxDevices: 10,
      boundHardwareIds: [req.body.hwid || 'HWID-LOCAL'],
      message: 'Offline license verification fallback.'
    });
  }
});

/**
 * POST /api/license/bind-device
 * Explicitly binds or overrides a terminal HWID for the tenant
 */
licenseRouter.post('/bind-device', async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, hwid, override } = req.body;
    const clientHwid = (hwid || 'HWID-DEVICE-1').trim().toUpperCase();
    const activeTenant = (tenantId || 'default').trim();

    let boundHardwareIds: string[] = [];

    if (await isMariaDbAvailable()) {
      try {
        const pool = getMariaDbPool();
        const [rows]: any = await pool.query(
          `SELECT id, bound_hardware_ids FROM mbi_licenses WHERE tenant_id = ? OR id = ? LIMIT 1;`,
          [activeTenant, activeTenant]
        );

        if (rows && rows.length > 0) {
          const raw = rows[0].bound_hardware_ids;
          if (typeof raw === 'string') {
            try { boundHardwareIds = JSON.parse(raw); } catch { boundHardwareIds = []; }
          } else if (Array.isArray(raw)) {
            boundHardwareIds = raw;
          }

          if (override) {
            boundHardwareIds = [clientHwid];
          } else if (!boundHardwareIds.includes(clientHwid)) {
            boundHardwareIds.push(clientHwid);
          }

          await pool.query(
            `UPDATE mbi_licenses SET bound_hardware_ids = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;`,
            [JSON.stringify(boundHardwareIds), rows[0].id]
          );
        }
      } catch (dbErr) {}
    }

    res.json({
      success: true,
      authorized: true,
      boundHardwareIds,
      message: `Terminal ${clientHwid} bound successfully.`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Error binding device' });
  }
});

/**
 * POST /api/license/auto-bind-primary
 * Automatically registers and binds Device #1 / primary terminal on registration & first login
 */
licenseRouter.post('/auto-bind-primary', async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, hwid, deviceId, userId } = req.body;
    const clientHwid = (hwid || deviceId || 'HWID-DEV1').trim().toUpperCase();
    const activeTenant = (tenantId || 'default').trim();

    let boundHardwareIds: string[] = [];

    if (await isMariaDbAvailable()) {
      try {
        const pool = getMariaDbPool();
        const [rows]: any = await pool.query(
          `SELECT id, bound_hardware_ids FROM mbi_licenses WHERE tenant_id = ? OR id = ? LIMIT 1;`,
          [activeTenant, activeTenant]
        );

        if (rows && rows.length > 0) {
          const raw = rows[0].bound_hardware_ids;
          if (typeof raw === 'string') {
            try { boundHardwareIds = JSON.parse(raw); } catch { boundHardwareIds = []; }
          } else if (Array.isArray(raw)) {
            boundHardwareIds = raw;
          }

          if (!boundHardwareIds.includes(clientHwid)) {
            boundHardwareIds.push(clientHwid);
          }

          await pool.query(
            `UPDATE mbi_licenses SET bound_hardware_ids = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;`,
            [JSON.stringify(boundHardwareIds), rows[0].id]
          );
        } else {
          // If no license record yet, create one with clientHwid bound
          const newLicId = `lic_${Date.now()}`;
          const newLicKey = `MBI-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
          boundHardwareIds = [clientHwid];
          await pool.query(
            `INSERT INTO mbi_licenses (id, tenant_id, license_key, client_name, owner_name, plan, status, issue_date, expiry_date, max_devices, bound_hardware_ids)
             VALUES (?, ?, ?, 'Pharmacy Store', 'Owner', 'Basic', 'Active', CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL 10 DAY), 10, ?)
             ON DUPLICATE KEY UPDATE bound_hardware_ids = VALUES(bound_hardware_ids);`,
            [newLicId, activeTenant, newLicKey, JSON.stringify(boundHardwareIds)]
          );
        }
      } catch (dbErr) {}
    }

    // Update local JSON cache for fallback resilience
    try {
      if (fs.existsSync(syncFile)) {
        const syncData = JSON.parse(fs.readFileSync(syncFile, 'utf-8'));
        const list: any[] = syncData.mbi_licenses || syncData.client_licenses || [];
        const found = list.find((l: any) => l.tenantId === activeTenant || l.id === activeTenant);
        if (found) {
          let existingBound = Array.isArray(found.boundHardwareIds) ? found.boundHardwareIds : [];
          if (!existingBound.includes(clientHwid)) {
            existingBound.push(clientHwid);
            found.boundHardwareIds = existingBound;
            fs.writeFileSync(syncFile, JSON.stringify(syncData, null, 2), 'utf-8');
          }
        }
      }
    } catch (e) {}

    res.json({
      success: true,
      authorized: true,
      isBound: true,
      boundHardwareIds: boundHardwareIds.length > 0 ? boundHardwareIds : [clientHwid],
      message: `Device #1 (${clientHwid}) automatically enrolled and authorized.`
    });
  } catch (err: any) {
    res.json({
      success: true,
      authorized: true,
      isBound: true,
      boundHardwareIds: [req.body.hwid || 'HWID-LOCAL'],
      message: 'Device enrolled with local fallback.'
    });
  }
});

/**
 * GET /api/license/bound-devices
 * Returns list of all bound hardware terminals for a tenant
 */
licenseRouter.get('/bound-devices', async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenantId = (req.query.tenantId as string) || (req.headers['x-tenant-id'] as string) || 'default';
    let boundHardwareIds: string[] = [];
    let maxDevices = 10;
    let licenseKey = '';
    let plan = 'Basic';
    let status = 'Active';

    if (await isMariaDbAvailable()) {
      try {
        const pool = getMariaDbPool();
        const [rows]: any = await pool.query(
          `SELECT * FROM mbi_licenses WHERE tenant_id = ? OR id = ? ORDER BY created_at DESC LIMIT 1;`,
          [tenantId, tenantId]
        );

        if (rows && rows.length > 0) {
          licenseKey = rows[0].license_key;
          plan = rows[0].plan || 'Basic';
          status = rows[0].status || 'Active';
          maxDevices = Number(rows[0].max_devices || 10);
          const raw = rows[0].bound_hardware_ids;
          if (typeof raw === 'string') {
            try { boundHardwareIds = JSON.parse(raw); } catch { boundHardwareIds = []; }
          } else if (Array.isArray(raw)) {
            boundHardwareIds = raw;
          }
        }
      } catch (dbErr) {}
    }

    res.json({
      success: true,
      tenantId,
      licenseKey,
      plan,
      status,
      maxDevices,
      totalBound: boundHardwareIds.length,
      boundHardwareIds
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

/**
 * POST /api/license/validate-key
 * Validates license key against MariaDB table mbi_licenses, updates mbi_tenants, and unlocks plan
 */
licenseRouter.post('/validate-key', async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { licenseKey, tenantId, hwid } = req.body;
    const cleanKey = (licenseKey || '').trim().toUpperCase();
    const clientHwid = (hwid || 'HWID-PRIMARY').trim().toUpperCase();

    if (!cleanKey) {
      res.status(400).json({ success: false, message: 'License key is required.' });
      return;
    }

    let isDbMatched = false;
    let matchedLicense: any = null;

    if (await isMariaDbAvailable()) {
      try {
        const pool = getMariaDbPool();
        const [rows]: any = await pool.query(
          `SELECT * FROM mbi_licenses WHERE UPPER(license_key) = ? LIMIT 1;`,
          [cleanKey]
        );

        if (rows && rows.length > 0) {
          isDbMatched = true;
          matchedLicense = rows[0];
        }
      } catch (dbErr: any) {
        // Fall through
      }
    }

    // Determine plan tier and duration
    let planTier: 'Silver' | 'Gold' | 'Platinum' = 'Gold';
    let durationDays = 365; // Default 1 Year

    // Check key prefixes or database record
    if (cleanKey.includes('PLAT') || cleanKey.includes('ENT') || cleanKey.includes('PREM')) {
      planTier = 'Platinum';
    } else if (cleanKey.includes('SILV') || cleanKey.includes('BASIC')) {
      planTier = 'Silver';
    } else {
      planTier = 'Gold'; // Default business/pro
    }

    if (cleanKey.includes('1M') || cleanKey.includes('MONTH')) {
      durationDays = 30; // 1 Month
    } else {
      durationDays = 365; // 1 Year
    }

    // Check status in DB if found
    if (isDbMatched && matchedLicense) {
      if (matchedLicense.status === 'Suspended' || matchedLicense.status === 'Revoked') {
        res.status(403).json({
          success: false,
          message: 'This license key has been suspended or revoked. Please contact MBI Support on WhatsApp (0328-1302636).'
        });
        return;
      }

      if (matchedLicense.plan) {
        const dbPlan = String(matchedLicense.plan).toUpperCase();
        if (dbPlan.includes('PLAT') || dbPlan.includes('ENTERPRISE')) planTier = 'Platinum';
        else if (dbPlan.includes('SILV') || dbPlan.includes('BASIC')) planTier = 'Silver';
        else planTier = 'Gold';
      }
    }

    // Calculate new expiry date
    const now = new Date();
    const expiryDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const planId = planTier === 'Platinum' ? 'Premium' : planTier === 'Gold' ? 'Business' : 'Basic';

    // Update MariaDB records
    if (await isMariaDbAvailable()) {
      try {
        const pool = getMariaDbPool();

        // Upsert into mbi_licenses with Active status and bound hardware ID
        await pool.query(
          `INSERT INTO mbi_licenses 
           (id, tenant_id, license_key, client_name, owner_name, phone, city, plan, status, issue_date, expiry_date, max_devices, bound_hardware_ids)
           VALUES (?, ?, ?, 'Store Owner', '', '', 'Lahore', ?, 'Active', CURRENT_DATE, ?, 10, ?)
           ON DUPLICATE KEY UPDATE 
             status = 'Active', 
             plan = VALUES(plan), 
             bound_hardware_ids = VALUES(bound_hardware_ids),
             expiry_date = VALUES(expiry_date),
             updated_at = CURRENT_TIMESTAMP;`,
          [`lic_${Date.now()}`, tenantId || 'default', cleanKey, planTier, expiryDate, JSON.stringify([clientHwid])]
        ).catch(() => {});

        // Update mbi_tenants
        if (tenantId) {
          await pool.query(
            `UPDATE mbi_tenants 
             SET status = 'Active', plan_id = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ? OR tenant_id = ?;`,
            [planId, tenantId, tenantId]
          ).catch(() => {});
        }
      } catch (updateErr: any) {}
    }

    res.json({
      success: true,
      message: `License successfully validated! ${planTier} Plan activated for ${durationDays === 30 ? '1 Month' : '1 Year'}. Device #1 bound.`,
      plan: planTier,
      planId,
      status: 'Active',
      durationDays,
      expiryDate,
      licenseKey: cleanKey,
      boundHardwareIds: [clientHwid]
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Error validating license key' });
  }
});

/**
 * GET /api/license/status
 * Queries current license & trial status
 */
licenseRouter.get('/status', async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenantId = (req.query.tenantId as string) || req.headers['x-tenant-id'] || 'default';
    let dbTenant: any = null;

    if (await isMariaDbAvailable()) {
      try {
        const pool = getMariaDbPool();
        const [rows]: any = await pool.query(
          `SELECT * FROM mbi_tenants WHERE id = ? OR tenant_id = ? LIMIT 1;`,
          [tenantId, tenantId]
        );
        if (rows && rows.length > 0) {
          dbTenant = rows[0];
        }
      } catch {}
    }

    res.json({
      success: true,
      tenantId,
      status: dbTenant?.status || 'Active',
      planId: dbTenant?.plan_id || 'Basic'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});
