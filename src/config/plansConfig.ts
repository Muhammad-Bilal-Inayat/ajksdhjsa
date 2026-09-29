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
}

export const MASTER_PLANS_CONFIG: PlanPricingDetail[] = [
  {
    id: 'basic',
    tierKey: 'silver',
    name: 'Silver Basic',
    badge: 'Basic Plan',
    tierIcon: '🥈',
    tagline: 'Essential billing, local receipt printing & core accounting for retail shops',
    limits: {
      users: '2 Users',
      branches: '2 Branches',
      terminals: '2 Terminals'
    },
    prices: {
      monthly: 1999,
      '1year': 19990,
      '3years': 59970,
      '5years': 99950
    },
    savings: {
      '1year': 'Save ~30%',
      '3years': 'Save ~40%',
      '5years': 'Save ~50%'
    },
    features: [
      '0.2s Ultra-Fast Barcode POS Billing & Thermal Printing (80mm/58mm)',
      'Pakistan 100k+ Preloaded Medicine Catalog (Formulas & Generics)',
      'Real-Time Inventory Tracking & Low Stock Alerts',
      '1-Click WhatsApp Direct Instant Share (wa.me Formatted Bills)',
      'Customer & Supplier Khata Ledgers with Balance Due Tracking',
      'Daily Cashier Drawer Handover & Shift Closing',
      '100% Offline-First Engine (Zero Internet Required)',
      'Daily Local Encrypted Database Backup & 1-Click Offline Restore'
    ]
  },
  {
    id: 'business',
    tierKey: 'gold',
    name: 'Gold Business',
    badge: 'Business Plan',
    tierIcon: '🥇',
    tagline: 'Most Popular for high-volume retail & wholesale pharmacies',
    isPopular: true,
    limits: {
      users: '5 Users',
      branches: '5 Branches',
      terminals: '5 Terminals'
    },
    prices: {
      monthly: 3999,
      '1year': 39990,
      '3years': 119970,
      '5years': 199950
    },
    savings: {
      '1year': 'Save ~30%',
      '3years': 'Save ~40%',
      '5years': 'Save ~50%'
    },
    features: [
      'Everything in Silver Basic +',
      'FEFO Expiry Radar (30 / 60 / 90 / 180 Days Horizon Visual Alerts)',
      'Multi-Godown Storage & Shelf / Bin Rack Mapping',
      'Live Real-Time Gross Profit & Net Margin (P&L) Analytics',
      'Wholesale Dual Pricing Matrix (TP, MRP, Box, Strip & Retail Rates)',
      'Sales & Purchase Return Credit Management (Debit/Credit Notes)',
      'Automated WhatsApp Khata Balance Due Reminders',
      'Narcotics & DRAP Form-7 Registry Books',
      'Multi-Terminal Local Hardware Sync (5 Counter Nodes)'
    ]
  },
  {
    id: 'enterprise',
    tierKey: 'platinum',
    name: 'Platinum Enterprise',
    badge: 'VIP Enterprise',
    tierIcon: '💎',
    tagline: 'Complete automation for hospital pharmacies & chain networks',
    isVip: true,
    limits: {
      users: '15 Users',
      branches: '10 Branches',
      terminals: '15 Terminals'
    },
    prices: {
      monthly: 6999,
      '1year': 69990,
      '3years': 209970,
      '5years': 349950
    },
    savings: {
      '1year': 'Save ~30%',
      '3years': 'Save ~40%',
      '5years': 'Save ~50%'
    },
    features: [
      'Everything in Gold Business +',
      'Automated Background WhatsApp Gateway (Auto Invoices, Returns & Khatas)',
      'FBR POS Digital Invoicing, Fiscal Stamps & Sales Tax Compliance',
      'Multi-Branch Stock Transfer Delivery Challans & Central Rebalancing',
      'Digital Pharmacy Online Storefront (E-Commerce Web POS & WhatsApp Orders)',
      'Immutable Cashier Anti-Theft Audit Trail Logs & 2FA Staff Access',
      'Multi-Node Mesh Sync (Up to 15 Billing Counters)',
      'Predictive AI Re-Order Velocity Forecasting',
      '50 GB High-Speed NVMe Storage with Midnight Cloud Mirroring',
      'Dedicated VIP Account Manager & 24/7 Priority SLA'
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
    feature: 'Fast POS Terminal (Barcode / FEFO)',
    silver: '✅ Unlimited',
    gold: '✅ Unlimited',
    platinum: '✅ Unlimited'
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
    feature: 'FEFO Expiry Radar (6 Horizons)',
    silver: '✅ 30/60/90 Days',
    gold: '✅ 7 to 180 Days Alert',
    platinum: '✅ Full Auto-Quarantine',
    highlight: true
  },
  {
    id: 5,
    feature: 'Supplier Purchase & Claims Khata',
    silver: '✅ Basic Khata',
    gold: '✅ Full Auto Return',
    platinum: '✅ Central Ledger & PO'
  },
  {
    id: 6,
    feature: 'Customer Udhar Khata & Reminders',
    silver: '✅ Basic Ledger',
    gold: '✅ WhatsApp Sharing',
    platinum: '✅ Auto SMS & WhatsApp Reminders'
  },
  {
    id: 7,
    feature: 'Narcotics & DRAP Controlled Drug Logs',
    silver: '✅ Form-7 Register',
    gold: '✅ Form-7 + Rx Audit',
    platinum: '✅ Full Compliance Safe'
  },
  {
    id: 8,
    feature: 'Wholesale & Retail Dual Pricing Engine',
    silver: '❌ Retail Only',
    gold: '✅ TP / MRP / Box Rate',
    platinum: '✅ Tiered Matrix Pricing',
    highlight: true
  },
  {
    id: 9,
    feature: 'Smart Re-Order Engine & Min Stocks',
    silver: '❌ Manual',
    gold: '✅ Velocity Based',
    platinum: '✅ Predictive AI Forecast'
  },
  {
    id: 10,
    feature: 'Shift Closing & Daily Cash Handover',
    silver: '✅ Daily Summary',
    gold: '✅ Cash Drawer Reconcile',
    platinum: '✅ Blind Cash Audit'
  },
  {
    id: 11,
    feature: 'Multi-Terminal Local Hardware Sync',
    silver: '❌ Single Active',
    gold: '✅ Local Sync (5 Nodes)',
    platinum: '✅ Mesh Sync (15 Nodes)',
    highlight: true
  },
  {
    id: 12,
    feature: 'Offline POS & Background DB Sync',
    silver: '✅ Offline IndexedDB',
    gold: '✅ Auto Reconnect Sync',
    platinum: '✅ Resilient Multi-Node'
  },
  {
    id: 13,
    feature: 'Thermal Receipt Customization (80mm & 58mm)',
    silver: '✅ 80mm & 58mm Standard',
    gold: '✅ 80mm & 58mm + Logo & QR',
    platinum: '✅ 80mm & 58mm + Custom Layout Engine'
  },
  {
    id: 14,
    feature: 'Role-Based Permissions & Pin Auth',
    silver: '✅ Basic Cashier/Admin',
    gold: '✅ Custom 12 Permissions',
    platinum: '✅ 2FA + Audit Trail'
  },
  {
    id: 15,
    feature: 'Cloud Backup & Instant Disaster Recovery',
    silver: '✅ Daily Backup',
    gold: '✅ Real-time Snapshot',
    platinum: '✅ Automated DB Vault',
    highlight: true
  },
  {
    id: 16,
    feature: 'Hardware Fingerprint Device Locking',
    silver: '✅ 2 Bound Devices',
    gold: '✅ 5 Bound Devices',
    platinum: '✅ 15 Bound Devices'
  },
  {
    id: 17,
    feature: 'Priority Customer Support',
    silver: 'Standard Helpdesk',
    gold: 'Priority Support 24/7',
    platinum: 'Dedicated VIP Onboarding',
    highlight: true
  }
];

export const UNIFORM_BUTTON_STYLES = {
  primary: 'text-sm font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 shadow-sm active:scale-95 flex items-center justify-center gap-2 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white',
  emerald: 'text-sm font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 shadow-sm active:scale-95 flex items-center justify-center gap-2 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white',
  secondary: 'text-sm font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 shadow-sm active:scale-95 flex items-center justify-center gap-2 cursor-pointer border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800',
  headerLink: 'text-sm font-medium px-4 py-2 rounded-lg transition-colors duration-150',
  headerBtn: 'text-sm font-medium px-4 py-2 rounded-lg transition-all duration-150 active:scale-95 flex items-center gap-1.5 cursor-pointer'
};
