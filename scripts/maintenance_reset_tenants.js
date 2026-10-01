import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

const masterDbPath = path.resolve(process.cwd(), 'server', 'data', 'master', 'master_hub.sqlite');
const tenantsDir = path.resolve(process.cwd(), 'server', 'data', 'tenants');

console.log('--- Cleaning and Resetting Master Hub & Tenant Data ---');

if (fs.existsSync(masterDbPath)) {
  const db = new DatabaseSync(masterDbPath);
  
  // Clean registered devices
  db.exec("DELETE FROM mbi_registered_devices;");
  // Clean master audit logs
  db.exec("DELETE FROM mbi_master_audit_logs;");
  
  console.log('Cleaned mbi_registered_devices and mbi_master_audit_logs in master_hub.sqlite');
}

// Clean and wipe all test tenant sqlite databases
if (fs.existsSync(tenantsDir)) {
  const files = fs.readdirSync(tenantsDir);
  for (const file of files) {
    if (file.endsWith('.sqlite')) {
      const tenantDbPath = path.join(tenantsDir, file);
      try {
        const tenantDb = new DatabaseSync(tenantDbPath);
        const tables = tenantDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        for (const t of tables) {
          const tableName = t.name;
          if (tableName !== 'sqlite_sequence' && tableName !== 'users') {
            tenantDb.exec(`DELETE FROM ${tableName};`);
          }
        }
        console.log(`Reset all data (medicines, parties, invoices, etc.) to 0 for: ${file}`);
      } catch (err) {
        console.error(`Error resetting ${file}:`, err.message);
      }
    }
  }
}

// Clean JSON test caches
const syncFile = path.resolve(process.cwd(), '.sync_data.json');
if (fs.existsSync(syncFile)) {
  try {
    const syncData = JSON.parse(fs.readFileSync(syncFile, 'utf-8') || '{}');
    syncData.medicines = [];
    syncData.invoices = [];
    syncData.purchaseOrders = [];
    syncData.suppliers = [];
    syncData.expenses = [];
    syncData.auditLogs = [];
    fs.writeFileSync(syncFile, JSON.stringify(syncData, null, 2), 'utf-8');
    console.log('Reset .sync_data.json data arrays to 0');
  } catch (e) {
    console.error('Error updating .sync_data.json:', e.message);
  }
}

console.log('Data reset complete.');
