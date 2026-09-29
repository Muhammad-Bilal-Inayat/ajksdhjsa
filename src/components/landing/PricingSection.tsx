import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Award, Check, Sparkles, MessageSquare, ShoppingCart, 
  Users, Building2, Zap, ArrowRight, ShieldCheck, CheckCircle2,
  TableProperties, Laptop, ChevronDown, ChevronUp, Star
} from 'lucide-react';
import { PlanComparisonModal } from './PlanComparisonModal';
import { 
  MASTER_PLANS_CONFIG, 
  PlanPricingDetail, 
  PricingDuration 
} from '../../config/plansConfig';

export type PricingInterval = PricingDuration;
export type PricingPlan = PlanPricingDetail;
export const EXACT_PRICING_PLANS = MASTER_PLANS_CONFIG;

interface PricingSectionProps {
  id?: string;
  showTitle?: boolean;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ 
  id = 'pricing',
  showTitle = true 
}) => {
  const navigate = useNavigate();
  const [interval, setInterval] = useState<PricingDuration>('1year');
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [expandedSpecs, setExpandedSpecs] = useState<Record<string, boolean>>({});

  const toggleExpand = (planId: string) => {
    setExpandedSpecs(prev => ({
      ...prev,
      [planId]: !prev[planId]
    }));
  };

  const getIntervalLabel = (int: PricingDuration) => {
    switch (int) {
      case 'monthly': return '/mo';
      case '1year': return '/year';
      case '3years': return 'for 3 Years';
      case '5years': return 'for 5 Years';
    }
  };

  const getIntervalFormatted = (int: PricingDuration) => {
    switch (int) {
      case 'monthly': return 'Monthly';
      case '1year': return '1-Year License';
      case '3years': return '3-Years License';
      case '5years': return '5-Years License';
    }
  };

  const handleCheckoutClick = (plan: PlanPricingDetail) => {
    navigate(`/checkout?plan=${plan.id}&duration=${interval}`);
  };

  return (
    <section id={id} className="py-14 sm:py-18 bg-slate-100 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800 transition-colors select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
        
        {showTitle && (
          <div className="text-center max-w-3xl mx-auto space-y-2.5">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold border bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
              <Award className="w-3.5 h-3.5" />
              <span>Compare MBI INVENTRA Editions (17-Point Matrix)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-950 dark:text-white">
              SELECT THE RIGHT PLAN FOR YOUR PHARMACY
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Fair &amp; transparent multi-year licensing with zero hidden renewal fees. Every plan includes an instant 10-day free trial.
            </p>
          </div>
        )}

        {/* Duration Selection Tabs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <div className="p-1 rounded-2xl border flex flex-wrap items-center justify-center gap-1 text-xs font-bold shadow-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setInterval('monthly')}
              className={`px-3.5 sm:px-4 py-2 rounded-xl transition-all cursor-pointer ${
                interval === 'monthly'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Monthly
            </button>

            <button
              type="button"
              onClick={() => setInterval('1year')}
              className={`px-3.5 sm:px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                interval === '1year'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>1-Year (Annual)</span>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-emerald-500 text-white">
                Save ~17%
              </span>
            </button>

            <button
              type="button"
              onClick={() => setInterval('3years')}
              className={`px-3.5 sm:px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                interval === '3years'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>3-Years</span>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-indigo-500 text-white">
                Save ~30%
              </span>
            </button>

            <button
              type="button"
              onClick={() => setInterval('5years')}
              className={`px-3.5 sm:px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                interval === '5years'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>5-Years</span>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-purple-600 text-white">
                Save ~40%
              </span>
            </button>
          </div>

          {/* Standardized CTA: Compare All Plans (17-Point Matrix) */}
          <button
            type="button"
            onClick={() => setIsComparisonOpen(true)}
            className="text-sm font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 shadow-sm active:scale-95 flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <TableProperties className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>📊 Compare All Plans (17-Point Matrix)</span>
          </button>
        </div>

        {/* 3 Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 max-w-7xl mx-auto items-stretch">
          {MASTER_PLANS_CONFIG.map((plan) => {
            const currentPrice = plan.prices[interval];
            const periodLabel = getIntervalLabel(interval);
            const isPopular = plan.isPopular;
            const isVip = plan.isVip;
            const isExpanded = !!expandedSpecs[plan.id];
            const effectiveMo = interval === '1year' 
              ? plan.effectiveMonthly 
              : Math.round(currentPrice / (interval === 'monthly' ? 1 : interval === '3years' ? 36 : 60));

            return (
              <div
                key={plan.id}
                className={`flex flex-col justify-between p-5 md:p-6 rounded-3xl bg-white dark:bg-slate-900 border shadow-md relative h-full transition-all hover:scale-[1.01] backdrop-blur-md ${
                  isPopular
                    ? 'border-2 border-blue-600 dark:border-blue-500 ring-4 ring-blue-500/10 shadow-xl'
                    : isVip
                    ? 'border-2 border-purple-600 dark:border-purple-500 ring-4 ring-purple-500/10'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-black px-3.5 py-1 rounded-full shadow-md z-10 whitespace-nowrap flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>MOST POPULAR</span>
                  </div>
                )}

                {isVip && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-black px-3.5 py-1 rounded-full shadow-md z-10 whitespace-nowrap flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>BEST ENTERPRISE VALUE</span>
                  </div>
                )}

                <div className="space-y-3.5 pt-1">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{plan.badge}</span>
                    </div>
                    <h3 className="text-lg md:text-xl font-black text-slate-950 dark:text-white leading-tight mt-0.5">
                      {plan.name}
                    </h3>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 min-h-[32px] leading-relaxed">
                    {plan.tagline}
                  </p>

                  {/* Price Tag */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-1">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-slate-500">Rs.</span>
                      <span className="text-2xl md:text-3xl font-black tracking-tight text-slate-950 dark:text-white font-mono">
                        {currentPrice.toLocaleString()}
                      </span>
                      <span className="text-xs font-bold text-slate-500">{periodLabel}</span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-bold">
                      <span className="text-slate-600 dark:text-slate-400">
                        ≈ Rs. {effectiveMo.toLocaleString()}/mo effective
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {plan.savings[interval] || 'Save on Annual'}
                      </span>
                    </div>
                  </div>

                  {/* Hardware & User Limits */}
                  <div className="py-2.5 px-3.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-bold flex items-center justify-between text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>Users: {plan.limits.users}</span>
                    </span>
                    <span className="text-slate-400 dark:text-slate-600">•</span>
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>Firms: {plan.limits.branches}</span>
                    </span>
                  </div>

                  {/* Core Features Included */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Core Features Included
                    </p>
                    <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          <span className="leading-snug">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Advanced Specifications & Capabilities (Expandable) */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => toggleExpand(plan.id)}
                      className="w-full flex items-center justify-between text-left py-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      <span>
                        {isExpanded ? 'Hide Extra Details' : 'Show Advanced Specs & Capabilities'}
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                    </button>

                    {isExpanded && (
                      <div className="mt-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 animate-in fade-in">
                        <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Advanced Specifications &amp; Capabilities:
                        </p>
                        <ul className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                          {plan.advancedSpecs.map((spec, sIdx) => (
                            <li key={sIdx} className="flex items-start gap-1.5">
                              <span className="text-blue-500 font-bold">•</span>
                              <span className="leading-tight">{spec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons at Bottom */}
                <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <a
                    href={`https://wa.me/923281302636?text=${encodeURIComponent(
                      `Salam! I want to activate MBI INVENTRA ${plan.name} (${getIntervalFormatted(interval)}: Rs. ${currentPrice.toLocaleString()}). Please guide me on instant license setup.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full text-xs font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Activate on WhatsApp</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => handleCheckoutClick(plan)}
                    className="w-full text-xs font-bold py-2 px-4 rounded-xl transition-all shadow-2xs active:scale-95 flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <ShoppingCart className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Online Checkout</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Trust Guarantee Badge */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600 dark:text-slate-400 shadow-xs max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="font-bold text-slate-900 dark:text-white">Official 10-Day Free Trial</span>
            <span>— Zero payment required to start testing your pharmacy data.</span>
          </div>
          <Link
            to="/register"
            className="text-blue-600 dark:text-blue-400 font-bold hover:underline inline-flex items-center gap-1"
          >
            <span>Activate 10-Day Free Trial</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>

      {/* 17-Point Plan Comparison Modal */}
      <PlanComparisonModal
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        activeInterval={interval}
      />
    </section>
  );
};

export default PricingSection;
