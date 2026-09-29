import { PlanTier, PLAN_LIMITS_MAP, PLAN_FEATURES, normalizePlanTier, hasPlanFeature, getPlanLimits, isPlanAtLeast } from '../lib/planFeatureManager';

/**
 * Basic (Silver) Complete Feature Set for 10-Day Free Trial Users
 */
export const BASIC_TRIAL_FEATURES = {
  posBilling: true,
  barcodeScanner: true,
  medicineCatalog: true,
  inventoryBatches: true,
  khataLedgers: true,
  cashierShifts: true,
  thermalPrinting: true,
  offlineSync: true,
  expensesManagement: true,
  customerLedger: true,
  supplierLedger: true,
  dailySalesReport: true,
  cloudBackup: true
};

/**
 * Business (Gold) Extended Feature Set
 */
export const BUSINESS_FEATURES = {
  ...BASIC_TRIAL_FEATURES,
  fefoRadar90d: true,
  fefoExpiryManagement: true,
  multiWarehouseGodowns: true,
  stockTransfers: true,
  quotationEstimates: true,
  saleOrdersChallans: true,
  purchaseOrders: true,
  chequeTracking: true,
  loanAccounts: true,
  billWiseProfitLoss: true,
  taxFbrReports: true,
  excelImportExport: true,
  deletedRecovery30d: true
};

/**
 * Enterprise (Platinum) Full Feature Set
 */
export const ENTERPRISE_FEATURES = {
  ...BUSINESS_FEATURES,
  unlimitedGodowns: true,
  branchToBranchTransfers: true,
  onlineStorefront: true,
  chartOfAccounts: true,
  journalVouchers: true,
  fullAuditTrail: true,
  rxPrescriptions: true,
  bookerBillerManagement: true,
  whatsappAutomation: true,
  customFieldSecurity: true,
  multiBranchSync: true
};

export class PlanService {
  /**
   * Retrieves feature dictionary for any given plan tier
   */
  public getPlanFeatures(plan: string = 'Basic') {
    const tier = normalizePlanTier(plan);
    switch (tier) {
      case 'ENTERPRISE':
        return ENTERPRISE_FEATURES;
      case 'BUSINESS':
        return BUSINESS_FEATURES;
      case 'BASIC':
      default:
        return BASIC_TRIAL_FEATURES;
    }
  }

  /**
   * Initialize 10-day basic trial features for newly registered tenant
   */
  public initializeBasicTrialFeatures(tenantId: string) {
    try {
      const trialFeatures = {
        ...BASIC_TRIAL_FEATURES,
        tenantId,
        activatedAt: new Date().toISOString(),
        plan: 'Basic',
        status: 'Active'
      };
      localStorage.setItem(`mbi_plan_features_${tenantId}`, JSON.stringify(trialFeatures));
      localStorage.setItem('mbi_active_plan_tier', 'Basic');
      window.dispatchEvent(new CustomEvent('mbi-plan-updated', { detail: { tenantId, plan: 'Basic' } }));
      return trialFeatures;
    } catch {
      return BASIC_TRIAL_FEATURES;
    }
  }

  /**
   * Activates paid plan upgrade upon checkout approval (Gold or Platinum)
   */
  public upgradePlan(tenantId: string, targetPlan: 'Business' | 'Enterprise' | 'Gold' | 'Platinum' | string) {
    const tier = normalizePlanTier(targetPlan);
    const features = this.getPlanFeatures(tier);
    
    try {
      localStorage.setItem(`mbi_plan_features_${tenantId}`, JSON.stringify({
        ...features,
        tenantId,
        upgradedAt: new Date().toISOString(),
        plan: tier,
        status: 'Active'
      }));
      localStorage.setItem('mbi_active_plan_tier', tier);

      // Notify application of plan upgrade
      window.dispatchEvent(new CustomEvent('mbi-plan-updated', { detail: { tenantId, plan: tier } }));
      window.dispatchEvent(new Event('mbi-effective-permissions-updated'));
    } catch {}

    return {
      success: true,
      plan: tier,
      features
    };
  }

  /**
   * Check if a specific feature is enabled for a given plan
   */
  public hasFeature(featureKey: string, plan?: string, tenantId?: string): boolean {
    return hasPlanFeature(featureKey, plan, tenantId);
  }

  /**
   * Check if a module is core baseline and guaranteed accessible across all plans
   */
  public isCoreBaselineModule(moduleName: string): boolean {
    const core = [
      'dashboard',
      'sale',
      'items',
      'purchase',
      'parties',
      'shifts',
      'shift-management',
      'expenses',
      'bank',
      'reports',
      'settings',
      'syncShare',
      'sync-share',
      'aiGuide',
      'ai-guide'
    ];
    return core.includes(moduleName.toLowerCase());
  }

  /**
   * Check if an advanced module is unlocked by plan tier
   */
  public isAdvancedModuleUnlocked(moduleKey: 'fefoRadar' | 'godowns' | 'transfers' | 'onlineStore' | 'auditTrail' | string, plan?: string): boolean {
    const tier = normalizePlanTier(plan);
    if (tier === 'ENTERPRISE') return true;
    if (tier === 'BUSINESS') {
      return moduleKey === 'fefoRadar' || moduleKey === 'godowns' || moduleKey === 'fefoExpiryManagement';
    }
    return false;
  }

  /**
   * Get effective quota limits for a plan
   */
  public getLimits(plan?: string, tenantId?: string) {
    return getPlanLimits(plan, tenantId);
  }
}

export const planService = new PlanService();
export default planService;

