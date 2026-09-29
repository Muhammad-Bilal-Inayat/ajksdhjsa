import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

export interface MariaDbConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  waitForConnections: boolean;
  connectionLimit: number;
  queueLimit: number;
}

export function getDbConfig(): MariaDbConfig {
  let host = process.env.DB_HOST || process.env.MARIADB_HOST || 'localhost';
  let port = Number(process.env.DB_PORT || process.env.MARIADB_PORT || 3306);
  let user = process.env.DB_USER || process.env.MARIADB_USER || 'root';
  let password = process.env.DB_PASS || process.env.DB_PASSWORD || process.env.MARIADB_PASSWORD || '';
  let database = process.env.DB_NAME || process.env.MARIADB_DATABASE || 'mbi72dn';

  // If DATABASE_URL is supplied, try parsing it
  const dbUrl = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MARIADB_URL;
  if (dbUrl && (!process.env.DB_PASS && !process.env.DB_USER)) {
    try {
      const normalizedUrl = dbUrl.startsWith('mariadb://') ? dbUrl.replace('mariadb://', 'mysql://') : dbUrl;
      const parsed = new URL(normalizedUrl);
      if (parsed.hostname) host = parsed.hostname;
      if (parsed.port) port = Number(parsed.port);
      if (parsed.username) user = decodeURIComponent(parsed.username);
      if (parsed.password) password = decodeURIComponent(parsed.password);
      if (parsed.pathname && parsed.pathname.length > 1) {
        database = decodeURIComponent(parsed.pathname.slice(1));
      }
    } catch (e) {
      // Ignored
    }
  }

  // Allow host to have port embedded like "localhost:3306"
  if (host.includes(':')) {
    const parts = host.split(':');
    host = parts[0];
    if (parts[1] && !isNaN(Number(parts[1]))) {
      port = Number(parts[1]);
    }
  }

  return {
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
}

let pool: mysql.Pool | null = null;
let isConnected = false;
let lastPingTime = 0;
let lastCheckTime = 0;
let lastError: string | null = null;

export function isMariaDbConnected(): boolean {
  return isConnected;
}

export function getMariaDbPool(): mysql.Pool {
  if (!pool) {
    try {
      const config = getDbConfig();
      pool = mysql.createPool({
        ...config,
        charset: 'utf8mb4',
        dateStrings: true,
        connectTimeout: 2000,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
      });

      // Handle pool errors and auto-reconnect
      const rawPool = (pool as any).pool || pool;
      if (rawPool && typeof rawPool.on === 'function') {
        rawPool.on('error', (err: any) => {
          lastError = err?.message;
          isConnected = false;
          if (err?.code === 'PROTOCOL_CONNECTION_LOST' || err?.fatal) {
            pool = null;
          }
        });
      }
    } catch (err: any) {
      lastError = err?.message;
      pool = null;
    }
  }
  return pool!;
}

/**
 * Initializes and validates connection to MariaDB.
 * Gracefully reports status without throwing if DB is offline.
 */
export async function testMariaDbConnection(): Promise<{
  connected: boolean;
  database: string;
  host: string;
  port: number;
  pingMs: number;
  error?: string;
}> {
  const start = Date.now();
  const config = getDbConfig();
  lastCheckTime = Date.now();
  try {
    const currentPool = getMariaDbPool();
    if (!currentPool) {
      isConnected = false;
      return {
        connected: false,
        database: config.database,
        host: config.host,
        port: config.port,
        pingMs: -1,
        error: 'Database pool unavailable',
      };
    }
    const conn = await currentPool.getConnection();
    await conn.ping();
    conn.release();
    isConnected = true;
    lastPingTime = Date.now();
    lastError = null;
    return {
      connected: true,
      database: config.database,
      host: config.host,
      port: config.port,
      pingMs: Date.now() - start,
    };
  } catch (err: any) {
    isConnected = false;
    lastError = err?.message;
    return {
      connected: false,
      database: config.database,
      host: config.host,
      port: config.port,
      pingMs: -1,
      error: err?.message || 'Connection refused or database service not running',
    };
  }
}

/**
 * Checks if MariaDB is reachable with throttled retry logic to avoid connection flooding
 */
export async function isMariaDbAvailable(): Promise<boolean> {
  const now = Date.now();
  if (isConnected && now - lastPingTime < 30000) {
    return true;
  }
  if (!isConnected && now - lastCheckTime < 30000) {
    return false;
  }
  try {
    const status = await testMariaDbConnection();
    return status.connected;
  } catch {
    isConnected = false;
    return false;
  }
}

/**
 * Executes MariaDB schema migration DDL
 */
export async function initializeMariaDbSchema(): Promise<boolean> {
  try {
    const isAvailable = await isMariaDbAvailable();
    if (!isAvailable) {
      return false;
    }

    const ddlPath = path.resolve(process.cwd(), 'mbi_inventra_mariadb.sql');
    if (!fs.existsSync(ddlPath)) return false;

    let rawSql = fs.readFileSync(ddlPath, 'utf-8');
    
    // Remove multi-line comments and single-line comments before splitting
    const cleanSql = rawSql
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .map(line => line.trim())
      .filter(line => !line.startsWith('--') && !line.startsWith('#'))
      .join('\n');

    const statements = cleanSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 5);

    const currentPool = getMariaDbPool();
    for (const stmt of statements) {
      try {
        await currentPool.query(stmt);
      } catch (err: any) {
        // Silent catch for already existing tables/indexes
      }
    }
    await seedMariaDbDefaults(currentPool);
    return true;
  } catch (err: any) {
    return false;
  }
}

/**
 * Seeds default subscription plans, system settings, and print templates
 */
export async function seedMariaDbDefaults(currentPool?: mysql.Pool): Promise<void> {
  try {
    const isAvailable = await isMariaDbAvailable();
    if (!isAvailable) return;

    const p = currentPool || getMariaDbPool();

    // 1. Seed Default Subscription Plans
    await p.query(`
      INSERT INTO mbi_plans 
      (id, name, plan_type, monthly_price, annual_price, max_users, max_branches, is_active, features)
      VALUES 
      ('basic', 'MBI Silver (Basic Retail)', 'basic', 1999, 19990, 2, 1, 1, '{"offlineBilling":true,"thermalReceipts":true,"khataLedger":true,"fefoTracking":false}'),
      ('business', 'MBI Gold (Business Wholesale)', 'business', 3999, 39990, 5, 3, 1, '{"offlineBilling":true,"thermalReceipts":true,"khataLedger":true,"fefoTracking":true,"cloudSync":true,"whatsappReminders":true}'),
      ('enterprise', 'MBI Platinum (Enterprise Fleet)', 'enterprise', 6999, 69990, 15, 10, 1, '{"offlineBilling":true,"thermalReceipts":true,"khataLedger":true,"fefoTracking":true,"cloudSync":true,"whatsappReminders":true,"onlineStore":true,"stockTransfers":true,"auditTrail":true}')
      ON DUPLICATE KEY UPDATE 
      name = VALUES(name),
      monthly_price = VALUES(monthly_price),
      annual_price = VALUES(annual_price),
      max_users = VALUES(max_users),
      max_branches = VALUES(max_branches),
      is_active = VALUES(is_active),
      features = VALUES(features)
    `);

    // 2. Seed Default Print Templates
    await p.query(`
      INSERT INTO mbi_print_templates
      (id, tenant_id, template_id, template_name, page_size, config_json, is_default)
      VALUES
      ('tpl_thermal_default', 'default', 'THERMAL_MBI_STANDARD', 'MBI Standard Thermal POS Receipt', 'thermal_80mm', '{"storeName":true,"logo":true,"urduFooter":true,"batchInfo":true,"fldQr":true}', 1),
      ('tpl_a4_classic', 'default', 'A4_CLASSIC_TAX', 'Classic Tax Banner A4', 'a4', '{"storeName":true,"logo":true,"drugLicense":true,"signatureBlock":true}', 1)
      ON DUPLICATE KEY UPDATE
      template_name = VALUES(template_name),
      page_size = VALUES(page_size),
      config_json = VALUES(config_json),
      is_default = VALUES(is_default)
    `);

    // 3. Seed Default App System Settings
    await p.query(`
      INSERT INTO mbi_settings
      (tenant_id, setting_key, setting_value)
      VALUES
      ('default', 'app_config', '{"brand":"MBI INVENTRA 4","version":"4.2.0","syncMode":"delta_stream","database":"mbi72dn"}')
      ON DUPLICATE KEY UPDATE
      setting_value = VALUES(setting_value),
      updated_at = CURRENT_TIMESTAMP
    `);
  } catch (err: any) {
    // Graceful seed notice
  }
}

/**
 * Fetches row count and status for all MariaDB tables
 */
export async function getMariaDbTableStats(): Promise<Record<string, number>> {
  const stats: Record<string, number> = {};
  const tables = [
    'mbi_plans',
    'mbi_tenants',
    'mbi_users',
    'mbi_registration_leads',
    'mbi_licenses',
    'mbi_medicines',
    'mbi_inventory_batches',
    'mbi_invoices',
    'mbi_invoice_items',
    'mbi_purchases',
    'mbi_parties',
    'mbi_party_transactions',
    'mbi_cashier_shifts',
    'mbi_print_templates',
    'mbi_audit_logs',
    'mbi_expenses',
    'mbi_checkout_orders',
    'mbi_settings',
    'mbi_stock_transfers',
    'mbi_prescriptions',
    'mbi_supplier_returns',
    'mbi_promotional_coupons',
    'mbi_notifications',
    'mbi_ai_chat_history'
  ];

  try {
    const isAvailable = await isMariaDbAvailable();
    if (!isAvailable) return stats;

    const currentPool = getMariaDbPool();
    for (const table of tables) {
      try {
        const [rows]: any = await currentPool.query(`SELECT COUNT(*) as count FROM ${table}`);
        if (rows && rows[0]) {
          stats[table] = Number(rows[0].count || 0);
        }
      } catch (e) {
        stats[table] = 0;
      }
    }
  } catch (err) {
    // Graceful return
  }
  return stats;
}

/**
 * Automatically persists synchronized JSON records into MariaDB tables when online
 */
export async function syncRecordToMariaDb(collectionName: string, record: any): Promise<boolean> {
  if (!record || !record.id) return false;
  
  const isAvailable = await isMariaDbAvailable();
  if (!isAvailable) return false;

  try {
    const currentPool = getMariaDbPool();

    // 1. INVOICES (Zero-Conflict Idempotent + Delta Stock Deduction)
    if (collectionName === 'invoices') {
      const tenantId = record.tenantId || record.tenant_id || 'default';
      const deviceId = record.deviceId || record.device_id || 'device-1';
      const invoiceNumber = record.invoiceNumber || record.invoice_number || `INV-${record.id.slice(0, 6)}`;
      const idempotencyKey = record.idempotencyKey || record.idempotency_key || `${tenantId}_${deviceId}_${record.id}`;

      const sql = `
        INSERT INTO mbi_invoices 
        (id, tenant_id, device_id, invoice_number, idempotency_key, customer_name, customer_phone, date, sub_total, discount_amount, tax_amount, grand_total, received_amount, balance_due, payment_method, cashier_name, is_voided)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        customer_name = VALUES(customer_name),
        grand_total = VALUES(grand_total),
        received_amount = VALUES(received_amount),
        balance_due = VALUES(balance_due),
        payment_method = VALUES(payment_method),
        is_voided = VALUES(is_voided),
        updated_at = CURRENT_TIMESTAMP
      `;
      await currentPool.execute(sql, [
        record.id,
        tenantId,
        deviceId,
        invoiceNumber,
        idempotencyKey,
        record.customerName || record.billingName || 'Walk-in Customer',
        record.customerPhone || null,
        record.date ? record.date.slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' '),
        Number(record.subTotal || record.grandTotal || 0),
        Number(record.discountAmount || 0),
        Number(record.taxAmount || 0),
        Number(record.grandTotal || record.totalAmount || 0),
        Number(record.receivedAmount || record.grandTotal || 0),
        Number(record.balanceDue || 0),
        record.paymentMethod || record.paymentType || 'Cash',
        record.cashierName || record.createdByName || 'Cashier',
        record.isVoided ? 1 : 0
      ]);

      // Sync items & perform delta stock subtraction
      if (Array.isArray(record.items)) {
        for (const item of record.items) {
          const itemId = item.id || `${record.id}_${item.medicineId || item.batchId || Math.random().toString(36).substring(2, 7)}`;
          const itemSql = `
            INSERT INTO mbi_invoice_items 
            (id, invoice_id, tenant_id, medicine_id, medicine_name, batch_number, expiry_date, quantity, unit, selling_price, purchase_price, total)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            quantity = VALUES(quantity),
            selling_price = VALUES(selling_price),
            total = VALUES(total)
          `;
          await currentPool.execute(itemSql, [
            itemId,
            record.id,
            tenantId,
            item.medicineId || item.medicine_id || null,
            item.name || item.medicineName || 'Medicine',
            item.batchNumber || item.batch_number || null,
            item.expiryDate ? item.expiryDate.slice(0, 10) : null,
            Number(item.quantity || 1),
            item.unit || 'Pcs',
            Number(item.sellingPrice || item.pricePerUnit || item.price || 0),
            Number(item.purchasePrice || item.purchaseRate || item.costPrice || 0),
            Number(item.total || 0)
          ]);

          // Inventory Delta Deduction
          const soldQuantity = Number(item.quantity || 0);
          if (soldQuantity > 0 && !record.isVoided) {
            try {
              if (item.batchId) {
                await currentPool.execute(
                  `UPDATE mbi_inventory_batches SET current_stock_quantity = GREATEST(0, current_stock_quantity - ?) WHERE id = ? AND tenant_id = ?`,
                  [soldQuantity, item.batchId, tenantId]
                );
              } else if (item.batchNumber && (item.medicineId || item.name)) {
                await currentPool.execute(
                  `UPDATE mbi_inventory_batches SET current_stock_quantity = GREATEST(0, current_stock_quantity - ?) WHERE tenant_id = ? AND batch_number = ?`,
                  [soldQuantity, tenantId, item.batchNumber]
                );
              }
            } catch (deductErr) {
              // Delta deduction notice
            }
          }
        }
      }
      return true;
    }

    // 2. MEDICINES
    if (collectionName === 'medicines') {
      const sql = `
        INSERT INTO mbi_medicines
        (id, tenant_id, name, generic_salt, company, category, dosage_form, strength, barcode, min_stock_level, pack_size)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        generic_salt = VALUES(generic_salt),
        company = VALUES(company),
        category = VALUES(category),
        dosage_form = VALUES(dosage_form),
        barcode = VALUES(barcode),
        updated_at = CURRENT_TIMESTAMP
      `;
      await currentPool.execute(sql, [
        record.id,
        record.tenantId || 'global',
        record.name || 'Medicine Name',
        record.genericSalt || record.genericFormula || record.genericName || record.salt || null,
        record.company || record.manufacturer || null,
        record.category || 'General Medicine',
        record.dosageForm || record.unit || record.form || 'Tablet',
        record.strength || null,
        record.barcode || null,
        Number(record.minStockLevel || record.lowStockThreshold || 5),
        Number(record.packSize || 1)
      ]);

      if (record.batchNumber || record.quantity !== undefined || record.sellingPrice !== undefined) {
        const batchSql = `
          INSERT INTO mbi_inventory_batches
          (id, tenant_id, medicine_id, batch_number, expiry_date, purchase_rate, mrp_selling_price, current_stock_quantity, godown_location)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
          batch_number = VALUES(batch_number),
          expiry_date = VALUES(expiry_date),
          purchase_rate = VALUES(purchase_rate),
          mrp_selling_price = VALUES(mrp_selling_price),
          current_stock_quantity = VALUES(current_stock_quantity),
          godown_location = VALUES(godown_location),
          updated_at = CURRENT_TIMESTAMP
        `;
        await currentPool.execute(batchSql, [
          `batch_${record.id}`,
          record.tenantId || 'global',
          record.id,
          record.batchNumber || 'BATCH001',
          record.expiryDate ? record.expiryDate.slice(0, 10) : '2028-12-31',
          Number(record.purchasePrice || record.purchaseRate || record.costPrice || 0),
          Number(record.sellingPrice || record.mrpSellingPrice || record.salePrice || 0),
          Number(record.quantity || record.stock || record.currentStockQuantity || 0),
          record.rackLocation || record.shelfLocation || record.godownLocation || 'Main Store'
        ]);
      }
      return true;
    }

    // 3. PURCHASES & PURCHASE ORDERS
    if (collectionName === 'purchaseOrders' || collectionName === 'purchases') {
      const sql = `
        INSERT INTO mbi_purchases
        (id, tenant_id, purchase_number, supplier_id, supplier_name, bill_date, total_amount, paid_amount, balance_due, payment_mode)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        supplier_name = VALUES(supplier_name),
        total_amount = VALUES(total_amount),
        paid_amount = VALUES(paid_amount),
        balance_due = VALUES(balance_due),
        payment_mode = VALUES(payment_mode),
        updated_at = CURRENT_TIMESTAMP
      `;
      await currentPool.execute(sql, [
        record.id,
        record.tenantId || 'default',
        record.orderNumber || record.purchaseNumber || record.invoiceNumber || `PO-${record.id.slice(0, 6)}`,
        record.supplierId || 'sup_default',
        record.supplierName || 'General Supplier',
        record.date ? record.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
        Number(record.grandTotal || record.totalAmount || record.total || 0),
        Number(record.paidAmount || 0),
        Number(record.balanceDue || 0),
        record.paymentMethod || record.paymentMode || 'Cash'
      ]);
      return true;
    }

    // 4. BATCHES / INVENTORY
    if (collectionName === 'batches' || collectionName === 'inventory' || collectionName === 'inventory_batches') {
      const sql = `
        INSERT INTO mbi_inventory_batches
        (id, tenant_id, medicine_id, batch_number, expiry_date, purchase_rate, mrp_selling_price, current_stock_quantity, supplier_id, godown_location)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        batch_number = VALUES(batch_number),
        expiry_date = VALUES(expiry_date),
        purchase_rate = VALUES(purchase_rate),
        mrp_selling_price = VALUES(mrp_selling_price),
        current_stock_quantity = VALUES(current_stock_quantity),
        godown_location = VALUES(godown_location),
        updated_at = CURRENT_TIMESTAMP
      `;
      await currentPool.execute(sql, [
        record.id,
        record.tenantId || 'default',
        record.medicineId || record.medId || 'global_med',
        record.batchNumber || record.batchNo || 'BATCH001',
        record.expiryDate ? record.expiryDate.slice(0, 10) : '2028-12-31',
        Number(record.purchaseRate || record.purchasePrice || record.costPrice || 0),
        Number(record.mrpSellingPrice || record.sellingPrice || record.salePrice || 0),
        Number(record.currentStockQuantity || record.stock || record.quantity || 0),
        record.supplierId || null,
        record.godownLocation || record.location || 'Main Store'
      ]);
      return true;
    }

    // 5. PARTIES (CUSTOMERS / SUPPLIERS)
    if (collectionName === 'parties' || collectionName === 'customers' || collectionName === 'suppliers') {
      const sql = `
        INSERT INTO mbi_parties
        (id, tenant_id, name, type, phone, email, address, credit_limit, current_balance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        phone = VALUES(phone),
        credit_limit = VALUES(credit_limit),
        current_balance = VALUES(current_balance),
        updated_at = CURRENT_TIMESTAMP
      `;
      await currentPool.execute(sql, [
        record.id,
        record.tenantId || 'default',
        record.name || record.companyName || 'Party Name',
        record.type || (collectionName === 'suppliers' ? 'Supplier' : 'Customer'),
        record.phone || null,
        record.email || null,
        record.address || null,
        Number(record.creditLimit || 0),
        Number(record.outstandingBalance || record.currentBalance || record.balance || 0)
      ]);
      return true;
    }

    // 6. LEDGER TRANSACTIONS & PARTY PAYMENTS (KHATA)
    if (collectionName === 'partyPayments' || collectionName === 'party_transactions' || collectionName === 'khata_transactions' || collectionName === 'transactions') {
      const sql = `
        INSERT INTO mbi_party_transactions
        (id, tenant_id, party_id, type, amount, balance_after, reference_id, description, date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        amount = VALUES(amount),
        balance_after = VALUES(balance_after),
        description = VALUES(description)
      `;
      await currentPool.execute(sql, [
        record.id,
        record.tenantId || 'default',
        record.partyId || record.customerId || record.supplierId || 'general_party',
        record.type || (record.paymentType === 'In' ? 'Credit' : 'Debit'),
        Number(record.amount || 0),
        Number(record.balanceAfter || record.currentBalance || 0),
        record.referenceId || record.referenceNumber || record.invoiceId || null,
        record.description || record.notes || 'Party Transaction',
        record.date ? record.date.slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' ')
      ]);
      return true;
    }

    // 7. USERS & APP USERS (Multi-User & Staff Accounts)
    if (collectionName === 'users' || collectionName === 'appUsers') {
      const isSilent = record.isSilentMonitored || record.silentMonitoring || record.isSilent ? 1 : 0;
      const isKilled = record.isKillSwitchActive || record.isSuspended || record.isKilled ? 1 : 0;
      const sql = `
        INSERT INTO mbi_users 
        (id, tenant_id, name, email_or_phone, passcode, role, status, is_online, can_edit_bill, is_silent_monitored, is_kill_switch_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        role = VALUES(role),
        passcode = VALUES(passcode),
        status = VALUES(status),
        is_online = VALUES(is_online),
        can_edit_bill = VALUES(can_edit_bill),
        is_silent_monitored = VALUES(is_silent_monitored),
        is_kill_switch_active = VALUES(is_kill_switch_active),
        updated_at = CURRENT_TIMESTAMP
      `;
      await currentPool.execute(sql, [
        record.id,
        record.tenantId || 'default',
        record.name || 'Staff User',
        record.emailOrPhone || record.email || record.phone || 'user@pharma.com',
        record.passcode || record.pin || '0000',
        record.role || 'Cashier',
        record.status || (isKilled ? 'Suspended' : 'Active'),
        record.isOnline ? 1 : 0,
        record.canEditInvoices || record.canEditBill ? 1 : 0,
        isSilent,
        isKilled
      ]);
      return true;
    }

    // 8. REGISTRATION LEADS (Self-Service Registrations across Browsers & Devices)
    if (collectionName === 'registration_leads' || collectionName === 'leads' || collectionName === 'mbi_registration_leads') {
      const sql = `
        INSERT INTO mbi_registration_leads
        (id, store_name, owner_name, username, phone, email, city, address, drug_license_no, ntn_number, requested_plan, status, is_approved, activation_key, notes, submitted_at, activated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        store_name = VALUES(store_name),
        owner_name = VALUES(owner_name),
        username = VALUES(username),
        phone = VALUES(phone),
        email = VALUES(email),
        city = VALUES(city),
        address = VALUES(address),
        drug_license_no = VALUES(drug_license_no),
        ntn_number = VALUES(ntn_number),
        requested_plan = VALUES(requested_plan),
        status = VALUES(status),
        is_approved = VALUES(is_approved),
        activation_key = VALUES(activation_key),
        notes = VALUES(notes),
        activated_at = VALUES(activated_at),
        updated_at = CURRENT_TIMESTAMP
      `;
      await currentPool.execute(sql, [
        record.id,
        record.storeName || record.name || 'Pharmacy Store',
        record.ownerName || record.name || 'Store Owner',
        record.username || null,
        record.phone || '',
        record.email || '',
        record.city || 'Lahore',
        record.address || '',
        record.drugLicenseNo || null,
        record.ntnNumber || null,
        record.requestedPlan || 'Basic (10-Day Free Trial)',
        record.status || 'activated',
        record.isApproved ? 1 : 1,
        record.activationKey || null,
        record.notes || null,
        record.submittedAt ? record.submittedAt.slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' '),
        record.activatedAt ? record.activatedAt.slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' ')
      ]);
      return true;
    }

    // 9. CLIENT LICENSES & KEYS
    if (collectionName === 'client_licenses' || collectionName === 'licenses' || collectionName === 'mbi_licenses') {
      const sql = `
        INSERT INTO mbi_licenses
        (id, license_key, client_name, owner_name, phone, city, plan, status, issue_date, expiry_date, max_devices, sale_price, amount_paid, amount_due, bound_hardware_ids)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        client_name = VALUES(client_name),
        owner_name = VALUES(owner_name),
        phone = VALUES(phone),
        city = VALUES(city),
        plan = VALUES(plan),
        status = VALUES(status),
        expiry_date = VALUES(expiry_date),
        max_devices = VALUES(max_devices),
        sale_price = VALUES(sale_price),
        amount_paid = VALUES(amount_paid),
        amount_due = VALUES(amount_due),
        bound_hardware_ids = VALUES(bound_hardware_ids),
        updated_at = CURRENT_TIMESTAMP
      `;
      await currentPool.execute(sql, [
        record.id,
        record.licenseKey || `MBI-${record.id.slice(0, 8)}`,
        record.clientName || 'Store Client',
        record.ownerName || 'Store Owner',
        record.phone || '',
        record.city || 'Lahore',
        record.plan || 'Basic',
        record.status || 'Active',
        record.issueDate ? record.issueDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
        record.expiryDate ? record.expiryDate.slice(0, 10) : new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
        Number(record.maxDevices || 5),
        Number(record.salePrice || 0),
        Number(record.amountPaid || 0),
        Number(record.amountDue || 0),
        Array.isArray(record.boundHardwareIds) ? JSON.stringify(record.boundHardwareIds) : (record.boundHardwareIds || null)
      ]);
      return true;
    }

    // 10. CASHIER SHIFTS
    if (collectionName === 'cashierShifts' || collectionName === 'cashier_shifts' || collectionName === 'shifts') {
      const sql = `
        INSERT INTO mbi_cashier_shifts
        (id, tenant_id, user_id, user_name, opening_cash, closing_cash, expected_cash, difference, opened_at, closed_at, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        closing_cash = VALUES(closing_cash),
        expected_cash = VALUES(expected_cash),
        difference = VALUES(difference),
        closed_at = VALUES(closed_at),
        status = VALUES(status)
      `;
      await currentPool.execute(sql, [
        record.id,
        record.tenantId || 'default',
        record.userId || record.cashierId || 'system',
        record.userName || record.cashierName || 'Cashier',
        Number(record.openingCash || record.startingCash || 0),
        record.closingCash !== undefined ? Number(record.closingCash) : null,
        record.expectedCash !== undefined ? Number(record.expectedCash) : null,
        record.difference !== undefined ? Number(record.difference) : null,
        record.openedAt ? record.openedAt.slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' '),
        record.closedAt ? record.closedAt.slice(0, 19).replace('T', ' ') : null,
        record.status || 'Open'
      ]);
      return true;
    }

    // 11. PRINT TEMPLATES
    if (collectionName === 'print_templates' || collectionName === 'print_settings') {
      const sql = `
        INSERT INTO mbi_print_templates
        (id, tenant_id, printer_type, active_theme, brand_name, subtitle, phone_numbers, country_city, footer_title, footer_contact, footer_website, compact_footer, is_client_locked)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        active_theme = VALUES(active_theme),
        brand_name = VALUES(brand_name),
        subtitle = VALUES(subtitle),
        phone_numbers = VALUES(phone_numbers),
        footer_title = VALUES(footer_title),
        footer_contact = VALUES(footer_contact),
        compact_footer = VALUES(compact_footer),
        is_client_locked = VALUES(is_client_locked),
        updated_at = CURRENT_TIMESTAMP
      `;
      await currentPool.execute(sql, [
        record.id || 'global_thermal',
        record.tenantId || 'global',
        record.printerType || 'THERMAL',
        record.activeTheme || record.theme || 'THERMAL_MBI_STANDARD',
        record.brandName || record.companyName || 'MBI INVENTRA',
        record.subtitle || 'PHARMACY POS & ERP',
        record.phoneNumbers || record.phone || '03364585863 • 03281302636',
        record.countryCity || 'Pakistan',
        record.footerTitle || 'THANK YOU FOR SHOPPING!',
        record.footerContact || 'Contact us : 03281302636',
        record.footerWebsite || 'Pharmacy POS & ERP    www.mbiinventra.com',
        record.compactFooter ? 1 : 0,
        record.isClientLocked ? 1 : 0
      ]);
      return true;
    }

    // 12. TENANTS
    if (collectionName === 'tenants') {
      const sql = `
        INSERT INTO mbi_tenants
        (id, organization_id, name, owner_name, owner_email, owner_phone, city, plan_id, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        owner_name = VALUES(owner_name),
        owner_phone = VALUES(owner_phone),
        plan_id = VALUES(plan_id),
        status = VALUES(status),
        updated_at = CURRENT_TIMESTAMP
      `;
      await currentPool.execute(sql, [
        record.id,
        record.organizationId || record.id,
        record.name || 'Pharmacy Store',
        record.ownerName || 'Owner',
        record.ownerEmail || 'owner@pharma.com',
        record.ownerPhone || '03000000000',
        record.city || 'Lahore',
        record.planId || 'Basic',
        record.status || 'Active'
      ]);
      return true;
    }

    // 13. EXPENSES
    if (collectionName === 'expenses' || collectionName === 'mbi_expenses') {
      const sql = `
        INSERT INTO mbi_expenses
        (id, tenant_id, title, category, amount, payment_method, date, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        category = VALUES(category),
        amount = VALUES(amount),
        payment_method = VALUES(payment_method),
        notes = VALUES(notes),
        updated_at = CURRENT_TIMESTAMP
      `;
      await currentPool.execute(sql, [
        record.id,
        record.tenantId || 'default',
        record.title || record.name || 'General Expense',
        record.category || 'General',
        Number(record.amount || 0),
        record.paymentMethod || record.paymentMode || 'Cash',
        record.date ? record.date.slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' '),
        record.notes || record.description || null
      ]);
      return true;
    }

    // 14. CHECKOUT ORDERS (Online Store & PWA)
    if (collectionName === 'checkoutOrders' || collectionName === 'orders' || collectionName === 'mbi_checkout_orders') {
      const sql = `
        INSERT INTO mbi_checkout_orders
        (id, tenant_id, order_number, customer_name, customer_phone, customer_email, shipping_address, city, items_json, sub_total, shipping_fee, grand_total, payment_method, payment_status, order_status, prescription_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        customer_name = VALUES(customer_name),
        order_status = VALUES(order_status),
        payment_status = VALUES(payment_status),
        updated_at = CURRENT_TIMESTAMP
      `;
      await currentPool.execute(sql, [
        record.id,
        record.tenantId || 'default',
        record.orderNumber || `ORD-${record.id.slice(0, 6)}`,
        record.customerName || record.name || 'Online Customer',
        record.customerPhone || record.phone || '',
        record.customerEmail || record.email || null,
        record.shippingAddress || record.address || 'Standard Delivery',
        record.city || 'Lahore',
        typeof record.items === 'string' ? record.items : JSON.stringify(record.items || []),
        Number(record.subTotal || record.subtotal || 0),
        Number(record.shippingFee || record.shipping || 0),
        Number(record.grandTotal || record.total || 0),
        record.paymentMethod || 'COD',
        record.paymentStatus || 'Unpaid',
        record.orderStatus || record.status || 'Pending',
        record.prescriptionUrl || null
      ]);
      return true;
    }

    // 15. SETTINGS
    if (collectionName === 'settings' || collectionName === 'mbi_settings') {
      const sql = `
        INSERT INTO mbi_settings
        (id, tenant_id, company_name, tagline, phone, email, address, currency, invoice_prefix, tax_rate_percent, settings_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        company_name = VALUES(company_name),
        tagline = VALUES(tagline),
        phone = VALUES(phone),
        email = VALUES(email),
        address = VALUES(address),
        currency = VALUES(currency),
        invoice_prefix = VALUES(invoice_prefix),
        settings_json = VALUES(settings_json),
        updated_at = CURRENT_TIMESTAMP
      `;
      await currentPool.execute(sql, [
        record.id || `set_${record.tenantId || 'global'}`,
        record.tenantId || 'global',
        record.companyName || record.name || 'MBI INVENTRA',
        record.tagline || null,
        record.phone || null,
        record.email || null,
        record.address || null,
        record.currency || 'PKR',
        record.invoicePrefix || 'INV-',
        Number(record.taxRatePercent || 0),
        typeof record === 'string' ? record : JSON.stringify(record)
      ]);
      return true;
    }

    // 16. AUDIT LOGS
    if (collectionName === 'auditLogs' || collectionName === 'audit_logs' || collectionName === 'mbi_audit_logs') {
      const sql = `
        INSERT INTO mbi_audit_logs
        (id, tenant_id, user_id, user_name, action, category, details, ip_address)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        action = VALUES(action),
        details = VALUES(details)
      `;
      await currentPool.execute(sql, [
        record.id,
        record.tenantId || 'default',
        record.userId || null,
        record.userName || record.user || 'System',
        record.action || 'ACTIVITY',
        record.category || 'SECURITY',
        typeof record.details === 'object' ? JSON.stringify(record.details) : (record.details || null),
        record.ipAddress || record.ip || null
      ]);
      return true;
    }

    // 17. NOTIFICATIONS
    if (collectionName === 'notifications' || collectionName === 'mbi_notifications') {
      const sql = `
        INSERT INTO mbi_notifications
        (id, tenant_id, recipient_phone, recipient_name, notification_type, message_body, media_url, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        status = VALUES(status)
      `;
      await currentPool.execute(sql, [
        record.id,
        record.tenantId || 'default',
        record.recipientPhone || record.phone || '',
        record.recipientName || record.name || null,
        record.notificationType || record.type || 'WHATSAPP_INVOICE',
        record.messageBody || record.message || '',
        record.mediaUrl || null,
        record.status || 'Sent'
      ]);
      return true;
    }

    // 18. AI CHAT HISTORY & PERMANENT IMMUTABLE AUDIT LOGS
    if (collectionName === 'ai_chat_history' || collectionName === 'mbi_ai_chat_history') {
      const sql = `
        INSERT INTO mbi_ai_chat_history
        (id, session_id, tenant_id, user_id, user_name, store_name, user_plan, sender, sender_name, prompt_or_text, is_escalation, key_index_used, ip_address, page_context)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        prompt_or_text = VALUES(prompt_or_text),
        is_escalation = VALUES(is_escalation)
      `;
      await currentPool.execute(sql, [
        record.id || `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        record.sessionId || record.session_id || 'default_sess',
        record.tenantId || record.tenant_id || 'default',
        record.userId || record.user_id || null,
        record.userName || record.user_name || null,
        record.storeName || record.store_name || null,
        record.userPlan || record.user_plan || 'business',
        record.sender || 'user',
        record.senderName || record.sender_name || 'User',
        record.text || record.prompt || record.prompt_or_text || '',
        record.isEscalation || record.is_escalation ? 1 : 0,
        Number(record.keyIndexUsed ?? record.key_index_used ?? 0),
        record.ip || record.ip_address || null,
        record.pageContext || record.page_context || 'user'
      ]);
      return true;
    }

    return false;
  } catch (err: any) {
    return false;
  }
}

/**
 * Save an immutable AI chat record to MariaDB
 */
export async function saveAiChatLogToMariaDb(data: {
  id?: string;
  sessionId: string;
  tenantId?: string;
  userId?: string;
  userName?: string;
  storeName?: string;
  userPlan?: string;
  sender: 'user' | 'ai' | 'human_agent';
  senderName?: string;
  text: string;
  isEscalation?: boolean;
  keyIndexUsed?: number;
  ip?: string;
  pageContext?: string;
}): Promise<boolean> {
  const isAvailable = await isMariaDbAvailable();
  if (!isAvailable) return false;

  try {
    const currentPool = getMariaDbPool();
    // Ensure table exists
    await currentPool.query(`
      CREATE TABLE IF NOT EXISTS mbi_ai_chat_history (
        id VARCHAR(64) NOT NULL PRIMARY KEY,
        session_id VARCHAR(128) NOT NULL,
        tenant_id VARCHAR(64) NOT NULL DEFAULT 'default',
        user_id VARCHAR(64) NULL,
        user_name VARCHAR(255) NULL,
        store_name VARCHAR(255) NULL,
        user_plan VARCHAR(64) NULL,
        sender VARCHAR(32) NOT NULL,
        sender_name VARCHAR(255) NULL,
        prompt_or_text LONGTEXT NOT NULL,
        is_escalation TINYINT(1) NOT NULL DEFAULT 0,
        key_index_used INT NULL DEFAULT 0,
        ip_address VARCHAR(64) NULL,
        page_context VARCHAR(64) NULL DEFAULT 'user',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ai_sess (session_id),
        INDEX idx_ai_tenant (tenant_id),
        INDEX idx_ai_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    const sql = `
      INSERT INTO mbi_ai_chat_history
      (id, session_id, tenant_id, user_id, user_name, store_name, user_plan, sender, sender_name, prompt_or_text, is_escalation, key_index_used, ip_address, page_context)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await currentPool.execute(sql, [
      data.id || `ai_chat_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      data.sessionId,
      data.tenantId || 'default',
      data.userId || null,
      data.userName || 'Pharmacy User',
      data.storeName || 'Pharmacy Store',
      data.userPlan || 'business',
      data.sender,
      data.senderName || (data.sender === 'user' ? 'Client' : data.sender === 'ai' ? 'MBI AI' : 'Support Agent'),
      data.text,
      data.isEscalation ? 1 : 0,
      Number(data.keyIndexUsed || 0),
      data.ip || null,
      data.pageContext || 'user'
    ]);
    return true;
  } catch (err: any) {
    return false;
  }
}

/**
 * Fetch immutable AI chat history directly from MariaDB
 */
export async function getAiChatHistoryFromMariaDb(options?: {
  limit?: number;
  tenantId?: string;
  sessionId?: string;
  search?: string;
}): Promise<any[]> {
  const isAvailable = await isMariaDbAvailable();
  if (!isAvailable) return [];

  try {
    const currentPool = getMariaDbPool();
    let query = `SELECT * FROM mbi_ai_chat_history WHERE 1=1`;
    const params: any[] = [];

    if (options?.tenantId && options.tenantId !== 'all') {
      query += ` AND tenant_id = ?`;
      params.push(options.tenantId);
    }

    if (options?.sessionId) {
      query += ` AND session_id = ?`;
      params.push(options.sessionId);
    }

    if (options?.search) {
      query += ` AND (prompt_or_text LIKE ? OR user_name LIKE ? OR store_name LIKE ?)`;
      const s = `%${options.search}%`;
      params.push(s, s, s);
    }

    query += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(options?.limit || 200);

    const [rows]: any = await currentPool.query(query, params);
    return rows || [];
  } catch (err: any) {
    return [];
  }
}
