import React from 'react';
import { formatCurrency } from '../../lib/utils';
import { TrendingUp, AlertCircle, CheckCircle2, DollarSign } from 'lucide-react';

export interface SalePurchaseKpiCardsProps {
  paidAmount: number;
  unpaidAmount: number;
  totalAmount: number;
  currencyPrefix?: string;
  reportType?: 'Sale' | 'Purchase' | 'All';
}

export const SalePurchaseKpiCards: React.FC<SalePurchaseKpiCardsProps> = ({
  paidAmount,
  unpaidAmount,
  totalAmount,
  currencyPrefix = 'Rs.',
  reportType = 'Sale'
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      {/* Card 1: Paid Total */}
      <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/20 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
            Total Paid ({reportType})
          </span>
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 opacity-80" />
        </div>
        <div className="text-2xl font-black text-emerald-800 dark:text-emerald-300 mt-1 font-mono">
          {currencyPrefix} {paidAmount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      {/* Card 2: Unpaid / Due */}
      <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
            Unpaid / Balance Due
          </span>
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 opacity-80" />
        </div>
        <div className="text-2xl font-black text-amber-800 dark:text-amber-300 mt-1 font-mono">
          {currencyPrefix} {unpaidAmount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      {/* Card 3: Grand Total */}
      <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
            Grand Total Turnover
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200">
            All
          </span>
        </div>
        <div className="text-2xl font-black text-blue-800 dark:text-blue-300 mt-1 font-mono">
          {currencyPrefix} {totalAmount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
    </div>
  );
};

export default SalePurchaseKpiCards;
