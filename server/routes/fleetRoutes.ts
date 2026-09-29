import express, { Response } from 'express';
import { getMariaDbPool, isMariaDbAvailable } from '../db/mariaClient';
import { requireMasterAuth, TenantRequest } from '../middleware/tenantMiddleware';
import { broadcastGlobalEvent, broadcastTenantEvent } from './syncRoutes';
import fs from 'fs';
import path from 'path';

export const fleetRouter = express.Router();
const syncFile = path.resolve(process.cwd(), '.sync_data.json');

// 1. Get all fleet tenants from mbi_tenants with user & license counts
fleetRouter.get('/tenants', async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    let tenants: any[] = [];

    if (await isMariaDbAvailable()) {
      try {
        const pool = getMariaDbPool();
        const [rows]: any = await pool.query(
          `SELECT t.*, 
            (SELECT COUNT(*) FROM mbi_users u WHERE u.tenant_id = t.id OR u.tenant_id = t.tenant_id) as user_count,
            (SELECT COUNT(*) FROM mbi_invoices i WHERE i.tenant_id = t.id OR i.tenant_id = t.tenant_id) as invoice_count
           FROM mbi_tenants t
           ORDER BY t.created_at DESC;`
        );
        if (Array.isArray(rows)) {
          tenants = rows;
        }
      } catch (dbErr) {}
    }

    // Merge with fallback storage
    if (fs.existsSync(syncFile)) {
      try {
        const syncData = JSON.parse(fs.readFileSync(syncFile, 'utf-8'));
        const fallbackTenants = syncData.mbi_tenants || syncData.tenants || [];
        const existingIds = new Set(tenants.map(t => t.id || t.tenant_id));
        for (const ft of fallbackTenants) {
          const tid = ft.id || ft.tenantId || ft.tenant_id;
          if (tid && !existingIds.has(tid)) {
            tenants.push({
              id: tid,
              tenant_id: tid,
              name: ft.name || ft.storeName || 'Pharmacy Client',
              owner_name: ft.ownerName || 'Owner',
              owner_phone: ft.ownerPhone || ft.phone || '',
              owner_email: ft.ownerEmail || ft.email || '',
              city: ft.city || 'Lahore',
              plan: ft.plan || ft.planId || 'Basic',
              status: ft.status || 'Active',
              created_at: ft.trialStartDate || new Date().toISOString()
            });
            existingIds.add(tid);
          }
        }
      } catch (e) {}
    }

    res.json({
      success: true,
      count: tenants.length,
      tenants,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Error fetching fleet tenants' });
  }
});

// 2. Save or update a fleet tenant in mbi_tenants
fleetRouter.post('/tenants/save', async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { id, tenant_id, name, owner_name, owner_phone, owner_email, city, address, plan, status, drug_license_no, ntn_number } = req.body;
    const cleanTenantId = tenant_id || id || `tenant_${Date.now()}`;
    const cleanId = id || cleanTenantId;

    if (await isMariaDbAvailable()) {
      try {
        const pool = getMariaDbPool();
        await pool.query(
          `INSERT INTO mbi_tenants (id, tenant_id, name, owner_name, owner_phone, owner_email, city, address, plan, status, drug_license_no, ntn_number, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
           ON DUPLICATE KEY UPDATE 
             name = VALUES(name),
             owner_name = VALUES(owner_name),
             owner_phone = VALUES(owner_phone),
             owner_email = VALUES(owner_email),
             city = VALUES(city),
             address = VALUES(address),
             plan = VALUES(plan),
             status = VALUES(status),
             drug_license_no = VALUES(drug_license_no),
             ntn_number = VALUES(ntn_number),
             updated_at = CURRENT_TIMESTAMP;`,
          [
            cleanId,
            cleanTenantId,
            name || 'Pharmacy Store',
            owner_name || 'Store Admin',
            owner_phone || '',
            owner_email || '',
            city || 'Lahore',
            address || '',
            plan || 'Business',
            status || 'Active',
            drug_license_no || '',
            ntn_number || ''
          ]
        );
      } catch (dbErr) {}
    }

    res.json({
      success: true,
      message: `Tenant ${name} saved successfully`,
      tenantId: cleanTenantId
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Error saving fleet tenant' });
  }
});

// 3. Delete / Archive a tenant
fleetRouter.post('/tenants/delete', async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenant_id } = req.body;
    if (!tenant_id) {
      res.status(400).json({ success: false, error: 'tenant_id is required' });
      return;
    }

    if (await isMariaDbAvailable()) {
      try {
        const pool = getMariaDbPool();
        await pool.query('DELETE FROM mbi_tenants WHERE tenant_id = ? OR id = ?;', [tenant_id, tenant_id]);
      } catch (dbErr) {}
    }

    res.json({ success: true, message: `Tenant ${tenant_id} removed.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Error deleting tenant' });
  }
});

// 4. Get all registration trial leads
fleetRouter.get('/leads', async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    let leads: any[] = [];
    if (await isMariaDbAvailable()) {
      try {
        const pool = getMariaDbPool();
        const [rows]: any = await pool.query('SELECT * FROM mbi_registration_leads ORDER BY submitted_at DESC, created_at DESC;');
        if (Array.isArray(rows)) {
          leads = rows;
        }
      } catch (dbErr) {}
    }

    if (fs.existsSync(syncFile)) {
      try {
        const syncData = JSON.parse(fs.readFileSync(syncFile, 'utf-8'));
        const fallbackLeads = syncData.mbi_registration_leads || syncData.registration_leads || [];
        const existingIds = new Set(leads.map(l => l.id));
        for (const fl of fallbackLeads) {
          if (fl && fl.id && !existingIds.has(fl.id)) {
            leads.push(fl);
            existingIds.add(fl.id);
          }
        }
      } catch (e) {}
    }

    res.json({ success: true, count: leads.length, leads });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Error fetching leads' });
  }
});

// 5. 1-Click Approve lead & provision tenant & user
fleetRouter.post('/leads/approve', async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { leadId, serialKey, plan } = req.body;
    const pool = getMariaDbPool();

    const [leadRows]: any = await pool.query('SELECT * FROM mbi_registration_leads WHERE id = ? LIMIT 1;', [leadId]);
    if (!leadRows || leadRows.length === 0) {
      res.status(404).json({ success: false, error: 'Lead not found' });
      return;
    }

    const lead = leadRows[0];
    const tenantId = `tenant_${lead.phone.replace(/[^0-9]/g, '') || Date.now()}`;
    const cleanPlan = plan || lead.selected_plan || 'Business';

    // 1. Provision Tenant
    await pool.query(
      `INSERT INTO mbi_tenants (id, tenant_id, name, owner_name, owner_phone, owner_email, city, address, plan, status, drug_license_no, ntn_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?)
       ON DUPLICATE KEY UPDATE status = 'Active', plan = VALUES(plan);`,
      [
        tenantId,
        tenantId,
        lead.store_name,
        lead.owner_name,
        lead.phone,
        lead.email || `${lead.username}@mbinventra.com`,
        lead.city || 'Lahore',
        lead.address || '',
        cleanPlan,
        lead.drug_license_no || '',
        lead.ntn_number || ''
      ]
    );

    // 2. Provision Primary Admin User
    const userId = `usr_${Date.now()}`;
    await pool.query(
      `INSERT INTO mbi_users (id, tenant_id, name, username, email_or_phone, passcode, role, status, is_primary_admin, is_kill_switch_active)
       VALUES (?, ?, ?, ?, ?, ?, 'Primary Admin', 'Active', 1, 0)
       ON DUPLICATE KEY UPDATE passcode = VALUES(passcode), status = 'Active';`,
      [
        userId,
        tenantId,
        lead.owner_name,
        lead.username || lead.phone,
        lead.email || lead.phone,
        lead.password || '1234'
      ]
    );

    // 3. Provision License Key
    const key = serialKey || `MBI-PRO-${Date.now().toString().slice(-6)}`;
    await pool.query(
      `INSERT INTO mbi_licenses (id, tenant_id, license_key, plan, status, max_terminals, expires_at)
       VALUES (?, ?, ?, ?, 'Active', 5, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 365 DAY))
       ON DUPLICATE KEY UPDATE status = 'Active';`,
      [`lic_${Date.now()}`, tenantId, key, cleanPlan]
    );

    // 4. Update Lead Status
    await pool.query("UPDATE mbi_registration_leads SET status = 'Approved', updated_at = CURRENT_TIMESTAMP WHERE id = ?;", [leadId]);

    res.json({
      success: true,
      message: `Store ${lead.store_name} successfully approved and provisioned!`,
      tenantId,
      licenseKey: key
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Error approving lead' });
  }
});

// 6. 1-Click Remote License Extension (+1 Year or custom days)
fleetRouter.post('/licenses/extend', async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, daysToAdd = 365, newExpiryDate } = req.body;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'tenantId is required' });
      return;
    }

    const pool = getMariaDbPool();
    const expiry = newExpiryDate || new Date(Date.now() + daysToAdd * 86400000).toISOString().slice(0, 10);

    // Update license expiry date
    await pool.query(
      `UPDATE mbi_licenses 
       SET expires_at = ?, status = 'Active', updated_at = CURRENT_TIMESTAMP 
       WHERE tenant_id = ? OR id = ?;`,
      [expiry, tenantId, tenantId]
    );

    // Ensure tenant status is Active
    await pool.query(
      `UPDATE mbi_tenants 
       SET status = 'Active', updated_at = CURRENT_TIMESTAMP 
       WHERE tenant_id = ? OR id = ?;`,
      [tenantId, tenantId]
    );

    res.json({
      success: true,
      message: `Tenant ${tenantId} license extended successfully until ${expiry}`,
      newExpiryDate: expiry
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Error extending license' });
  }
});

// 7. Direct Centralized Tenant Pipeline Registration
fleetRouter.post('/tenants/register', async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { storeName, ownerName, phone, email, city, plan, password } = req.body;
    const cleanTenantId = `tenant_${(phone || Date.now().toString()).replace(/[^0-9]/g, '')}`;
    const cleanPlan = plan || 'Basic';
    const pool = getMariaDbPool();

    // 1. Insert into mbi_tenants
    await pool.query(
      `INSERT INTO mbi_tenants (id, tenant_id, name, owner_name, owner_phone, owner_email, city, plan, status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active', CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE 
         name = VALUES(name),
         owner_name = VALUES(owner_name),
         owner_phone = VALUES(owner_phone),
         owner_email = VALUES(owner_email),
         city = VALUES(city),
         plan = VALUES(plan),
         status = 'Active',
         updated_at = CURRENT_TIMESTAMP;`,
      [
        cleanTenantId,
        cleanTenantId,
        storeName || 'My Pharmacy Store',
        ownerName || 'Pharmacy Admin',
        phone || '',
        email || `${phone}@inventra.local`,
        city || 'Lahore',
        cleanPlan
      ]
    );

    // 2. Insert into mbi_licenses
    const licenseKey = `MBI-TR-${Date.now().toString(36).slice(-4).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    await pool.query(
      `INSERT INTO mbi_licenses (id, tenant_id, license_key, plan, status, max_terminals, expires_at)
       VALUES (?, ?, ?, ?, 'Active', 5, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 10 DAY))
       ON DUPLICATE KEY UPDATE status = 'Active';`,
      [`lic_${Date.now()}`, cleanTenantId, licenseKey, cleanPlan]
    );

    res.json({
      success: true,
      message: 'Tenant registered in centralized pipeline successfully',
      tenantId: cleanTenantId,
      licenseKey
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Error registering tenant' });
  }
});

// 8. Unified Fleet Users List: GET /api/fleet/users
fleetRouter.get('/users', async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const usersMap = new Map<string, any>();

    // 1. Read from MariaDB mbi_users
    if (await isMariaDbAvailable()) {
      try {
        const pool = getMariaDbPool();
        const [rows]: any = await pool.query(
          `SELECT u.id, u.tenant_id, u.name, u.username, u.email_or_phone as emailOrPhone, 
                  u.role, u.status, u.is_kill_switch_active as isKillSwitchActive, 
                  u.is_silent_monitored as isSilentMonitored, u.bound_hwid as boundHwid, 
                  u.last_sync_time as lastSyncTime, t.name as storeName 
           FROM mbi_users u
           LEFT JOIN mbi_tenants t ON (u.tenant_id = t.id OR u.tenant_id = t.tenant_id)
           ORDER BY u.created_at DESC;`
        );
        if (Array.isArray(rows)) {
          for (const r of rows) {
            usersMap.set(r.id, {
              ...r,
              installationId: r.tenant_id,
              isOnline: true,
              passcode: '1234'
            });
          }
        }
      } catch (dbErr) {}
    }

    // 2. Merge with local .master_users.json
    try {
      const usersJsonPath = path.resolve(process.cwd(), '.master_users.json');
      if (fs.existsSync(usersJsonPath)) {
        const localList = JSON.parse(fs.readFileSync(usersJsonPath, 'utf-8') || '[]');
        if (Array.isArray(localList)) {
          for (const lu of localList) {
            if (lu && lu.id) {
              const existing = usersMap.get(lu.id);
              usersMap.set(lu.id, {
                ...lu,
                ...existing,
                passcode: lu.passcode || existing?.passcode || '1234',
                storeName: lu.storeName || existing?.storeName || 'MBI INVENTRA'
              });
            }
          }
        }
      }
    } catch (e) {}

    const users = Array.from(usersMap.values());

    res.json({
      success: true,
      count: users.length,
      users,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Error fetching fleet users' });
  }
});

// 9. Save or Update User in MariaDB + Master Store: POST /api/fleet/users/save
fleetRouter.post('/users/save', async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { id, name, username, emailOrPhone, role, status, passcode, storeName, tenantId, boundHwid } = req.body;
    const cleanId = id || `u_${Date.now()}`;
    const cleanTenantId = tenantId || 'tenant_main';
    const cleanRole = role || 'Cashier';

    // 1. Update MariaDB
    if (await isMariaDbAvailable()) {
      try {
        const pool = getMariaDbPool();
        await pool.query(
          `INSERT INTO mbi_users (id, tenant_id, name, username, email_or_phone, role, status, bound_hwid, passcode_hash, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
           ON DUPLICATE KEY UPDATE 
             name = VALUES(name),
             username = VALUES(username),
             email_or_phone = VALUES(email_or_phone),
             role = VALUES(role),
             status = VALUES(status),
             bound_hwid = VALUES(bound_hwid),
             passcode_hash = VALUES(passcode_hash),
             updated_at = CURRENT_TIMESTAMP;`,
          [
            cleanId,
            cleanTenantId,
            name || 'Staff User',
            username || emailOrPhone || cleanId,
            emailOrPhone || '',
            cleanRole,
            status || 'Active',
            boundHwid || null,
            passcode || '1234'
          ]
        );
      } catch (dbErr) {}
    }

    // 2. Update .master_users.json
    try {
      const usersJsonPath = path.resolve(process.cwd(), '.master_users.json');
      let localList: any[] = [];
      if (fs.existsSync(usersJsonPath)) {
        try { localList = JSON.parse(fs.readFileSync(usersJsonPath, 'utf-8') || '[]'); } catch (e) {}
      }
      const existingIdx = localList.findIndex(u => u.id === cleanId || u.emailOrPhone === emailOrPhone);
      const userRecord = {
        id: cleanId,
        name: name || 'Staff User',
        emailOrPhone: emailOrPhone || `${cleanId}@inventra.local`,
        role: cleanRole,
        status: status || 'Active',
        passcode: passcode || '1234',
        storeName: storeName || 'MBI INVENTRA',
        installationId: cleanTenantId,
        boundHwid: boundHwid || null,
        lastSyncTime: new Date().toISOString(),
        isOnline: true,
        updatedAt: new Date().toISOString()
      };

      if (existingIdx >= 0) {
        localList[existingIdx] = { ...localList[existingIdx], ...userRecord };
      } else {
        localList.push(userRecord);
      }
      fs.writeFileSync(usersJsonPath, JSON.stringify(localList, null, 2), 'utf-8');
    } catch (fsErr) {}

    // Broadcast update event
    broadcastGlobalEvent({
      type: 'USER_CREDENTIALS_UPDATED',
      payload: { userId: cleanId, role: cleanRole, tenantId: cleanTenantId }
    });

    res.json({
      success: true,
      message: `User ${name || cleanId} updated successfully and synchronized to all terminals.`,
      userId: cleanId
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Error saving user' });
  }
});

// 10. Reset Passcode: POST /api/fleet/users/passcode
fleetRouter.post('/users/passcode', async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { userId, newPasscode } = req.body;
    if (!userId || !newPasscode) {
      res.status(400).json({ success: false, error: 'userId and newPasscode are required' });
      return;
    }

    if (await isMariaDbAvailable()) {
      try {
        const pool = getMariaDbPool();
        await pool.query(
          'UPDATE mbi_users SET passcode_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;',
          [newPasscode, userId]
        );
      } catch (dbErr) {}
    }

    try {
      const usersJsonPath = path.resolve(process.cwd(), '.master_users.json');
      if (fs.existsSync(usersJsonPath)) {
        const localList = JSON.parse(fs.readFileSync(usersJsonPath, 'utf-8') || '[]');
        const target = localList.find((u: any) => u.id === userId);
        if (target) {
          target.passcode = newPasscode;
          target.updatedAt = new Date().toISOString();
          fs.writeFileSync(usersJsonPath, JSON.stringify(localList, null, 2), 'utf-8');
        }
      }
    } catch (e) {}

    broadcastGlobalEvent({
      type: 'USER_PASSCODE_CHANGED',
      payload: { userId, timestamp: new Date().toISOString() }
    });

    res.json({ success: true, message: `Passcode updated for user ${userId}` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Error resetting passcode' });
  }
});

// 11. Kill Switch / Remote Deactivate: POST /api/fleet/users/kill-switch
fleetRouter.post('/users/kill-switch', async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { userId, isKilled } = req.body;
    const flag = isKilled ? 1 : 0;
    const statusVal = isKilled ? 'Suspended' : 'Active';

    if (await isMariaDbAvailable()) {
      try {
        const pool = getMariaDbPool();
        await pool.query(
          'UPDATE mbi_users SET is_kill_switch_active = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;',
          [flag, statusVal, userId]
        );
      } catch (dbErr) {}
    }

    try {
      const usersJsonPath = path.resolve(process.cwd(), '.master_users.json');
      if (fs.existsSync(usersJsonPath)) {
        const localList = JSON.parse(fs.readFileSync(usersJsonPath, 'utf-8') || '[]');
        const target = localList.find((u: any) => u.id === userId);
        if (target) {
          target.status = statusVal;
          target.isKillSwitchActive = Boolean(isKilled);
          fs.writeFileSync(usersJsonPath, JSON.stringify(localList, null, 2), 'utf-8');
        }
      }
    } catch (e) {}

    broadcastGlobalEvent({
      type: 'USER_REMOTE_KILL_SWITCH',
      payload: { userId, isKilled: Boolean(isKilled) }
    });

    res.json({ success: true, message: `Remote kill switch ${isKilled ? 'ACTIVATED' : 'LIFTED'} for user ${userId}` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Error updating kill switch' });
  }
});

// 12. Delete User: POST /api/fleet/users/delete
fleetRouter.post('/users/delete', async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ success: false, error: 'userId is required' });
      return;
    }

    if (await isMariaDbAvailable()) {
      try {
        const pool = getMariaDbPool();
        await pool.query('DELETE FROM mbi_users WHERE id = ?;', [userId]);
      } catch (dbErr) {}
    }

    try {
      const usersJsonPath = path.resolve(process.cwd(), '.master_users.json');
      if (fs.existsSync(usersJsonPath)) {
        let localList = JSON.parse(fs.readFileSync(usersJsonPath, 'utf-8') || '[]');
        localList = localList.filter((u: any) => u.id !== userId);
        fs.writeFileSync(usersJsonPath, JSON.stringify(localList, null, 2), 'utf-8');
      }
    } catch (e) {}

    broadcastGlobalEvent({
      type: 'USER_DELETED',
      payload: { userId }
    });

    res.json({ success: true, message: `User ${userId} deleted successfully` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Error deleting user' });
  }
});

