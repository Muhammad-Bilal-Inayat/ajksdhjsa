import React, { useState } from 'react';
import { 
  Calculator, TrendingUp, ShieldCheck, DollarSign, 
  Sparkles, CheckCircle2, ArrowRight, Zap, AlertTriangle 
} from 'lucide-react';

export const ExpiryCalculator: React.FC<{ onOpenTrial?: () => void }> = ({ onOpenTrial }) => {
  // Inventory size in PKR (Default: 2,500,000 PKR / 25 Lakhs)
  const [inventoryValue, setInventoryValue] = useState<number>(2500000);
  
  // Expiry loss percentage without automated FEFO (industry avg: 4.2%)
  const expiryLossRate = 0.042;
  const fefoRecoveryRate = 0.88; // 88% of expiry losses recovered via timely 30/60/90-day dispatch / return

  const annualLossWithoutFefo = inventoryValue * expiryLossRate;
  const monthlyLossWithoutFefo = Math.round(annualLossWithoutFefo / 12);
  const annualSavingsRecovered = Math.round(annualLossWithoutFefo * fefoRecoveryRate);
  const monthlySavingsRecovered = Math.round(annualSavingsRecovered / 12);

  // Software annual cost (Business Plan ~39,990)
  const softwareCost = 39990;
  const netRoiRatio = Math.max(2, Math.round(annualSavingsRecovered / softwareCost));

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-xl rounded-3xl p-6 sm:p-8 space-y-6 select-none transition-colors">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 border border-amber-500/20 dark:border-amber-500/30">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">
                Interactive FEFO Expiry Savings Calculator
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 text-[10px] font-bold">
                Live ROI Estimator
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              Estimate how much money automated 30/60/90-day expiry radar saves your pharmacy every month.
            </p>
          </div>
        </div>
      </div>

      {/* Slider Control */}
      <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 transition-colors">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Current Pharmacy Stock / Inventory Value:
          </label>
          <span className="text-base sm:text-lg font-black font-mono text-blue-600 dark:text-blue-400">
            Rs {inventoryValue.toLocaleString()} PKR
          </span>
        </div>

        <input
          type="range"
          min={500000}
          max={15000000}
          step={250000}
          value={inventoryValue}
          onChange={(e) => setInventoryValue(Number(e.target.value))}
          className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500"
        />

        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          <span>Rs 5 Lakhs (Small Retail)</span>
          <span>Rs 50 Lakhs</span>
          <span>Rs 1.5 Crore (Mega Pharmacy)</span>
        </div>
      </div>

      {/* Calculation Results Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Expiry Waste Without FEFO */}
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 p-4 rounded-2xl space-y-1 transition-colors">
          <div className="flex items-center justify-between text-xs text-rose-700 dark:text-rose-300 font-semibold">
            <span>Expired Wastage Loss</span>
            <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-rose-700 dark:text-rose-200">
            Rs {monthlyLossWithoutFefo.toLocaleString()} <span className="text-xs font-sans text-rose-600 dark:text-rose-300 font-normal">/mo</span>
          </p>
          <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80">
            ~Rs {annualLossWithoutFefo.toLocaleString()}/yr lost in dumped medicines
          </p>
        </div>

        {/* Card 2: Recovered Savings */}
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-4 rounded-2xl space-y-1 transition-colors">
          <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
            <span>FEFO Recovered Savings</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-emerald-700 dark:text-emerald-300">
            Rs {monthlySavingsRecovered.toLocaleString()} <span className="text-xs font-sans text-emerald-600 dark:text-emerald-300 font-normal">/mo</span>
          </p>
          <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80">
            Rs {annualSavingsRecovered.toLocaleString()} annual net cash recovered
          </p>
        </div>

        {/* Card 3: Software ROI Multiplier */}
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 p-4 rounded-2xl space-y-1 transition-colors">
          <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 font-semibold">
            <span>Net Software ROI</span>
            <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-300">
            {netRoiRatio}x ROI
          </p>
          <p className="text-[11px] text-blue-600/80 dark:text-blue-300/80">
            Pays for itself within the first 14 days of operation
          </p>
        </div>
      </div>

      {/* Call to action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Ready to eliminate expired inventory waste with 30, 60 & 90-day automated alerts?
        </p>
        <button
          type="button"
          onClick={onOpenTrial}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer shrink-0 active:scale-98"
        >
          <span>Claim 10-Day Free Trial</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
