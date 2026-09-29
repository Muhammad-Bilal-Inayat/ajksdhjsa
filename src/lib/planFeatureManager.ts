import { SaaSPlanTier, UserRole, Tenant } from '../types';
import { getTenantById } from './masterServerService';
import { isMasterAdminAuthenticated } from './masterServerService';
import { manualPatchService } from './manualPatchService';

/**
 * MBI INVENTRA — CENTRALIZED SUBSCRIPTION PLAN FEATURE & ACCESS CONTROL ENGINE
 * 
 * Plan Tiers:
 * 1. BASIC (Silver)
 * 2. BUSINESS (Gold)
 * 3. ENTERPRISE (Platinum)
 * 
 * Rules:
 * - Strict inheritance: ENTERPRISE -> BUSINESS -> BASIC
 * - Strict visibility: Users ONLY see what belongs to their active plan.
 * - Master Admin accounts retain full system access and can grant dynamic tenant overrides.
 */

export type PlanTier = 'BASIC' | 'BUSINESS' | 'ENTERPRISE';

export interface PlanLimits {
  tier: PlanTier;
  planName: string;
  badge: string;
  color: string;
  maxFirms: number;
  maxStaffUsers: number;
  maxGodowns: number;
  deletedRecoveryDays: number;
  isGodownAllowed: boolean;
  isOnlineStoreAllowed: boolean;
  isAuditTrailAllowed: boolean;
  isJournalVoucherAllowed: boolean;
  isBatchExpiryAllowed: boolean;
  isExcelImportExportAllowed: boolean;
  isLiveProfitAllowed: boolean;
  isCustomFieldsAllowed: boolean;
}

/**
 * PLAN LIMITS DEFINITION
 */
export const PLAN_LIMITS_MAP: Record<PlanTier, PlanLimits> = {
  BASIC: {
    tier: 'BASIC',
    planName: 'Basic (Silver)',
    badge: '🥈 BASIC SILVER',
    color: '#64748b',
    maxFirms: 2,
    maxStaffUsers: 2,
    maxGodowns: 0,
    deletedRecoveryDays: 0,
    isGodownAllowed: false,
    isOnlineStoreAllowed: false,
    isAuditTrailAllowed: false,
    isJournalVoucherAllowed: false,
    isBatchExpiryAllowed: false,
    isExcelImportExportAllowed: false,
    isLiveProfitAllowed: false,
    isCustomFieldsAllowed: false,
  },
  BUSINESS: {
    tier: 'BUSINESS',
    planName: 'Business (Gold)',
    badge: '🥇 BUSINESS GOLD',
    color: '#eab308',
    maxFirms: 5,
    maxStaffUsers: 5,
    maxGodowns: 3,
    deletedRecoveryDays: 30,
    isGodownAllowed: true,
    isOnlineStoreAllowed: false,
    isAuditTrailAllowed: false,
    isJournalVoucherAllowed: false,
    isBatchExpiryAllowed: true,
    isExcelImportExportAllowed: true,
    isLiveProfitAllowed: true,
    isCustomFieldsAllowed: true,
  },
  ENTERPRISE: {
    tier: 'ENTERPRISE',
    planName: 'Enterprise (Platinum)',
    badge: '💎 ENTERPRISE PLATINUM',
    color: '#8b5cf6',
    maxFirms: 10,
    maxStaffUsers: 15,
    maxGodowns: 999, // unlimited
    deletedRecoveryDays: 9999, // extended / lifetime
    isGodownAllowed: true,
    isOnlineStoreAllowed: true,
    isAuditTrailAllowed: true,
    isJournalVoucherAllowed: true,
    isBatchExpiryAllowed: true,
    isExcelImportExportAllowed: true,
    isLiveProfitAllowed: true,
    isCustomFieldsAllowed: true,
  }
};

/**
 * CENTRALIZED PLAN_FEATURES DICTIONARY
 */
export const PLAN_FEATURES = {
  BASIC: [
    // Core POS & Billing
    'pos_billing',
    'sale_invoices',
    'create_sale',
    'reprint_bills',
    'bill_receipt',
    'purchase_bills',
    'create_purchase',
    'payment_in',
    'payment_out',

    // Ledgers & Parties
    'customer_ledger',
    'supplier_ledger',
    'party_ledger',
    'party_statement',
    'manage_parties',
    'credit_limits',

    // Daily & Basic Operational Reports
    'daily_sales_report',
    'daily_cash_report',
    'expense_report',
    'day_book',
    'all_transactions',
    'cash_in_hand',
    'low_stock_summary',
    'stock_summary',
    'expense_category',
    'expense_item',
    'party_statement_report',
    'all_parties_report',
    'operational_reports',

    // Basic Tools & Utilities
    'basic_barcode',
    'barcode_generator',
    'basic_expenses',
    'manage_expenses',
    'pos_shortcuts',
    'basic_accounting',
    'whatsapp_invoice_share',
    'whatsapp_basic',
    'offline_mode',
    'cloud_backup',
    'backup_restore',
    'shift_management',
    'notes_register',
  ],

  BUSINESS: [
    // Warehouses & Stock Transfers
    'godowns',
    'multi_warehouse',
    'stock_transfer',
    'godown_management',

    // Batch & FEFO Expiry
    'batch_management',
    'fefo_expiry_management',
    'fefo_expiry',
    'expiry_alerts',
    'fefo_expiry_report',
    'fifo_allocation_report',
    'item_batch_report',
    'item_serial_report',
    'expiry_reports_alerts',

    // Recovery & Multi-pricing
    'deleted_transaction_recovery_30d',
    'deleted_recovery_30d',
    'recycle_bin_30d',
    'multiple_pricing_levels',
    'multi_rate',
    'party_specific_rates',
    'excel_bulk_import_export',
    'excel_import_export',
    'advanced_thermal_barcode',
    'combine_orders_challans',

    // Financial & Profit Reports
    'advanced_accounting',
    'balance_sheet',
    'bill_wise_profit_loss',
    'bill_profit',
    'party_wise_profit_loss',
    'party_profit',
    'item_wise_profit_loss',
    'stock_movement_reports',
    'stock_movement_report',
    'stock_detail',
    'stock_summary_by_category',
    'category_profit_heatmap',

    // Tax & Compliance Standard Reports
    'tax_report',
    'tax_rate_report',
    'form_27eq',
    'tcs_receivable',

    // Advanced Invoice & Product Features
    'live_profit_margin',
    'live_profit_margin_invoice',
    'custom_item_fields',
    'advanced_whatsapp_pdf',
    'controlled_generic_registry',
    'quotation_estimates',
    'sale_orders',
    'sale_order',
    'purchase_orders',
    'purchase_order',
    'delivery_challans',
    'delivery_challan',
    'cheque_tracking',
    'loan_accounts',
    'supplier_intelligence',
    'demand_forecast',
    'top_products_analytics',
    'top_products',
    'shortage_registry',
    'shortage_book',
  ],

  ENTERPRISE: [
    // FBR POS Integration & Digital Invoicing (Strictly Enterprise Only)
    'tax_fbr_reports',
    'fbr_pos_integration',
    'pos_tax_fbr_pos_integration',
    'fbr_digital_tax_stamps',
    'fbr_sales_tax_invoicing',

    // Enterprise Warehouses & Branches
    'unlimited_godowns',
    'branch_to_branch_transfers',
    'branch_transfers',
    'advanced_warehouse_controls',
    'multi_branch_sync',

    // Advanced Financial Accounting
    'advanced_financial_accounting',
    'chart_of_accounts',
    'journal_vouchers',
    'complete_financial_reporting',

    // Digital Pharmacy & Storefront
    'online_storefront',
    'digital_pharmacy',
    'store_management',
    'online_orders',
    'store_promotions',

    // Clinical & Regulatory Advanced Rx
    'rx_prescriptions',
    'prescription_management',
    'patient_management',
    'chronic_refills',
    'narcotics_register',
    'drap_form8',

    // Enterprise Automation & Security
    'booker_biller_management',
    'booker_biller_dashboard',
    'booker_ledger',
    'bookers',
    'whatsapp_automation',
    'recycle_bin_extended',
    'extended_recovery_lifetime',
    'full_audit_trail',
    'user_activity_logs',
    'audit_export',
    'custom_field_permissions',
    'custom_field_level_security',
  ]
};

/**
 * REPORT ALLOWLIST BY PLAN TIER
 */
export const PLAN_ALLOWED_REPORTS: Record<PlanTier, string[]> = {
  BASIC: [
    'sale',
    'purchase',
    'day_book',
    'all_transactions',
    'cash_in_hand',
    'party_statement',
    'all_parties',
    'stock_summary',
    'low_stock_summary',
    'expense_transaction',
    'expense_category',
    'expense_item',
    'notes_register',
    'shift_summary',
  ],
  BUSINESS: [
    // Inherits Basic Reports
    'sale',
    'purchase',
    'day_book',
    'all_transactions',
    'cash_in_hand',
    'party_statement',
    'all_parties',
    'stock_summary',
    'low_stock_summary',
    'expense_transaction',
    'expense_category',
    'expense_item',
    'notes_register',
    'shift_summary',

    // Business Reports
    'balance_sheet',
    'bill_profit',
    'bill_wise_profit_loss',
    'party_profit',
    'party_wise_profit_loss',
    'item_profit',
    'stock_detail',
    'stock_movement',
    'stock_movement_report',
    'stock_summary_by_category',
    'category_profit_heatmap',
    'fefo_expiry_report',
    'fifo_allocation_report',
    'item_batch_report',
    'item_serial_report',
    'tax_report',
    'tax_rate_report',
    'form_27eq',
    'tcs_receivable',
    'sale_order',
    'purchase_order',
    'delivery_challan',
    'cheque_report',
    'loan_statement',
    'supplier_intelligence',
    'demand_forecast',
  ],
  ENTERPRISE: [
    // All Basic + Business reports PLUS:
    '*', // Enterprise has access to all reports including journal voucher register, audit trail export, online store analytics, etc.
  ]
};

/**
 * SETTINGS TABS ALLOWLIST BY PLAN TIER
 */
export const PLAN_ALLOWED_SETTINGS_TABS: Record<PlanTier, string[]> = {
  BASIC: [
    'GENERAL',
    'BACKUP & RESTORE',
    'QR CODE GENERATOR',
    'DOCUMENTATION',
    'UPDATES',
    'TRANSACTION',
    'PRINT',
    'TAXES',
    'USER MANAGEMENT',
    'PARTY',
    'ITEM',
  ],
  BUSINESS: [
    'GENERAL',
    'BACKUP & RESTORE',
    'QR CODE GENERATOR',
    'DOCUMENTATION',
    'UPDATES',
    'TRANSACTION',
    'PRINT',
    'TAXES',
    'USER MANAGEMENT',
    'PARTY',
    'ITEM',
    'PRICING & MARGIN',
    'CONTROLLED & GENERIC',
    'SAFETY & LOCK',
  ],
  ENTERPRISE: [
    'GENERAL',
    'BACKUP & RESTORE',
    'QR CODE GENERATOR',
    'DOCUMENTATION',
    'UPDATES',
    'TRANSACTION',
    'PRINT',
    'TAXES',
    'USER MANAGEMENT',
    'PARTY',
    'ITEM',
    'PRICING & MARGIN',
    'CONTROLLED & GENERIC',
    'SAFETY & LOCK',
    'ADMIN SETTINGS',
    'FEATURE FLAGS',
    'MODULE VISIBILITY',
    'ROLES & RBAC',
    'DEMO DATA',
  ]
};

/**
 * ROUTE ALLOWLIST & PREFIXES FOR PLAN ACCESS
 */
export const ROUTE_PLAN_REQUIREMENTS: Array<{ prefix: string; requiredTier: PlanTier; label: string; featureKey: string }> = [
  // Enterprise Only Routes
  { prefix: '/bookers', requiredTier: 'ENTERPRISE', label: 'Order Bookers & Billers Management', featureKey: 'booker_biller_management' },
  { prefix: '/bookers-management', requiredTier: 'ENTERPRISE', label: 'Order Bookers & Billers Management', featureKey: 'booker_biller_management' },
  { prefix: '/order-bookers', requiredTier: 'ENTERPRISE', label: 'Order Bookers & Billers Management', featureKey: 'booker_biller_management' },
  { prefix: '/online-store', requiredTier: 'ENTERPRISE', label: 'Digital Pharmacy & Online Store', featureKey: 'online_storefront' },
  { prefix: '/audit-trail', requiredTier: 'ENTERPRISE', label: 'Full System Audit Trail', featureKey: 'full_audit_trail' },
  { prefix: '/journal-vouchers', requiredTier: 'ENTERPRISE', label: 'Chart of Accounts & Journal Vouchers', featureKey: 'journal_vouchers' },
  { prefix: '/rx-prescriptions', requiredTier: 'ENTERPRISE', label: 'Patient Rx Prescriptions', featureKey: 'rx_prescriptions' },
  { prefix: '/sync-health', requiredTier: 'ENTERPRISE', label: 'Sync Health & Server Diagnostics', featureKey: 'server_diagnostics' },
  { prefix: '/sync/health', requiredTier: 'ENTERPRISE', label: 'Sync Health & Server Diagnostics', featureKey: 'server_diagnostics' },

  // Business+ Routes
  { prefix: '/top-products', requiredTier: 'BUSINESS', label: 'Top Products Analytics', featureKey: 'top_products_analytics' },
  { prefix: '/shortage-registry', requiredTier: 'BUSINESS', label: 'Shortage & Lost Demand Registry', featureKey: 'shortage_registry' },
  { prefix: '/shortages', requiredTier: 'BUSINESS', label: 'Shortage & Lost Demand Registry', featureKey: 'shortage_registry' },
  { prefix: '/shortage', requiredTier: 'BUSINESS', label: 'Shortage & Lost Demand Registry', featureKey: 'shortage_registry' },
  { prefix: '/short-register', requiredTier: 'BUSINESS', label: 'Shortage & Lost Demand Registry', featureKey: 'shortage_registry' },
  { prefix: '/godowns', requiredTier: 'BUSINESS', label: 'Godowns & Multi-Warehouse', featureKey: 'godowns' },
  { prefix: '/stock-transfer', requiredTier: 'BUSINESS', label: 'Stock Transfers', featureKey: 'stock_transfer' },
  { prefix: '/bank/cheques', requiredTier: 'BUSINESS', label: 'Cheque Clearance', featureKey: 'cheque_tracking' },
  { prefix: '/bank/loan-accounts', requiredTier: 'BUSINESS', label: 'Loan Accounts', featureKey: 'loan_accounts' },

  // Standard Sales & Purchases Submenus (Accessible to all retail tiers)
  { prefix: '/sale/quotation', requiredTier: 'BASIC', label: 'Estimates & Quotations', featureKey: 'quotation_estimates' },
  { prefix: '/sale/estimate', requiredTier: 'BASIC', label: 'Estimates & Quotations', featureKey: 'quotation_estimates' },
  { prefix: '/sale/order', requiredTier: 'BASIC', label: 'Sale Orders', featureKey: 'sale_orders' },
  { prefix: '/sale/challan', requiredTier: 'BASIC', label: 'Delivery Challan', featureKey: 'delivery_challans' },
  { prefix: '/purchase/order', requiredTier: 'BASIC', label: 'Purchase Orders', featureKey: 'purchase_orders' },

  // Basic+ Routes (All users)
  { prefix: '/sale', requiredTier: 'BASIC', label: 'Sales & Billing', featureKey: 'pos_billing' },
  { prefix: '/purchase', requiredTier: 'BASIC', label: 'Purchases', featureKey: 'purchase_bills' },
  { prefix: '/parties', requiredTier: 'BASIC', label: 'Customers & Suppliers', featureKey: 'customer_ledger' },
  { prefix: '/items', requiredTier: 'BASIC', label: 'Inventory Items', featureKey: 'stock_summary' },
  { prefix: '/expenses', requiredTier: 'BASIC', label: 'Expenses', featureKey: 'basic_expenses' },
  { prefix: '/bank', requiredTier: 'BASIC', label: 'Cash & Bank', featureKey: 'cash_in_hand' },
  { prefix: '/reports', requiredTier: 'BASIC', label: 'Reports', featureKey: 'daily_sales_report' },
  { prefix: '/settings', requiredTier: 'BASIC', label: 'Settings', featureKey: 'basic_accounting' },
  { prefix: '/utilities', requiredTier: 'BASIC', label: 'Utilities & Barcodes', featureKey: 'basic_barcode' },
  { prefix: '/shift-management', requiredTier: 'BASIC', label: 'Cashier Shifts', featureKey: 'shift_management' },
];

/**
 * Normalizes any plan string to 'BASIC' | 'BUSINESS' | 'ENTERPRISE'
 */
export function normalizePlanTier(rawPlan?: string | null): PlanTier {
  if (!rawPlan) return 'BASIC';
  const p = String(rawPlan).trim().toUpperCase();

  if (p.includes('ENTERPRISE') || p.includes('PLATINUM') || p.includes('PREMIUM') || p.includes('LIFETIME') || p.includes('MULTI-BRANCH')) {
    return 'ENTERPRISE';
  }
  if (p.includes('BUSINESS') || p.includes('GOLD') || p.includes('PRO') || p.includes('PHARMACY PRO')) {
    return 'BUSINESS';
  }
  if (p.includes('BASIC') || p.includes('SILVER') || p.includes('STANDARD') || p.includes('TRIAL') || p.includes('FREE')) {
    return 'BASIC';
  }
  return 'BASIC';
}

/**
 * Hierarchy Rank for comparing plans: BASIC (1) < BUSINESS (2) < ENTERPRISE (3)
 */
export const PLAN_RANK: Record<PlanTier, number> = {
  BASIC: 1,
  BUSINESS: 2,
  ENTERPRISE: 3
};

/**
 * Checks if candidate plan is at least the required plan tier
 */
export function isPlanAtLeast(currentPlan: string | PlanTier, requiredTier: PlanTier): boolean {
  const currentTier = normalizePlanTier(currentPlan);
  return PLAN_RANK[currentTier] >= PLAN_RANK[requiredTier];
}

/**
 * Get current active subscription plan for a tenant securely.
 * Priority:
 * 1. Master Server Tenant Record (Server-Authoritative)
 * 2. Authenticated Session / Impersonation Session
 * 3. Default fallback: 'BASIC'
 */
export function getCurrentPlan(tenantId?: string): PlanTier {
  // If Master Admin is active, check context
  if (isMasterAdminAuthenticated()) {
    try {
      const simUserStr = typeof localStorage !== 'undefined' ? localStorage.getItem('active_simulated_user') : null;
      if (simUserStr) {
        const u = JSON.parse(simUserStr);
        if (u && u.plan) return normalizePlanTier(u.plan);
      }
    } catch {}
  }

  // 1. Check Master Tenant Record if tenantId provided
  const tid = tenantId || (typeof localStorage !== 'undefined' ? localStorage.getItem('mbi_active_tenant_id') || localStorage.getItem('mbi_active_business_id') : undefined);
  if (tid) {
    const tenantDoc = getTenantById(tid);
    if (tenantDoc) {
      // STRICT PURCHASED PLAN VERIFICATION:
      // Whichever plan is bought / assigned, strictly return that exact plan!
      if (tenantDoc.paidLicenseActive && tenantDoc.plan) {
        return normalizePlanTier(tenantDoc.plan);
      }
      if (tenantDoc.plan && tenantDoc.status !== 'Trial' && !tenantDoc.isTrialActive) {
        return normalizePlanTier(tenantDoc.plan);
      }
      if (tenantDoc.plan) {
        return normalizePlanTier(tenantDoc.plan);
      }
    }
  }

  // 2. Check cached tenant object
  try {
    if (typeof localStorage !== 'undefined') {
      const cachedTenantStr = localStorage.getItem('mbi_active_tenant_cache');
      if (cachedTenantStr) {
        const parsed = JSON.parse(cachedTenantStr);
        if (parsed) {
          if (parsed.paidLicenseActive && parsed.plan) {
            return normalizePlanTier(parsed.plan);
          }
          if (parsed.plan && parsed.status !== 'Trial' && !parsed.isTrialActive) {
            return normalizePlanTier(parsed.plan);
          }
          if (parsed.plan) {
            return normalizePlanTier(parsed.plan);
          }
        }
      }
    }
  } catch {}

  // 3. Fallback to BASIC
  return 'BASIC';
}

/**
 * Retrieves the complete list of inherited features for a given plan tier
 */
export function getInheritedFeatures(tier: PlanTier): Set<string> {
  const features = new Set<string>();

  // Always include BASIC features
  PLAN_FEATURES.BASIC.forEach(f => features.add(f));

  // Include BUSINESS features if tier is BUSINESS or ENTERPRISE
  if (tier === 'BUSINESS' || tier === 'ENTERPRISE') {
    PLAN_FEATURES.BUSINESS.forEach(f => features.add(f));
  }

  // Include ENTERPRISE features if tier is ENTERPRISE
  if (tier === 'ENTERPRISE') {
    PLAN_FEATURES.ENTERPRISE.forEach(f => features.add(f));
  }

  return features;
}

/**
 * Checks whether a specific featureKey is included in the plan
 */
export function hasPlanFeature(featureKey: string, plan?: string | PlanTier, tenantId?: string): boolean {
  // Master Admin Override: Always allowed if Master Admin
  if (isMasterAdminAuthenticated()) {
    return true;
  }

  // MANUAL FEATURE PATCH CHECK: If active manual patch unlocks this feature, permit immediately!
  if (manualPatchService.isFeaturePatched(featureKey, tenantId)) {
    return true;
  }

  const effectiveTier = plan ? normalizePlanTier(plan) : getCurrentPlan(tenantId);
  const activeFeatures = getInheritedFeatures(effectiveTier);

  // Direct check or wildcard
  if (activeFeatures.has(featureKey) || activeFeatures.has('*')) {
    return true;
  }

  // Check normalized key
  const normalizedKey = featureKey.toLowerCase().replace(/[\s-_]/g, '');
  for (const f of activeFeatures) {
    if (f.toLowerCase().replace(/[\s-_]/g, '') === normalizedKey) {
      return true;
    }
  }

  // Check tenant custom feature toggles override if set by Master Admin
  if (tenantId) {
    const tenantDoc = getTenantById(tenantId);
    if (tenantDoc && (tenantDoc as any).featureToggles && (tenantDoc as any).featureToggles[featureKey] === true) {
      return true;
    }
  }

  return false;
}

/**
 * canAccessFeature: Universal access checker for UI components and actions
 */
export function canAccessFeature(
  featureKey: string,
  context?: {
    plan?: string | PlanTier;
    tenantId?: string;
    role?: UserRole;
    userId?: string;
  }
): boolean {
  // Master Admin accounts always have access
  if (isMasterAdminAuthenticated() || context?.role === 'Primary Admin' && isMasterAdminAuthenticated()) {
    return true;
  }

  return hasPlanFeature(featureKey, context?.plan, context?.tenantId);
}

/**
 * Retrieves the effective plan limits for a tenant or plan
 */
export function getPlanLimits(plan?: string | PlanTier, tenantId?: string): PlanLimits {
  const tier = plan ? normalizePlanTier(plan) : getCurrentPlan(tenantId);
  const baseLimits = { ...PLAN_LIMITS_MAP[tier] };

  // Check dynamic overrides if tenantId exists
  if (tenantId) {
    const tenantDoc = getTenantById(tenantId);
    if (tenantDoc) {
      if (tenantDoc.maxFirms) baseLimits.maxFirms = tenantDoc.maxFirms;
      if (tenantDoc.maxUsers) baseLimits.maxStaffUsers = tenantDoc.maxUsers;
    }
  }

  return baseLimits;
}

/**
 * Enforce Firm / Branch Limit
 */
export function canAddFirm(currentCount: number, plan?: string | PlanTier, tenantId?: string): {
  allowed: boolean;
  maxAllowed: number;
  currentCount: number;
  message?: string;
} {
  const limits = getPlanLimits(plan, tenantId);
  const allowed = currentCount < limits.maxFirms;

  return {
    allowed,
    maxAllowed: limits.maxFirms,
    currentCount,
    message: allowed
      ? undefined
      : `Firm limit reached (${currentCount}/${limits.maxFirms}) for ${limits.planName}. Please upgrade your subscription plan to add more firms.`
  };
}

/**
 * Enforce Staff User Limit
 */
export function canAddStaffUser(currentCount: number, plan?: string | PlanTier, tenantId?: string): {
  allowed: boolean;
  maxAllowed: number;
  currentCount: number;
  message?: string;
} {
  const limits = getPlanLimits(plan, tenantId);
  const allowed = currentCount < limits.maxStaffUsers;

  return {
    allowed,
    maxAllowed: limits.maxStaffUsers,
    currentCount,
    message: allowed
      ? undefined
      : `Staff seat limit reached (${currentCount}/${limits.maxStaffUsers}) for ${limits.planName}. Please upgrade your subscription plan to add more staff users.`
  };
}

/**
 * Enforce Godown / Warehouse Limit
 */
export function canAddGodown(currentCount: number, plan?: string | PlanTier, tenantId?: string): {
  allowed: boolean;
  maxAllowed: number;
  currentCount: number;
  message?: string;
} {
  const limits = getPlanLimits(plan, tenantId);
  if (!limits.isGodownAllowed) {
    return {
      allowed: false,
      maxAllowed: 0,
      currentCount,
      message: `Godowns & multi-warehouses are not included in ${limits.planName}. Please upgrade to Business (up to 3 godowns) or Enterprise (unlimited).`
    };
  }

  const allowed = currentCount < limits.maxGodowns;
  return {
    allowed,
    maxAllowed: limits.maxGodowns,
    currentCount,
    message: allowed
      ? undefined
      : `Godown limit reached (${currentCount}/${limits.maxGodowns}) for ${limits.planName}. Please upgrade to Enterprise for unlimited godowns.`
  };
}

/**
 * Checks if a specific report is allowed under the plan
 */
export function isReportAllowedInPlan(reportId: string, plan?: string | PlanTier, tenantId?: string): boolean {
  if (isMasterAdminAuthenticated()) return true;

  const tier = plan ? normalizePlanTier(plan) : getCurrentPlan(tenantId);
  if (tier === 'ENTERPRISE') return true;

  const allowedList = PLAN_ALLOWED_REPORTS[tier];
  if (allowedList.includes('*') || allowedList.includes(reportId)) return true;

  // Clean and check
  const cleanId = reportId.toLowerCase().replace(/[\s-_]/g, '');
  return allowedList.some(r => r.toLowerCase().replace(/[\s-_]/g, '') === cleanId);
}

/**
 * Checks if a specific settings tab is allowed under the plan
 */
export function isSettingsTabAllowedInPlan(tabKey: string, plan?: string | PlanTier, tenantId?: string): boolean {
  if (isMasterAdminAuthenticated()) return true;

  const upperTab = tabKey.toUpperCase().trim();

  // Manual Patch tab is always accessible so users can manage/upload patches
  if (upperTab.includes('PATCH')) return true;

  // Manual patch check for settings tab
  if (manualPatchService.isSettingsTabPatched(tabKey, tenantId)) return true;

  const tier = plan ? normalizePlanTier(plan) : getCurrentPlan(tenantId);
  if (tier === 'ENTERPRISE') return true;

  const allowedTabs = PLAN_ALLOWED_SETTINGS_TABS[tier];
  return allowedTabs.some(t => t.toUpperCase() === upperTab);
}

/**
 * Checks if a route pathname is allowed under the plan
 */
export function isRouteAllowedInPlan(pathname: string, plan?: string | PlanTier, tenantId?: string): {
  isAllowed: boolean;
  requiredTier?: PlanTier;
  reason?: string;
} {
  if (isMasterAdminAuthenticated()) {
    return { isAllowed: true };
  }

  // MANUAL FEATURE PATCH CHECK: If active manual patch unlocks this route, permit immediately!
  if (manualPatchService.isRoutePatched(pathname, tenantId)) {
    return { isAllowed: true };
  }

  const tier = plan ? normalizePlanTier(plan) : getCurrentPlan(tenantId);
  const cleanPath = pathname.toLowerCase();

  for (const route of ROUTE_PLAN_REQUIREMENTS) {
    if (cleanPath.startsWith(route.prefix.toLowerCase())) {
      if (!isPlanAtLeast(tier, route.requiredTier)) {
        return {
          isAllowed: false,
          requiredTier: route.requiredTier,
          reason: `Feature "${route.label}" requires ${PLAN_LIMITS_MAP[route.requiredTier].planName}. Your current active plan is ${PLAN_LIMITS_MAP[tier].planName}.`
        };
      }
    }
  }

  return { isAllowed: true };
}
