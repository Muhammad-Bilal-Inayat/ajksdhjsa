import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, Check, Sparkles, ShoppingCart, ArrowRight, ShieldCheck, 
  HelpCircle, Zap, Building2, Users, Laptop, Lock
} from 'lucide-react';
import { 
  MASTER_PLANS_CONFIG, 
  EXACT_17_POINT_MATRIX, 
  PricingDuration,
  ComparisonMatrixPoint 
} from '../../config/plansConfig';

export interface PlanComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeInterval?: PricingDuration;
}

export const PlanComparisonModal: React.FC<PlanComparisonModalProps> = ({
  isOpen,
  onClose,
  activeInterval = '1year'
}) => {
  const navigate = useNavigate();
  const [interval, setInterval] = useState<PricingDuration>(activeInterval);

  if (!isOpen) return null;

  const handleSelectPlan = (planId: 'basic' | 'business' | 'enterprise') => {
    onClose();
    navigate(`/checkout?plan=${planId}&duration=${interval}`);
  };

  const silverPlan = MASTER_PLANS_CONFIG[0];
  const goldPlan = MASTER_PLANS_CONFIG[1];
  const platinumPlan = MASTER_PLANS_CONFIG[2];

  const getIntervalLabel = (int: PricingDuration) => {
    switch (int) {
      case 'monthly': return '/mo';
      case '1year': return '/yr';
      case '3years': return ' (3 Yrs)';
      case '5years': return ' (5 Yrs)';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Official 17-Point Feature Matrix
              </span>
              <span className="text-xs text-slate-500 hidden sm:inline">• Transparent Pharmacy POS Capabilities</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              Compare MBI INVENTRA Editions
            </h2>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Duration Selector Tabs */}
            <div className="hidden sm:flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setInterval('monthly')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  interval === 'monthly' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setInterval('1year')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  interval === '1year' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                1-Year (-30%)
              </button>
              <button
                type="button"
                onClick={() => setInterval('3years')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  interval === '3years' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                3-Years
              </button>
              <button
                type="button"
                onClick={() => setInterval('5years')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  interval === '5years' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                5-Years
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Table Area */}
        <div className="flex-1 overflow-y-auto overflow-x-auto p-2 sm:p-5 custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[620px]">
            {/* Sticky Table Header with Plans & Action Buttons */}
            <thead>
              <tr className="border-b-2 border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-md">
                <th className="p-3 sm:p-3.5 text-xs font-black text-slate-500 uppercase tracking-wider w-[40%]">
                  Feature / Capability (17 Core Points)
                </th>

                {/* Silver Plan Column Header */}
                <th className="p-3 sm:p-3.5 text-center w-[20%]">
                  <div className="space-y-1">
                    <span className="text-base sm:text-lg">🥈</span>
                    <div className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">Silver Basic</div>
                    <div className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                      PKR {silverPlan.prices[interval].toLocaleString()}
                      <span className="text-[10px] text-slate-500 font-sans">{getIntervalLabel(interval)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectPlan('basic')}
                      className="mt-1 w-full text-xs font-semibold py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-all active:scale-95 cursor-pointer shadow-xs"
                    >
                      Choose Silver
                    </button>
                  </div>
                </th>

                {/* Gold Plan Column Header */}
                <th className="p-3 sm:p-3.5 text-center w-[20%] bg-blue-50/50 dark:bg-blue-950/20 border-x border-blue-200 dark:border-blue-900/60 relative">
                  <div className="space-y-1">
                    <span className="text-base sm:text-lg">🥇</span>
                    <div className="font-black text-xs sm:text-sm text-blue-950 dark:text-blue-200 flex items-center justify-center gap-1">
                      <span>Gold Business</span>
                    </div>
                    <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      PKR {goldPlan.prices[interval].toLocaleString()}
                      <span className="text-[10px] text-slate-500 font-sans">{getIntervalLabel(interval)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectPlan('business')}
                      className="mt-1 w-full text-xs font-semibold py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all active:scale-95 cursor-pointer shadow-xs"
                    >
                      Choose Gold ⭐
                    </button>
                  </div>
                </th>

                {/* Platinum Plan Column Header */}
                <th className="p-3 sm:p-3.5 text-center w-[20%]">
                  <div className="space-y-1">
                    <span className="text-base sm:text-lg">💎</span>
                    <div className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">Platinum VIP</div>
                    <div className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                      PKR {platinumPlan.prices[interval].toLocaleString()}
                      <span className="text-[10px] text-slate-500 font-sans">{getIntervalLabel(interval)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectPlan('enterprise')}
                      className="mt-1 w-full text-xs font-semibold py-1.5 px-3 rounded-lg bg-purple-700 hover:bg-purple-600 text-white transition-all active:scale-95 cursor-pointer shadow-xs"
                    >
                      Choose VIP
                    </button>
                  </div>
                </th>
              </tr>
            </thead>

            {/* Matrix Body with Refined 17 Points */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs sm:text-sm">
              {EXACT_17_POINT_MATRIX.map((row) => (
                <tr 
                  key={row.id}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                    row.highlight ? 'bg-blue-50/30 dark:bg-blue-950/10 font-medium' : ''
                  }`}
                >
                  {/* Feature Name */}
                  <td className="p-3 sm:p-3 text-slate-800 dark:text-slate-200 font-semibold">
                    <span className="text-slate-400 mr-1.5 text-xs font-mono">{row.id}.</span>
                    {row.feature}
                  </td>

                  {/* Silver */}
                  <td className="p-3 sm:p-3 text-center text-slate-600 dark:text-slate-300 font-medium">
                    <span className={row.silver.includes('❌') ? 'text-rose-500 font-semibold' : ''}>
                      {row.silver}
                    </span>
                  </td>

                  {/* Gold */}
                  <td className="p-3 sm:p-3 text-center text-blue-950 dark:text-blue-100 font-bold bg-blue-50/30 dark:bg-blue-950/20 border-x border-blue-200/60 dark:border-blue-900/40">
                    <span className={row.gold.includes('✅') ? 'text-emerald-600 dark:text-emerald-400' : ''}>
                      {row.gold}
                    </span>
                  </td>

                  {/* Platinum */}
                  <td className="p-3 sm:p-3 text-center text-slate-800 dark:text-slate-200 font-bold">
                    <span className={row.platinum.includes('✅') ? 'text-emerald-600 dark:text-emerald-400' : ''}>
                      {row.platinum}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>All tiers include 10-day full feature free trial with zero payment required upfront.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => handleSelectPlan('business')}
              className="text-xs font-semibold px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <span>Get Gold Business Plan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PlanComparisonModal;
