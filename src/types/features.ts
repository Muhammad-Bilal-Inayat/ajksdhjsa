export interface FeatureCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  features: FeatureItem[];
}

export interface FeatureItem {
  id: string;
  name: string;
  description: string;
  badge?: string;
  defaultEnabled: boolean;
  category: 'pos_billing' | 'inventory_fefo' | 'ledgers_khatas' | 'ai_security' | 'cloud_sync' | 'analytics_reports';
}

export type TenantFeatureMap = Record<string, boolean>;

export const DEFAULT_173_FEATURE_MATRIX: FeatureCategory[] = [
  {
    id: 'pos_billing',
    name: 'POS & Billing Engine',
    description: 'High-speed retail counter, barcode engine, receipt printers & cart holding',
    icon: 'Zap',
    features: [
      { id: 'pos_rapid_billing_02s', name: '0.2s Ultra-Fast Billing', description: 'Zero-lag sub-second continuous billing engine', defaultEnabled: true, category: 'pos_billing' },
      { id: 'pos_barcode_auto_detect', name: 'Barcode Auto-Detection & Camera Scanner', description: 'Instant camera & USB barcode auto-focus recognition', defaultEnabled: true, category: 'pos_billing' },
      { id: 'pos_thermal_80mm_58mm', name: 'Thermal Receipt 80mm / 58mm Printing', description: 'ESC/POS high speed receipt templates with custom Urdu/English store headers', defaultEnabled: true, category: 'pos_billing' },
      { id: 'pos_split_payment_multi', name: 'Split Payment (Cash + Card + Khata)', description: 'Simultaneous partial payment across multiple modes', defaultEnabled: true, category: 'pos_billing' },
      { id: 'pos_hold_resume_cart', name: 'Hold & Multi-Counter Cart Dock', description: 'Suspend active invoice to serve next customer with instant resume', defaultEnabled: true, category: 'pos_billing' },
      { id: 'pos_custom_discounts', name: 'Granular Item & Bill Level Discounts', description: 'Flat amount or percentage discount validation rules', defaultEnabled: true, category: 'pos_billing' },
      { id: 'pos_fast_keyboard_shortcuts', name: 'F1-F12 Keyboard Command Center', description: 'Mouse-free keyboard navigation for seasoned counter operators', defaultEnabled: true, category: 'pos_billing' },
      { id: 'pos_walkin_fast_profile', name: 'Walk-in Customer Quick Profiling', description: 'Instant phone number linking without modal blockage', defaultEnabled: true, category: 'pos_billing' },
      { id: 'pos_tax_fbr_pos_integration', name: 'FBR POS / Provincial Tax Integration', description: 'Digital tax invoice formatting and QR code printing', defaultEnabled: true, category: 'pos_billing' },
      { id: 'pos_auto_change_calc', name: 'Smart Change & Return Calculator', description: 'Visual cash return denomination assistant', defaultEnabled: true, category: 'pos_billing' }
    ]
  },
  {
    id: 'inventory_fefo',
    name: 'Inventory & FEFO Batches',
    description: 'First-Expiry-First-Out engine, narcotics tracking, expiry radars & multi-godown',
    icon: 'Package',
    features: [
      { id: 'fefo_radar_near_expiry', name: 'Near-Expiry Radar & Smart FEFO Dispatch', description: 'Automated 30/60/90 days expiry alerts and oldest batch prioritization', defaultEnabled: true, category: 'inventory_fefo' },
      { id: 'inventory_batch_segregation', name: 'Batch & Lot Number Segregation', description: 'Independent cost tracking and MRP control per manufacturing batch', defaultEnabled: true, category: 'inventory_fefo' },
      { id: 'inventory_multi_godown', name: 'Multi-Godown / Branch Stock Transfer', description: 'Inter-warehouse stock requisition and gate pass logs', defaultEnabled: true, category: 'inventory_fefo' },
      { id: 'inventory_return_debit_note', name: 'Supplier Expiry Return & Debit Notes', description: 'Automated credit claiming for expired or damaged items', defaultEnabled: true, category: 'inventory_fefo' },
      { id: 'inventory_low_stock_auto_order', name: 'Low Stock Auto-Purchase Requisition', description: 'Predictive reorder level triggers based on 30-day velocity', defaultEnabled: true, category: 'inventory_fefo' },
      { id: 'inventory_narcotic_schedule_d', name: 'Schedule D Narcotics & Controlled Drug Book', description: 'Form-7 compliant narcotic dispensing registers with doctor license tracking', defaultEnabled: true, category: 'inventory_fefo' },
      { id: 'inventory_salt_composition_lookup', name: 'Generic Formula & Salt Alternates', description: 'Instant replacement medicine lookup with equivalent therapeutic strength', defaultEnabled: true, category: 'inventory_fefo' },
      { id: 'inventory_barcode_label_maker', name: 'Custom Barcode & Price Tag Generator', description: 'Thermal sticker generation for non-barcoded generic items', defaultEnabled: true, category: 'inventory_fefo' }
    ]
  },
  {
    id: 'ledgers_khatas',
    name: 'Ledgers & Financial Khatas',
    description: 'Double-entry accounting, customer credit books, supplier payables & cash registers',
    icon: 'BookOpen',
    features: [
      { id: 'khata_customer_credit_book', name: 'Customer Credit Khata & WhatsApp Statements', description: 'Digital ledger with 1-click WhatsApp balance reminders', defaultEnabled: true, category: 'ledgers_khatas' },
      { id: 'khata_supplier_payables_ledger', name: 'Supplier Payables & Purchase Aging', description: 'Distributor payment tracking with cheque due alerts', defaultEnabled: true, category: 'ledgers_khatas' },
      { id: 'khata_daily_cash_drawer_shift', name: 'Counter Cash Shifts & Z-Report Closes', description: 'Opening float, shift reconciliation, and shortage/excess audits', defaultEnabled: true, category: 'ledgers_khatas' },
      { id: 'khata_expense_voucher_tracker', name: 'Petty Cash & Pharmacy Expense Vouchers', description: 'Rent, salaries, utility bills, and tea expense categorizations', defaultEnabled: true, category: 'ledgers_khatas' },
      { id: 'khata_profit_loss_realtime', name: 'Real-Time Net Profit / Loss Dashboard', description: 'COGS subtraction, gross margin, and net operating income analytics', defaultEnabled: true, category: 'ledgers_khatas' },
      { id: 'khata_bank_account_reconciliation', name: 'Bank & Digital Wallet Reconciliation', description: 'Meezan, HBL, EasyPaisa, and JazzCash account ledger balances', defaultEnabled: true, category: 'ledgers_khatas' }
    ]
  },
  {
    id: 'ai_security',
    name: 'AI Copilot & Enterprise Security',
    description: 'Prescription OCR, drug interaction radar, hardware lock & remote kill switch',
    icon: 'ShieldCheck',
    features: [
      { id: 'ai_mbi_copilot_assistant', name: 'MBI AI Pharmacy Copilot', description: 'Conversational assistant for stock queries, revenue trends, and drug info', defaultEnabled: true, category: 'ai_security' },
      { id: 'ai_prescription_ocr_scanner', name: 'Doctor Prescription Image OCR', description: 'Optical character recognition converting handwritten slips to billing items', defaultEnabled: true, category: 'ai_security' },
      { id: 'security_hwid_hardware_lock', name: 'Anti-Piracy HWID Hardware Binding', description: 'Cryptographic binding preventing unauthorized cloning on other computers', defaultEnabled: true, category: 'ai_security' },
      { id: 'security_silent_remote_telemetry', name: 'Silent Remote Fleet Telemetry', description: 'Background heartbeat transmitting version, database health, and sales volume', defaultEnabled: true, category: 'ai_security' },
      { id: 'security_kill_switch_remote_lock', name: 'Emergency Remote Lock & Kill Switch', description: 'Instant store freezing in case of license default or stolen hardware', defaultEnabled: true, category: 'ai_security' },
      { id: 'security_granular_rbac_roles', name: 'Granular Role-Based Access Control (RBAC)', description: 'Primary Owner immunity and fine-grained counter cashier restrictions', defaultEnabled: true, category: 'ai_security' },
      { id: 'security_immutable_audit_trails', name: 'Tamper-Evident Audit Trails', description: 'Un-editable log of invoice deletions, price overrides, and cash drawer openings', defaultEnabled: true, category: 'ai_security' }
    ]
  },
  {
    id: 'cloud_sync',
    name: 'Cloud & Offline Synchronization',
    description: 'MariaDB replication, 100% offline continuity, SSE live streams & automated backup',
    icon: 'Cloud',
    features: [
      { id: 'sync_offline_dual_engine', name: 'Dual Engine 100% Offline Continuity', description: 'Local IndexedDB/MariaDB keeps billing running with 0ms internet dependency', defaultEnabled: true, category: 'cloud_sync' },
      { id: 'sync_sse_realtime_stream', name: 'Real-Time Server-Sent Events (SSE) Stream', description: 'Instant push notifications for price updates, fleet broadcasts, and remote locks', defaultEnabled: true, category: 'cloud_sync' },
      { id: 'sync_encrypted_cloud_backup', name: '24-Hour Automated Encrypted Cloud Snapshots', description: 'Automated disaster recovery storage with zero data loss guarantee', defaultEnabled: true, category: 'cloud_sync' },
      { id: 'sync_pwa_hot_code_push', name: 'PWA Hot Code Push & Service Worker Cache', description: 'Seamless background updates without disrupting active cashiers', defaultEnabled: true, category: 'cloud_sync' },
      { id: 'sync_cross_device_counter_link', name: 'Local Area Network (LAN) Multi-Counter Sync', description: 'Link 10+ counter PCs to single local Master MariaDB server', defaultEnabled: true, category: 'cloud_sync' }
    ]
  }
];

export function getFullFeatureIdList(): string[] {
  return DEFAULT_173_FEATURE_MATRIX.flatMap(cat => cat.features.map(f => f.id));
}

export function getDefaultFeatureMap(): TenantFeatureMap {
  const map: TenantFeatureMap = {};
  for (const cat of DEFAULT_173_FEATURE_MATRIX) {
    for (const f of cat.features) {
      map[f.id] = f.defaultEnabled;
    }
  }
  return map;
}
