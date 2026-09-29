import { formatWhatsAppPhone, buildInvoiceWhatsAppMessage, WhatsAppInvoiceData } from './whatsappService';
import { checkServerFeatureOverride, getActiveTenantPlan } from '../utils/planPermissions';

export interface TenantWhatsAppConfig {
  tenantId: string;
  connectedNumber: string;
  ownerWhatsApp: string;
  isLinked: boolean;
  autoSendOnSale: boolean;
  autoSendOnReturn: boolean;
  autoSendOnKhataPayment: boolean;
  autoSendOnPurchase: boolean;
  autoSendShiftClosing: boolean;
  customSaleTemplate?: string;
  customKhataTemplate?: string;
  lastUpdated?: string;
}

export const DEFAULT_WHATSAPP_CONFIG: TenantWhatsAppConfig = {
  tenantId: 'default',
  connectedNumber: '',
  ownerWhatsApp: '',
  isLinked: true,
  autoSendOnSale: true,
  autoSendOnReturn: true,
  autoSendOnKhataPayment: true,
  autoSendOnPurchase: false,
  autoSendShiftClosing: true,
  customSaleTemplate: 'Dear {CustomerName},\nThank you for shopping at *{PharmacyName}*!\n\n🧾 *Invoice #{InvoiceNo}*\n💰 Total Amount: Rs. {TotalAmount}\n📅 Date: {Date}\n\n_We appreciate your business and wish you good health!_',
  customKhataTemplate: 'Dear {CustomerName},\nPayment of Rs. {PaidAmount} received at *{PharmacyName}*.\nRemaining Balance: Rs. {DueBalance}.\nReceipt #{ReceiptNo}.'
};

/**
 * Get tenant's saved WhatsApp configuration
 */
export function getTenantWhatsAppConfig(tenantId?: string): TenantWhatsAppConfig {
  const tid = tenantId || localStorage.getItem('mbi_tenant_id') || 'default';
  try {
    const raw = localStorage.getItem(`mbi_whatsapp_config_${tid}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_WHATSAPP_CONFIG, ...parsed, tenantId: tid };
    }
  } catch (e) {
    console.warn('Error reading WhatsApp config:', e);
  }
  return { ...DEFAULT_WHATSAPP_CONFIG, tenantId: tid };
}

/**
 * Save tenant's WhatsApp configuration to local and server
 */
export async function saveTenantWhatsAppConfig(config: TenantWhatsAppConfig): Promise<boolean> {
  const tid = config.tenantId || 'default';
  try {
    localStorage.setItem(`mbi_whatsapp_config_${tid}`, JSON.stringify(config));
    
    // Attempt background sync to server
    fetch('/api/whatsapp/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': tid
      },
      body: JSON.stringify(config)
    }).catch(() => {});

    return true;
  } catch (e) {
    console.error('Failed to save WhatsApp config:', e);
    return false;
  }
}

/**
 * Check if tenant has Auto Background WhatsApp enabled
 * Requires Enterprise (Platinum) tier OR Super Admin override
 */
export function isAutoWhatsAppAllowed(tenantId?: string): boolean {
  const override = checkServerFeatureOverride('auto_whatsapp_gateway', tenantId);
  if (override !== null) return override;

  const plan = getActiveTenantPlan(tenantId);
  return plan === 'platinum';
}

/**
 * Dispatches an automated or 1-click WhatsApp Invoice
 */
export async function dispatchWhatsAppInvoice(
  invoiceData: WhatsAppInvoiceData,
  tenantId?: string
): Promise<{ success: boolean; mode: 'auto_background' | 'click_direct'; message: string; url?: string }> {
  const tid = tenantId || localStorage.getItem('mbi_tenant_id') || 'default';
  const config = getTenantWhatsAppConfig(tid);
  const formattedPhone = formatWhatsAppPhone(invoiceData.customerPhone || '');
  const messageText = buildInvoiceWhatsAppMessage(invoiceData);

  // If no customer phone, cannot dispatch
  if (!formattedPhone) {
    return {
      success: false,
      mode: 'click_direct',
      message: 'No valid customer phone number provided.'
    };
  }

  const isAuto = isAutoWhatsAppAllowed(tid) && config.autoSendOnSale;

  if (isAuto) {
    try {
      // Background Dispatch via Server Endpoint
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tid
        },
        body: JSON.stringify({
          tenantId: tid,
          phone: formattedPhone,
          message: messageText,
          invoiceNumber: invoiceData.invoiceNumber,
          customerName: invoiceData.customerName,
          amount: invoiceData.grandTotal
        })
      });

      if (res.ok) {
        return {
          success: true,
          mode: 'auto_background',
          message: `✅ Auto WhatsApp bill sent to +${formattedPhone}`
        };
      }
    } catch (e) {
      console.warn('Background auto WhatsApp dispatch fallback:', e);
    }
  }

  // 1-Click Direct Share fallback
  const directUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`;
  return {
    success: true,
    mode: 'click_direct',
    message: '1-Click WhatsApp invoice ready',
    url: directUrl
  };
}
