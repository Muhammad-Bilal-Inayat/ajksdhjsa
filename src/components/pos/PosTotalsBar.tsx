import React from 'react';
import { formatCurrency } from '../../lib/utils';

export interface PosTotalsBarProps {
  paymentMethod: string;
  onPaymentMethodChange: (method: any) => void;
  customerPhone: string;
  onCustomerPhoneChange: (phone: string) => void;
  totalItems: number;
  totalQty: number;
  subtotal: number;
  discountAmount?: number;
  onDiscountChange?: (discount: number) => void;
  grandTotal: number;
  paidAmount?: number;
  onPaidAmountChange?: (paid: number) => void;
}

export const PosTotalsBar: React.FC<PosTotalsBarProps> = ({
  paymentMethod,
  onPaymentMethodChange,
  customerPhone,
  onCustomerPhoneChange,
  totalItems,
  totalQty,
  subtotal,
  discountAmount = 0,
  onDiscountChange,
  grandTotal,
  paidAmount = 0,
  onPaidAmountChange
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 mt-2">
      {/* Left: Customer & Payment Method */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Payment Mode</label>
          <select 
            value={paymentMethod}
            onChange={(e) => onPaymentMethodChange(e.target.value)}
            className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden cursor-pointer"
          >
            <option value="Cash">💵 Cash</option>
            <option value="Card">💳 Credit/Debit Card</option>
            <option value="Online">📱 EasyPaisa / JazzCash</option>
            <option value="Credit">📒 Customer Khata (Credit)</option>
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Customer Phone</label>
          <input 
            type="text" 
            value={customerPhone}
            onChange={(e) => onCustomerPhoneChange(e.target.value)}
            placeholder="0300-1234567" 
            className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden font-mono" 
          />
        </div>
      </div>

      {/* Right: Real-Time Totals Calculation */}
      <div className="flex items-center justify-end gap-5 text-right flex-wrap sm:flex-nowrap">
        <div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block">Items / Qty</span>
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{totalItems} ({totalQty})</span>
        </div>
        <div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block">Subtotal</span>
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Rs. {subtotal.toFixed(2)}</span>
        </div>
        {onDiscountChange && (
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 block">Discount</span>
            <input
              type="number"
              min="0"
              value={discountAmount === 0 ? '' : discountAmount}
              onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="w-20 px-2 py-1 text-right font-mono text-xs font-bold text-purple-600 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 outline-hidden"
            />
          </div>
        )}
        <div className="pl-4 border-l border-slate-200 dark:border-slate-700">
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase block">Grand Total</span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">Rs. {grandTotal.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
};

export default PosTotalsBar;
