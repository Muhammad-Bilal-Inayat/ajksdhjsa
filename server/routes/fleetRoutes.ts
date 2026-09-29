import express, { Response } from 'express';
import { getMariaDbPool } from '../db/mariaClient';
import { requireMasterAuth, TenantRequest } from '../middleware/tenantMiddleware';

export const fleetRouter = express.Router();

// 1. Get all fleet tenants from mbi_tenants with user & license counts
fleetRouter.get('/tenants', async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const pool = getMariaDbPool();
    const [tenants]: any = await pool.query(
      `SELECT t.*, 
        (SELECT COUNT(*) FROM mbi_users u WHERE u.tenant_id = t.tenant_id) as user_count,
        (SELECT COUNT(*) FROM mbi_invoices i WHERE i.tenant_id = t.tenant_id) as invoice_count
       FROM mbi_tenants t
       ORDER BY t.created_at DESC;`
    );

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

    const pool = getMariaDbPool();
    await pool.query('DELETE FROM mbi_tenants WHERE tenant_id = ? OR id = ?;', [tenant_id, tenant_id]);

    res.json({ success: true, message: `Tenant ${tenant_id} removed.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Error deleting tenant' });
  }
});

// 4. Get all registration trial leads
fleetRouter.get('/leads', async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const pool = getMariaDbPool();
    const [leads]: any = await pool.query('SELECT * FROM mbi_registration_leads ORDER BY created_at DESC;');
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
