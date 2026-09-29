/**
 * MBI INVENTRA - Private Transaction & Encrypted Ledger Engine
 * Completely isolated from public POS invoices, cashier shifts, and public ledgers.
 */

export type PrivateTxnType = 
  | 'Sale' 
  | 'Purchase' 
  | 'Sale Return' 
  | 'Purchase Return' 
  | 'Stock Adjustment';

export type PrivateTxnStatus = 'Posted' | 'Draft' | 'Cancelled';

export interface PrivateLineItem {
  id: string;
  medicineId?: string;
  name: string;
  genericName?: string;
  barcode?: string;
  batchNumber?: string;
  expiryDate?: string;
  packSize?: string;
  unit?: string;
  quantity: number;
  purchaseRate: number; // Cost Price
  saleRate: number;     // Selling Price
  discountPercent?: number;
  discountAmount?: number;
  taxPercent?: number;
  taxAmount?: number;
  lineTotal: number;
  lineProfit?: number; // Only exposed to authorized roles (Owner/Admin)
  adjustmentReason?: 'Damage' | 'Breakage' | 'Physical Audit' | 'Expired' | 'Correction' | 'Other';
}

export interface PrivateTransactionRecord {
  id: string;
  tenantId: string;
  firmId?: string;
  transactionNumber: string;
  type: PrivateTxnType;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  referenceNumber?: string;
  partyName: string; // Default: 'Walk-in Customer / Cash'
  partyPhone?: string;
  paymentMethod: 'Cash' | 'Bank / Raast' | 'JazzCash / EasyPaisa' | 'Credit / Due' | 'Mixed';
  status: PrivateTxnStatus;
  notes?: string;
  items: PrivateLineItem[];
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  grossProfit: number;
  paidAmount: number;
  balanceDue: number;
  changeDue: number;
  createdByUserId?: string;
  createdByUserName?: string;
  createdAt: string;
  updatedAt: string;
  isEncrypted: boolean;
}

export interface PrivatePanelConfig {
  enabled: boolean;
  shortcutKey: string; // e.g. 'Alt+P'
  unlockPin: string;   // e.g. '7860'
  allowedRoles: string[];
  allowOwnerAggregates: boolean;
  updatedAt?: string;
}

const DEFAULT_CONFIG: PrivatePanelConfig = {
  enabled: true,
  shortcutKey: 'Alt+P',
  unlockPin: '7860',
  allowedRoles: ['Owner', 'Admin', 'Super Admin', 'Primary Admin'],
  allowOwnerAggregates: true,
  updatedAt: new Date().toISOString(),
};

const STORAGE_KEY_PREFIX = 'mbi_private_transactions_';
const CONFIG_KEY_PREFIX = 'mbi_private_panel_config_';

// Simple obfuscation/encryption wrapper for isolation
function encryptPayload(data: any): string {
  try {
    const json = JSON.stringify(data);
    return btoa(encodeURIComponent(json));
  } catch (e) {
    return JSON.stringify(data);
  }
}

function decryptPayload<T>(cipher: string): T | null {
  try {
    if (!cipher) return null;
    if (cipher.startsWith('{') || cipher.startsWith('[')) {
      return JSON.parse(cipher) as T;
    }
    const json = decodeURIComponent(atob(cipher));
    return JSON.parse(json) as T;
  } catch (e) {
    try {
      return JSON.parse(cipher) as T;
    } catch {
      return null;
    }
  }
}

class PrivateTransactionService {
  private inMemoryCache = new Map<string, PrivateTransactionRecord[]>();

  constructor() {
    // Listen for SSE broadcast updates for private panel config
    if (typeof window !== 'undefined') {
      window.addEventListener('mbi-private-panel-config-updated', (event: any) => {
        if (event.detail && event.detail.config) {
          const tenantId = event.detail.tenantId || 'default';
          this.saveConfigLocally(tenantId, event.detail.config);
        }
      });
    }
  }

  /**
   * Get Private Engine Configuration for a tenant
   */
  public getConfig(tenantId: string = 'default'): PrivatePanelConfig {
    try {
      const raw = localStorage.getItem(`${CONFIG_KEY_PREFIX}${tenantId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_CONFIG, ...parsed };
      }
    } catch {}
    return { ...DEFAULT_CONFIG };
  }

  /**
   * Save Private Engine Configuration locally and sync to server if online
   */
  public async saveConfig(config: Partial<PrivatePanelConfig>, tenantId: string = 'default'): Promise<boolean> {
    const current = this.getConfig(tenantId);
    const updated: PrivatePanelConfig = {
      ...current,
      ...config,
      updatedAt: new Date().toISOString(),
    };

    this.saveConfigLocally(tenantId, updated);

    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/private-panel-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      return res.ok;
    } catch (err) {
      console.warn('[PRIVATE ENGINE] Remote config sync notice:', err);
      return true; // Still locally saved
    }
  }

  public saveConfigLocally(tenantId: string, config: PrivatePanelConfig): void {
    try {
      localStorage.setItem(`${CONFIG_KEY_PREFIX}${tenantId}`, JSON.stringify(config));
    } catch (e) {
      console.error('[PRIVATE ENGINE] Local storage save error:', e);
    }
  }

  /**
   * Verify entered PIN against the tenant's configured unlock PIN
   */
  public verifyPin(enteredPin: string, tenantId: string = 'default'): boolean {
    const config = this.getConfig(tenantId);
    const targetPin = (config.unlockPin || '7860').trim();
    return enteredPin.trim() === targetPin;
  }

  /**
   * Generate Next Private Transaction Number (e.g. PVT-20260927-001)
   */
  public generateNextTxnNumber(type: PrivateTxnType): string {
    const prefixMap: Record<PrivateTxnType, string> = {
      'Sale': 'PVT-SL',
      'Purchase': 'PVT-PR',
      'Sale Return': 'PVT-SR',
      'Purchase Return': 'PVT-PRR',
      'Stock Adjustment': 'PVT-ADJ',
    };
    const prefix = prefixMap[type] || 'PVT-TX';
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${dateStr}-${rand}`;
  }

  /**
   * Fetch all isolated private records for a tenant
   */
  public async getAllTransactions(tenantId: string = 'default'): Promise<PrivateTransactionRecord[]> {
    if (this.inMemoryCache.has(tenantId)) {
      return this.inMemoryCache.get(tenantId)!;
    }

    try {
      const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${tenantId}`);
      if (!raw) {
        this.inMemoryCache.set(tenantId, []);
        return [];
      }
      const records = decryptPayload<PrivateTransactionRecord[]>(raw) || [];
      // Sort newest first
      records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      this.inMemoryCache.set(tenantId, records);
      return records;
    } catch (e) {
      console.error('[PRIVATE LEDGER] Error loading transactions:', e);
      return [];
    }
  }

  /**
   * Save or Update a Private Transaction Record
   */
  public async saveTransaction(
    txnData: Partial<PrivateTransactionRecord>,
    tenantId: string = 'default'
  ): Promise<PrivateTransactionRecord> {
    const records = await this.getAllTransactions(tenantId);
    const nowIso = new Date().toISOString();

    const isExisting = Boolean(txnData.id && records.some(r => r.id === txnData.id));

    const finalRecord: PrivateTransactionRecord = {
      id: txnData.id || `pvt_txn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      tenantId: tenantId,
      firmId: txnData.firmId || 'main',
      transactionNumber: txnData.transactionNumber || this.generateNextTxnNumber(txnData.type || 'Sale'),
      type: txnData.type || 'Sale',
      date: txnData.date || nowIso.slice(0, 10),
      time: txnData.time || new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      referenceNumber: txnData.referenceNumber || '',
      partyName: txnData.partyName || 'Walk-in Customer / Cash',
      partyPhone: txnData.partyPhone || '',
      paymentMethod: txnData.paymentMethod || 'Cash',
      status: txnData.status || 'Posted',
      notes: txnData.notes || '',
      items: txnData.items || [],
      subtotal: txnData.subtotal || 0,
      totalDiscount: txnData.totalDiscount || 0,
      totalTax: txnData.totalTax || 0,
      grandTotal: txnData.grandTotal || 0,
      grossProfit: txnData.grossProfit || 0,
      paidAmount: txnData.paidAmount || 0,
      balanceDue: txnData.balanceDue || 0,
      changeDue: txnData.changeDue || 0,
      createdByUserId: txnData.createdByUserId,
      createdByUserName: txnData.createdByUserName,
      createdAt: isExisting ? (txnData.createdAt || nowIso) : nowIso,
      updatedAt: nowIso,
      isEncrypted: true,
    };

    let updatedList: PrivateTransactionRecord[];
    if (isExisting) {
      updatedList = records.map(r => r.id === finalRecord.id ? finalRecord : r);
    } else {
      updatedList = [finalRecord, ...records];
    }

    // Persist isolated encrypted store
    this.inMemoryCache.set(tenantId, updatedList);
    const encrypted = encryptPayload(updatedList);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${tenantId}`, encrypted);

    return finalRecord;
  }

  /**
   * Delete a Private Transaction Record
   */
  public async deleteTransaction(id: string, tenantId: string = 'default'): Promise<boolean> {
    const records = await this.getAllTransactions(tenantId);
    const filtered = records.filter(r => r.id !== id);
    this.inMemoryCache.set(tenantId, filtered);
    const encrypted = encryptPayload(filtered);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${tenantId}`, encrypted);
    return true;
  }

  /**
   * Calculate Private Aggregates (Owner & Super Admin Only)
   */
  public async getPrivateAggregates(tenantId: string = 'default'): Promise<{
    totalTurnover: number;
    totalSales: number;
    totalPurchases: number;
    totalReturns: number;
    totalProfit: number;
    totalCount: number;
  }> {
    const records = await this.getAllTransactions(tenantId);
    let totalSales = 0;
    let totalPurchases = 0;
    let totalReturns = 0;
    let totalProfit = 0;

    for (const r of records) {
      if (r.status === 'Cancelled') continue;
      if (r.type === 'Sale') {
        totalSales += r.grandTotal || 0;
        totalProfit += r.grossProfit || 0;
      } else if (r.type === 'Purchase') {
        totalPurchases += r.grandTotal || 0;
      } else if (r.type === 'Sale Return') {
        totalReturns += r.grandTotal || 0;
        totalProfit -= r.grossProfit || 0;
      } else if (r.type === 'Purchase Return') {
        totalPurchases -= r.grandTotal || 0;
      }
    }

    const totalTurnover = totalSales + totalPurchases;

    return {
      totalTurnover: Math.round(totalTurnover * 100) / 100,
      totalSales: Math.round(totalSales * 100) / 100,
      totalPurchases: Math.round(totalPurchases * 100) / 100,
      totalReturns: Math.round(totalReturns * 100) / 100,
      totalProfit: Math.round(totalProfit * 100) / 100,
      totalCount: records.length,
    };
  }

  /**
   * Print Private Receipt in thermal / standard window
   */
  public printPrivateReceipt(txn: PrivateTransactionRecord, storeName: string = 'MBI INVENTRA PHARMACY'): void {
    const printWindow = window.open('', '_blank', 'width=420,height=600');
    if (!printWindow) {
      alert('Please allow popups to print the private receipt');
      return;
    }

    const itemsHtml = txn.items.map(it => `
      <tr>
        <td style="padding: 4px 0; font-size: 11px;">
          <strong>${it.name}</strong><br/>
          <span style="font-size: 9px; color: #555;">${it.packSize || ''} ${it.unit || ''} | B: ${it.batchNumber || '-'}</span>
        </td>
        <td style="padding: 4px 0; text-align: center; font-size: 11px;">${it.quantity}</td>
        <td style="padding: 4px 0; text-align: right; font-size: 11px;">${(txn.type === 'Purchase' || txn.type === 'Purchase Return' ? it.purchaseRate : it.saleRate).toFixed(2)}</td>
        <td style="padding: 4px 0; text-align: right; font-size: 11px; font-weight: bold;">${it.lineTotal.toFixed(2)}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Private Receipt - ${txn.transactionNumber}</title>
        <style>
          @page { size: 80mm auto; margin: 3mm; }
          body { font-family: monospace, sans-serif; font-size: 11px; margin: 0; padding: 10px; color: #000; background: #fff; }
          .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
          .title { font-size: 14px; font-weight: bold; margin: 0; }
          .watermark { display: inline-block; padding: 2px 6px; font-size: 9px; font-weight: bold; border: 1px solid #000; border-radius: 4px; margin-top: 4px; }
          .meta { font-size: 10px; margin-bottom: 8px; line-height: 1.4; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
          th { text-align: left; font-size: 10px; border-bottom: 1px solid #000; padding: 3px 0; }
          .totals { border-top: 1px dashed #000; padding-top: 6px; line-height: 1.5; font-size: 11px; }
          .grand { font-size: 13px; font-weight: bold; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 0; }
          .footer { text-align: center; margin-top: 12px; font-size: 9px; color: #555; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${storeName}</div>
          <div class="watermark">🔒 PRIVATE TRANSACTION RECORD</div>
        </div>
        <div class="meta">
          <div><strong>Txn #:</strong> ${txn.transactionNumber}</div>
          <div><strong>Type:</strong> ${txn.type.toUpperCase()} | <strong>Status:</strong> ${txn.status}</div>
          <div><strong>Date:</strong> ${txn.date} ${txn.time}</div>
          <div><strong>Party:</strong> ${txn.partyName} ${txn.partyPhone ? `(${txn.partyPhone})` : ''}</div>
          <div><strong>Payment:</strong> ${txn.paymentMethod}</div>
          ${txn.referenceNumber ? `<div><strong>Ref #:</strong> ${txn.referenceNumber}</div>` : ''}
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 45%;">Item</th>
              <th style="width: 15%; text-align: center;">Qty</th>
              <th style="width: 20%; text-align: right;">Rate</th>
              <th style="width: 20%; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div class="totals">
          <div style="display: flex; justify-content: space-between;"><span>Subtotal:</span><span>Rs. ${txn.subtotal.toFixed(2)}</span></div>
          ${txn.totalDiscount > 0 ? `<div style="display: flex; justify-content: space-between;"><span>Discount:</span><span>- Rs. ${txn.totalDiscount.toFixed(2)}</span></div>` : ''}
          ${txn.totalTax > 0 ? `<div style="display: flex; justify-content: space-between;"><span>Tax:</span><span>+ Rs. ${txn.totalTax.toFixed(2)}</span></div>` : ''}
          <div class="grand" style="display: flex; justify-content: space-between;">
            <span>GRAND TOTAL:</span>
            <span>Rs. ${txn.grandTotal.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 3px;"><span>Paid Amount:</span><span>Rs. ${txn.paidAmount.toFixed(2)}</span></div>
          <div style="display: flex; justify-content: space-between;"><span>Balance Due:</span><span>Rs. ${txn.balanceDue.toFixed(2)}</span></div>
        </div>
        ${txn.notes ? `<div style="margin-top: 8px; font-size: 10px;"><strong>Notes:</strong> ${txn.notes}</div>` : ''}
        <div class="footer">
          * CONFIDENTIAL & ISOLATED PRIVATE LEDGER *<br/>
          Recorded via MBI Inventra Private Engine
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 750);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  }
}

export const privateTransactionService = new PrivateTransactionService();
