import { 
  hasPlanFeature as baseHasPlanFeature,
  isRouteAllowedInPlan as baseIsRouteAllowedInPlan,
  isReportAllowedInPlan as baseIsReportAllowedInPlan,
  isSettingsTabAllowedInPlan as baseIsSettingsTabAllowedInPlan,
  normalizePlanTier as baseNormalizePlanTier,
  PLAN_LIMITS_MAP,
  PlanTier
} from './planFeatureManager';
import { canAddFirm, canAddUser, canAddGodown, getEffectiveTenantLimits } from './planLimitsService';

export type { PlanTier };
export type PlanFeatureKey = 
  | 'basic_pos_billing'
  | 'customer_credit_ledger'
  | 'multi_firm_management'
  | 'fefo_expiry_tracking'
  | 'multi_godown'
  | 'quotation_estimates'
  | 'sale_orders'
  | 'purchase_orders'
  | 'cheque_tracking'
  | 'loan_accounts'
  | 'bill_wise_profit_loss'
  | 'online_storefront'
  | 'chart_of_accounts'
  | 'enterprise_audit_trail';

export interface PlanLimitValidationResult {
  allowed: boolean;
  maxAllowed: number;
  currentCount: number;
  message?: string;
}

export interface PlanFeatureDetails {
  key: string;
  name: string;
  description: string;
  requiredTier: PlanTier;
  category: 'core' | 'inventory' | 'sales' | 'finance' | 'enterprise';
}

export const ALL_PLAN_FEATURES: PlanFeatureDetails[] = [
  {
    key: 'basic_pos_billing',
    name: 'Standard POS Billing',
    description: 'Fast barcode checkout, receipt printing, and credit sales.',
    requiredTier: 'BASIC',
    category: 'core'
  },
  {
    key: 'customer_credit_ledger',
    name: 'Customer & Supplier Ledgers',
    description: 'Track outstanding balances, payments in/out, and account statements.',
    requiredTier: 'BASIC',
    category: 'finance'
  },
  {
    key: 'multi_firm_management',
    name: 'Multi-Firm Management',
    description: 'Operate up to 5 firms on Business or 10+ firms on Enterprise.',
    requiredTier: 'BUSINESS',
    category: 'core'
  },
  {
    key: 'fefo_expiry_tracking',
    name: 'FEFO Batch & Expiry Management',
    description: 'Batch-wise stock control, near-expiry alerts, and automated first-expiry-first-out.',
    requiredTier: 'BUSINESS',
    category: 'inventory'
  },
  {
    key: 'multi_godown',
    name: 'Multi-Godown & Warehouses',
    description: 'Manage multiple stock locations, racks, and warehouse transfers.',
    requiredTier: 'BUSINESS',
    category: 'inventory'
  },
  {
    key: 'quotation_estimates',
    name: 'Quotation & Estimates',
    description: 'Create price estimates, convert quotations to invoices with 1 click.',
    requiredTier: 'BUSINESS',
    category: 'sales'
  },
  {
    key: 'sale_orders',
    name: 'Sale Orders & Delivery Challans',
    description: 'Full order lifecycle management from order booking to dispatch.',
    requiredTier: 'BUSINESS',
    category: 'sales'
  },
  {
    key: 'purchase_orders',
    name: 'Purchase Orders & Supplier Returns',
    description: 'Issue POs to suppliers, track partial fulfillment, and manage debit notes.',
    requiredTier: 'BUSINESS',
    category: 'sales'
  },
  {
    key: 'cheque_tracking',
    name: 'Cheque & Banking Management',
    description: 'Track received and issued cheques, clearance status, and bank reconciliations.',
    requiredTier: 'BUSINESS',
    category: 'finance'
  },
  {
    key: 'loan_accounts',
    name: 'Loan & Liability Accounts',
    description: 'Manage bank loans, EMI amortization schedules, and partner capital.',
    requiredTier: 'BUSINESS',
    category: 'finance'
  },
  {
    key: 'bill_wise_profit_loss',
    name: 'Bill-Wise Profit & Margin Analysis',
    description: 'Real-time item cost, gross margin, and profitability per invoice.',
    requiredTier: 'BUSINESS',
    category: 'finance'
  },
  {
    key: 'online_storefront',
    name: 'Digital Pharmacy Storefront',
    description: 'Customer-facing web catalog, mobile ordering, and WhatsApp ordering.',
    requiredTier: 'ENTERPRISE',
    category: 'enterprise'
  },
  {
    key: 'chart_of_accounts',
    name: 'Full Chart of Accounts & Balance Sheet',
    description: 'Double-entry accounting, Trial Balance, Profit & Loss, and Balance Sheet.',
    requiredTier: 'ENTERPRISE',
    category: 'enterprise'
  },
  {
    key: 'enterprise_audit_trail',
    name: 'Enterprise Audit Trail & Security Logs',
    description: 'Immutable change logs, suspicious activity alerts, and device locks.',
    requiredTier: 'ENTERPRISE',
    category: 'enterprise'
  }
];

/**
 * PlanManager Class
 * Consolidates all subscription-plan logic, feature gates, and limit checks across the entire applet.
 */
export class PlanManager {
  /**
   * Normalize any plan string (e.g., "Silver Basic", "Standard POS", "Gold Business") into standard PlanTier
   */
  public static normalizeTier(planName?: string): PlanTier {
    return baseNormalizePlanTier(planName);
  }

  /**
   * Check if a specific feature key is accessible for the provided plan tier
   */
  public static hasPlanFeature(featureKey: string, plan?: string, tenantId?: string): boolean {
    return baseHasPlanFeature(featureKey as any, plan, tenantId);
  }

  /**
   * Enforce and validate plan quota limits (firms, users, godowns, branches)
   */
  public static enforcePlanLimit(
    plan: string,
    limitType: 'firms' | 'users' | 'godowns' | 'branches',
    currentCount: number,
    tenantId?: string
  ): PlanLimitValidationResult {
    const tier = this.normalizeTier(plan);
    const limits = PLAN_LIMITS_MAP[tier] || PLAN_LIMITS_MAP.BASIC;

    if (limitType === 'firms') {
      const maxAllowed = limits.maxFirms;
      const allowed = currentCount < maxAllowed;
      return {
        allowed,
        maxAllowed,
        currentCount,
        message: allowed ? undefined : `Your ${tier} plan allows up to ${maxAllowed} firm(s). Please upgrade to Business or Enterprise.`
      };
    }

    if (limitType === 'users') {
      const maxAllowed = limits.maxStaffUsers;
      const allowed = currentCount < maxAllowed;
      return {
        allowed,
        maxAllowed,
        currentCount,
        message: allowed ? undefined : `Your ${tier} plan allows up to ${maxAllowed} staff user(s). Please upgrade your subscription.`
      };
    }

    if (limitType === 'godowns') {
      const maxAllowed = limits.maxGodowns;
      if (maxAllowed === 0) {
        return {
          allowed: false,
          maxAllowed: 0,
          currentCount,
          message: `Multi-Godown management requires a Business or Enterprise subscription plan.`
        };
      }
      const allowed = currentCount < maxAllowed;
      return {
        allowed,
        maxAllowed,
        currentCount,
        message: allowed ? undefined : `Your ${tier} plan allows up to ${maxAllowed} godown(s). Please upgrade to Enterprise for unlimited godowns.`
      };
    }

    // Default branches
    const maxAllowed = limits.maxFirms;
    return {
      allowed: currentCount < maxAllowed,
      maxAllowed,
      currentCount,
      message: currentCount >= maxAllowed ? `Limit reached for ${tier} plan.` : undefined
    };
  }

  /**
   * Validate if a route URL is allowed in the current plan
   */
  public static isRouteAllowed(route: string, plan?: string, tenantId?: string) {
    return baseIsRouteAllowedInPlan(route, plan, tenantId);
  }

  /**
   * Validate if a report ID is allowed in the current plan
   */
  public static isReportAllowed(reportId: string, plan?: string, tenantId?: string) {
    return baseIsReportAllowedInPlan(reportId, plan, tenantId);
  }

  /**
   * Validate if a settings tab is allowed in the current plan
   */
  public static isSettingsTabAllowed(tabKey: string, plan?: string, tenantId?: string) {
    return baseIsSettingsTabAllowedInPlan(tabKey, plan, tenantId);
  }

  /**
   * Get the required tier for a given feature key
   */
  public static getRequiredTier(featureKey: string): PlanTier {
    const found = ALL_PLAN_FEATURES.find(f => f.key === featureKey);
    return found ? found.requiredTier : 'BASIC';
  }

  /**
   * Compare if current tier satisfies required tier
   */
  public static isTierSufficient(currentPlan: string | undefined, requiredTier: PlanTier): boolean {
    const currentTier = this.normalizeTier(currentPlan);
    const weight: Record<PlanTier, number> = {
      BASIC: 1,
      BUSINESS: 2,
      ENTERPRISE: 3
    };
    return (weight[currentTier] || 1) >= (weight[requiredTier] || 1);
  }

  /**
   * Get readable label for a plan tier
   */
  public static getTierLabel(tier: PlanTier): string {
    switch (tier) {
      case 'BASIC':
        return 'Silver Basic';
      case 'BUSINESS':
        return 'Gold Business';
      case 'ENTERPRISE':
        return 'Platinum Enterprise';
      default:
        return 'Standard Plan';
    }
  }
}

// Standalone utility exports matching user brief
export const hasPlanFeature = (featureKey: string, plan?: string, tenantId?: string): boolean => {
  return PlanManager.hasPlanFeature(featureKey, plan, tenantId);
};

export const enforcePlanLimit = (
  plan: string,
  limitType: 'firms' | 'users' | 'godowns' | 'branches',
  count: number,
  tenantId?: string
): PlanLimitValidationResult => {
  return PlanManager.enforcePlanLimit(plan, limitType, count, tenantId);
};
