import { Response } from 'express';
import { signJwt } from '../auth/jwt';
import { getMariaDbPool, isMariaDbAvailable, isMariaDbConnected } from '../db/mariaClient';
import { getMasterVault, getTenantVault, validateAndBindHwidLock, listTenantUsers } from '../db/sqliteVaultManager';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { broadcastAdminEvent, broadcastFleetActivity } from '../routes/adminRoutes';
import { broadcastTenantEvent } from '../routes/syncRoutes';
import { getFallbackUsers } from './userController';
import { sendAdminAlertNewTenant, sendTenantWelcomeEmail, sendPasswordResetOtpEmail } from '../services/emailService';
import fs from 'fs';
import path from 'path';

const syncFile = path.resolve(process.cwd(), '.sync_data.json');

// In-memory active device registry for live fleet telemetry
interface ActiveDeviceRecord {
  id: string;
  tenantId: string;
  storeName: string;
  userId: string;
  userName: string;
  userRole: string;
  hwid: string;
  deviceModel: string;
  os: string;
  ipAddress: string;
  status: 'ONLINE' | 'OFFLINE' | 'REVOKED';
  lastActive: string;
  locationCity: string;
}

export const activeDevicesRegistry = new Map<string, ActiveDeviceRecord>();

/**
 * Controller: User & Staff Login
 */
export async function loginController(req: TenantRequest, res: Response): Promise<void> {
  try {
    const { email, phone, email_or_phone, passcode, password, pinCode, deviceId, hwid, deviceModel, os, firmId } = req.body;
    const inputEmailOrPhone = (email_or_phone || email || phone || '').trim();
    const inputPasscode = (passcode || pinCode || password || '0000').trim();
    const clientHwid = (hwid || deviceId || `HWID-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${(req.ip || '127').slice(-3)}`).toUpperCase();
    const clientDeviceModel = deviceModel || (req.headers['user-agent']?.includes('Mobile') ? 'Android Terminal' : 'POS Workstation');
    const clientOs = os || (req.headers['user-agent']?.includes('Windows') ? 'Windows 11' : req.headers['user-agent']?.includes('Mac') ? 'macOS' : 'Linux / Android');
    const clientIp = req.ip || (req.headers['x-forwarded-for'] as string) || '182.185.24.11';

    if (!inputEmailOrPhone) {
      res.status(400).json({ success: false, error: 'Email or phone number is required' });
      return;
    }

    let authenticatedUser: any = null;
    const requestedTenantId = (req.headers['x-tenant-id'] as string) || req.body.tenantId || '';

    // 1. Direct SQLite Master Hub verification for exact tenant binding (0ms, unique tenant_id mapping)
    try {
      const master = getMasterVault();
      const inputIdent = inputEmailOrPhone.toLowerCase().trim();
      const masterUser: any = master.prepare(`
        SELECT * FROM mbi_users 
        WHERE (LOWER(username) = ? OR LOWER(email) = ? OR phone = ? OR LOWER(name) = ? OR id = ?)
          AND (passcode = ? OR pin = ?)
          AND (status = 'Active' OR status = 'Joined' OR status IS NULL)
        LIMIT 1
      `).get(inputIdent, inputIdent, inputIdent, inputIdent, inputIdent, inputPasscode, inputPasscode);

      if (masterUser) {
        authenticatedUser = {
          ...masterUser,
          tenant_id: masterUser.tenant_id,
          tenantId: masterUser.tenant_id
        };
      }
    } catch (sqliteMasterErr) {}

    // 1b. If not found in Master Vault mbi_users, check individual tenant vaults
    if (!authenticatedUser) {
      try {
        const master = getMasterVault();
        const allTenants: any[] = master.prepare("SELECT tenant_id FROM mbi_tenants").all();
        const tenantList = requestedTenantId ? [requestedTenantId] : Array.from(new Set(allTenants.map(t => t.tenant_id)));

        for (const tId of tenantList) {
          try {
            const vaultUsers = listTenantUsers(tId);
            const matched = vaultUsers.find(u => {
              const uIdent = (u.username || u.emailOrPhone || u.email || u.phone || u.name || u.id || '').toString().toLowerCase().trim();
              const inputIdent = inputEmailOrPhone.toLowerCase().trim();
              const identMatches = uIdent === inputIdent ||
                (u.username && String(u.username).toLowerCase().trim() === inputIdent) ||
                (u.emailOrPhone && String(u.emailOrPhone).toLowerCase().trim() === inputIdent) ||
                (u.email && String(u.email).toLowerCase().trim() === inputIdent) ||
                (u.phone && String(u.phone).trim() === inputIdent);

              const userPin = String(u.passcode || u.pin || '').trim();
              const pinMatches = userPin === inputPasscode;

              return identMatches && pinMatches && (u.status === 'Active' || u.status === 'Joined');
            });

            if (matched) {
              authenticatedUser = { ...matched, tenant_id: tId, tenantId: tId };
              break;
            }
          } catch (vErr) {}
        }
      } catch (sqliteErr) {}
    }

    // 2. Direct MariaDB verification if database is available
    if (!authenticatedUser && (await isMariaDbAvailable())) {
      try {
        const pool = getMariaDbPool();
        const [rows]: any = await pool.query(
          `SELECT * FROM mbi_users 
           WHERE (email_or_phone = ? OR name = ? OR username = ? OR email = ? OR phone = ?) 
             AND (passcode = ?) 
             AND (status = 'Active' OR status = 'Joined' OR status IS NULL) 
           LIMIT 1;`,
          [inputEmailOrPhone, inputEmailOrPhone, inputEmailOrPhone, inputEmailOrPhone, inputEmailOrPhone, inputPasscode]
        );

        if (rows && rows.length > 0) {
          authenticatedUser = rows[0];
        }
      } catch (dbErr: any) {
        // Fall through to in-memory/file check
      }
    }

    // 3. Fallback in-memory & sync storage check
    if (!authenticatedUser) {
      try {
        const fallbackUsers = getFallbackUsers(requestedTenantId || undefined);
        authenticatedUser = fallbackUsers.find((u: any) => {
          const uIdent = (u.username || u.emailOrPhone || u.email || u.phone || u.name || '').toString().toLowerCase().trim();
          const inputIdent = inputEmailOrPhone.toLowerCase().trim();
          const identMatches = uIdent === inputIdent ||
            (u.username && String(u.username).toLowerCase().trim() === inputIdent) ||
            (u.emailOrPhone && String(u.emailOrPhone).toLowerCase().trim() === inputIdent) ||
            (u.email && String(u.email).toLowerCase().trim() === inputIdent) ||
            (u.phone && String(u.phone).trim() === inputIdent);

          const userPin = String(u.passcode || u.pin || '').trim();
          const pinMatches = userPin === inputPasscode;

          return identMatches && pinMatches && (u.status === 'Active' || u.status === 'Joined' || !u.status);
        });
      } catch (e) {}
    }

    // 3. Fallback to .sync_data.json collections
    if (!authenticatedUser && fs.existsSync(syncFile)) {
      try {
        const syncData = JSON.parse(fs.readFileSync(syncFile, 'utf-8'));
        const candidateLists: any[] = [
          ...(syncData.mbi_users || []),
          ...(syncData.appUsers || []),
          ...(syncData.users || []),
          ...(syncData.registration_leads || []).map((l: any) => ({
            id: l.id || `usr_${l.id}`,
            tenant_id: l.tenantId || `tenant_${l.id}`,
            name: l.ownerName || l.storeName,
            username: l.username || l.ownerName,
            emailOrPhone: l.phone || l.email,
            email: l.email,
            phone: l.phone,
            role: 'Owner',
            status: 'Active',
            passcode: l.password || '1234'
          }))
        ];

        authenticatedUser = candidateLists.find((u: any) =>
          (
            u.emailOrPhone === inputEmailOrPhone ||
            u.email === inputEmailOrPhone ||
            u.phone === inputEmailOrPhone ||
            u.username === inputEmailOrPhone ||
            u.name === inputEmailOrPhone ||
            (u.emailOrPhone && String(u.emailOrPhone).toLowerCase() === inputEmailOrPhone.toLowerCase()) ||
            (u.username && String(u.username).toLowerCase() === inputEmailOrPhone.toLowerCase()) ||
            (u.email && String(u.email).toLowerCase() === inputEmailOrPhone.toLowerCase()) ||
            (u.name && String(u.name).toLowerCase() === inputEmailOrPhone.toLowerCase())
          ) &&
          (u.passcode === inputPasscode || u.pin === inputPasscode) &&
          (u.status === 'Active' || u.status === 'Joined' || !u.status)
        );
      } catch (e) {}
    }

    if (!authenticatedUser) {
      res.status(401).json({ success: false, error: 'Invalid credentials or inactive user account' });
      return;
    }

    // Kill switch security enforcement
    if (authenticatedUser.is_kill_switch_active === 1 || authenticatedUser.is_kill_switch_active === true) {
      res.status(403).json({ success: false, error: 'Account Remotely Suspended by Organization Admin' });
      return;
    }

    const tenantId = authenticatedUser.tenant_id || authenticatedUser.tenantId || 'tenant_main_pharmacy';

    // Cascade Suspension: If Company Tenant is suspended in MariaDB, block all staff & sub-users
    if (await isMariaDbAvailable()) {
      try {
        const pool = getMariaDbPool();
        const [tenantRows]: any = await pool.query(
          `SELECT status, is_active FROM mbi_tenants WHERE id = ? OR tenant_id = ? LIMIT 1;`,
          [tenantId, tenantId]
        );
        if (tenantRows && tenantRows.length > 0) {
          const tStatus = String(tenantRows[0].status || '').toLowerCase();
          const tActive = tenantRows[0].is_active;
          if (tStatus === 'suspended' || tStatus === 'deactivated' || tActive === 0) {
            res.status(403).json({
              success: false,
              error: 'Organization Suspended: The company subscription has been suspended by the Master Administrator. All cashier and staff terminal access is blocked.'
            });
            return;
          }
        }
      } catch (tErr) {}
    }

    // 1-Device Hard Binding Check via SQLite Master Hub & MariaDB
    try {
      const hwidCheck = validateAndBindHwidLock(
        tenantId,
        authenticatedUser.id,
        clientHwid,
        clientDeviceModel,
        clientOs,
        clientIp
      );

      if (!hwidCheck.allowed) {
        res.status(403).json({
          success: false,
          isDeviceUnbound: true,
          isUnauthorizedDevice: true,
          error: hwidCheck.error || 'Device Unauthorized: This account is locked to its registered primary device.',
          boundHwid: hwidCheck.boundHwid,
          currentHwid: clientHwid
        });
        return;
      }
    } catch (hwidErr) {}


    // Update is_online in background if MariaDB is active
    if (isMariaDbConnected()) {
      setImmediate(async () => {
        try {
          const pool = getMariaDbPool();
          pool.execute(
            'UPDATE mbi_users SET is_online = 1, last_login_at = CURRENT_TIMESTAMP WHERE id = ?;',
            [authenticatedUser.id]
          ).catch(() => {});

          if (clientHwid) {
            pool.query(
              `UPDATE mbi_licenses 
               SET bound_hwid = ?,
                   bound_hardware_ids = ?,
                   updated_at = CURRENT_TIMESTAMP 
               WHERE tenant_id = ? OR id = ? OR client_name = ?;`,
              [clientHwid, JSON.stringify([clientHwid]), tenantId, tenantId, tenantId]
            ).catch(() => {});

            pool.query(
              `UPDATE mbi_users 
               SET bound_hwid = ?, updated_at = CURRENT_TIMESTAMP 
               WHERE id = ?;`,
              [clientHwid, authenticatedUser.id]
            ).catch(() => {});
          }
        } catch {}
      });
    }

    // Extract authentic tenant plan and store name from Master DB or Tenant Vault
    let tenantPlan = 'Basic';
    let tenantStoreName = '';
    try {
      const masterDb = getMasterVault();
      const tRow: any = masterDb.prepare('SELECT name, plan, status FROM mbi_tenants WHERE id = ? OR tenant_id = ? LIMIT 1;').get(tenantId, tenantId);
      if (tRow) {
        if (tRow.name) tenantStoreName = tRow.name;
        if (tRow.plan) tenantPlan = tRow.plan;
      }
    } catch (e) {}

    // Fallback: Retrieve authentic store name from License or Tenant Vault
    if (!tenantStoreName) {
      try {
        const masterDb = getMasterVault();
        const licRow: any = masterDb.prepare('SELECT client_name, owner_name, plan FROM mbi_licenses WHERE tenant_id = ? LIMIT 1').get(tenantId);
        if (licRow?.client_name) {
          tenantStoreName = licRow.client_name;
        }
        if (licRow?.plan) {
          tenantPlan = licRow.plan;
        }
      } catch (e) {}
    }
    if (!tenantStoreName) {
      try {
        const tVault = getTenantVault(tenantId);
        const ownerRow: any = tVault.prepare("SELECT name, username FROM users WHERE is_primary_owner = 1 OR role IN ('Owner', 'Primary Admin') LIMIT 1").get();
        if (ownerRow?.name) {
          tenantStoreName = ownerRow.name;
        }
      } catch {}
    }
    if (!tenantStoreName) {
      tenantStoreName = authenticatedUser.storeName || authenticatedUser.store_name || (tenantId === 'tenant_main_pharmacy' ? 'Inventra Central Pharmacy' : 'Pharmacy Store');
    }

    // Register active device connection
    const deviceKey = `dev_${authenticatedUser.id}_${clientHwid.slice(-6)}`;
    const devRecord: ActiveDeviceRecord = {
      id: deviceKey,
      tenantId,
      storeName: tenantStoreName,
      userId: authenticatedUser.id,
      userName: authenticatedUser.name,
      userRole: authenticatedUser.role || 'Staff',
      hwid: clientHwid,
      deviceModel: clientDeviceModel,
      os: clientOs,
      ipAddress: clientIp,
      status: 'ONLINE',
      lastActive: new Date().toISOString(),
      locationCity: 'Pakistan'
    };
    activeDevicesRegistry.set(deviceKey, devRecord);

    // Broadcast live device connection event with HWID and IP to Master Fleet table in real time
    try {
      broadcastAdminEvent({
        type: 'DEVICE_LOGGED_IN',
        tenantId,
        device: devRecord,
        user: {
          id: authenticatedUser.id,
          name: authenticatedUser.name,
          role: authenticatedUser.role
        },
        timestamp: new Date().toISOString()
      });

      broadcastFleetActivity({
        id: `act_${Date.now()}`,
        tenantId,
        storeName: devRecord.storeName,
        userName: authenticatedUser.name,
        userRole: authenticatedUser.role || 'Staff',
        actionType: 'DEVICE_AUTH',
        actionDetails: `Staff terminal authenticated with HWID: ${clientHwid} (${clientDeviceModel})`,
        ipAddress: clientIp,
        deviceInfo: `${clientOs} • ${clientHwid}`,
        timestamp: new Date().toISOString(),
        relativeTime: 'Just now'
      });

      broadcastTenantEvent(tenantId, {
        type: 'STAFF_ONLINE_STATUS',
        entity: 'mbi_users',
        payload: {
          userId: authenticatedUser.id,
          isOnline: true,
          hwid: clientHwid,
          timestamp: new Date().toISOString()
        }
      });
    } catch (sseErr) {}

    const userRole = authenticatedUser.role || 'Cashier';
    const isOwnerOrPrimaryAdmin = (userRole || '').toLowerCase() === 'owner' || 
      (userRole || '').toLowerCase() === 'primary admin' || 
      (userRole || '').toLowerCase() === 'admin' ||
      authenticatedUser.is_primary_owner === 1;

    // Role-based permission defaults (Staff/Cashiers NEVER get ALL_PERMISSIONS)
    let resolvedPermissions: string[] = ['POS_BILLING', 'VIEW_SALES', 'CREATE_SALES', 'VIEW_PRODUCTS'];
    let resolvedAllowedModules: Record<string, boolean> = {
      dashboard: true,
      parties: true,
      items: true,
      sale: true,
      purchase: false,
      expenses: false,
      bank: false,
      reports: false,
      syncShare: false,
      backup: false,
      utilities: false,
      settings: false,
    };

    if (isOwnerOrPrimaryAdmin) {
      resolvedPermissions = ['ALL_PERMISSIONS'];
      resolvedAllowedModules = {
        dashboard: true,
        parties: true,
        items: true,
        sale: true,
        purchase: true,
        expenses: true,
        bank: true,
        reports: true,
        syncShare: true,
        backup: true,
        utilities: true,
        settings: true,
      };
    } else if (userRole.toLowerCase() === 'pharmacist') {
      resolvedPermissions = [
        'POS_BILLING', 'VIEW_SALES', 'CREATE_SALES', 'EDIT_SALES', 'VIEW_PRODUCTS',
        'MANAGE_PRODUCTS', 'PURCHASE_ENTRY', 'EXPENSES', 'BANK_MANAGEMENT', 'FINANCIAL_REPORTS',
        'CONTROLLED_DRUGS', 'BATCH_EXPIRY_MANAGEMENT', 'STORE_SETTINGS'
      ];
      resolvedAllowedModules = {
        dashboard: true,
        parties: true,
        items: true,
        sale: true,
        purchase: true,
        expenses: true,
        bank: true,
        reports: true,
        syncShare: false,
        backup: false,
        utilities: true,
        settings: true,
      };
    } else if (authenticatedUser.permissions) {
      resolvedPermissions = typeof authenticatedUser.permissions === 'string' 
        ? JSON.parse(authenticatedUser.permissions) 
        : authenticatedUser.permissions;
    } else if (authenticatedUser.allowed_modules) {
      const allowedArr = typeof authenticatedUser.allowed_modules === 'string'
        ? JSON.parse(authenticatedUser.allowed_modules)
        : authenticatedUser.allowed_modules;
      if (Array.isArray(allowedArr)) {
        resolvedPermissions = allowedArr;
      }
    }

    // Construct signed JWT payload
    const tokenPayload = {
      userId: authenticatedUser.id,
      tenantId,
      role: userRole,
      name: authenticatedUser.name,
      username: authenticatedUser.username || authenticatedUser.name,
      email: authenticatedUser.email_or_phone || authenticatedUser.email || authenticatedUser.phone,
      firmId: firmId || 'firm_main',
      deviceId: clientHwid,
      plan: tenantPlan,
      storeName: tenantStoreName,
      isPrimaryAdmin: isOwnerOrPrimaryAdmin,
      permissions: resolvedPermissions,
      allowedModules: resolvedAllowedModules
    };

    const token = signJwt(tokenPayload, 86400 * 7);

    res.json({
      success: true,
      token,
      user: {
        userId: tokenPayload.userId,
        id: tokenPayload.userId,
        tenantId: tokenPayload.tenantId,
        tenant_id: tokenPayload.tenantId,
        role: tokenPayload.role,
        name: tokenPayload.name,
        fullName: tokenPayload.name,
        username: tokenPayload.username,
        email: tokenPayload.email,
        phone: authenticatedUser.phone || '',
        firmId: tokenPayload.firmId,
        plan: tenantPlan,
        storeName: tenantStoreName,
        isPrimaryAdmin: tokenPayload.isPrimaryAdmin,
        isPrimaryOwner: Boolean(authenticatedUser.is_primary_owner === 1 || userRole === 'Owner'),
        permissions: tokenPayload.permissions,
        allowedModules: resolvedAllowedModules,
        hwid: clientHwid
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Login failed' });
  }
}

/**
 * Controller: Register 10-day trial tenant & Auto-Bind First Device with Full Basic Feature Set
 */
export async function registerTrialController(req: TenantRequest, res: Response): Promise<void> {
  try {
    const { storeName, ownerName, username, city, phone, email, password, plan, hwid, deviceId, deviceModel, os } = req.body;
    const cleanStoreName = (storeName || '').trim();
    const cleanOwnerName = (ownerName || cleanStoreName || 'Store Owner').trim();
    const cleanUsername = (username || cleanOwnerName.replace(/\s+/g, '').toLowerCase()).trim();
    const cleanCity = (city || 'Lahore').trim();
    const cleanPhone = (phone || '').trim();
    const cleanEmail = (email || `${cleanUsername || cleanPhone || 'user'}@inventra.local`).trim();
    const cleanPassword = (password || '1234').trim();

    // Capture or generate client HWID
    const clientHwid = (hwid || deviceId || `HWID-DEV1-${Math.random().toString(36).substring(2, 8).toUpperCase()}`).toUpperCase();
    const clientDeviceModel = deviceModel || (req.headers['user-agent']?.includes('Mobile') ? 'Android Terminal' : 'Primary POS Station');
    const clientOs = os || (req.headers['user-agent']?.includes('Windows') ? 'Windows 11' : 'Linux / Android / Web');
    const clientIp = req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';

    if (!cleanStoreName) {
      res.status(400).json({ success: false, error: 'Pharmacy / Store Name is required' });
      return;
    }

    if (!email || !email.trim()) {
      res.status(400).json({ success: false, error: 'Email Address is required' });
      return;
    }

    const tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const licenseId = `lic_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const generatedKey = `MBI-TR-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const trialExpiry = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    const registrationDate = new Date().toISOString();

    // Complete 10-Day Basic (Silver) feature set initialized immediately
    const basicTrialFeatures = {
      posBilling: true,
      barcodeScanner: true,
      medicineCatalog: true,
      inventoryBatches: true,
      khataLedgers: true,
      cashierShifts: true,
      thermalPrinting: true,
      offlineSync: true,
      expensesManagement: true
    };

    // 1. Direct SQLite Master Vault & Tenant Vault Provisioning (0ms native setup)
    try {
      const master = getMasterVault();
      const vault = getTenantVault(tenantId);

      // Master Tenants
      master.prepare(`
        INSERT INTO mbi_tenants (id, tenant_id, name, owner_name, owner_phone, owner_email, city, plan, status, trial_expires_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Basic', 'Active', ?, datetime('now'), datetime('now'))
        ON CONFLICT(tenant_id) DO UPDATE SET
          name = excluded.name,
          owner_name = excluded.owner_name,
          trial_expires_at = excluded.trial_expires_at,
          updated_at = datetime('now')
      `).run(tenantId, tenantId, cleanStoreName, cleanOwnerName, cleanPhone, cleanEmail, cleanCity, trialExpiry);

      // Master Licenses with Auto-Bound HWID #1
      master.prepare(`
        INSERT OR REPLACE INTO mbi_licenses (id, tenant_id, license_key, client_name, owner_name, phone, plan, status, expires_at, max_users, max_devices, bound_hwid, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'Basic', 'Active', ?, 10, 1, ?, datetime('now'))
      `).run(licenseId, tenantId, generatedKey, cleanStoreName, cleanOwnerName, cleanPhone, trialExpiry, clientHwid);

      // Master Registered Devices
      master.prepare(`
        INSERT INTO mbi_registered_devices (id, tenant_id, user_id, device_name, device_type, platform, hwid_fingerprint, installation_id, status, first_authorized_at, last_seen_at)
        VALUES (?, ?, ?, ?, 'Desktop', ?, ?, ?, 'Active', datetime('now'), datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          last_seen_at = datetime('now')
      `).run(`dev_${userId}_${clientHwid.slice(-6)}`, tenantId, userId, clientDeviceModel, clientOs, clientHwid, generatedKey);

      // Isolated Tenant Vault Primary Owner
      vault.prepare(`
        INSERT INTO users (id, name, username, email_or_phone, email, phone, passcode, role, is_primary_owner, is_active, is_online, permissions, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Owner', 1, 1, 1, '{"ALL_PERMISSIONS":true}', datetime('now'), datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          passcode = excluded.passcode,
          is_active = 1
      `).run(userId, cleanOwnerName || cleanUsername, cleanUsername, cleanPhone || cleanEmail, cleanEmail, cleanPhone, cleanPassword);
    } catch (vaultErr) {
      console.warn('[SQLITE VAULT PROVISION NOTICE]:', vaultErr);
    }

    // 2. Persist to MariaDB in background if database connection is active
    if (isMariaDbConnected()) {
      setImmediate(async () => {
        try {
          const pool = getMariaDbPool();

          // Insert License with First-Device Auto-Binding
          try {
            await pool.query(
              `INSERT INTO mbi_licenses (
                 id, tenant_id, license_key, client_name, owner_name, phone, city, plan, status, 
                 issue_date, expiry_date, max_devices, bound_hwid, bound_hardware_ids
               ) VALUES (
                 ?, ?, ?, ?, ?, ?, ?, 'Basic', 'Active',
                 CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL 10 DAY), 10, ?, ?
               )
               ON DUPLICATE KEY UPDATE 
                 bound_hwid = VALUES(bound_hwid),
                 bound_hardware_ids = VALUES(bound_hardware_ids),
                 status = 'Active',
                 plan = 'Basic',
                 expiry_date = VALUES(expiry_date);`,
              [licenseId, tenantId, generatedKey, cleanStoreName, cleanOwnerName, cleanPhone, cleanCity, clientHwid, JSON.stringify([clientHwid])]
            );
          } catch {
            await pool.query(
              `INSERT INTO mbi_licenses (
                 id, tenant_id, license_key, client_name, owner_name, phone, city, plan, status, 
                 issue_date, expiry_date, max_devices, bound_hardware_ids
               ) VALUES (
                 ?, ?, ?, ?, ?, ?, ?, 'Basic', 'Active',
                 CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL 10 DAY), 10, ?
               )
               ON DUPLICATE KEY UPDATE 
                 bound_hardware_ids = VALUES(bound_hardware_ids),
                 status = 'Active',
                 plan = 'Basic',
                 expiry_date = VALUES(expiry_date);`,
              [licenseId, tenantId, generatedKey, cleanStoreName, cleanOwnerName, cleanPhone, cleanCity, JSON.stringify([clientHwid])]
            ).catch(() => {});
          }

          // Insert Tenant with Basic Plan and Active Status
          await pool.query(
            `INSERT INTO mbi_tenants (
               id, tenant_id, organization_id, name, city, owner_name, owner_email, owner_phone, contact_phone, contact_email, 
               plan, plan_id, status, subscription_plan, subscription_status, storage_limit_mb, trial_expires_at, is_active, created_at, updated_at
             ) VALUES (
               ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
               'Basic', 'Basic', 'Active', 'Basic', 'Active', 5000, DATE_ADD(CURRENT_DATE, INTERVAL 10 DAY), 1, NOW(), CURRENT_TIMESTAMP
             )
             ON DUPLICATE KEY UPDATE 
               tenant_id = COALESCE(VALUES(tenant_id), tenant_id, id),
               organization_id = COALESCE(VALUES(organization_id), organization_id, id),
               name = VALUES(name),
               plan = 'Basic',
               plan_id = 'Basic',
               status = 'Active',
               subscription_plan = 'Basic',
               subscription_status = 'Active',
               trial_expires_at = VALUES(trial_expires_at),
               updated_at = CURRENT_TIMESTAMP;`,
            [tenantId, tenantId, tenantId, cleanStoreName, cleanCity, cleanOwnerName, cleanEmail, cleanPhone, cleanPhone, cleanEmail]
          ).catch((err) => {
            console.warn('[REGISTER TENANT DB NOTICE]:', err?.message);
          });

          // Insert Primary Admin User
          await pool.query(
            `INSERT INTO mbi_users (
               id, tenant_id, name, username, email_or_phone, email, phone, passcode, role, is_primary_owner, is_primary_admin, is_online, status, is_kill_switch_active, created_at, updated_at
             ) VALUES (
               ?, ?, ?, ?, ?, ?, ?, ?, 'Owner', 1, 1, 1, 'Active', 0, NOW(), CURRENT_TIMESTAMP
             )
             ON DUPLICATE KEY UPDATE 
               name = VALUES(name),
               username = VALUES(username),
               passcode = VALUES(passcode),
               status = 'Active',
               is_online = 1,
               updated_at = CURRENT_TIMESTAMP;`,
            [userId, tenantId, cleanOwnerName || cleanUsername, cleanUsername, cleanPhone || cleanEmail || cleanUsername, cleanEmail, cleanPhone, cleanPassword]
          ).catch((err) => {
            console.warn('[REGISTER USER DB NOTICE]:', err?.message);
          });

          // Insert Registration Lead for WhatsApp trial leads dashboard
          const leadId = `lead_${Date.now()}`;
          await pool.query(
            `INSERT INTO mbi_registration_leads (
               id, store_name, owner_name, username, phone, email, city, requested_plan, status, is_approved, activation_key, submitted_at, activated_at
             ) VALUES (
               ?, ?, ?, ?, ?, ?, ?, 'Basic (10-Day Free Trial)', 'activated', 1, ?, ?, ?
             )
             ON DUPLICATE KEY UPDATE 
               store_name = VALUES(store_name),
               status = 'activated',
               is_approved = 1,
               activated_at = VALUES(activated_at);`,
            [leadId, cleanStoreName, cleanOwnerName, cleanUsername, cleanPhone, cleanEmail, cleanCity, generatedKey, registrationDate, registrationDate]
          ).catch(() => {});

          // Insert Registered Device in mbi_devices
          const deviceId = `dev_${userId}_${clientHwid.slice(-6)}`;
          await pool.query(
            `INSERT INTO mbi_devices (
               id, tenant_id, user_id, device_name, device_type, platform, browser_info, os, hwid, installation_id, authorization_key, status, first_authorized_at, last_seen_at
             ) VALUES (
               ?, ?, ?, ?, 'Desktop', 'Windows', 'Web Terminal', ?, ?, ?, ?, 'Active', ?, ?
             )
             ON DUPLICATE KEY UPDATE 
               status = 'Active',
               last_seen_at = CURRENT_TIMESTAMP;`,
            [deviceId, tenantId, userId, clientDeviceModel, clientOs, clientHwid, clientHwid, generatedKey, registrationDate, registrationDate]
          ).catch(() => {});
        } catch (dbErr: any) {
          // Ignored
        }
      });
    }

    // 2. Update local sync file cache (.sync_data.json and .master_users.json)
    const newLicense = {
      id: licenseId,
      tenantId,
      licenseKey: generatedKey,
      clientName: cleanStoreName,
      ownerName: cleanOwnerName,
      phone: cleanPhone,
      city: cleanCity,
      plan: 'Basic',
      status: 'Active',
      issueDate: registrationDate.slice(0, 10),
      expiryDate: trialExpiry.slice(0, 10),
      maxDevices: 10,
      boundHardwareIds: [clientHwid]
    };

    const newTenant = {
      id: tenantId,
      tenantId,
      name: cleanStoreName,
      ownerName: cleanOwnerName,
      ownerPhone: cleanPhone,
      ownerEmail: cleanEmail,
      city: cleanCity,
      planId: 'Basic',
      plan: 'Basic',
      status: 'Active',
      subscriptionStatus: 'Active',
      trialExpiresAt: trialExpiry,
      features: basicTrialFeatures
    };

    const newUser = {
      id: userId,
      tenantId,
      tenant_id: tenantId,
      name: cleanOwnerName || cleanUsername,
      username: cleanUsername,
      emailOrPhone: cleanPhone || cleanEmail || cleanUsername,
      email: cleanEmail,
      phone: cleanPhone,
      passcode: cleanPassword,
      role: 'Owner',
      status: 'Active',
      isPrimaryOwner: 1,
      is_primary_owner: 1,
      isPrimaryAdmin: 1,
      is_primary_admin: 1,
      isOnline: true,
      is_online: 1
    };

    const newLead = {
      id: `lead_${Date.now()}`,
      storeName: cleanStoreName,
      ownerName: cleanOwnerName,
      username: cleanUsername,
      phone: cleanPhone,
      city: cleanCity,
      email: cleanEmail,
      requestedPlan: 'Basic (10-Day Free Trial)',
      status: 'activated',
      isApproved: true,
      activationKey: generatedKey,
      submittedAt: registrationDate,
      activatedAt: registrationDate
    };

    // Non-blocking background sync for legacy JSON files
    setImmediate(() => {
      try {
        let syncData: any = {};
        if (fs.existsSync(syncFile)) {
          const raw = fs.readFileSync(syncFile, 'utf-8');
          syncData = JSON.parse(raw);
        }
        if (!syncData.mbi_licenses) syncData.mbi_licenses = [];
        if (!syncData.mbi_tenants) syncData.mbi_tenants = [];
        if (!syncData.mbi_users) syncData.mbi_users = [];
        if (!syncData.appUsers) syncData.appUsers = [];
        if (!syncData.tenants) syncData.tenants = [];
        if (!syncData.client_licenses) syncData.client_licenses = [];
        if (!syncData.registration_leads) syncData.registration_leads = [];
        if (!syncData.mbi_registration_leads) syncData.mbi_registration_leads = [];

        syncData.mbi_licenses.push(newLicense);
        syncData.client_licenses.push(newLicense);
        syncData.mbi_tenants.push(newTenant);
        syncData.tenants.push(newTenant);
        syncData.mbi_users.push(newUser);
        syncData.appUsers.push(newUser);
        syncData.registration_leads.push(newLead);
        syncData.mbi_registration_leads.push(newLead);

        fs.writeFileSync(syncFile, JSON.stringify(syncData, null, 2), 'utf-8');
      } catch (fsErr) {}

      // Update .master_users.json for Master Governance Hub
      try {
        const masterUsersFile = path.resolve(process.cwd(), '.master_users.json');
        let masterUsers: any[] = [];
        if (fs.existsSync(masterUsersFile)) {
          masterUsers = JSON.parse(fs.readFileSync(masterUsersFile, 'utf-8'));
        }
        masterUsers = masterUsers.filter(u => u.id !== userId);
        masterUsers.push(newUser);
        fs.writeFileSync(masterUsersFile, JSON.stringify(masterUsers, null, 2), 'utf-8');
      } catch (muErr) {}
    });

    // 3. Auto-Register First Device in Live Telemetry
    const deviceKey = `dev_${userId}_${clientHwid.slice(-6)}`;
    const devRecord: ActiveDeviceRecord = {
      id: deviceKey,
      tenantId,
      storeName: cleanStoreName,
      userId,
      userName: cleanOwnerName,
      userRole: 'Primary Owner',
      hwid: clientHwid,
      deviceModel: clientDeviceModel,
      os: clientOs,
      ipAddress: clientIp,
      status: 'ONLINE',
      lastActive: new Date().toISOString(),
      locationCity: cleanCity
    };
    activeDevicesRegistry.set(deviceKey, devRecord);

    // 4. Broadcast live registration & telemetry to Master Hub & Fleet tables
    try {
      broadcastAdminEvent({
        type: 'TENANT_REGISTERED',
        tenant: newTenant,
        user: newUser,
        license: newLicense,
        lead: newLead,
        device: devRecord,
        timestamp: new Date().toISOString()
      });

      broadcastFleetActivity({
        id: `act_${Date.now()}`,
        tenantId,
        storeName: cleanStoreName,
        userName: cleanOwnerName,
        userRole: 'Owner',
        actionType: 'NEW_REGISTRATION',
        actionDetails: `10-Day Basic Trial registered for ${cleanStoreName} (${cleanCity}). Device #1 (${clientHwid}) auto-bound.`,
        ipAddress: clientIp,
        deviceInfo: `${clientOs} • ${clientHwid}`,
        timestamp: new Date().toISOString(),
        relativeTime: 'Just now'
      });

      broadcastTenantEvent(tenantId, {
        type: 'TENANT_PROVISIONED',
        entity: 'mbi_tenants',
        payload: {
          tenantId,
          storeName: cleanStoreName,
          licenseKey: generatedKey,
          hwid: clientHwid,
          timestamp: new Date().toISOString()
        }
      });
    } catch (sseErr) {}

    // 5. Automated Background Email Dispatch (100% Free Gmail SMTP)
    setImmediate(async () => {
      try {
        // Alert Super Admin (mbiinventra@gmail.com)
        await sendAdminAlertNewTenant({
          storeName: cleanStoreName,
          ownerName: cleanOwnerName || cleanUsername,
          username: cleanUsername,
          phone: cleanPhone,
          email: cleanEmail,
          city: cleanCity,
          plan: 'Basic (10-Day Free Trial)',
          tenantId
        });

        // Welcome Email to Pharmacy Customer
        if (cleanEmail && cleanEmail.includes('@')) {
          await sendTenantWelcomeEmail({
            toEmail: cleanEmail,
            storeName: cleanStoreName,
            ownerName: cleanOwnerName || cleanUsername,
            username: cleanUsername,
            pin: cleanPassword,
            portalUrl: (req.headers.origin as string) || 'https://mbiinventra.com'
          });
        }
      } catch (emailErr) {
        console.warn('[AUTO EMAIL DISPATCH NOTICE]:', emailErr);
      }
    });

    // Construct signed JWT token for immediate auto-login
    const tokenPayload = {
      userId,
      tenantId,
      role: 'Primary Admin',
      name: cleanOwnerName || cleanUsername,
      username: cleanUsername,
      email: cleanEmail,
      firmId: 'firm_main',
      deviceId: clientHwid,
      plan: 'Basic',
      storeName: cleanStoreName,
      isPrimaryAdmin: true,
      permissions: ['ALL_PERMISSIONS'],
      allowedModules: {
        dashboard: true,
        parties: true,
        items: true,
        sale: true,
        purchase: true,
        expenses: true,
        bank: true,
        reports: true,
        syncShare: true,
        backup: true,
        utilities: true,
        settings: true,
      }
    };
    const token = signJwt(tokenPayload, 86400 * 7);

    res.json({
      success: true,
      token,
      message: '10-Day Free Trial registered successfully! Device #1 auto-bound as Primary Terminal.',
      tenantId,
      userId,
      licenseId,
      licenseKey: generatedKey,
      plan: 'Basic',
      status: 'Active',
      hwid: clientHwid,
      boundHardwareIds: [clientHwid],
      trialExpiresAt: trialExpiry,
      storeName: cleanStoreName,
      ownerName: cleanOwnerName,
      features: basicTrialFeatures,
      user: {
        userId,
        id: userId,
        tenantId,
        tenant_id: tenantId,
        role: 'Primary Admin',
        name: cleanOwnerName || cleanUsername,
        fullName: cleanOwnerName || cleanUsername,
        username: cleanUsername,
        email: cleanEmail,
        phone: cleanPhone,
        firmId: 'firm_main',
        plan: 'Basic',
        storeName: cleanStoreName,
        isPrimaryAdmin: true,
        isPrimaryOwner: true,
        permissions: ['ALL_PERMISSIONS'],
        allowedModules: tokenPayload.allowedModules,
        hwid: clientHwid
      },
      tenant: {
        id: tenantId,
        tenantId,
        organizationId: `org_${tenantId}`,
        licenseId,
        name: cleanStoreName,
        ownerName: cleanOwnerName,
        ownerEmail: cleanEmail,
        ownerPhone: cleanPhone,
        city: cleanCity,
        plan: 'Basic',
        status: 'Active',
        trialStartDate: registrationDate,
        trialExpiryDate: trialExpiry,
        isTrialActive: true,
        trialExpired: false,
        paidLicenseActive: false,
        maxDevices: 1,
        maxUsers: 5,
        features: basicTrialFeatures
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Registration failed' });
  }
}

export const registerController = registerTrialController;

// In-memory OTP registry for Password Reset
interface PasswordResetOtpEntry {
  email: string;
  username: string;
  userName: string;
  otp: string;
  expiresAt: number;
  userId?: string;
  tenantId?: string;
}

const passwordResetOtpMap = new Map<string, PasswordResetOtpEntry>();

function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const name = parts[0];
  const domain = parts[1];
  const maskedName = name.length <= 2 ? name + '***' : name.slice(0, 2) + '***' + name.slice(-1);
  return `${maskedName}@${domain}`;
}

/**
 * Controller: Request Password Reset OTP via Email
 * POST /api/auth/forgot-password
 */
export async function forgotPasswordController(req: TenantRequest, res: Response): Promise<void> {
  try {
    const { identifier } = req.body;
    const cleanId = (identifier || '').trim().toLowerCase();

    if (!cleanId) {
      res.status(400).json({ success: false, error: 'Please enter your registered Email, Username, or Mobile.' });
      return;
    }

    let targetEmail = '';
    let targetUserName = 'User';
    let targetUserId = '';
    let targetTenantId = '';
    let targetUsername = cleanId;

    // Resilient digits for phone matching
    const rawDigits = cleanId.replace(/\D/g, '');
    const searchDigits = rawDigits.length >= 7 ? rawDigits.slice(-10) : '';

    // 1. Check Master SQLite Vault mbi_users
    try {
      const master = getMasterVault();
      const allUsers: any[] = master.prepare(`
        SELECT * FROM mbi_users
      `).all();

      const user = allUsers.find(u => {
        const uEmail = (u.email || '').toLowerCase().trim();
        const uUser = (u.username || '').toLowerCase().trim();
        const uPhone = (u.phone || '').replace(/\D/g, '');
        const uName = (u.name || '').toLowerCase().trim();
        const uId = (u.id || '').toLowerCase().trim();

        if (uEmail === cleanId || uUser === cleanId || uName === cleanId || uId === cleanId) return true;
        if (searchDigits && uPhone && (uPhone.endsWith(searchDigits) || searchDigits.endsWith(uPhone))) return true;
        return false;
      });

      if (user) {
        targetEmail = user.email || '';
        targetUserName = user.name || user.username || 'User';
        targetUserId = user.id;
        targetTenantId = user.tenant_id;
        targetUsername = user.username || cleanId;
      }
    } catch (e) {}

    // 2. Check Tenants table if user email not found
    if (!targetEmail) {
      try {
        const master = getMasterVault();
        const allTenants: any[] = master.prepare(`SELECT * FROM mbi_tenants`).all();

        const tenant = allTenants.find(t => {
          const tEmail = (t.owner_email || t.primary_admin_email || '').toLowerCase().trim();
          const tUser = (t.username || '').toLowerCase().trim();
          const tPhone = (t.owner_phone || '').replace(/\D/g, '');
          const tName = (t.name || t.owner_name || '').toLowerCase().trim();
          const tId = (t.tenant_id || '').toLowerCase().trim();

          if (tEmail === cleanId || tUser === cleanId || tName === cleanId || tId === cleanId) return true;
          if (searchDigits && tPhone && (tPhone.endsWith(searchDigits) || searchDigits.endsWith(tPhone))) return true;
          return false;
        });

        if (tenant) {
          targetEmail = tenant.owner_email || tenant.primary_admin_email || '';
          targetUserName = tenant.owner_name || tenant.name || 'Owner';
          targetTenantId = tenant.tenant_id;
          targetUsername = tenant.username || cleanId;
        }
      } catch (e) {}
    }

    // 3. Check individual Tenant Vaults
    if (!targetEmail) {
      try {
        const master = getMasterVault();
        const allTenants: any[] = master.prepare("SELECT tenant_id FROM mbi_tenants").all();
        for (const t of allTenants) {
          try {
            const vaultUsers = listTenantUsers(t.tenant_id);
            const matched = vaultUsers.find(u => {
              const uEmail = (u.email || u.emailOrPhone || '').toLowerCase().trim();
              const uUser = (u.username || '').toLowerCase().trim();
              const uPhone = (u.phone || '').replace(/\D/g, '');
              const uName = (u.name || '').toLowerCase().trim();

              if (uEmail === cleanId || uUser === cleanId || uName === cleanId) return true;
              if (searchDigits && uPhone && (uPhone.endsWith(searchDigits) || searchDigits.endsWith(uPhone))) return true;
              return false;
            });

            if (matched) {
              targetEmail = matched.email || (matched.emailOrPhone && matched.emailOrPhone.includes('@') ? matched.emailOrPhone : '');
              targetUserName = matched.name || matched.username || 'User';
              targetUserId = matched.id;
              targetTenantId = t.tenant_id;
              targetUsername = matched.username || cleanId;
              break;
            }
          } catch (tErr) {}
        }
      } catch (e) {}
    }

    // 4. Fallback: If user typed an email directly
    if (!targetEmail && cleanId.includes('@')) {
      targetEmail = cleanId;
      targetUserName = cleanId.split('@')[0];
    }

    if (!targetEmail || !targetEmail.includes('@')) {
      res.status(404).json({
        success: false,
        noEmail: true,
        error: 'No registered email found for this account/number. Please use WhatsApp Support (+92 328 1302636) to recover your account.'
      });
      return;
    }

    // Generate 6-digit secure numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    const otpEntry: PasswordResetOtpEntry = {
      email: targetEmail.toLowerCase().trim(),
      username: targetUsername,
      userName: targetUserName,
      otp,
      expiresAt,
      userId: targetUserId,
      tenantId: targetTenantId
    };

    passwordResetOtpMap.set(targetEmail.toLowerCase().trim(), otpEntry);
    if (targetUsername) {
      passwordResetOtpMap.set(targetUsername.toLowerCase().trim(), otpEntry);
    }
    if (cleanId) {
      passwordResetOtpMap.set(cleanId, otpEntry);
    }

    // Dispatch OTP Email
    const emailResult = await sendPasswordResetOtpEmail({
      toEmail: targetEmail,
      userName: targetUserName,
      otpCode: otp,
      expiresMinutes: 15
    });

    if (!emailResult.success) {
      console.warn('[FORGOT PASSWORD EMAIL NOTICE]: Could not send email directly:', emailResult.error);
    }

    res.json({
      success: true,
      message: `A 6-digit password recovery code has been sent to ${maskEmail(targetEmail)}.`,
      maskedEmail: maskEmail(targetEmail),
      targetEmail: targetEmail
    });

  } catch (err: any) {
    console.error('[FORGOT PASSWORD CONTROLLER ERROR]:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to process password recovery request' });
  }
}

/**
 * Controller: Verify OTP & Set New Password
 * POST /api/auth/verify-reset-otp
 */
export async function verifyResetOtpController(req: TenantRequest, res: Response): Promise<void> {
  try {
    const { identifier, otp, newPassword } = req.body;
    const cleanId = (identifier || '').trim().toLowerCase();
    const cleanOtp = (otp || '').trim();
    const cleanPass = (newPassword || '').trim();

    if (!cleanId || !cleanOtp || !cleanPass) {
      res.status(400).json({ success: false, error: 'Verification code and new password are required.' });
      return;
    }

    if (cleanPass.length < 4) {
      res.status(400).json({ success: false, error: 'New password must be at least 4 characters long.' });
      return;
    }

    const entry = passwordResetOtpMap.get(cleanId);
    if (!entry) {
      res.status(400).json({ success: false, error: 'Invalid or expired recovery session. Please request a new code.' });
      return;
    }

    if (Date.now() > entry.expiresAt) {
      passwordResetOtpMap.delete(cleanId);
      res.status(400).json({ success: false, error: 'Verification code has expired. Please request a new code.' });
      return;
    }

    if (entry.otp !== cleanOtp) {
      res.status(400).json({ success: false, error: 'Invalid 6-digit verification code. Please check your email and try again.' });
      return;
    }

    // Update password in SQLite Master Vault
    try {
      const master = getMasterVault();
      master.prepare(`
        UPDATE mbi_users 
        SET passcode = ?, pin = ?
        WHERE LOWER(email) = ? OR LOWER(username) = ? OR id = ?
      `).run(cleanPass, cleanPass, entry.email.toLowerCase(), entry.username.toLowerCase(), entry.userId || '');
    } catch (dbErr) {}

    // Update in individual tenant vault if tenant exists
    if (entry.tenantId) {
      try {
        const tenantDb = getTenantVault(entry.tenantId);
        tenantDb.prepare(`
          UPDATE mbi_users 
          SET passcode = ?, pin = ?
          WHERE LOWER(email) = ? OR LOWER(username) = ? OR id = ?
        `).run(cleanPass, cleanPass, entry.email.toLowerCase(), entry.username.toLowerCase(), entry.userId || '');
      } catch (tDbErr) {}
    }

    // Clean up OTP session
    passwordResetOtpMap.delete(cleanId);
    if (entry.email) passwordResetOtpMap.delete(entry.email.toLowerCase().trim());
    if (entry.username) passwordResetOtpMap.delete(entry.username.toLowerCase().trim());

    res.json({
      success: true,
      message: 'Password has been reset successfully! You can now log in with your new password.'
    });
  } catch (err: any) {
    console.error('[VERIFY RESET OTP ERROR]:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to reset password' });
  }
}
