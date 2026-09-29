import { Medicine, Party, Supplier, Invoice, InvoiceItem, PurchaseOrder, PurchaseBillItem } from '../types';

export interface InvoiceColumnConfig {
  showHsn: boolean;
  showBatch: boolean;
  showExpiry: boolean;
  showMrp: boolean;
  showQuantity: boolean;
  showFreeQuantity: boolean;
  showDiscount: boolean;
  showUnit: boolean;
  showUnitPrice: boolean;
  showTaxGst: boolean;
  showAmount: boolean;
  showPoNumber: boolean;
  showPoDate: boolean;
  showPaymentTerms: boolean;
  showBarcode?: boolean;
  showManufacturer?: boolean;
}

export const DEFAULT_INVOICE_COLUMN_CONFIG: InvoiceColumnConfig = {
  showHsn: true,
  showBatch: true,
  showExpiry: true,
  showMrp: true,
  showQuantity: true,
  showFreeQuantity: true,
  showDiscount: true,
  showUnit: true,
  showUnitPrice: true,
  showTaxGst: true,
  showAmount: true,
  showPoNumber: true,
  showPoDate: true,
  showPaymentTerms: true,
  showBarcode: false,
  showManufacturer: true
};

export type InvoiceMode = 'Sale' | 'Purchase' | 'Estimate' | 'Sale Order' | 'Purchase Order' | 'Delivery Challan' | 'Sale Return' | 'Purchase Return';

export interface InvoiceGridRowItem {
  id: string;
  tempId?: string;
  medicineId?: string;
  name: string;
  genericName?: string;
  strength?: string;
  manufacturer?: string;
  barcode?: string;
  hsnCode?: string;
  batchNumber?: string;
  expiryDate?: string;
  mfgDate?: string;
  mrp?: number;
  quantity: number;
  freeQuantity?: number;
  discountPercentage?: number;
  discountAmount?: number;
  unit: string;
  pricePerUnit: number;
  sellingPrice?: number;
  purchasePrice?: number;
  taxPercentage?: number;
  taxAmount?: number;
  total: number;
}

export type { Medicine, Party, Supplier, Invoice, InvoiceItem, PurchaseOrder, PurchaseBillItem };
