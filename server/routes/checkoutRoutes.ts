import { Router, Request, Response } from 'express';
import { getMariaDbPool } from '../db/mariaClient';
import { broadcastFleetActivity } from './adminRoutes';
import fs from 'fs';
import path from 'path';

export const checkoutRouter = Router();
const syncFile = path.resolve(process.cwd(), '.sync_data.json');

function getLocalSyncData(): any {
  try {
    if (fs.existsSync(syncFile)) {
      return JSON.parse(fs.readFileSync(syncFile, 'utf-8'));
    }
  } catch (e) {}
  return {};
}

function saveLocalSyncData(data: any) {
  try {
    fs.writeFileSync(syncFile, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Failed to save sync file:', e);
  }
}

/**
 * POST /api/checkout/orders
 * Submit new SaaS Plan order with payment proof and auto-provision temporary 10-day trial
 */
checkoutRouter.post('/orders', async (req: Request, res: Response) => {
  try {
    const {
      businessName,
      ownerName,
      username,
      whatsapp,
      email,
      city,
      password,
      planId,
      planName,
      billingInterval,
      amountRupees,
      paymentMethod,
      trxId,
      paymentScreenshot,
      notes
    } = req.body || {};

    if (!businessName || !ownerName || !whatsapp) {
      return res.status(400).json({
        success: false,
        error: 'Business Name, Owner Name, and WhatsApp number are required.'
      });
    }

    const orderId = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const tenantId = `tnt_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
    const createdAt = new Date().toISOString();

    const orderRecord = {
      id: orderId,
      tenantId,
      createdAt,
      businessName: businessName.trim(),
      ownerName: ownerName.trim(),
      username: (username || `user_${Date.now().toString(36)}`).trim().toLowerCase(),
      whatsapp: whatsapp.trim(),
      email: (email || `${whatsapp.trim()}@inventra.local`).trim(),
      city: (city || 'Lahore').trim(),
      planId: planId || 'business',
      planName: planName || 'Gold Business',
      billingInterval: billingInterval || '1year',
      amountRupees: Number(amountRupees) || 39990,
      paymentMethod: paymentMethod || 'Meezan Bank',
      trxId: (trxId || 'PENDING-VERIFY').trim(),
      paymentScreenshot: paymentScreenshot || '',
      notes: notes || '',
      status: 'pending'
    };

    // 1. Try writing to MariaDB
    const pool = getMariaDbPool();
    let dbSuccess = false;

    if (pool) {
      try {
        // Ensure lead registered in mbi_registration_leads
        await pool.query(
          `INSERT INTO mbi_registration_leads (
            id, store_name, owner_name, username, phone, email, city, 
            requested_plan, status, notes, submitted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW())
          ON DUPLICATE KEY UPDATE 
            requested_plan = VALUES(requested_plan),
            notes = VALUES(notes),
            updated_at = NOW();`,
          [
            orderId,
            orderRecord.businessName,
            orderRecord.ownerName,
            orderRecord.username,
            orderRecord.whatsapp,
            orderRecord.email,
            orderRecord.city,
            `${orderRecord.planName} (${orderRecord.billingInterval})`,
            `Trx: ${orderRecord.trxId} | Method: ${orderRecord.paymentMethod} | Amount: PKR ${orderRecord.amountRupees}`
          ]
        );

        // Auto-provision trial tenant in mbi_tenants so user can log in immediately
        await pool.query(
          `INSERT INTO mbi_tenants (
            id, name, owner_name, phone, email, city, plan, status, trial_ends_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'Basic (10-Day Free Trial)', 'Active', DATE_ADD(NOW(), INTERVAL 10 DAY), NOW())
          ON DUPLICATE KEY UPDATE updated_at = NOW();`,
          [
            tenantId,
            orderRecord.businessName,
            orderRecord.ownerName,
            orderRecord.whatsapp,
            orderRecord.email,
            orderRecord.city
          ]
        );

        // Auto-create user in mbi_users
        await pool.query(
          `INSERT INTO mbi_users (
            id, tenant_id, name, username, phone, email, password_hash, role, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Admin', 'Active', NOW())
          ON DUPLICATE KEY UPDATE updated_at = NOW();`,
          [
            `usr_${tenantId}`,
            tenantId,
            orderRecord.ownerName,
            orderRecord.username,
            orderRecord.whatsapp,
            orderRecord.email,
            password || '123456'
          ]
        );

        dbSuccess = true;
      } catch (dbErr: any) {
        console.warn('MariaDB checkout insert warning:', dbErr?.message);
      }
    }

    // 2. Write to local fallback sync file
    const syncData = getLocalSyncData();
    if (!syncData.checkoutOrders) syncData.checkoutOrders = [];
    syncData.checkoutOrders.unshift(orderRecord);

    if (!syncData.registration_leads) syncData.registration_leads = [];
    syncData.registration_leads.unshift({
      id: orderId,
      storeName: orderRecord.businessName,
      ownerName: orderRecord.ownerName,
      phone: orderRecord.whatsapp,
      email: orderRecord.email,
      city: orderRecord.city,
      plan: `${orderRecord.planName} (${orderRecord.billingInterval})`,
      status: 'pending',
      submittedAt: createdAt
    });

    saveLocalSyncData(syncData);

    // 3. Broadcast to Fleet Stream
    broadcastFleetActivity({
      type: 'CHECKOUT_ORDER_RECEIVED',
      orderId,
      businessName: orderRecord.businessName,
      plan: orderRecord.planName,
      amount: orderRecord.amountRupees,
      timestamp: createdAt
    });

    return res.json({
      success: true,
      order: orderRecord,
      orderId,
      tenantId,
      dbSynced: dbSuccess,
      message: 'Order received successfully! Temporary 10-day access active.'
    });
  } catch (err: any) {
    console.error('Checkout order submission error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to process checkout order'
    });
  }
});

/**
 * GET /api/checkout/orders
 * Retrieve all checkout orders
 */
checkoutRouter.get('/orders', async (req: Request, res: Response) => {
  try {
    const syncData = getLocalSyncData();
    const orders = syncData.checkoutOrders || [];
    return res.json({
      success: true,
      orders,
      total: orders.length
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

/**
 * POST /api/checkout/orders/:orderId/verify
 * 1-Click Verification & Activation of Purchased Plan by Super Admin
 */
checkoutRouter.post('/orders/:orderId/verify', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { customExpiryDate } = req.body || {};
    const syncData = getLocalSyncData();
    const orders: any[] = syncData.checkoutOrders || [];
    const orderIndex = orders.findIndex(o => o.id === orderId);

    if (orderIndex === -1) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const order = orders[orderIndex];
    const planPrefix = (order.planId || 'BUS').toUpperCase().slice(0, 3);
    const generatedLicenseKey = `MBI-${planPrefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}-ACT`;

    // Calculate expiry based on duration
    let durationDays = 365;
    if (order.billingInterval === 'monthly') durationDays = 30;
    else if (order.billingInterval === '1year') durationDays = 365;
    else if (order.billingInterval === '3years') durationDays = 1095;
    else if (order.billingInterval === '5years') durationDays = 1825;

    const expiryDate = customExpiryDate || new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    order.status = 'approved';
    order.approvedAt = new Date().toISOString();
    order.licenseKeyGenerated = generatedLicenseKey;
    order.licenseExpiry = expiryDate;

    // Update in local sync file
    orders[orderIndex] = order;
    syncData.checkoutOrders = orders;
    saveLocalSyncData(syncData);

    // Update in MariaDB if available
    const pool = getMariaDbPool();
    if (pool) {
      try {
        await pool.query(
          `UPDATE mbi_registration_leads 
           SET status = 'approved', is_approved = 1, activation_key = ?, activated_at = NOW() 
           WHERE id = ? OR phone = ?;`,
          [generatedLicenseKey, order.id, order.whatsapp]
        );

        await pool.query(
          `UPDATE mbi_tenants 
           SET plan = ?, status = 'Active', trial_ends_at = ? 
           WHERE phone = ? OR name = ?;`,
          [order.planName, expiryDate.slice(0, 19).replace('T', ' '), order.whatsapp, order.businessName]
        );

        await pool.query(
          `INSERT INTO mbi_licenses (
            id, tenant_id, license_key, plan_type, status, expires_at, created_at
          ) VALUES (?, ?, ?, ?, 'Active', ?, NOW())
          ON DUPLICATE KEY UPDATE 
            license_key = VALUES(license_key),
            plan_type = VALUES(plan_type),
            status = 'Active',
            expires_at = VALUES(expires_at),
            updated_at = NOW();`,
          [
            `lic_${order.id}`,
            order.tenantId || `tnt_${order.id}`,
            generatedLicenseKey,
            order.planName,
            expiryDate.slice(0, 19).replace('T', ' ')
          ]
        );
      } catch (dbErr: any) {
        console.warn('MariaDB verification update warning:', dbErr?.message);
      }
    }

    broadcastFleetActivity({
      type: 'ORDER_VERIFIED_AND_ACTIVATED',
      orderId: order.id,
      businessName: order.businessName,
      plan: order.planName,
      licenseKey: generatedLicenseKey,
      timestamp: new Date().toISOString()
    });

    return res.json({
      success: true,
      order,
      licenseKey: generatedLicenseKey,
      expiryDate,
      message: 'Plan successfully verified and license activated!'
    });
  } catch (err: any) {
    console.error('Order verification error:', err);
    return res.status(500).json({ success: false, error: err?.message });
  }
});

/**
 * POST /api/checkout/orders/:orderId/reject
 */
checkoutRouter.post('/orders/:orderId/reject', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body || {};
    const syncData = getLocalSyncData();
    const orders: any[] = syncData.checkoutOrders || [];
    const order = orders.find(o => o.id === orderId);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    order.status = 'rejected';
    order.rejectionReason = reason || 'Payment proof or transaction ID could not be verified.';
    order.rejectedAt = new Date().toISOString();

    syncData.checkoutOrders = orders;
    saveLocalSyncData(syncData);

    return res.json({ success: true, order });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

/**
 * DELETE /api/checkout/orders/:orderId
 */
checkoutRouter.delete('/orders/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const syncData = getLocalSyncData();
    const orders: any[] = syncData.checkoutOrders || [];
    syncData.checkoutOrders = orders.filter(o => o.id !== orderId);
    saveLocalSyncData(syncData);
    return res.json({ success: true, message: 'Order deleted' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

export default checkoutRouter;
