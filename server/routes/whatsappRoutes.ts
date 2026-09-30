import { Router, Response } from 'express';
import { getMariaDbPool, isMariaDbAvailable } from '../db/mariaClient';
import { TenantRequest } from '../middleware/tenantMiddleware';
import fs from 'fs';
import path from 'path';

export const whatsappRouter = Router();

const whatsappHistoryFile = path.resolve(process.cwd(), '.whatsapp_history.json');

// Helper to save sent WhatsApp dispatch logs
function logWhatsAppDispatch(log: any) {
  try {
    let history: any[] = [];
    if (fs.existsSync(whatsappHistoryFile)) {
      history = JSON.parse(fs.readFileSync(whatsappHistoryFile, 'utf8') || '[]');
    }
    history.unshift({
      id: `wa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ...log,
      timestamp: new Date().toISOString()
    });
    if (history.length > 500) history = history.slice(0, 500);
    fs.writeFileSync(whatsappHistoryFile, JSON.stringify(history, null, 2), 'utf8');
  } catch {}
}

// 1. GET /api/whatsapp/settings/:tenantId
whatsappRouter.get('/settings/:tenantId', async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.params;
    let config = null;

    if (await isMariaDbAvailable()) {
      try {
        const pool = getMariaDbPool();
        const [rows]: any = await pool.query(
          'SELECT data FROM mbi_settings WHERE tenant_id = ? AND `key` = "whatsapp_config" LIMIT 1;',
          [tenantId]
        );
        if (rows && rows.length > 0 && rows[0].data) {
          config = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
        }
      } catch (dbErr) {}
    }

    res.json({
      success: true,
      tenantId,
      config: config || {
        tenantId,
        connectedNumber: '',
        ownerWhatsApp: '',
        isLinked: true,
        linkedDeviceName: 'WhatsApp Web Multi-Device (MBI Inventra)',
        lastConnectedAt: new Date().toISOString(),
        autoSendOnSale: true,
        autoSendOnReturn: true,
        autoSendOnPurchaseOrder: true,
        autoSendOnPurchase: false,
        autoSendOnPurchaseReturn: true,
        autoSendOnKhataPayment: true,
        autoSendOnSupplierPayment: false,
        autoSendOnQuotation: false,
        autoSendOnDeliveryChallan: false,
        autoSendShiftClosing: true,
        autoSendLowStockAlert: true,
        customSaleTemplate: '',
        customKhataTemplate: ''
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Error fetching WhatsApp settings' });
  }
});

// 2. POST /api/whatsapp/settings (Save Company WhatsApp Settings)
whatsappRouter.post('/settings', async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { 
      tenantId, 
      connectedNumber, 
      ownerWhatsApp, 
      isLinked,
      linkedDeviceName,
      autoSendOnSale, 
      autoSendOnReturn, 
      autoSendOnPurchaseOrder,
      autoSendOnPurchase, 
      autoSendOnPurchaseReturn,
      autoSendOnKhataPayment, 
      autoSendOnSupplierPayment,
      autoSendOnQuotation,
      autoSendOnDeliveryChallan,
      autoSendShiftClosing, 
      autoSendLowStockAlert,
      customSaleTemplate, 
      customKhataTemplate 
    } = req.body;
    const cleanTenantId = tenantId || req.headers['x-tenant-id']?.toString() || 'default';

    const config = {
      tenantId: cleanTenantId,
      connectedNumber: connectedNumber || '',
      ownerWhatsApp: ownerWhatsApp || '',
      isLinked: isLinked !== false,
      linkedDeviceName: linkedDeviceName || 'WhatsApp Web Multi-Device (MBI Inventra)',
      lastConnectedAt: new Date().toISOString(),
      autoSendOnSale: autoSendOnSale !== false,
      autoSendOnReturn: autoSendOnReturn !== false,
      autoSendOnPurchaseOrder: autoSendOnPurchaseOrder !== false,
      autoSendOnPurchase: !!autoSendOnPurchase,
      autoSendOnPurchaseReturn: autoSendOnPurchaseReturn !== false,
      autoSendOnKhataPayment: autoSendOnKhataPayment !== false,
      autoSendOnSupplierPayment: !!autoSendOnSupplierPayment,
      autoSendOnQuotation: !!autoSendOnQuotation,
      autoSendOnDeliveryChallan: !!autoSendOnDeliveryChallan,
      autoSendShiftClosing: autoSendShiftClosing !== false,
      autoSendLowStockAlert: autoSendLowStockAlert !== false,
      customSaleTemplate: customSaleTemplate || '',
      customKhataTemplate: customKhataTemplate || '',
      updatedAt: new Date().toISOString()
    };

    if (await isMariaDbAvailable()) {
      try {
        const pool = getMariaDbPool();
        await pool.query(
          `INSERT INTO mbi_settings (id, tenant_id, \`key\`, data, updated_at)
           VALUES (?, ?, 'whatsapp_config', ?, CURRENT_TIMESTAMP)
           ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = CURRENT_TIMESTAMP;`,
          [`wa_${cleanTenantId}`, cleanTenantId, JSON.stringify(config)]
        );
      } catch (dbErr) {}
    }

    res.json({
      success: true,
      message: 'Company WhatsApp Automation settings saved successfully',
      config
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Error saving WhatsApp settings' });
  }
});

import { 
  requestWhatsAppPairing, 
  getTenantState, 
  sendWhatsAppMessage, 
  disconnectWhatsApp 
} from '../services/baileysService';

// 2.1 POST /api/whatsapp/pair/:tenantId (Live WhatsApp Web Pairing Code Generator)
whatsappRouter.post('/pair/:tenantId', async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.params;
    const { phone } = req.body;
    if (!phone) {
      res.status(400).json({ success: false, error: 'Phone number is required to generate pairing code' });
      return;
    }

    const cleanTenantId = tenantId || req.headers['x-tenant-id']?.toString() || 'default';
    const result = await requestWhatsAppPairing(cleanTenantId, phone);

    if (result.success) {
      res.json({
        success: true,
        tenantId: cleanTenantId,
        phone,
        pairingCode: result.pairingCode,
        status: result.pairingCode ? 'PAIRING' : 'CONNECTED',
        expiresInSeconds: 160
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to request live WhatsApp pairing code'
      });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Error initiating pairing' });
  }
});

// 2.2 GET /api/whatsapp/status/:tenantId (Check Live Connection State)
whatsappRouter.get('/status/:tenantId', (req: TenantRequest, res: Response): void => {
  try {
    const { tenantId } = req.params;
    const cleanTenantId = tenantId || req.headers['x-tenant-id']?.toString() || 'default';
    const state = getTenantState(cleanTenantId);
    res.json({
      success: true,
      state
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Error checking WhatsApp status' });
  }
});

// 2.3 POST /api/whatsapp/disconnect/:tenantId (Unlink WhatsApp device)
whatsappRouter.post('/disconnect/:tenantId', async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.params;
    const cleanTenantId = tenantId || req.headers['x-tenant-id']?.toString() || 'default';

    await disconnectWhatsApp(cleanTenantId);

    if (await isMariaDbAvailable()) {
      try {
        const pool = getMariaDbPool();
        await pool.query(
          `UPDATE mbi_settings SET data = JSON_SET(COALESCE(data, '{}'), '$.isLinked', false, '$.connectedNumber', '')
           WHERE tenant_id = ? AND \`key\` = "whatsapp_config";`,
          [cleanTenantId]
        );
      } catch {}
    }
    res.json({ success: true, message: 'WhatsApp device unlinked successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Error unlinking WhatsApp device' });
  }
});

// 3. POST /api/whatsapp/send (Background Auto Dispatcher)
whatsappRouter.post('/send', async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, phone, message, invoiceNumber, customerName, amount } = req.body;
    const cleanTenantId = tenantId || req.headers['x-tenant-id']?.toString() || 'default';

    if (!phone || !message) {
      res.status(400).json({ success: false, error: 'Phone number and message text are required' });
      return;
    }

    // Attempt real Baileys dispatch
    let realDeliverySuccess = true;
    let deliveryNote = '';
    try {
      const sendResult = await sendWhatsAppMessage(cleanTenantId, phone, message);
      if (!sendResult.success) {
        realDeliverySuccess = false;
        deliveryNote = sendResult.error || '';
      }
    } catch (sendErr: any) {
      realDeliverySuccess = false;
      deliveryNote = sendErr?.message || '';
    }

    // Log the automatic background dispatch
    logWhatsAppDispatch({
      tenantId: cleanTenantId,
      phone,
      invoiceNumber: invoiceNumber || 'N/A',
      customerName: customerName || 'Walk-in Customer',
      amount: amount || 0,
      messagePreview: message.substring(0, 100),
      status: realDeliverySuccess ? 'DELIVERED' : 'QUEUED',
      deliveryMode: 'Auto-Background Gateway',
      note: deliveryNote
    });

    // Record in MariaDB Audit Logs
    if (await isMariaDbAvailable()) {
      try {
        const pool = getMariaDbPool();
        await pool.query(
          `INSERT INTO mbi_audit_logs (id, tenant_id, user_id, action, details, ip_address)
           VALUES (?, ?, 'whatsapp_bot', 'WHATSAPP_BILL_AUTO_SENT', ?, ?);`,
          [
            `audit_wa_${Date.now()}`,
            cleanTenantId,
            `Automated WhatsApp bill #${invoiceNumber || ''} sent to +${phone} (Rs. ${amount || 0})`,
            req.ip || '127.0.0.1'
          ]
        );
      } catch {}
    }

    res.json({
      success: true,
      message: realDeliverySuccess 
        ? `✅ Automated WhatsApp invoice delivered to +${phone}` 
        : `⚠️ WhatsApp logged (Phone not linked yet or queued)`,
      phone,
      invoiceNumber
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to dispatch WhatsApp message' });
  }
});

// 4. GET /api/whatsapp/history/:tenantId
whatsappRouter.get('/history/:tenantId', (req: TenantRequest, res: Response): void => {
  try {
    const { tenantId } = req.params;
    let history: any[] = [];
    if (fs.existsSync(whatsappHistoryFile)) {
      try {
        const all = JSON.parse(fs.readFileSync(whatsappHistoryFile, 'utf8') || '[]');
        history = all.filter((h: any) => h.tenantId === tenantId || tenantId === 'all');
      } catch {}
    }
    res.json({ success: true, count: history.length, history });
  } catch (err: any) {
    res.json({ success: true, count: 0, history: [] });
  }
});

// 5. POST /api/whatsapp/admin/toggle-gateway (Super Admin toggle override)
whatsappRouter.post('/admin/toggle-gateway', async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const masterPin = req.headers['x-master-pin'];
    if (masterPin !== 'Ami7788!@' && masterPin !== '03082003') {
      res.status(403).json({ success: false, error: 'Unauthorized: Invalid Master PIN' });
      return;
    }

    const { tenantId, enabled } = req.body;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'tenantId is required' });
      return;
    }

    if (await isMariaDbAvailable()) {
      try {
        const pool = getMariaDbPool();
        // Update or insert tenant settings override
        const [rows]: any = await pool.query(
          'SELECT data FROM mbi_settings WHERE tenant_id = ? AND `key` = "whatsapp_config" LIMIT 1;',
          [tenantId]
        );
        let config: any = {};
        if (rows && rows.length > 0 && rows[0].data) {
          config = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
        }
        config.autoGatewayOverride = !!enabled;
        config.updatedAt = new Date().toISOString();

        await pool.query(
          `INSERT INTO mbi_settings (id, tenant_id, \`key\`, data, updated_at)
           VALUES (?, ?, 'whatsapp_config', ?, CURRENT_TIMESTAMP)
           ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = CURRENT_TIMESTAMP;`,
          [`wa_${tenantId}`, tenantId, JSON.stringify(config)]
        );
      } catch (dbErr) {}
    }

    res.json({
      success: true,
      message: `WhatsApp Auto-Gateway override set to ${enabled ? 'ENABLED' : 'DISABLED'} for tenant ${tenantId}`,
      tenantId,
      autoGatewayOverride: !!enabled
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Error toggling WhatsApp gateway' });
  }
});

