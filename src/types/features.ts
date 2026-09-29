export interface FeatureCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  features: FeatureItem[];
}

export type PlanTierCode = 'basic' | 'business' | 'enterprise';

export interface FeatureItem {
  id: string;
  name: string;
  description: string;
  badge?: string;
  defaultEnabled: boolean;
  minPlan: PlanTierCode;
  category: 'pos_billing' | 'inventory_fefo' | 'ledgers_khatas' | 'whatsapp_comm' | 'ai_security' | 'cloud_sync' | 'analytics_reports';
}

export type TenantFeatureMap = Record<string, boolean>;

export const DEFAULT_173_FEATURE_MATRIX: FeatureCategory[] = [
  {
    id: 'pos_billing',
    name: 'POS & Rapid Billing Engine',
    description: 'High-speed retail counter, barcode engine, receipt printers & split payments',
    icon: 'Zap',
    features: [
      { id: 'pos_rapid_billing_02s', name: '0.2s Ultra-Fast Billing', description: 'Zero-lag sub-second continuous billing engine', defaultEnabled: true, minPlan: 'basic', category: 'pos_billing' },
      { id: 'pos_barcode_auto_detect', name: 'Barcode Auto-Detection & Camera Scanner', description: 'Instant camera & USB barcode auto-focus recognition', defaultEnabled: true, minPlan: 'basic', category: 'pos_billing' },
      { id: 'pos_thermal_80mm_58mm', name: 'Thermal Receipt 80mm / 58mm Printing', description: 'ESC/POS high speed receipt templates with custom Urdu/English headers', defaultEnabled: true, minPlan: 'basic', category: 'pos_billing' },
      { id: 'pos_split_payment_multi', name: 'Split Payment (Cash + Card + Khata)', description: 'Simultaneous partial payment across multiple modes', defaultEnabled: true, minPlan: 'basic', category: 'pos_billing' },
      { id: 'pos_hold_resume_cart', name: 'Hold & Multi-Counter Cart Dock', description: 'Suspend active invoice to serve next customer with instant resume', defaultEnabled: true, minPlan: 'basic', category: 'pos_billing' },
      { id: 'pos_custom_discounts', name: 'Granular Item & Bill Level Discounts', description: 'Flat amount or percentage discount validation rules', defaultEnabled: true, minPlan: 'basic', category: 'pos_billing' },
      { id: 'pos_fast_keyboard_shortcuts', name: 'F1-F12 Keyboard Command Center', description: 'Mouse-free keyboard navigation for seasoned counter operators', defaultEnabled: true, minPlan: 'basic', category: 'pos_billing' },
      { id: 'pos_walkin_fast_profile', name: 'Walk-in Customer Quick Profiling', description: 'Instant phone number linking without modal blockage', defaultEnabled: true, minPlan: 'basic', category: 'pos_billing' },
      { id: 'pos_tax_fbr_pos_integration', name: 'FBR POS / Fiscal Digital Stamps', description: 'FBR digital invoice formatting, STRN/NTN stamps and QR verification', defaultEnabled: false, minPlan: 'enterprise', category: 'pos_billing' },
      { id: 'pos_auto_change_calc', name: 'Smart Change & Return Calculator', description: 'Visual cash return denomination assistant', defaultEnabled: true, minPlan: 'basic', category: 'pos_billing' }
    ]
  },
  {
    id: 'whatsapp_comm',
    name: 'WhatsApp Automation & Customer Khata',
    description: 'Automated background gateway vs 1-click wa.me instant delivery',
    icon: 'MessageSquare',
    features: [
      { id: 'whatsapp_direct_1click', name: '1-Click WhatsApp Direct (wa.me)', description: 'Instant 1-click formatted invoice & ledger statement sharing via web/desktop', defaultEnabled: true, minPlan: 'basic', category: 'whatsapp_comm' },
      { id: 'whatsapp_auto_gateway', name: 'Automated Background WhatsApp Gateway', description: 'Silent automatic dispatch of invoices, return notes & shift closings from attached company number', defaultEnabled: false, minPlan: 'enterprise', category: 'whatsapp_comm' },
      { id: 'whatsapp_khata_reminders', name: 'WhatsApp Khata Balance Due Alerts', description: '1-click customer due balance statement and payment links', defaultEnabled: true, minPlan: 'basic', category: 'whatsapp_comm' },
      { id: 'whatsapp_daily_shift_summary', name: 'WhatsApp End-of-Day Shift Z-Report', description: 'Automated owner report with daily net sales, cash in drawer and discounts', defaultEnabled: true, minPlan: 'business', category: 'whatsapp_comm' }
    ]
  },
  {
    id: 'inventory_fefo',
    name: 'Inventory & FEFO Expiry Management',
    description: 'First-Expiry-First-Out engine, narcotics tracking, expiry radars & multi-godown',
    icon: 'Package',
    features: [
      { id: 'fefo_radar_near_expiry', name: 'Near-Expiry Radar & Smart FEFO Dispatch', description: 'Automated 30/60/90 days expiry alerts and oldest batch prioritization', defaultEnabled: false, minPlan: 'business', category: 'inventory_fefo' },
      { id: 'inventory_batch_segregation', name: 'Batch & Lot Number Segregation', description: 'Independent cost tracking and MRP control per manufacturing batch', defaultEnabled: true, minPlan: 'basic', category: 'inventory_fefo' },
      { id: 'inventory_multi_godown', name: 'Multi-Godown Storage & Branch Requisitions', description: 'Inter-warehouse stock requisition and gate pass transfer logs', defaultEnabled: false, minPlan: 'business', category: 'inventory_fefo' },
      { id: 'inventory_multi_branch_transfers', name: 'Multi-Branch Cross-Store Live Stock Transfer', description: 'Direct stock movement between distinct pharmacy branches with audit receipts', defaultEnabled: false, minPlan: 'enterprise', category: 'inventory_fefo' },
      { id: 'inventory_wholesale_matrix', name: 'Wholesale & B2B Dual Pricing Matrix', description: 'Tiered retail vs wholesale rate cards with carton/pack quantity rules', defaultEnabled: false, minPlan: 'business', category: 'inventory_fefo' },
      { id: 'inventory_return_debit_note', name: 'Supplier Expiry Return & Debit Notes', description: 'Automated credit claiming for expired or damaged items', defaultEnabled: true, minPlan: 'basic', category: 'inventory_fefo' },
      { id: 'inventory_low_stock_auto_order', name: 'Low Stock Auto-Purchase Demand Book', description: 'Predictive reorder level triggers and 1-click PO generation', defaultEnabled: true, minPlan: 'basic', category: 'inventory_fefo' },
      { id: 'inventory_narcotic_schedule_d', name: 'Schedule D Narcotics & Controlled Drug Book', description: 'Form-7 compliant narcotic dispensing registers with doctor license tracking', defaultEnabled: false, minPlan: 'business', category: 'inventory_fefo' },
      { id: 'inventory_salt_composition_lookup', name: 'Generic Formula & 100k+ Pre-Indexed Medicines', description: 'Instant replacement medicine lookup with equivalent therapeutic strength', defaultEnabled: true, minPlan: 'basic', category: 'inventory_fefo' },
      { id: 'inventory_barcode_label_maker', name: 'Custom Barcode & Price Tag Generator', description: 'Thermal sticker generation for non-barcoded generic items', defaultEnabled: true, minPlan: 'basic', category: 'inventory_fefo' }
    ]
  },
  {
    id: 'ledgers_khatas',
    name: 'Ledgers, Accounts & P&L Analytics',
    description: 'Double-entry accounting, customer credit books, supplier payables & cash registers',
    icon: 'BookOpen',
    features: [
      { id: 'khata_customer_credit_book', name: 'Customer Credit Khata & Balance Tracking', description: 'Digital ledger with balance limits and payment receipts', defaultEnabled: true, minPlan: 'basic', category: 'ledgers_khatas' },
      { id: 'khata_supplier_payables_ledger', name: 'Supplier Payables & Purchase Aging', description: 'Distributor payment tracking with cheque due alerts', defaultEnabled: true, minPlan: 'basic', category: 'ledgers_khatas' },
      { id: 'khata_daily_cash_drawer_shift', name: 'Counter Cash Shifts & Z-Report Closes', description: 'Opening float, shift reconciliation, and shortage/excess audits', defaultEnabled: true, minPlan: 'basic', category: 'ledgers_khatas' },
      { id: 'khata_expense_voucher_tracker', name: 'Petty Cash & Pharmacy Expense Vouchers', description: 'Rent, salaries, utility bills, and tea expense categorizations', defaultEnabled: true, minPlan: 'basic', category: 'ledgers_khatas' },
      { id: 'khata_profit_loss_realtime', name: 'Real-Time Net Profit / Loss Analytics', description: 'COGS subtraction, gross margin, and net operating income analytics', defaultEnabled: false, minPlan: 'business', category: 'ledgers_khatas' },
      { id: 'khata_bank_account_reconciliation', name: 'Bank & Digital Wallet Reconciliation', description: 'Meezan, HBL, EasyPaisa, and JazzCash account ledger balances', defaultEnabled: false, minPlan: 'business', category: 'ledgers_khatas' }
    ]
  },
  {
    id: 'ai_security',
    name: 'AI Copilot & Enterprise Security',
    description: 'Prescription OCR, drug interaction radar, hardware lock & remote kill switch',
    icon: 'ShieldCheck',
    features: [
      { id: 'ai_mbi_copilot_assistant', name: 'MBI AI Pharmacy Copilot & Knowledge Guide', description: 'Conversational assistant with daily quota governance (Basic 20, Business 50, Enterprise 200 msgs/day)', defaultEnabled: true, minPlan: 'basic', category: 'ai_security' },
      { id: 'ai_prescription_ocr_scanner', name: 'Doctor Prescription Image OCR AI', description: 'Optical character recognition converting handwritten slips to billing items', defaultEnabled: false, minPlan: 'enterprise', category: 'ai_security' },
      { id: 'security_hwid_hardware_lock', name: 'Anti-Piracy HWID Hardware Binding', description: 'Cryptographic binding preventing unauthorized cloning on other computers', defaultEnabled: true, minPlan: 'basic', category: 'ai_security' },
      { id: 'security_silent_remote_telemetry', name: 'Silent Remote Fleet Telemetry', description: 'Background heartbeat transmitting version, database health, and sales volume', defaultEnabled: true, minPlan: 'basic', category: 'ai_security' },
      { id: 'security_kill_switch_remote_lock', name: 'Emergency Remote Lock & Kill Switch', description: 'Instant store freezing in case of license default or stolen hardware', defaultEnabled: false, minPlan: 'enterprise', category: 'ai_security' },
      { id: 'security_granular_rbac_roles', name: 'Granular Role-Based Access Control (RBAC)', description: 'Primary Owner immunity and fine-grained counter cashier restrictions', defaultEnabled: true, minPlan: 'basic', category: 'ai_security' },
      { id: 'security_immutable_audit_trails', name: 'Tamper-Evident Anti-Theft Audit Trails', description: 'Un-editable log of invoice deletions, price overrides, and cash drawer openings', defaultEnabled: false, minPlan: 'enterprise', category: 'ai_security' }
    ]
  },
  {
    id: 'cloud_sync',
    name: 'Cloud & Offline Synchronization',
    description: 'MariaDB replication, 100% offline continuity, SSE live streams & 50GB NVMe cloud',
    icon: 'Cloud',
    features: [
      { id: 'sync_offline_dual_engine', name: 'Dual Engine 100% Offline Continuity', description: 'Local IndexedDB/MariaDB keeps billing running with 0ms internet dependency', defaultEnabled: true, minPlan: 'basic', category: 'cloud_sync' },
      { id: 'sync_sse_realtime_stream', name: 'Real-Time Server-Sent Events (SSE) Stream', description: 'Instant push notifications for price updates, fleet broadcasts, and remote locks', defaultEnabled: true, minPlan: 'basic', category: 'cloud_sync' },
      { id: 'sync_encrypted_cloud_backup', name: '24-Hour Automated Encrypted Cloud Snapshots', description: 'Automated disaster recovery storage with zero data loss guarantee', defaultEnabled: false, minPlan: 'business', category: 'cloud_sync' },
      { id: 'sync_nvme_cloud_mirror_50gb', name: '50GB NVMe Cloud Mirroring & Storage', description: 'Dedicated enterprise cloud replica with sub-second database mirroring', defaultEnabled: false, minPlan: 'enterprise', category: 'cloud_sync' },
      { id: 'sync_pwa_hot_code_push', name: 'PWA Hot Code Push & Service Worker Cache', description: 'Seamless background updates without disrupting active cashiers', defaultEnabled: true, minPlan: 'basic', category: 'cloud_sync' },
      { id: 'sync_cross_device_counter_link', name: 'Local Area Network (LAN) Multi-Counter Sync', description: 'Link 5+ counter PCs to single local Master MariaDB server', defaultEnabled: false, minPlan: 'business', category: 'cloud_sync' },
      { id: 'sync_online_storefront', name: 'Online Storefront & Mobile Order Integration', description: 'Public patient medicine ordering website with live inventory sync', defaultEnabled: false, minPlan: 'enterprise', category: 'cloud_sync' }
    ]
  }
];

export function getFullFeatureIdList(): string[] {
  return DEFAULT_173_FEATURE_MATRIX.flatMap(cat => cat.features.map(f => f.id));
}

/**
 * Generates default feature flags based strictly on the tenant's plan tier.
 */
export function getFeaturesForPlan(plan?: string): TenantFeatureMap {
  const normalized = (plan || 'basic').toLowerCase().trim();
  const isEnterprise = normalized.includes('enterprise') || normalized.includes('platinum');
  const isBusiness = normalized.includes('business') || normalized.includes('gold') || isEnterprise;

  const map: TenantFeatureMap = {};
  for (const cat of DEFAULT_173_FEATURE_MATRIX) {
    for (const f of cat.features) {
      if (isEnterprise) {
        map[f.id] = true;
      } else if (isBusiness) {
        map[f.id] = f.minPlan === 'basic' || f.minPlan === 'business';
      } else {
        map[f.id] = f.minPlan === 'basic';
      }
    }
  }
  return map;
}

export function getDefaultFeatureMap(): TenantFeatureMap {
  return getFeaturesForPlan('basic');
}
