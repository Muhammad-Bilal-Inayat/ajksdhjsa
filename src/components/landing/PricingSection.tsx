import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Award, Check, Sparkles, MessageSquare, ShoppingCart, 
  Users, Building2, Zap, ArrowRight, ShieldCheck, CheckCircle2,
  TableProperties, Laptop
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

  const getIntervalLabel = (int: PricingDuration) => {
    switch (int) {
      case 'monthly': return '/month';
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
    <section id={id} className="py-14 sm:py-18 bg-slate-100 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
        
        {showTitle && (
          <div className="text-center max-w-3xl mx-auto space-y-2.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
              <Award className="w-3.5 h-3.5" />
              <span>Transparent Multi-Year Pricing &amp; Fair Value</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-950 dark:text-white">
              SELECT THE RIGHT PLAN FOR YOUR PHARMACY
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Lock in maximum savings with multi-year commitments. Every plan includes a 10-day free trial with zero setup fees.
            </p>
          </div>
        )}

        {/* Duration Tabs: Monthly, 1-Year (Save 30%), 3-Years, 5-Years */}
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
              <span>1-Year</span>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-emerald-500 text-white">
                Save 30%
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
                Save 40%
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
                Save 50%
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

            return (
              <div
                key={plan.id}
                className={`flex flex-col justify-between p-5 md:p-6 rounded-2xl bg-white dark:bg-slate-900 border shadow-md relative h-full transition-all hover:scale-[1.01] backdrop-blur-md ${
                  isPopular
                    ? 'border-2 border-blue-600 dark:border-blue-500 ring-4 ring-blue-500/10 shadow-xl'
                    : isVip
                    ? 'border-2 border-purple-600 dark:border-purple-500 ring-4 ring-purple-500/10'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-black px-3 py-0.5 rounded-full shadow-md z-10 whitespace-nowrap flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>MOST POPULAR</span>
                  </div>
                )}

                {isVip && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-black px-3 py-0.5 rounded-full shadow-md z-10 whitespace-nowrap flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>VIP ENTERPRISE</span>
                  </div>
                )}

                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl md:text-2xl">{plan.tierIcon}</span>
                      <div>
                        <h3 className="text-lg md:text-xl font-bold text-slate-950 dark:text-white leading-tight">{plan.name}</h3>
                        <span className="text-[10px] md:text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{plan.badge}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 min-h-[28px] leading-relaxed">{plan.tagline}</p>

                  {/* Price Tag */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-1">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-500">PKR</span>
                      <span className="text-2xl md:text-3xl font-black tracking-tight text-slate-950 dark:text-white font-mono">
                        {currentPrice.toLocaleString()}
                      </span>
                      <span className="text-xs font-bold text-slate-500">{periodLabel}</span>
                    </div>

                    {interval !== 'monthly' && (
                      <p className="text-[10px] md:text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        <span>
                          ≈ PKR {Math.round(currentPrice / (interval === '1year' ? 12 : interval === '3years' ? 36 : 60)).toLocaleString()}/mo rate
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Hardware & User Limits */}
                  <div className="py-2 px-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-[11px] font-semibold flex items-center justify-between text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="flex items-center gap-1 truncate">
                      <Users className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>{plan.limits.users}</span>
                    </span>
                    <span className="text-slate-400 dark:text-slate-600">•</span>
                    <span className="flex items-center gap-1 truncate">
                      <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>{plan.limits.branches}</span>
                    </span>
                    <span className="text-slate-400 dark:text-slate-600">•</span>
                    <span className="flex items-center gap-1 truncate">
                      <Laptop className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>{plan.limits.terminals}</span>
                    </span>
                  </div>

                  {/* Features List */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                    <p className="text-[10px] md:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Features Included:</p>
                    <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          <span className="leading-snug">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Standardized Action Buttons at Bottom */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <button
                    type="button"
                    onClick={() => handleCheckoutClick(plan)}
                    className="w-full text-sm font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 shadow-sm active:scale-95 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Choose {plan.name}</span>
                  </button>

                  <a
                    href={`https://wa.me/923281302636?text=${encodeURIComponent(
                      `Salam! I want to order MBI INVENTRA ${plan.name} (${getIntervalFormatted(interval)}: PKR ${currentPrice.toLocaleString()}). Please guide me on activation.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full text-sm font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 shadow-sm active:scale-95 flex items-center justify-center gap-2 border border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-500" />
                    <span>Order via WhatsApp</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Trust Guarantee Badge */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600 dark:text-slate-400 shadow-xs max-w-4xl mx-auto">
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
