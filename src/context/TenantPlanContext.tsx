import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  PlanTier, 
  normalizePlan, 
  getActiveTenantPlan, 
  isModuleAllowed, 
  isRouteAllowed, 
  isReportAllowed,
  checkServerFeatureOverride 
} from '../utils/planPermissions';
import { useAuth } from '../contexts/AuthContext';

export interface TenantPlanContextType {
  plan: PlanTier;
  rawPlan: string;
  isTrial: boolean;
  isSilver: boolean;
  isGold: boolean;
  isPlatinum: boolean;
  isEnterprise: boolean;
  currentPlan: string;
  isModuleAllowed: (moduleKey: string) => boolean;
  isRouteAllowed: (route: string) => boolean;
  isReportAllowed: (reportId: string) => boolean;
  refreshPlan: () => void;
}

const TenantPlanContext = createContext<TenantPlanContextType | undefined>(undefined);

export const TenantPlanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tenantId, currentUser, tenant } = useAuth();
  const [version, setVersion] = useState(0);

  const refreshPlan = () => {
    setVersion(v => v + 1);
  };

  useEffect(() => {
    const handlePlanUpdated = () => refreshPlan();
    const handleStorageUpdated = (e: StorageEvent) => {
      if (e.key?.startsWith('mbi_plan') || e.key?.startsWith('mbi_tenant') || e.key === 'mbi_active_user') {
        refreshPlan();
      }
    };

    window.addEventListener('mbi-plan-updated', handlePlanUpdated);
    window.addEventListener('mbi_checkout_orders_updated', handlePlanUpdated);
    window.addEventListener('storage', handleStorageUpdated);

    return () => {
      window.removeEventListener('mbi-plan-updated', handlePlanUpdated);
      window.removeEventListener('mbi_checkout_orders_updated', handlePlanUpdated);
      window.removeEventListener('storage', handleStorageUpdated);
    };
  }, []);

  const { plan, rawPlan } = useMemo(() => {
    // 1. Check direct tenant/user object
    const raw = tenant?.plan || currentUser?.plan || localStorage.getItem('mbi_active_plan_tier') || 'Basic';
    const normalized = getActiveTenantPlan(tenantId || undefined);
    return {
      plan: normalized,
      rawPlan: String(raw)
    };
  }, [tenantId, currentUser, tenant, version]);

  const value: TenantPlanContextType = useMemo(() => {
    const isTrial = plan === 'trial';
    const isSilver = plan === 'silver' || plan === 'trial';
    const isGold = plan === 'gold';
    const isPlatinum = plan === 'platinum';
    const isEnterprise = isPlatinum || /enterprise|platinum|pro/i.test(rawPlan);

    return {
      plan,
      rawPlan,
      currentPlan: rawPlan,
      isTrial,
      isSilver,
      isGold,
      isPlatinum,
      isEnterprise,
      isModuleAllowed: (moduleKey: string) => isModuleAllowed(moduleKey, tenantId || undefined, rawPlan),
      isRouteAllowed: (route: string) => isRouteAllowed(route, tenantId || undefined, rawPlan),
      isReportAllowed: (reportId: string) => isReportAllowed(reportId, tenantId || undefined, rawPlan),
      refreshPlan
    };
  }, [plan, rawPlan, tenantId]);

  return (
    <TenantPlanContext.Provider value={value}>
      {children}
    </TenantPlanContext.Provider>
  );
};

export const useTenantPlan = (): TenantPlanContextType => {
  const context = useContext(TenantPlanContext);
  if (!context) {
    // Graceful fallback if called outside provider
    const fallbackPlan = getActiveTenantPlan();
    return {
      plan: fallbackPlan,
      rawPlan: fallbackPlan,
      isTrial: fallbackPlan === 'trial',
      isSilver: fallbackPlan === 'silver' || fallbackPlan === 'trial',
      isGold: fallbackPlan === 'gold',
      isPlatinum: fallbackPlan === 'platinum',
      isModuleAllowed: (mod: string) => isModuleAllowed(mod),
      isRouteAllowed: (route: string) => isRouteAllowed(route),
      isReportAllowed: (rep: string) => isReportAllowed(rep),
      refreshPlan: () => {}
    };
  }
  return context;
};

export default TenantPlanContext;
