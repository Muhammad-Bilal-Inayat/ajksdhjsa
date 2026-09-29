import React from 'react';
import { 
  Building2, 
  Wallet, 
  CreditCard, 
  DollarSign, 
  Truck, 
  Percent, 
  Receipt, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { Supplier } from '../../types';
import { formatCurrency } from '../../lib/utils';

export interface PurchasePaymentSummaryProps {
  supplier: Supplier | null;
  subTotal: number;
  discountAmount: number;
  taxAmount: number;
  freightAmount: number;
  grandTotal: number;
  paidAmount: number;
  paymentMode: 'Cash' | 'Bank Transfer' | 'Cheque' | 'Supplier Khata Credit';
  balanceDue: number;
  onDiscountChange: (val: number) => void;
  onTaxChange: (val: number) => void;
  onFreightChange: (val: number) => void;
  onPaidAmountChange: (val: number) => void;
  onPaymentModeChange: (mode: 'Cash' | 'Bank Transfer' | 'Cheque' | 'Supplier Khata Credit') => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  itemCount: number;
}

export const PurchasePaymentSummary: React.FC<PurchasePaymentSummaryProps> = ({
  supplier,
  subTotal,
  discountAmount,
  taxAmount,
  freightAmount,
  grandTotal,
  paidAmount,
  paymentMode,
  balanceDue,
  onDiscountChange,
  onTaxChange,
  onFreightChange,
  onPaidAmountChange,
  onPaymentModeChange,
  onSave,
  onCancel,
  isSaving,
  itemCount
}) => {
  const currentSupplierBalance = supplier ? Number(supplier.balance || 0) : 0;
  const newProjectedBalance = currentSupplierBalance + balanceDue;

  return (
    <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 sm:p-6 rounded-b-3xl shadow-lg space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Col (5 cols): Supplier Khata Ledger Box */}
        <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Supplier Khata &amp; Ledger</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400 uppercase">
              {supplier?.phone || 'No Phone'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Selected Supplier
              </span>
              <p className="font-bold text-slate-900 dark:text-white text-sm truncate mt-0.5">
                {supplier ? supplier.name : 'Walk-in / Cash Vendor'}
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Current Khata Balance
              </span>
              <p className={`font-mono font-bold text-sm mt-0.5 ${currentSupplierBalance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {formatCurrency(currentSupplierBalance)} {currentSupplierBalance > 0 ? '(Payable)' : '(Clear)'}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">Projected Balance After Bill:</span>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
              {formatCurrency(newProjectedBalance)}
            </span>
          </div>

          {balanceDue > 0 && (
            <div className="text-[11px] bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 p-2.5 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>Unpaid amount of {formatCurrency(balanceDue)} will be credited to supplier khata.</span>
            </div>
          )}
        </div>

        {/* Middle Col (3 cols): Extra Calculations (Disc, Tax, Freight) */}
        <div className="lg:col-span-3 space-y-2.5 text-xs bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Sub Total ({itemCount} Items):</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {formatCurrency(subTotal)}
            </span>
          </div>

          {/* Bill Discount */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500 font-medium flex items-center gap-1">
              <Percent className="w-3.5 h-3.5 text-purple-500" />
              <span>Bill Discount (Rs):</span>
            </span>
            <input
              type="number"
              min="0"
              value={discountAmount === 0 ? '' : discountAmount}
              onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="w-24 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-right font-mono text-xs text-purple-600 dark:text-purple-400 focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>

          {/* Extra Freight / Delivery */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500 font-medium flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-cyan-500" />
              <span>Freight / Bilty:</span>
            </span>
            <input
              type="number"
              min="0"
              value={freightAmount === 0 ? '' : freightAmount}
              onChange={(e) => onFreightChange(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="w-24 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-right font-mono text-xs text-cyan-600 dark:text-cyan-400 focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>

          {/* Tax Amount */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500 font-medium flex items-center gap-1">
              <Receipt className="w-3.5 h-3.5 text-slate-400" />
              <span>Tax / Advance WHT:</span>
            </span>
            <input
              type="number"
              min="0"
              value={taxAmount === 0 ? '' : taxAmount}
              onChange={(e) => onTaxChange(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="w-24 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-right font-mono text-xs text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-sm font-black text-slate-900 dark:text-white">
            <span>Grand Total:</span>
            <span className="font-mono text-base text-blue-600 dark:text-blue-400">
              {formatCurrency(grandTotal)}
            </span>
          </div>
        </div>

        {/* Right Col (4 cols): Payment Settlement & Actions */}
        <div className="lg:col-span-4 space-y-3 bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-200/80 dark:border-blue-900/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              Payment Settlement
            </span>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
              {balanceDue === 0 ? 'Fully Paid' : 'Credit / Partial'}
            </span>
          </div>

          {/* Paid Amount Input */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center justify-between">
              <span>Paid Amount (Rs)</span>
              <button
                type="button"
                onClick={() => onPaidAmountChange(grandTotal)}
                className="text-blue-600 dark:text-blue-400 hover:underline font-bold text-[10px] cursor-pointer"
              >
                Pay Full ({formatCurrency(grandTotal)})
              </button>
            </label>
            <input
              type="number"
              min="0"
              value={paidAmount === 0 ? '' : paidAmount}
              onChange={(e) => onPaidAmountChange(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold text-base focus:ring-2 focus:ring-emerald-500 outline-hidden text-right"
            />
          </div>

          {/* Payment Mode Dropdown */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Payment Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => onPaymentModeChange(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-hidden"
              >
                <option value="Cash">💵 Cash</option>
                <option value="Bank Transfer">🏦 Bank Transfer</option>
                <option value="Cheque">📜 Cheque</option>
                <option value="Supplier Khata Credit">📖 Khata Credit</option>
              </select>
            </div>

            <div className="text-right">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Balance Due
              </label>
              <div className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold text-xs text-rose-600 dark:text-rose-400">
                {formatCurrency(balanceDue)}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              disabled={isSaving || itemCount === 0}
              onClick={onSave}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? 'Saving Inward Bill...' : 'Save Purchase (F9)'}</span>
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
