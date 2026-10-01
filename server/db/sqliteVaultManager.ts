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

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT UNIQUE,
      email_or_phone TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Cashier',
      passcode TEXT NOT NULL DEFAULT '1234',
      bound_device_id TEXT,
      is_primary_owner INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
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
