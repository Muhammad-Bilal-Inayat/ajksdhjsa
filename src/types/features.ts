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
  category: 
    | 'pos_billing' 
    | 'inventory_fefo' 
    | 'ledgers_khatas' 
    | 'whatsapp_comm' 
    | 'ai_security' 
    | 'cloud_sync' 
    | 'analytics_reports'
    | 'hospital_clinical'
    | 'distribution_bookers'
    | 'marketing_loyalty'
    | 'critical_overrides'
    | 'dashboard_widgets';
}

export type TenantFeatureMap = Record<string, boolean>;

export const DEFAULT_173_FEATURE_MATRIX: FeatureCategory[] = [
  {
    id: 'critical_overrides',
    name: 'Critical Security Overrides & High-Risk Access',
    description: 'High-risk security overrides including bill deletion, past invoice editing, cost visibility, and discounts',
    icon: 'ShieldAlert',
    features: [
      { id: 'override_invoice_editing', name: 'Invoice Editing Permission', description: 'Allow counter staff & managers to modify finalized past sales invoices', defaultEnabled: false, minPlan: 'enterprise', category: 'critical_overrides', badge: 'HIGH RISK' },
      { id: 'override_bill_deletion', name: 'Bill & Receipt Deletion', description: 'Authority to permanently void/delete completed sales bills and remove audit traces', defaultEnabled: false, minPlan: 'enterprise', category: 'critical_overrides', badge: 'CRITICAL' },
      { id: 'override_share_pdf', name: 'Share, Export & PDF Generation', description: 'Enable direct PDF generation, data export and WhatsApp document transmission', defaultEnabled: true, minPlan: 'basic', category: 'critical_overrides', badge: 'ACCESS' },
      { id: 'override_purchase_cost', name: 'Purchase Cost & Margin Visibility', description: 'Display wholesale supplier purchase costs and item profit margins to cashiers', defaultEnabled: false, minPlan: 'business', category: 'critical_overrides', badge: 'CONFIDENTIAL' },
      { id: 'override_discounts', name: 'Special Item & Bill Discounts', description: 'Grant cashier authority to bypass maximum discount limits on counter sales', defaultEnabled: true, minPlan: 'basic', category: 'critical_overrides', badge: 'FINANCIAL' }
    ]
  },
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
      { id: 'pos_auto_change_calc', name: 'Smart Change & Return Calculator', description: 'Visual cash return denomination assistant', defaultEnabled: true, minPlan: 'basic', category: 'pos_billing' },
      { id: 'pos_sales_returns_refunds', name: 'Sales Returns & Instant Refunds', description: 'Complete sales return processing with auto stock & cash adjustment', defaultEnabled: true, minPlan: 'basic', category: 'pos_billing' },
      { id: 'pos_custom_invoice_branding', name: 'Custom Invoice Branding & Logos', description: 'Pharmacy logo, watermark, and footer notes customizer', defaultEnabled: true, minPlan: 'basic', category: 'pos_billing' }
    ]
  },
  {
    id: 'whatsapp_comm',
    name: 'WhatsApp Automation & Invoicing',
    description: 'Automated background gateway vs 1-click wa.me instant delivery',
    icon: 'MessageSquare',
    features: [
      { id: 'whatsapp_direct_1click', name: '1-Click WhatsApp Direct (wa.me)', description: 'Instant 1-click formatted invoice & ledger statement sharing via web/desktop', defaultEnabled: true, minPlan: 'basic', category: 'whatsapp_comm' },
      { id: 'whatsapp_auto_gateway', name: 'Automated Background WhatsApp Gateway', description: 'Silent automatic dispatch of invoices, return notes & shift closings from attached company number', defaultEnabled: false, minPlan: 'enterprise', category: 'whatsapp_comm' },
      { id: 'whatsapp_khata_reminders', name: 'WhatsApp Khata Balance Due Alerts', description: '1-click customer due balance statement and payment links', defaultEnabled: true, minPlan: 'basic', category: 'whatsapp_comm' },
      { id: 'whatsapp_daily_shift_summary', name: 'WhatsApp End-of-Day Shift Z-Report', description: 'Automated owner report with daily net sales, cash in drawer and discounts', defaultEnabled: true, minPlan: 'business', category: 'whatsapp_comm' },
      { id: 'whatsapp_staff_invitations', name: 'WhatsApp Staff Invitation & PIN Dispatch', description: 'Auto dispatch login PIN and portal links to newly created staff members', defaultEnabled: true, minPlan: 'basic', category: 'whatsapp_comm' }
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
      { id: 'inventory_barcode_label_maker', name: 'Custom Barcode & Price Tag Generator', description: 'Thermal sticker generation for non-barcoded generic items', defaultEnabled: true, minPlan: 'basic', category: 'inventory_fefo' },
      { id: 'inventory_product_recall_quarantine', name: 'Product Recall & Quarantine Storage', description: 'Quarantine defective/recalled batches to prevent accidental counter sale', defaultEnabled: false, minPlan: 'enterprise', category: 'inventory_fefo' },
      { id: 'inventory_physical_stock_audit', name: 'Physical Stock Reconciliation & Audit', description: 'Cycle count vs system stock adjustment with variance loss reporting', defaultEnabled: false, minPlan: 'business', category: 'inventory_fefo' }
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
      { id: 'khata_bank_account_reconciliation', name: 'Bank & Digital Wallet Reconciliation', description: 'Meezan, HBL, EasyPaisa, and JazzCash account ledger balances', defaultEnabled: false, minPlan: 'business', category: 'ledgers_khatas' },
      { id: 'khata_cheque_management_clearing', name: 'Cheque Management & Clearing Register', description: 'Inward and outward post-dated cheque tracking and bank clearance', defaultEnabled: false, minPlan: 'business', category: 'ledgers_khatas' },
      { id: 'khata_loans_investor_ledger', name: 'Partner Investments & Loan Accounts', description: 'Director capital accounts, short-term debt and interest schedules', defaultEnabled: false, minPlan: 'enterprise', category: 'ledgers_khatas' }
    ]
  },
  {
    id: 'ai_security',
    name: 'AI Copilot, Forecasting & Security',
    description: 'Prescription OCR, drug interaction radar, demand forecasting & remote lock',
    icon: 'ShieldCheck',
    features: [
      { id: 'ai_mbi_copilot_assistant', name: 'MBI AI Pharmacy Copilot & Knowledge Guide', description: 'Conversational assistant with daily quota governance (Basic 20, Business 50, Enterprise 200 msgs/day)', defaultEnabled: true, minPlan: 'basic', category: 'ai_security' },
      { id: 'ai_demand_forecasting_engine', name: 'AI Demand Forecasting & Predictive Orders', description: 'Machine learning prediction of seasonal surges (Flu, Dengue, Seasonal antibiotics)', defaultEnabled: false, minPlan: 'enterprise', category: 'ai_security' },
      { id: 'ai_smart_reorder_supplier_intel', name: 'Smart Reorder & Supplier Rate Intelligence', description: 'Automatic best supplier rate and discount comparison for lowest cost acquisition', defaultEnabled: false, minPlan: 'business', category: 'ai_security' },
      { id: 'ai_missed_sales_opportunity_tracker', name: 'Missed Sales & Lost Customer Demand Tracker', description: 'Log unavailable medicines requested by walk-in patients to optimize procurement', defaultEnabled: true, minPlan: 'basic', category: 'ai_security' },
      { id: 'ai_prescription_ocr_scanner', name: 'Doctor Prescription Image OCR AI', description: 'Optical character recognition converting handwritten slips to billing items', defaultEnabled: false, minPlan: 'enterprise', category: 'ai_security' },
      { id: 'security_hwid_hardware_lock', name: 'Anti-Piracy HWID Hardware Binding', description: 'Cryptographic binding preventing unauthorized cloning on other computers', defaultEnabled: true, minPlan: 'basic', category: 'ai_security' },
      { id: 'security_silent_remote_telemetry', name: 'Silent Remote Fleet Telemetry', description: 'Background heartbeat transmitting version, database health, and sales volume', defaultEnabled: true, minPlan: 'basic', category: 'ai_security' },
      { id: 'security_kill_switch_remote_lock', name: 'Emergency Remote Lock & Kill Switch', description: 'Instant store freezing in case of license default or stolen hardware', defaultEnabled: false, minPlan: 'enterprise', category: 'ai_security' },
      { id: 'security_granular_rbac_roles', name: 'Granular Role-Based Access Control (RBAC)', description: 'Primary Owner immunity and fine-grained counter cashier restrictions', defaultEnabled: true, minPlan: 'basic', category: 'ai_security' },
      { id: 'security_immutable_audit_trails', name: 'Tamper-Evident Anti-Theft Audit Trails', description: 'Un-editable log of invoice deletions, price overrides, and cash drawer openings', defaultEnabled: false, minPlan: 'enterprise', category: 'ai_security' }
    ]
  },
  {
    id: 'hospital_clinical',
    name: 'Hospital & Clinical Operations',
    description: 'OPD/IPD workflows, doctor prescriptions, ward beds and patient registries',
    icon: 'Activity',
    features: [
      { id: 'hosp_opd_ipd_patient_admission', name: 'OPD / IPD Patient Admission & Rounds', description: 'Inpatient bed allocation, doctor consultation slips and indoor treatment charts', defaultEnabled: false, minPlan: 'enterprise', category: 'hospital_clinical' },
      { id: 'hosp_doctor_prescriptions_registry', name: 'Doctor Management & Prescription Slips', description: 'Consultant fee splitting, specialty categorization and doctor referral tracking', defaultEnabled: false, minPlan: 'business', category: 'hospital_clinical' },
      { id: 'hosp_ward_bed_occupancy_mgmt', name: 'Ward & Bed Occupancy Control', description: 'Emergency, ICU, General Ward and Private Room live bed tracker', defaultEnabled: false, minPlan: 'enterprise', category: 'hospital_clinical' },
      { id: 'hosp_patient_medical_history', name: 'Patient Medical History & Chronic Refills', description: 'Electronic Health Record (EHR) with diabetes, hypertension and allergy tracking', defaultEnabled: false, minPlan: 'business', category: 'hospital_clinical' }
    ]
  },
  {
    id: 'distribution_bookers',
    name: 'Distribution & Field Sales Bookers',
    description: 'Wholesale field sales, order bookers, targets & commission ledgers',
    icon: 'Truck',
    features: [
      { id: 'dist_sales_bookers_field_orders', name: 'Field Order Booker Mobile Interface', description: 'Field salesmen order booking on tablets with GPS delivery coordinates', defaultEnabled: false, minPlan: 'business', category: 'distribution_bookers' },
      { id: 'dist_booker_commission_ledger', name: 'Booker Targets & Commission Accounting', description: 'Automated percentage/slab commission calculation upon payment recovery', defaultEnabled: false, minPlan: 'business', category: 'distribution_bookers' },
      { id: 'dist_route_delivery_runs', name: 'Delivery Route Management & Trip Sheets', description: 'Challan generation, van load sheets and driver payment reconciliation', defaultEnabled: false, minPlan: 'enterprise', category: 'distribution_bookers' }
    ]
  },
  {
    id: 'marketing_loyalty',
    name: 'Marketing, Loyalty & Promotions',
    description: 'Customer loyalty points, promotional discounts & campaign broadcasts',
    icon: 'Gift',
    features: [
      { id: 'mktg_loyalty_points_redemption', name: 'Customer Loyalty Reward Points Engine', description: 'Spend-based points accumulation and instant invoice cash redemption', defaultEnabled: false, minPlan: 'business', category: 'marketing_loyalty' },
      { id: 'mktg_promotional_campaigns_sms', name: 'Promotional Broadcast Campaigns', description: 'Automated SMS/WhatsApp discount announcements to VIP customers', defaultEnabled: false, minPlan: 'enterprise', category: 'marketing_loyalty' },
      { id: 'mktg_discount_coupons_vouchers', name: 'Digital Discount Coupons & Gift Vouchers', description: 'Single-use promo codes and seasonal percentage voucher validation', defaultEnabled: false, minPlan: 'business', category: 'marketing_loyalty' }
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
  },
  {
    id: 'dashboard_widgets',
    name: 'Dashboard Analytics & Live KPI Widgets',
    description: 'Toggle individual KPI metric cards, charts, and alert widgets on the home screen',
    icon: 'LayoutDashboard',
    features: [
      { id: 'pharmacy_erp_kpi_metrics', name: 'Executive KPI Metrics Banner', description: 'Top revenue, profit margin, cleared invoices and FEFO zero loss tracker', defaultEnabled: true, minPlan: 'basic', category: 'dashboard_widgets' },
      { id: 'todays_profit', name: "Today's Profit & Margins Widget", description: 'Real-time gross/net profit, COGS and profit margin %', defaultEnabled: true, minPlan: 'basic', category: 'dashboard_widgets' },
      { id: 'recent_sales', name: 'Recent Sales Invoices Feed', description: 'Real-time streaming feed of sales invoices with reprint', defaultEnabled: true, minPlan: 'basic', category: 'dashboard_widgets' },
      { id: 'top_products', name: 'Top Selling Medicines Leaderboard', description: 'High-turnover products ranked by volume and revenue', defaultEnabled: true, minPlan: 'basic', category: 'dashboard_widgets' },
      { id: 'stock_inventory', name: 'Stock Inventory Valuation Widget', description: 'Total wholesale catalog inventory value and live active medicine count', defaultEnabled: true, minPlan: 'basic', category: 'dashboard_widgets' },
      { id: 'low_stock_alerts', name: 'Low Stock & Shortage Warning Alerts', description: 'Critical inventory restock list with 1-click PO generator', defaultEnabled: true, minPlan: 'basic', category: 'dashboard_widgets' },
      { id: 'sales_expenses', name: 'Sales & Daily Expenses Summary', description: 'Billing turnover with visual charts and operational expense tracking', defaultEnabled: true, minPlan: 'basic', category: 'dashboard_widgets' },
      { id: 'sales_trend', name: 'Sales Trend & Velocity Reports', description: 'Daily and weekly revenue patterns and peak pharmacy demand', defaultEnabled: true, minPlan: 'basic', category: 'dashboard_widgets' },
      { id: 'bank_accounts', name: 'Cash-in-Hand & Bank Accounts Widget', description: 'Counter drawer cash and commercial bank accounts balance', defaultEnabled: true, minPlan: 'basic', category: 'dashboard_widgets' },
      { id: 'privacy_mode', name: 'Privacy & Counter Mask Mode Toggle', description: 'Quick toggle to blur figures and mask customer amounts', defaultEnabled: true, minPlan: 'basic', category: 'dashboard_widgets' },
      { id: 'fefo_expiry_status', name: '30/60/90 Days FEFO Expiry Radar', description: 'First-Expiry First-Out tracker with multi-bucket breakdown', defaultEnabled: true, minPlan: 'business', category: 'dashboard_widgets' },
      { id: 'expiry_alerts', name: 'Critical Expiry Batch Alerts Table', description: 'Near-expiry batch safety monitoring with threshold days', defaultEnabled: true, minPlan: 'business', category: 'dashboard_widgets' },
      { id: 'therapeutic_category_mix', name: 'Therapeutic Drug Category Mix Donut', description: 'Segmented stock mix chart and margin percentages across drug classes', defaultEnabled: true, minPlan: 'business', category: 'dashboard_widgets' },
      { id: 'weekly_revenue_trajectory', name: 'Weekly Revenue & Bill Trajectory Chart', description: 'Daily counter performance spline with peak day tagging', defaultEnabled: true, minPlan: 'business', category: 'dashboard_widgets' },
      { id: 'receivables_payables', name: 'Customer Receivables & Supplier Payables', description: 'Customer credit ledger balances and supplier payables', defaultEnabled: true, minPlan: 'business', category: 'dashboard_widgets' },
      { id: 'missed_sales_demand', name: 'Missed Sales & Demand Registry Hub', description: 'Out-of-stock inquiries, prescription shortages, and lost revenue', defaultEnabled: true, minPlan: 'business', category: 'dashboard_widgets' },
      { id: 'udhar_aging_whatsapp', name: 'Customer Udhar Aging & WhatsApp Radar', description: 'Credit aging buckets (0-30d, 31-60d, 90d+) with WhatsApp reminders', defaultEnabled: true, minPlan: 'business', category: 'dashboard_widgets' },
      { id: 'reorder_suggestions', name: 'Smart AI Reorder & Low-Stock Predictor', description: 'Sales velocity predictor forecasting stockout days', defaultEnabled: true, minPlan: 'business', category: 'dashboard_widgets' },
      { id: 'pharmacy_erp_analytics_hub', name: 'Multi-Branch ERP Analytics Hub', description: 'Switchable multi-tab analytics engine with 7-day trend and SKU matrix', defaultEnabled: true, minPlan: 'enterprise', category: 'dashboard_widgets' },
      { id: 'hourly_rush_velocity', name: 'Hourly Rush Hours Velocity & Staffing', description: 'Dual-peak doctor consultant rush hours with cashier staffing recommendations', defaultEnabled: true, minPlan: 'enterprise', category: 'dashboard_widgets' },
      { id: 'fast_skus_margin_matrix', name: 'Fast SKUs & Profit Margins Matrix', description: 'Stock turnover rates, monthly consumption velocity, and margin matrix', defaultEnabled: true, minPlan: 'enterprise', category: 'dashboard_widgets' },
      { id: 'ai_expiry_loss_prevention', name: 'AI Expiry Loss Prevention & Debit Notes', description: 'Claimable credit value and supplier debit return notes', defaultEnabled: true, minPlan: 'enterprise', category: 'dashboard_widgets' },
      { id: 'anti_theft_audit_radar', name: 'Anti-Theft Void & Cashier Drawer Audit', description: 'Cancelled bills, deleted line items, manual overrides and variance logs', defaultEnabled: true, minPlan: 'enterprise', category: 'dashboard_widgets' },
      { id: 'multi_branch_telemetry', name: 'Multi-Branch Real-Time Mesh Telemetry', description: 'Consolidated inter-branch transfer tracking and chain analytics', defaultEnabled: true, minPlan: 'enterprise', category: 'dashboard_widgets' },
      { id: 'action_required', name: 'Action Required Alerts Overview', description: 'Instant overview of expired stock, shortages, and customer dues', defaultEnabled: true, minPlan: 'basic', category: 'dashboard_widgets' },
      { id: 'mbi_ai_recommendation', name: 'MBI AI Smart Insights & Reorder Advice', description: 'AI business health score and predictive recommendations', defaultEnabled: true, minPlan: 'business', category: 'dashboard_widgets' },
      { id: 'business_health', name: 'Business Health 4-Pillar Sparklines', description: 'Sales, Margins, Stock turnover, and Cash reserve health indicators', defaultEnabled: true, minPlan: 'basic', category: 'dashboard_widgets' },
      { id: 'quick_actions_grid', name: 'Quick Actions 1-Click Launchpad', description: 'Direct shortcuts (+Sale, +Purchase, +Medicine, +Expense, Payments)', defaultEnabled: true, minPlan: 'basic', category: 'dashboard_widgets' },
      { id: 'widget_today_sales', name: 'Today Net Sales KPI Card (Legacy)', description: 'Live daily revenue counter with cash/credit breakdown', defaultEnabled: true, minPlan: 'basic', category: 'dashboard_widgets' },
      { id: 'widget_cloud_sync_health', name: 'Real-Time Cloud Sync Health Badge', description: 'Connection status, server latency, and un-synced outbox record count', defaultEnabled: true, minPlan: 'basic', category: 'dashboard_widgets' }
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
