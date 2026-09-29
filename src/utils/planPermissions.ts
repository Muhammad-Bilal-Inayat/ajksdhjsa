import { isMasterAdminAuthenticated } from '../lib/masterServerService';

export type PlanTier = 'silver' | 'gold' | 'platinum' | 'trial';

/**
 * Normalizes any plan string to standardized PlanTier
 */
export function normalizePlan(plan?: string | null): PlanTier {
  if (!plan) return 'trial';
  const p = plan.trim().toLowerCase();
  if (p === 'enterprise' || p === 'platinum' || p === 'vip') return 'platinum';
  if (p === 'business' || p === 'gold') return 'gold';
  if (p === 'basic' || p === 'silver') return 'silver';
  if (p === 'trial' || p === 'free') return 'trial';
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
                       localStorage.getItem('mbi_plan');
    if (activeTier) return normalizePlan(activeTier);

    const activeUser = localStorage.getItem('mbi_active_user');
    if (activeUser) {
      const parsed = JSON.parse(activeUser);
      if (parsed.plan) return normalizePlan(parsed.plan);
      if (parsed.tenant?.plan) return normalizePlan(parsed.tenant.plan);
    }
  } catch (e) {
    console.warn('Error reading tenant plan:', e);
  }

  return 'silver'; // Default to Silver Basic for safe operational fallback
}

/**
 * Check dynamic /server Super Admin overrides
 */
export function checkServerFeatureOverride(featureKey: string, tenantId?: string): boolean | null {
  try {
    // 1. Check Master Admin global bypass
    if (isMasterAdminAuthenticated()) {
      return true;
    }

    // 2. Check tenant-specific custom feature map
    if (tenantId) {
      const overridesStr = localStorage.getItem(`mbi_tenant_overrides_${tenantId}`);
      if (overridesStr) {
        const overrides = JSON.parse(overridesStr);
        if (typeof overrides[featureKey] === 'boolean') {
          return overrides[featureKey];
        }
      }

      const planFeaturesStr = localStorage.getItem(`mbi_plan_features_${tenantId}`);
      if (planFeaturesStr) {
        const features = JSON.parse(planFeaturesStr);
        if (typeof features[featureKey] === 'boolean') {
          return features[featureKey];
        }
      }
    }

    // 3. Check global manual feature flags from /server
    const manualFlags = localStorage.getItem('mbi_server_feature_flags');
    if (manualFlags) {
      const parsed = JSON.parse(manualFlags);
      if (typeof parsed[featureKey] === 'boolean') {
        return parsed[featureKey];
      }
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

  // Gold Modules
  'top-products': 'gold',
  'topProducts': 'gold',
  'fefo-radar-advanced': 'gold',
  'multi-godowns': 'gold',
  'wholesale-matrix': 'gold',
  'advanced-reports': 'gold',
  'tax-fbr': 'gold',
  'quotations': 'gold',
  'orders-challans': 'gold',

  // Platinum Modules (Locked in Silver & Gold)
  'bookers': 'platinum',
  'booker-biller': 'platinum',
  'online-store': 'platinum',
  'onlineStore': 'platinum',
  'inter-branch-transfers': 'platinum',
  'audit-logs': 'platinum',
  'journal-vouchers': 'platinum',
  'mesh-sync': 'platinum',
  'ai-reorder-velocity': 'platinum'
};

/**
 * Check if a top-level module or feature is allowed
 */
export function isModuleAllowed(moduleKey: string, tenantId?: string, explicitPlan?: string): boolean {
  // 1. Check dynamic Super Admin /server override
  const override = checkServerFeatureOverride(moduleKey, tenantId);
  if (override !== null) return override;

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

  // Specific Enterprise restricted routes
  if (cleanPath.startsWith('/bookers') || cleanPath.startsWith('/online-store')) {
    const override = checkServerFeatureOverride(cleanPath.includes('booker') ? 'bookers' : 'onlineStore', tenantId);
    if (override !== null) return override;
    const plan = explicitPlan ? normalizePlan(explicitPlan) : getActiveTenantPlan(tenantId);
    return plan === 'platinum';
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
  'fefo_expiry_report': 'silver',
  'low_stock_summary': 'silver',
  'stock_summary': 'silver',
  'item_batch_report': 'gold',
  'fifo_allocation_report': 'gold',
  'controlled_register': 'gold',
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
};

/**
 * Check if a specific report is allowed for tenant's plan
 */
export function isReportAllowed(reportId: string, tenantId?: string, explicitPlan?: string): boolean {
  const override = checkServerFeatureOverride(`report_${reportId}`, tenantId);
  if (override !== null) return override;

  const plan = explicitPlan ? normalizePlan(explicitPlan) : getActiveTenantPlan(tenantId);
  const reqTier = REPORT_TIER_REQUIREMENTS[reportId] || 'silver';

  return isPlanSufficient(plan, reqTier);
}
