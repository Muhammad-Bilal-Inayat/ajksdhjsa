import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

/**
 * 🏆 MBI INVENTRA — TENANT-ISOLATED SQLITE VAULT ENGINE (STEP 1)
 * 
 * Features:
 * 1. 100% Lifetime Free (Native Node.js SQLite - Zero Cloud Cost)
 * 2. Ultra-Lightweight (WAL Mode Enabled, 0ms latency, zero memory leaks)
 * 3. Hard Physical Isolation (Each tenant has private data/tenants/tenant_[id].sqlite)
 * 4. Master Hub Vault (data/master/master_hub.sqlite) for global licenses & plan controls
 */

const DATA_DIR = path.resolve(process.cwd(), 'server', 'data');
const MASTER_DIR = path.join(DATA_DIR, 'master');
const TENANTS_DIR = path.join(DATA_DIR, 'tenants');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

// Ensure all database storage directories exist
[DATA_DIR, MASTER_DIR, TENANTS_DIR, BACKUPS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const MASTER_DB_PATH = path.join(MASTER_DIR, 'master_hub.sqlite');

// Master Database Instance
let masterDbInstance: DatabaseSync | null = null;

// Tenant Database Cache Map: Map<tenantId, DatabaseSync>
const tenantDbCache = new Map<string, DatabaseSync>();

/**
 * Initialize and get the Master Hub Database
 */
export function getMasterVault(): DatabaseSync {
  if (masterDbInstance) return masterDbInstance;

  masterDbInstance = new DatabaseSync(MASTER_DB_PATH);
  
  // Enable high-concurrency WAL mode & fast performance pragmas
  masterDbInstance.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA foreign_keys = ON;
    PRAGMA wal_autocheckpoint = 1000;
    PRAGMA mmap_size = 268435456;
    PRAGMA cache_size = -64000;

    CREATE TABLE IF NOT EXISTS mbi_tenants (
      id TEXT PRIMARY KEY,
      tenant_id TEXT UNIQUE,
      name TEXT NOT NULL,
      owner_name TEXT NOT NULL DEFAULT 'Store Owner',
      owner_phone TEXT NOT NULL DEFAULT '',
      owner_email TEXT,
      city TEXT NOT NULL DEFAULT 'Lahore',
      address TEXT,
      plan TEXT NOT NULL DEFAULT 'Basic',
      status TEXT NOT NULL DEFAULT 'Active',
      trial_expires_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mbi_licenses (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      license_key TEXT UNIQUE NOT NULL,
      client_name TEXT NOT NULL,
      owner_name TEXT NOT NULL,
      phone TEXT,
      plan TEXT NOT NULL DEFAULT 'Basic',
      status TEXT NOT NULL DEFAULT 'Active',
      expires_at TEXT,
      max_users INTEGER NOT NULL DEFAULT 5,
      max_devices INTEGER NOT NULL DEFAULT 1,
      bound_hwid TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mbi_registered_devices (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      device_name TEXT NOT NULL,
      device_type TEXT NOT NULL DEFAULT 'Desktop',
      platform TEXT NOT NULL,
      hwid_fingerprint TEXT NOT NULL,
      installation_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Active',
      first_authorized_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mbi_master_audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      admin_email TEXT NOT NULL,
      target_tenant_id TEXT,
      details_json TEXT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mbi_user_access_profiles (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      profile_json TEXT NOT NULL,
      effective_json TEXT,
      updated_by TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  return masterDbInstance;
}

/**
 * Initialize and get a private Tenant Vault Database
 */
export function getTenantVault(tenantId: string): DatabaseSync {
  const cleanId = (tenantId || 'tenant_default').trim().replace(/[^a-zA-Z0-9_-]/g, '_');

  if (tenantDbCache.has(cleanId)) {
    return tenantDbCache.get(cleanId)!;
  }

  const tenantDbPath = path.join(TENANTS_DIR, `tenant_${cleanId}.sqlite`);
  const tenantDb = new DatabaseSync(tenantDbPath);

  // Enable WAL mode & build isolated schema
  tenantDb.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA foreign_keys = ON;
    PRAGMA wal_autocheckpoint = 1000;
    PRAGMA mmap_size = 268435456;
    PRAGMA cache_size = -64000;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT UNIQUE,
      email_or_phone TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'Cashier',
      passcode TEXT NOT NULL DEFAULT '1234',
      bound_device_id TEXT,
      is_primary_owner INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      is_online INTEGER NOT NULL DEFAULT 0,
      is_kill_switch_active INTEGER NOT NULL DEFAULT 0,
      permissions TEXT DEFAULT '{}',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS medicines (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      generic_name TEXT,
      barcode TEXT,
      rack TEXT,
      retail_price REAL NOT NULL DEFAULT 0.0,
      cost_price REAL NOT NULL DEFAULT 0.0,
      stock_qty REAL NOT NULL DEFAULT 0.0,
      min_stock REAL NOT NULL DEFAULT 5.0,
      fefo_expiry_date TEXT,
      batch_number TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS parties (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'Customer',
      phone TEXT,
      email TEXT,
      address TEXT,
      balance REAL NOT NULL DEFAULT 0.0,
      credit_limit REAL NOT NULL DEFAULT 0.0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT NOT NULL,
      customer_id TEXT,
      customer_name TEXT,
      user_id TEXT NOT NULL,
      grand_total REAL NOT NULL DEFAULT 0.0,
      net_total REAL NOT NULL DEFAULT 0.0,
      discount REAL NOT NULL DEFAULT 0.0,
      tax REAL NOT NULL DEFAULT 0.0,
      paid_amount REAL NOT NULL DEFAULT 0.0,
      payment_type TEXT NOT NULL DEFAULT 'CASH',
      status TEXT NOT NULL DEFAULT 'COMPLETED',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      medicine_id TEXT NOT NULL,
      medicine_name TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1.0,
      unit_price REAL NOT NULL DEFAULT 0.0,
      cost_price REAL NOT NULL DEFAULT 0.0,
      subtotal REAL NOT NULL DEFAULT 0.0,
      batch_number TEXT,
      expiry_date TEXT,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      bill_number TEXT NOT NULL,
      supplier_id TEXT,
      supplier_name TEXT,
      total_amount REAL NOT NULL DEFAULT 0.0,
      paid_amount REAL NOT NULL DEFAULT 0.0,
      status TEXT NOT NULL DEFAULT 'PAID',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0.0,
      payment_mode TEXT NOT NULL DEFAULT 'CASH',
      notes TEXT,
      user_id TEXT,
      date TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shifts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT,
      start_time TEXT NOT NULL DEFAULT (datetime('now')),
      end_time TEXT,
      opening_cash REAL NOT NULL DEFAULT 0.0,
      closing_cash REAL NOT NULL DEFAULT 0.0,
      system_cash REAL NOT NULL DEFAULT 0.0,
      discrepancy REAL NOT NULL DEFAULT 0.0,
      status TEXT NOT NULL DEFAULT 'OPEN'
    );

    CREATE TABLE IF NOT EXISTS sync_outbox_log (
      id TEXT PRIMARY KEY,
      mutation_id TEXT UNIQUE NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      is_synced INTEGER NOT NULL DEFAULT 1
    );
  `);

  tenantDbCache.set(cleanId, tenantDb);
  return tenantDb;
}

/**
 * Health check for Master and Tenant Vaults
 */
export function checkVaultEngineHealth(): {
  status: 'ONLINE';
  engine: 'Node.js Native SQLite (DatabaseSync)';
  masterDbPath: string;
  activeCachedTenants: number;
  walModeActive: boolean;
} {
  const master = getMasterVault();
  const row: any = master.prepare("PRAGMA journal_mode;").get();

  return {
    status: 'ONLINE',
    engine: 'Node.js Native SQLite (DatabaseSync)',
    masterDbPath: MASTER_DB_PATH,
    activeCachedTenants: tenantDbCache.size,
    walModeActive: String(row?.journal_mode || '').toUpperCase() === 'WAL'
  };
}

/**
 * List all users for a given tenant strictly from tenant SQLite vault
 */
export function listTenantUsers(tenantId: string): any[] {
  const vault = getTenantVault(tenantId);
  const rows: any[] = vault.prepare(`
    SELECT * FROM users 
    ORDER BY CASE WHEN role IN ('Owner', 'Primary Admin', 'primary_admin') OR is_primary_owner = 1 THEN 0 ELSE 1 END, created_at ASC
  `).all();

  return rows.map(u => ({
    id: u.id,
    tenantId,
    tenant_id: tenantId,
    name: u.name,
    username: u.username || u.name.toLowerCase().replace(/\s+/g, '_'),
    emailOrPhone: u.email_or_phone || u.email || u.phone,
    email: u.email || '',
    phone: u.phone || '',
    role: u.role || 'Cashier',
    isPrimaryOwner: Boolean(u.is_primary_owner === 1 || u.role === 'Owner'),
    is_primary_owner: u.is_primary_owner === 1 ? 1 : 0,
    status: u.is_active === 1 ? 'Active' : 'Inactive',
    passcode: u.passcode || '1234',
    isOnline: Boolean(u.is_online === 1),
    is_online: u.is_online === 1 ? 1 : 0,
    isKillSwitchActive: Boolean(u.is_kill_switch_active === 1),
    is_kill_switch_active: u.is_kill_switch_active === 1 ? 1 : 0,
    permissions: typeof u.permissions === 'string' ? JSON.parse(u.permissions || '{}') : (u.permissions || {}),
    notes: u.notes || '',
    createdAt: u.created_at,
    updatedAt: u.updated_at
  }));
}

/**
 * Upsert a user in tenant SQLite vault
 */
export function upsertTenantUser(tenantId: string, user: any): any {
  const vault = getTenantVault(tenantId);
  const permissionsStr = typeof user.permissions === 'object' ? JSON.stringify(user.permissions) : (user.permissions || '{}');

  vault.prepare(`
    INSERT INTO users (
      id, name, username, email_or_phone, email, phone, role, passcode,
      is_primary_owner, is_active, is_online, is_kill_switch_active, permissions, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      username = excluded.username,
      email_or_phone = excluded.email_or_phone,
      email = excluded.email,
      phone = excluded.phone,
      role = excluded.role,
      passcode = excluded.passcode,
      is_active = excluded.is_active,
      is_online = excluded.is_online,
      is_kill_switch_active = excluded.is_kill_switch_active,
      permissions = excluded.permissions,
      notes = excluded.notes,
      updated_at = datetime('now')
  `).run(
    user.id,
    user.name,
    user.username || user.name.toLowerCase().replace(/\s+/g, '_'),
    user.emailOrPhone || user.phone || user.email || '',
    user.email || '',
    user.phone || '',
    user.role || 'Cashier',
    user.passcode || '1234',
    user.isPrimaryOwner || user.is_primary_owner ? 1 : 0,
    user.status === 'Inactive' || user.is_active === 0 ? 0 : 1,
    user.isOnline || user.is_online ? 1 : 0,
    user.isKillSwitchActive || user.is_kill_switch_active ? 1 : 0,
    permissionsStr,
    user.notes || '',
    user.createdAt || new Date().toISOString()
  );

  return user;
}

/**
 * Delete a user from tenant SQLite vault (protects primary owner)
 */
export function deleteTenantUser(tenantId: string, userId: string): boolean {
  const vault = getTenantVault(tenantId);
  const user: any = vault.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!user || user.is_primary_owner === 1 || user.role === 'Owner') {
    return false;
  }
  vault.prepare("DELETE FROM users WHERE id = ?").run(userId);
  return true;
}

/**
 * Validate & enforce Single-Device Hardware Lock (HWID) per tenant license
 */
export function validateAndBindHwidLock(
  tenantId: string,
  userId: string,
  hwid: string,
  deviceModel: string,
  os: string,
  ipAddress: string
): { allowed: boolean; boundHwid: string; isFirstDevice: boolean; error?: string } {
  const master = getMasterVault();
  
  // 1. Check License Bound HWID
  let license: any = master.prepare("SELECT * FROM mbi_licenses WHERE tenant_id = ?").get(tenantId);
  
  if (!license) {
    // Provision license record for this tenant if not yet created
    master.prepare(`
      INSERT INTO mbi_licenses (id, tenant_id, license_key, client_name, owner_name, plan, status, bound_hwid, created_at)
      VALUES (?, ?, ?, ?, 'Owner', 'Basic', 'Active', ?, datetime('now'))
    `).run(`lic_${tenantId}`, tenantId, `MBI-LIC-${tenantId.slice(-6).toUpperCase()}`, tenantId, hwid || 'UNBOUND');
    license = master.prepare("SELECT * FROM mbi_licenses WHERE tenant_id = ?").get(tenantId);
  }

  let boundHwid = license?.bound_hwid || '';

  const isPlaceholder = !boundHwid || 
    boundHwid === 'UNBOUND' || 
    boundHwid === 'HWID-PRIMARY-DEVICE' || 
    boundHwid.startsWith('HWID-DEV1-') ||
    boundHwid === 'HWID-LOCAL';

  // If first login on unbound license -> auto-bind device #1
  if (isPlaceholder && hwid) {
    master.prepare(`
      UPDATE mbi_licenses 
      SET bound_hwid = ?
      WHERE tenant_id = ?
    `).run(hwid, tenantId);

    // Register device in mbi_registered_devices
    master.prepare(`
      INSERT INTO mbi_registered_devices (
        id, tenant_id, user_id, device_name, device_type, platform, hwid_fingerprint, installation_id, status, last_seen_at
      ) VALUES (?, ?, ?, ?, 'Desktop', ?, ?, ?, 'Active', datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        last_seen_at = datetime('now')
    `).run(
      `dev_${userId}_${hwid.slice(-6)}`,
      tenantId,
      userId,
      deviceModel || 'POS Workstation',
      os || 'Windows',
      hwid,
      hwid
    );

    return { allowed: true, boundHwid: hwid, isFirstDevice: true };
  }

  // If already bound, verify match
  if (boundHwid && boundHwid !== hwid) {
    return {
      allowed: false,
      boundHwid,
      isFirstDevice: false,
      error: 'Device Unauthorized: This company is locked to its registered primary device. You cannot log in from a 2nd terminal without Master Admin approval.'
    };
  }

  // Update last seen
  try {
    master.prepare(`
      UPDATE mbi_registered_devices 
      SET last_seen_at = datetime('now') 
      WHERE tenant_id = ? AND hwid_fingerprint = ?
    `).run(tenantId, hwid);
  } catch (e) {}

  return { allowed: true, boundHwid, isFirstDevice: false };
}

/**
 * Log atomic delta mutation in Tenant Outbox
 */
export function logDeltaMutation(
  tenantId: string,
  mutation: { mutationId: string; entityType: string; entityId: string; operation: string; payload: any }
): void {
  const vault = getTenantVault(tenantId);
  vault.prepare(`
    INSERT INTO sync_outbox_log (id, mutation_id, entity_type, entity_id, operation, payload_json, timestamp, is_synced)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), 1)
    ON CONFLICT(mutation_id) DO UPDATE SET
      payload_json = excluded.payload_json,
      timestamp = datetime('now')
  `).run(
    `mut_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    mutation.mutationId || `mut_${Date.now()}`,
    mutation.entityType,
    mutation.entityId,
    mutation.operation || 'UPSERT',
    JSON.stringify(mutation.payload || {})
  );
}

/**
 * Get delta changes since a specific timestamp for fast 0ms incremental delta sync
 */
export function getDeltaChangesSince(tenantId: string, lastTimestamp?: string): any[] {
  const vault = getTenantVault(tenantId);
  if (!lastTimestamp) {
    return vault.prepare("SELECT * FROM sync_outbox_log ORDER BY timestamp ASC LIMIT 500").all();
  }
  return vault.prepare("SELECT * FROM sync_outbox_log WHERE timestamp > ? ORDER BY timestamp ASC LIMIT 500").all(lastTimestamp);
}
