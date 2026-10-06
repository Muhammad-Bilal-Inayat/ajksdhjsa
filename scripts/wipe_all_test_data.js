import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

console.log('========================================================');
console.log('🚀 TOTAL SYSTEM WIPE: RESETTING ALL USERS, TENANTS & VAULTS');
console.log('========================================================');

const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, 'server', 'data');
const MASTER_DB_PATH = path.join(DATA_DIR, 'master', 'master_hub.sqlite');
const TENANTS_DIR = path.join(DATA_DIR, 'tenants');

// 1. Wipe Master SQLite Vault
if (fs.existsSync(MASTER_DB_PATH)) {
  try {
    const masterDb = new DatabaseSync(MASTER_DB_PATH);
    const tables = masterDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    for (const t of tables) {
      if (t.name !== 'sqlite_sequence') {
        masterDb.exec(`DELETE FROM ${t.name};`);
        console.log(`[Master Vault] Cleared table: ${t.name}`);
      }
    }
  } catch (err) {
    console.error('[Master Vault] Error cleaning tables:', err.message);
  }
}

// 2. Clear all tables in all Tenant SQLite files
if (fs.existsSync(TENANTS_DIR)) {
  const files = fs.readdirSync(TENANTS_DIR);
  for (const file of files) {
    if (file.endsWith('.sqlite')) {
      const filePath = path.join(TENANTS_DIR, file);
      try {
        const tenantDb = new DatabaseSync(filePath);
        const tables = tenantDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        for (const t of tables) {
          if (t.name !== 'sqlite_sequence') {
            tenantDb.exec(`DELETE FROM ${t.name};`);
          }
        }
        console.log(`[Tenant Vaults] Cleared all table rows in: ${file}`);
      } catch (err) {
        console.error(`[Tenant Vaults] Error wiping ${file}:`, err.message);
      }
    }
  }
}

// 3. Clear root JSON storage files
const jsonFilesToReset = [
  { file: '.master_tenants.json', content: '[]' },
  { file: '.master_users.json', content: '[]' },
  { file: '.master_permissions.json', content: '{}' },
  { file: '.fleet_api_keys.json', content: '{}' },
  { file: '.master_audit_logs.json', content: '[]' },
  { file: '.ai_chat_sessions.json', content: '[]' },
  { file: '.ai_support_leads.json', content: '[]' },
  { file: '.ai_tenant_quotas.json', content: '{}' },
  { file: '.broadcast_history.json', content: '[]' },
  { file: '.testimonials_store.json', content: '[]' }
];

for (const item of jsonFilesToReset) {
  const fullPath = path.join(ROOT_DIR, item.file);
  try {
    fs.writeFileSync(fullPath, item.content, 'utf-8');
    console.log(`[Root JSON] Cleaned: ${item.file}`);
  } catch (err) {
    console.error(`[Root JSON] Error writing ${item.file}:`, err.message);
  }
}

// 4. Reset .sync_data.json
const syncFile = path.join(ROOT_DIR, '.sync_data.json');
if (fs.existsSync(syncFile)) {
  try {
    const emptySync = {
      medicines: [],
      invoices: [],
      purchaseOrders: [],
      suppliers: [],
      expenses: [],
      auditLogs: [],
      customers: [],
      users: []
    };
    fs.writeFileSync(syncFile, JSON.stringify(emptySync, null, 2), 'utf-8');
    console.log('[Sync Cache] Reset .sync_data.json to clean empty state');
  } catch (err) {
    console.error('[Sync Cache] Error resetting .sync_data.json:', err.message);
  }
}

console.log('========================================================');
console.log('✨ TOTAL DATA PURGE COMPLETE: 0 DUMMY/TEST USERS OR TENANTS REMAIN');
console.log('========================================================');
