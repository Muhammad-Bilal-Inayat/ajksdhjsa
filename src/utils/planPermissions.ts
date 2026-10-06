import { isMasterAdminAuthenticated } from '../lib/masterServerService';

export type PlanTier = 'silver' | 'gold' | 'platinum' | 'trial';

/**
 * Normalizes any plan string to standardized PlanTier
 */
export function normalizePlan(plan?: string | null): PlanTier {
  if (!plan) return 'silver';
  const p = String(plan).trim().toLowerCase();
  if (p.includes('enterprise') || p.includes('platinum') || p.includes('multi-branch') || p.includes('vip') || p.includes('premium') || p.includes('lifetime')) return 'platinum';
  if (p.includes('business') || p.includes('gold') || p.includes('pro')) return 'gold';
  if (p.includes('basic') || p.includes('silver') || p.includes('standard')) return 'silver';
  if (p.includes('trial') || p.includes('free')) return 'trial';
  return 'silver';
}

/**
 * Check if the tenant plan meets or exceeds the required tier
 * Hierarchy: platinum > gold > silver == trial (for basic core features)
 */
export function isPlanSufficient(currentPlan: PlanTier, requiredTier: 'silver' | 'gold' | 'platinum'): boolean {
  if (currentPlan === 'platinum') return true;
  if (currentPlan === 'gold') return requiredTier === 'gold' || requiredTier === 'silver';
  if (currentPlan === 'silver' || currentPlan === 'trial') return requiredTier === 'silver';
  return false;
}

/**
 * Retrieve effective plan from localStorage / active tenant context
 */
export function getActiveTenantPlan(tenantId?: string): PlanTier {
  try {
    if (tenantId) {
      const tenantFeatures = localStorage.getItem(`mbi_plan_features_${tenantId}`);
      if (tenantFeatures) {
        const parsed = JSON.parse(tenantFeatures);
        if (parsed.plan) return normalizePlan(parsed.plan);
      }
    }

    const activeTier = localStorage.getItem('mbi_active_plan_tier') ||
      localStorage.getItem('mbi_subscription_tier') ||
      localStorage.getItem('mbi_plan') ||
      localStorage.getItem('mbi_license_plan');
    if (activeTier) return normalizePlan(activeTier);

    const checkSources = [
      'mbi_tenant',
      'mbi_business',
      'mbi_company',
      'mbi_active_tenant',
      'mbi_active_user',
      'mbi_user',
      'mbi_user_profile'
    ];

    for (const key of checkSources) {
      const item = localStorage.getItem(key);
      if (item) {
        try {
          const parsed = JSON.parse(item);
          if (parsed.plan) return normalizePlan(parsed.plan);
          if (parsed.tenant?.plan) return normalizePlan(parsed.tenant.plan);
          if (parsed.business?.plan) return normalizePlan(parsed.business.plan);
        } catch { }
      }
    }
  } catch (e) {
    console.warn('Error reading tenant plan:', e);
  }

  return 'silver'; // Default to Silver Basic for safe operational fallback
}

const FEATURE_ALIASES_MAP: Record<string, string[]> = {
  'onlineStore': ['online_storefront', 'online_store', 'ecommerce_store', 'sync_online_storefront', 'digital_pharmacy', 'onlineStore', 'store_management'],
  'online_store': ['online_storefront', 'online_store', 'ecommerce_store', 'sync_online_storefront', 'digital_pharmacy', 'onlineStore', 'store_management'],
  'online_storefront': ['online_storefront', 'online_store', 'ecommerce_store', 'sync_online_storefront', 'digital_pharmacy', 'onlineStore', 'store_management'],
  'bookers': ['booker_biller_management', 'bookers', 'dist_sales_bookers_field_orders', 'booker_management', 'booker-biller', 'dist_booker_commission_ledger'],
  'booker_biller_management': ['booker_biller_management', 'bookers', 'dist_sales_bookers_field_orders', 'booker_management', 'booker-biller', 'dist_booker_commission_ledger'],
  'auto_whatsapp_gateway': ['auto_whatsapp_gateway', 'automated_whatsapp_gateway', 'whatsapp_automation', 'whatsapp_auto_gateway'],
  'whatsapp_automation': ['auto_whatsapp_gateway', 'automated_whatsapp_gateway', 'whatsapp_automation', 'whatsapp_auto_gateway'],
  'whatsapp_auto_gateway': ['auto_whatsapp_gateway', 'automated_whatsapp_gateway', 'whatsapp_automation', 'whatsapp_auto_gateway'],
  'fbr_pos_integration': ['fbr_pos_integration', 'pos_tax_fbr_pos_integration', 'digital_fiscalization', 'fbr-pos', 'tax-fbr', 'qr_digital_tax_stamps'],
  'journal_vouchers': ['journal_vouchers', 'chart_of_accounts', 'double_entry_accounting', 'journal-vouchers', 'coa', 'trial_balance'],
  'rx_prescriptions': ['rx_prescriptions', 'doctor_prescription_management', 'hosp_doctor_prescriptions_registry', 'prescription_management', 'patient_chronic_medication_refills'],
  'full_audit_trail': ['full_audit_trail', 'complete_user_audit_trail', 'security_immutable_audit_trails', 'audit-logs', 'audit_logs'],
  'narcotics_register': ['narcotics_register', 'controlled_drug_register', 'inventory_narcotic_schedule_d', 'controlled_generic_registry', 'drap_form8', 'drap_form_8_drug_register'],
  'controlled_register': ['controlled_generic_registry', 'narcotics_register', 'controlled_drug_register', 'inventory_narcotic_schedule_d'],
  'multi_godowns': ['godowns', 'multi_warehouse', 'inventory_multi_godown', 'multi-godowns', 'multi_godowns', 'stock_transfer'],
  'godowns': ['godowns', 'multi_godowns', 'multi_warehouse', 'inventory_multi_godown', 'multi-godowns', 'stock_transfer'],
  'shortage_registry': ['shortage_registry', 'shortages', 'shortage', 'short-register', 'missed_sales_demand', 'dashboard_shortage_matrix'],
  'top_products': ['top_products', 'topProducts', 'top_products_analytics', 'fast_skus_margin_matrix', 'dashboard_top_products'],
  'topProducts': ['top_products', 'topProducts', 'top_products_analytics', 'fast_skus_margin_matrix', 'dashboard_top_products'],
  'fefo_expiry_management': ['fefo_expiry_management', 'fefo_expiry', 'fefo-radar-advanced', 'fefo_expiry_report', 'fefo_expiry_status', 'dashboard_expiry_alerts'],
  'ai_assistant': ['ai_assistant', 'aiGuide', 'ai_guide', 'ai_recommendations', 'mbi_ai_recommendation', 'clinical_drug_interaction'],
  'multi_branch_hq': ['multi_branch_hq', 'multi_branch_operations', '10_plus_branches', 'centralized_branch_sync', 'inter_branch_stock_transfers', 'multi_branch_telemetry'],
};

/**
 * Check dynamic /server Super Admin overrides
 */
export function checkServerFeatureOverride(featureKey: string, tenantId?: string): boolean | null {
  try {
    // 1. Check Master Admin global bypass
    if (isMasterAdminAuthenticated()) {
      return true;
    }

    const tid = tenantId || (typeof localStorage !== 'undefined' ? localStorage.getItem('mbi_active_tenant_id') || localStorage.getItem('mbi_active_business_id') : undefined);
    const keysToCheck = [featureKey, ...(FEATURE_ALIASES_MAP[featureKey] || [])];

    // 2. Check tenant-specific custom feature map
    if (tid) {
      const storageKeys = [
        `mbi_tenant_overrides_${tid}`,
        `mbi_tenant_features_${tid}`,
        `mbi_plan_features_${tid}`
      ];

      for (const storageKey of storageKeys) {
        const storedStr = localStorage.getItem(storageKey);
        if (storedStr) {
          try {
            const parsed = JSON.parse(storedStr);
            for (const k of keysToCheck) {
              if (typeof parsed[k] === 'boolean') {
                return parsed[k];
              }
              const norm = k.toLowerCase().replace(/[\s-_]/g, '');
              for (const [prop, val] of Object.entries(parsed)) {
                if (prop.toLowerCase().replace(/[\s-_]/g, '') === norm && typeof val === 'boolean') {
                  return val;
                }
              }
            }
          } catch {}
        }
      }

      // 2b. Check mock_business / mbi_tenant cached objects
      const tenantSources = ['mock_business', 'mbi_tenant', 'mbi_active_tenant'];
      for (const ts of tenantSources) {
        const raw = localStorage.getItem(ts);
        if (raw) {
          try {
            const doc = JSON.parse(raw);
            const feats = doc?.features || doc?.customFeatures || doc?.featureToggles;
            if (feats && typeof feats === 'object') {
              for (const k of keysToCheck) {
                if (typeof feats[k] === 'boolean') return feats[k];
                const norm = k.toLowerCase().replace(/[\s-_]/g, '');
                for (const [prop, val] of Object.entries(feats)) {
                  if (prop.toLowerCase().replace(/[\s-_]/g, '') === norm && typeof val === 'boolean') {
                    return val as boolean;
                  }
                }
              }
            }
          } catch {}
        }
      }
    }

    // 3. Check global manual feature flags from /server
    const manualFlags = localStorage.getItem('mbi_server_feature_flags');
    if (manualFlags) {
      try {
        const parsed = JSON.parse(manualFlags);
        for (const k of keysToCheck) {
          if (typeof parsed[k] === 'boolean') {
            return parsed[k];
          }
          const norm = k.toLowerCase().replace(/[\s-_]/g, '');
          for (const [prop, val] of Object.entries(parsed)) {
            if (prop.toLowerCase().replace(/[\s-_]/g, '') === norm && typeof val === 'boolean') {
              return val;
            }
          }
        }
      } catch {}
    }
  } catch (e) {
    console.warn('Error checking feature override:', e);
  }

  return null;
}

/**
 * Module permission map by plan
 */
export const MODULE_TIER_REQUIREMENTS: Record<string, 'silver' | 'gold' | 'platinum'> = {
  // Core Silver / Trial Modules (Allowed for all)
  'dashboard': 'silver',
  'sale': 'silver',
  'pos': 'silver',
  'items': 'silver',
  'inventory': 'silver',
  'shortage': 'silver',
  'shortage-registry': 'silver',
  'purchase': 'silver',
  'parties': 'silver',
  'customers': 'silver',
  'suppliers': 'silver',
  'shifts': 'silver',
  'shift-management': 'silver',
  'expenses': 'silver',
  'bank': 'silver',
  'cash-in-hand': 'silver',
  'reports': 'silver',
  'settings': 'silver',
  'sync-share': 'silver',
  'syncShare': 'silver',
  'ai-guide': 'silver',
  'aiGuide': 'silver',
  'notes': 'silver',
  'top-products': 'silver',
  'topProducts': 'silver',

  // Gold Modules
  'fefo-radar-advanced': 'gold',
  'multi-godowns': 'gold',
  'wholesale-matrix': 'gold',
  'advanced-reports': 'gold',
  'quotations': 'gold',
  'orders-challans': 'gold',

  // Platinum / Enterprise Modules (Locked in Silver & Gold)
  'tax-fbr': 'platinum',
  'fbr-pos': 'platinum',
  'fbr_pos_integration': 'platinum',
  'digital_fiscalization': 'platinum',
  'qr_digital_tax_stamps': 'platinum',
  'sales_tax_invoicing': 'platinum',
  'double_entry_accounting': 'platinum',
  'chart_of_accounts': 'platinum',
  'journal_vouchers': 'platinum',
  'journal-vouchers': 'platinum',
  'trial_balance': 'platinum',
  'consolidated_financial_audits': 'platinum',
  'online_customer_storefront': 'platinum',
  'online_storefront': 'platinum',
  'ecommerce_store': 'platinum',
  'online-store': 'platinum',
  'onlineStore': 'platinum',
  'web_orders_manager': 'platinum',
  'online_promotions': 'platinum',
  'digital_product_catalog': 'platinum',
  'multi_branch_hq': 'platinum',
  'multi_branch_operations': 'platinum',
  '10_plus_branches': 'platinum',
  'unlimited_central_godowns': 'platinum',
  'unlimited_user_accounts': 'platinum',
  'centralized_branch_sync': 'platinum',
  'inter-branch-transfers': 'platinum',
  'inter_branch_stock_transfers': 'platinum',
  'branch_transfer_approvals': 'platinum',
  'consolidated_chain_analytics': 'platinum',
  'doctor_prescription_management': 'platinum',
  'prescription_management': 'platinum',
  'rx_prescriptions': 'platinum',
  'patient_chronic_medication_refills': 'platinum',
  'narcotics_register': 'platinum',
  'narcotics_controlled_drug_register': 'platinum',
  'controlled_drug_register': 'platinum',
  'drap_form8': 'platinum',
  // Booker & Biller Field Force (Gold & Platinum)
  'bookers': 'gold',
  'booker-biller': 'gold',
  'booker_management': 'gold',
  'booker_biller_management': 'gold',
  'biller_field_force_management': 'gold',
  'booker_ledger': 'gold',
  'commission_tracking': 'gold',

  // Company-Wide Activity & Security Audit Trail (Gold & Platinum)
  'audit-logs': 'gold',
  'audit_logs': 'gold',
  'full_audit_trail': 'gold',
  'complete_user_audit_trail': 'gold',
  'who_edited_deleted_tracking': 'gold',
  'timestamp_ip_logs': 'gold',
  'custom_field_level_security': 'platinum',
  'custom_field_permissions': 'platinum',
  'lifetime_extended_data_recovery': 'platinum',
  'all_24_dashboard_widgets': 'platinum',
  'mesh-sync': 'platinum',
  'ai-reorder-velocity': 'platinum',
  'auto_whatsapp_gateway': 'platinum',
  'automated_whatsapp_gateway': 'platinum',
  'whatsapp_automation': 'platinum'
};

/**
 * Check if a top-level module or feature is allowed
 */
export function isModuleAllowed(moduleKey: string, tenantId?: string, explicitPlan?: string): boolean {
  // 1. Check dynamic Super Admin /server override (including aliases)
  const override = checkServerFeatureOverride(moduleKey, tenantId);
  if (override !== null) return override;

  const aliases = FEATURE_ALIASES_MAP[moduleKey] || [];
  for (const alias of aliases) {
    const aliasOverride = checkServerFeatureOverride(alias, tenantId);
    if (aliasOverride !== null) return aliasOverride;
  }

  // 2. Resolve plan tier
  const plan = explicitPlan ? normalizePlan(explicitPlan) : getActiveTenantPlan(tenantId);

  // 3. Check requirement
  const reqTier = MODULE_TIER_REQUIREMENTS[moduleKey] || 'silver';
  return isPlanSufficient(plan, reqTier);
}

/**
 * Check if a route path is allowed for the active plan
 */
export function isRouteAllowed(path: string, tenantId?: string, explicitPlan?: string): boolean {
  const cleanPath = path.toLowerCase().split('?')[0];

  // Specific Gold / Enterprise restricted routes and their primary feature keys
  const routeTierRules: Array<{ prefix: string; featureKey: string; minTier: 'gold' | 'platinum' }> = [
    { prefix: '/bookers', featureKey: 'booker_biller_management', minTier: 'gold' },
    { prefix: '/bookers-management', featureKey: 'booker_biller_management', minTier: 'gold' },
    { prefix: '/order-bookers', featureKey: 'booker_biller_management', minTier: 'gold' },
    { prefix: '/audit-trail', featureKey: 'full_audit_trail', minTier: 'gold' },
    { prefix: '/audit-log', featureKey: 'full_audit_trail', minTier: 'gold' },
    { prefix: '/online-store', featureKey: 'online_storefront', minTier: 'platinum' },
    { prefix: '/journal-vouchers', featureKey: 'journal_vouchers', minTier: 'platinum' },
    { prefix: '/rx-prescriptions', featureKey: 'rx_prescriptions', minTier: 'platinum' }
  ];

  for (const rule of routeTierRules) {
    if (cleanPath.startsWith(rule.prefix)) {
      const override = checkServerFeatureOverride(rule.featureKey, tenantId);
      if (override !== null) return override;

      const aliases = FEATURE_ALIASES_MAP[rule.featureKey] || [];
      for (const alias of aliases) {
        const aliasOverride = checkServerFeatureOverride(alias, tenantId);
        if (aliasOverride !== null) return aliasOverride;
      }

      const plan = explicitPlan ? normalizePlan(explicitPlan) : getActiveTenantPlan(tenantId);
      return isPlanSufficient(plan, rule.minTier);
    }
  }

  return true;
}

/**
 * Reports permission map
 */
export const REPORT_TIER_REQUIREMENTS: Record<string, 'silver' | 'gold' | 'platinum'> = {
  // 📊 Sales & POS Reports
  'sale': 'silver',
  'day_book': 'silver',
  'all_transactions': 'silver',
  'item_profit_loss': 'silver',
  'bill_wise_profit': 'gold',
  'cash_flow': 'silver',

  // 📦 Stock & Inventory Reports
  'fefo_expiry_report': 'gold',
  'low_stock_summary': 'silver',
  'stock_summary': 'silver',
  'item_batch_report': 'gold',
  'fifo_allocation_report': 'gold',
  'controlled_register': 'platinum',
  'item_serial_report': 'gold',
  'category_profit_heatmap': 'gold',
  'stock_detail': 'silver',
  'item_detail': 'silver',
  'stock_summary_category': 'gold',
  'sale_purchase_category': 'gold',

  // 💰 Financial & Accounts Reports
  'expense': 'silver',
  'expense_category': 'silver',
  'expense_item': 'silver',
  'profit_loss': 'gold',
  'balance_sheet': 'gold',
  'bank_statement': 'silver',
  'discount_report': 'silver',

  // 👥 Khata & Party Reports
  'party_statement': 'silver',
  'all_parties': 'silver',
  'party_profit_loss': 'gold',
  'party_report_item': 'silver',
  'sale_purchase_party': 'gold',
  'sale_purchase_party_group': 'gold',
  'sale_summary_hsn': 'gold',

  // 🏛️ Taxes & Orders (Gold+)
  'tax_report': 'gold',
  'tax_rate_report': 'gold',
  'form_27eq': 'gold',
  'tcs_receivable': 'gold',
  'sale_purchase_orders': 'gold',
  'sale_purchase_order_item': 'gold',
  'loan_statement': 'silver',

  // 💎 Enterprise Only Exclusive Reports (Platinum)
  'fbr_tax_audit': 'platinum',
  'fbr_fiscal_tax_audit': 'platinum',
  'journal_voucher_report': 'platinum',
  'trial_balance_report': 'platinum',
  'multi_branch_consolidated_report': 'platinum',
  'multi_branch_stock_sales': 'platinum',
  'online_store_performance_report': 'platinum',
  'online_store_sales': 'platinum',
  'narcotics_dispensing_report': 'platinum',
  'controlled_drug_dispensing': 'platinum',
  'drap_form8_regulatory_report': 'platinum',
  'drap_form8': 'platinum',
  'booker_commission_report': 'platinum',
  'booker_commission_sales': 'platinum',
  'master_user_activity_audit_export': 'platinum',
  'audit_trail_export': 'platinum',
  'consolidated_financial_audits': 'platinum'
};

/**
 * Check if a specific report is allowed for tenant's plan
 */
export function isReportAllowed(reportId: string, tenantId?: string, explicitPlan?: string): boolean {
  const directOverride = checkServerFeatureOverride(`report_${reportId}`, tenantId);
  if (directOverride !== null) return directOverride;

  const rawOverride = checkServerFeatureOverride(reportId, tenantId);
  if (rawOverride !== null) return rawOverride;

  const plan = explicitPlan ? normalizePlan(explicitPlan) : getActiveTenantPlan(tenantId);
  const reqTier = REPORT_TIER_REQUIREMENTS[reportId] || 'silver';

  return isPlanSufficient(plan, reqTier);
}
