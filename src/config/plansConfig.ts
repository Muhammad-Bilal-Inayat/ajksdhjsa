export type PlanTier = 'silver' | 'gold' | 'platinum' | 'trial';
export type PricingDuration = 'monthly' | '1year' | '3years' | '5years';

export interface PlanPricingDetail {
  id: 'basic' | 'business' | 'enterprise';
  tierKey: 'silver' | 'gold' | 'platinum';
  name: string;
  badge: string;
  tierIcon: string;
  tagline: string;
  isPopular?: boolean;
  isVip?: boolean;
  effectiveMonthly: number;
  limits: {
    users: string;
    branches: string;
    terminals: string;
  };
  prices: {
    monthly: number;
    '1year': number;
    '3years': number;
    '5years': number;
  };
  savings: {
    '1year': string;
    '3years': string;
    '5years': string;
  };
  features: string[];
  advancedSpecs: string[];
}

export const MASTER_PLANS_CONFIG: PlanPricingDetail[] = [
  {
    id: 'basic',
    tierKey: 'silver',
    name: '🥈 Silver Basic',
    badge: 'Basic',
    tierIcon: '🥈',
    tagline: 'Essential billing, local receipt printing & core accounting for retail shops.',
    effectiveMonthly: 1666,
    limits: {
      users: '2 Accounts',
      branches: '2 Branch(es)',
      terminals: '2 Nodes'
    },
    prices: {
      monthly: 1999,
      '1year': 19990,
      '3years': 59970,
      '5years': 99950
    },
    savings: {
      '1year': 'Save ~17% (Annual Deal)',
      '3years': 'Save ~30%',
      '5years': 'Save ~40%'
    },
    features: [
      'Up to 2 Staff Accounts (Admin & Cashier)',
      'Up to 2 Registered Pharmacy Firm / Branch Locations',
      '0.2s Ultra-Fast Barcode POS Billing & Thermal Printing (80mm/58mm)',
      'Pakistan 100k+ Preloaded Medicine Catalog (Formulas & Generics)',
      'Real-Time Inventory Tracking & Low Stock Alerts',
      '1-Click WhatsApp Direct Instant Share (wa.me Formatted Bills)',
      'Customer & Supplier Khata Ledgers with Balance Due Tracking',
      'Daily Cashier Drawer Handover & Shift Closing',
      '100% Offline-First Engine (Zero Internet Required)'
    ],
    advancedSpecs: [
      'Thermal Barcode Label & Sticker Generator (Custom Label Dimensions)',
      'Daily Cashier Drawer Closing & Cash in Hand Register',
      'Supplier Inward Purchase Invoices with Cost Margin Verification',
      'Fast Instant Search by Brand Name, Formula, Generic, or Barcode',
      'Complete Local Database JSON Backup & 1-Click Offline Restore',
      'Expense Tracking by Category (Rent, Utilities, Staff Wages)',
      'Zero Cloud Dependency — All Data Remains 100% On Your Local Computer',
      'Standard Phone & WhatsApp Technical Assistance'
    ]
  },
  {
    id: 'business',
    tierKey: 'gold',
    name: '🥇 Gold Business ⭐',
    badge: 'Business',
    tierIcon: '🥇',
    tagline: 'Comprehensive multi-godown, batch & FEFO expiry radar, multi-pricing & profit analysis.',
    isPopular: true,
    effectiveMonthly: 3333,
    limits: {
      users: '5 Accounts',
      branches: '5 Branch(es)',
      terminals: '5 Nodes'
    },
    prices: {
      monthly: 3999,
      '1year': 39990,
      '3years': 119970,
      '5years': 199950
    },
    savings: {
      '1year': 'Save ~17% (Annual Deal) • Most Popular',
      '3years': 'Save ~30%',
      '5years': 'Save ~40%'
    },
    features: [
      'Up to 5 Concurrent Staff Accounts (Admin & Cashier)',
      'Up to 5 Registered Pharmacy Branches / Firms',
      'FEFO Expiry Radar (30 / 60 / 90 / 180 Days Early Warning Alerts)',
      'Multi-Godown Storage & Shelf / Bin Rack Mapping',
      'Live Real-Time Gross Profit & Net Margin (P&L) Analytics',
      'Wholesale Dual Pricing Matrix (TP, MRP, Box, Strip & Retail Rates)',
      'Sales & Purchase Return Credit Management (Debit/Credit Notes)',
      'Multi-Terminal Local Hardware Sync (5 Counter Nodes)'
    ],
    advancedSpecs: [
      'Everything in Silver Basic +',
      'Real-time Local Network Sync across Counter PCs & Tablets',
      'Customer & Supplier Khata Ledgers with Automated WhatsApp Balance Reminders',
      'Purchase Orders, Delivery Challans & Supplier Credit Notes (Dr. Note)',
      'Cashier Drawer Shift Reconciliation & Handover with Difference Audits',
      'Multi-Packing Wholesale Formulas (Carton, Box, Strip, Unit Packing)',
      'Doctor Referral Commission Tracking & Patient Prescriptions',
      'Local Database JSON Backup & 1-Click Instant Offline Restore',
      'Anti-Clock Tampering Verification to Protect License Integrity',
      'Direct Excel / CSV Spreadsheet Export for Accountant Review',
      'Narcotics & DRAP Form-7 Registry Books',
      'Priority 24/7 WhatsApp VIP Technical Support'
    ]
  },
  {
    id: 'enterprise',
    tierKey: 'platinum',
    name: '💎 Platinum Enterprise',
    badge: 'Enterprise',
    tierIcon: '💎',
    tagline: 'Multi-branch transfers, 1-Click WhatsApp Invoicing, FBR POS, digital storefront & full audit trail.',
    isVip: true,
    effectiveMonthly: 5833,
    limits: {
      users: '15 Accounts',
      branches: '10 Branch(es)',
      terminals: '15 Nodes'
    },
    prices: {
      monthly: 6999,
      '1year': 69990,
      '3years': 209970,
      '5years': 349950
    },
    savings: {
      '1year': 'Save ~17% (Annual Deal) • Best Enterprise Value',
      '3years': 'Save ~30%',
      '5years': 'Save ~40%'
    },
    features: [
      'Up to 15 Concurrent Staff Accounts (Full RBAC)',
      'Up to 10 Pharmacy Branches & Warehouses',
      '1-Click Instant WhatsApp Billing & Receipts (POS, Khata, PO)',
      'FBR POS Digital Invoicing, Fiscal Stamps & Tax Compliance',
      'Multi-Branch Stock Transfer Delivery Challans & Central Rebalancing',
      'Digital Pharmacy Online Storefront (E-Commerce Web POS & WhatsApp Orders)',
      'Immutable Cashier Anti-Theft Audit Trail Logs & 2FA Staff Access'
    ],
    advancedSpecs: [
      'Everything in Gold Business +',
      'Multi-Node Mesh Sync (Up to 15 Billing Counters)',
      'Predictive AI Re-Order Velocity & Shortage Forecasting',
      'Double-Entry Journal Vouchers & Complete Chart of Accounts',
      'Patient Prescription Medical History & Dosage Printouts',
      'High-Volume Wholesale Distribution Billing & Route Consignments',
      'Granular Role-Based Access Control (RBAC) with 40+ Permissions',
      'Anti-Clock Tampering Engine with Network Time Verification',
      'Automated Scheduled Database Backups & Disaster Recovery',
      'Custom Feature Patch Engine (.mbipatch manual addon compatibility)',
      'Direct Excel & CSV Tax Audit Exports for FBR & Auditors',
      'Multi-Register Cash Drawer Lock & Shift Reconciliation Logs',
      'Dedicated VIP Account Manager & Priority 24/7 SLA Support'
    ]
  }
];

export interface ComparisonMatrixPoint {
  id: number;
  feature: string;
  silver: string;
  gold: string;
  platinum: string;
  highlight?: boolean;
}

export const EXACT_17_POINT_MATRIX: ComparisonMatrixPoint[] = [
  {
    id: 1,
    feature: 'Fast 0.2s POS Terminal (Barcode / Thermal)',
    silver: '✅ Unlimited Billing',
    gold: '✅ Unlimited Billing',
    platinum: '✅ Unlimited Billing'
  },
  {
    id: 2,
    feature: 'Branch & Terminal Quota',
    silver: '2 Branches / 2 Terminals',
    gold: '5 Branches / 5 Terminals',
    platinum: '10 Branches / 15 Terminals',
    highlight: true
  },
  {
    id: 3,
    feature: 'Staff & User Access Seats',
    silver: '2 Staff Accounts',
    gold: '5 Staff Accounts',
    platinum: '15 Staff Accounts'
  },
  {
    id: 4,
    feature: 'WhatsApp Billing & Customer Receipts',
    silver: '🖱️ 1-Click Direct (wa.me)',
    gold: '🖱️ 1-Click Direct + Khata Alerts',
    platinum: '🖱️ 1-Click Instant Share + Multi-Counter',
    highlight: true
  },
  {
    id: 5,
    feature: 'FEFO Expiry Radar (Horizon Alerts)',
    silver: '✅ 30/60/90 Days',
    gold: '✅ 7 to 180 Days Alert',
    platinum: '✅ Full Auto-Quarantine & Returns',
    highlight: true
  },
  {
    id: 6,
    feature: 'FBR POS Digital Invoicing & Fiscal Stamps',
    silver: '❌ Not Included',
    gold: '❌ Not Included',
    platinum: '✅ FBR Certified QR + Digital Stamp',
    highlight: true
  },
  {
    id: 7,
    feature: 'Wholesale & Retail Dual Pricing Engine',
    silver: '❌ Single Retail Rate',
    gold: '✅ TP, MRP, Box, Strip & Retail Rates',
    platinum: '✅ Multi-Tier Tiered Wholesale & Cartons'
  },
  {
    id: 8,
    feature: 'Multi-Godown Storage & Rack Mapping',
    silver: '❌ Single Location',
    gold: '✅ Multi-Godown & Rack/Bin Locator',
    platinum: '✅ Central Warehouse & Multi-Hub Routing'
  },
  {
    id: 9,
    feature: 'Customer & Supplier Khata Ledgers',
    silver: '✅ Balance Due Tracking',
    gold: '✅ Debit/Credit Notes + Auto Reminders',
    platinum: '✅ Full Chart of Accounts & General Ledger'
  },
  {
    id: 10,
    feature: 'Offline Operation & Cloud Sync',
    silver: '✅ 100% Offline IndexedDB',
    gold: '✅ Offline + Real-Time Cloud Synapse',
    platinum: '✅ Offline + Multi-Branch Central Mesh'
  },
  {
    id: 11,
    feature: 'Daily Cashier Handover & Shift Audit',
    silver: '✅ Daily Shift Closing',
    gold: '✅ Shift Audits & Cash In Hand Balance',
    platinum: '✅ Immutable Anti-Theft Shift Logs & 2FA',
    highlight: true
  },
  {
    id: 12,
    feature: 'Digital Pharmacy E-Commerce Storefront',
    silver: '❌ Not Included',
    gold: '❌ Not Included',
    platinum: '✅ Web POS & Online WhatsApp Storefront',
    highlight: true
  },
  {
    id: 13,
    feature: 'AI Stock Depletion & Velocity Radar',
    silver: '❌ Basic Low Stock Alerts',
    gold: '✅ Smart Shortage Predictor',
    platinum: '✅ AI Velocity Forecasting + 1-Click PO',
    highlight: true
  },
  {
    id: 14,
    feature: 'Anti-Clock Tampering & HWID Security',
    silver: '✅ Single-PC HWID Bound',
    gold: '✅ Multi-Device Whitelist + Clock Guard',
    platinum: '✅ High-Security Hardware Seal + Audit Vault'
  },
  {
    id: 15,
    feature: 'Automated 24-Hour Encrypted Backups',
    silver: '✅ Daily Local Device Snapshot',
    gold: '✅ 24h Encrypted Local + Cloud Sync',
    platinum: '✅ Automated Cloud Mirror & Disaster Recovery'
  },
  {
    id: 16,
    feature: 'Staff Access Roles & Permissions (RBAC)',
    silver: '2 Standard Roles (Admin/Cashier)',
    gold: '8 Predefined Pharmacy Roles',
    platinum: '40+ Granular RBAC Permissions Matrix'
  },
  {
    id: 17,
    feature: 'Technical Support & SLA',
    silver: 'Standard Phone & WhatsApp',
    gold: 'Priority 24/7 WhatsApp VIP Support',
    platinum: 'Dedicated VIP Account Manager (24/7 SLA)',
    highlight: true
  }
];
