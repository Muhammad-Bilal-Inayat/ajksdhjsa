import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, Sparkles, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { PlanManager, PlanTier } from '../../lib/plans';

interface SubscriptionGuardProps {
  featureKey?: string;
  requiredTier?: PlanTier;
  fallback?: React.ReactNode;
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({
  featureKey,
  requiredTier,
  fallback,
  children,
  title,
  description
}) => {
  const { tenant, tenantId } = useAuth();
  const currentPlan = (tenant as any)?.plan || 'Standard POS';
  const effectiveTenantId = tenant?.tenantId || tenant?.id || tenantId;

  // Determine target tier
  const targetRequiredTier: PlanTier = requiredTier || (featureKey ? PlanManager.getRequiredTier(featureKey) : 'BASIC');

  // Check access
  const isAllowed = featureKey 
    ? PlanManager.hasPlanFeature(featureKey, currentPlan, effectiveTenantId)
    : PlanManager.isTierSufficient(currentPlan, targetRequiredTier);

  if (isAllowed) {
    return <>{children}</>;
  }

  // If custom fallback provided
  if (fallback) {
    return <>{fallback}</>;
  }

  const currentTier = PlanManager.normalizeTier(currentPlan);
  const targetLabel = PlanManager.getTierLabel(targetRequiredTier);

  const displayTitle = title || `Upgrade to ${targetLabel}`;
  const displayDescription = description || `This feature requires a ${targetLabel} subscription. Upgrade your plan to unlock full multi-counter capabilities, advanced analytics, and automated controls.`;

  return (
    <div className="w-full my-4 p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-amber-500/30 rounded-2xl shadow-xl text-white relative overflow-hidden">
      {/* Glow highlight background */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-xl mx-auto space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-inner">
          <Lock className="w-7 h-7 animate-pulse" />
        </div>

        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Plan Gate: {targetLabel}</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {displayTitle}
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            {displayDescription}
          </p>
        </div>

        <div className="py-2 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Instant Activation</span>
          </div>
          <div className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Zero Data Migration Needed</span>
          </div>
          <div className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Multi-Counter Ready</span>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
          <Link
            to="/pricing"
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>Upgrade to Premium</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to="/dashboard"
            className="w-full sm:w-auto px-5 py-3 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 text-sm font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};
