import React from 'react';
import { 
  X, Printer, Share2, FileText, Calendar, User, Tag, 
  Layers, DollarSign, CheckCircle2, Clock, AlertCircle, 
  ExternalLink, Building2, Package
} from 'lucide-react';
import { formatDate } from '../../lib/utils';
import { Medicine } from '../../types';

export interface ItemTransactionData {
  id: string;
  type: 'Sale' | 'Purchase' | 'Adjustment' | 'Opening Stock' | 'Sale Return' | 'Purchase Return' | 'Stock Adjustment';
  name: string;
  date: string;
  quantity: number;
  pricePerUnit: number;
  totalAmount: number;
  status: 'Paid' | 'Partial' | 'Unpaid' | 'Completed' | 'Pending';
  refNumber?: string;
  notes?: string;
}

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: ItemTransactionData | null;
  medicine: Medicine | null;
  onShareWhatsApp?: (tx: ItemTransactionData) => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  isOpen,
  onClose,
  transaction,
  medicine,
  onShareWhatsApp
}) => {
  if (!isOpen || !transaction) return null;

  const isSale = transaction.type === 'Sale' || transaction.type === 'Sale Return';
  const isPurchase = transaction.type === 'Purchase' || transaction.type === 'Purchase Return';
  const isAdjustment = transaction.type === 'Adjustment' || transaction.type === 'Opening Stock' || transaction.type === 'Stock Adjustment';

  const typeBadgeColor = isSale
    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
    : isPurchase
    ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800'
    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800';

  const statusBadgeColor = transaction.status === 'Paid' || transaction.status === 'Completed'
    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
    : transaction.status === 'Partial'
    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                Voucher & Transaction Record
              </div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>{transaction.type} Details</span>
                {transaction.refNumber && (
                  <span className="text-xs font-mono font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                    {transaction.refNumber}
                  </span>
                )}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Top Status & Date Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                Transaction Type
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold border text-[11px] ${typeBadgeColor}`}>
                {transaction.type}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                Settlement Status
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold border text-[11px] ${statusBadgeColor}`}>
                {transaction.status}
              </span>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                Timestamp & Date
              </span>
              <div className="flex items-center gap-1 font-mono font-semibold text-slate-700 dark:text-slate-300 text-xs">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{formatDate(transaction.date)}</span>
              </div>
            </div>
          </div>

          {/* Party / Customer / Supplier Card */}
          <div className="p-4 bg-white dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                {isSale ? <User className="w-3.5 h-3.5 text-blue-500" /> : isPurchase ? <Building2 className="w-3.5 h-3.5 text-purple-500" /> : <Tag className="w-3.5 h-3.5 text-amber-500" />}
                {isSale ? 'Customer / Client Name' : isPurchase ? 'Supplier / Vendor Name' : 'Adjustment Note / Source'}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">
              {transaction.name || (isSale ? 'Walk-in Customer' : isPurchase ? 'Default Supplier' : 'Manual Stock Adjustment')}
            </p>
          </div>

          {/* Product Line Item Breakdown */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-blue-500" />
                Product & Batch Breakdown
              </span>
              {medicine?.category && (
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">
                  {medicine.category}
                </span>
              )}
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3.5">Item Description</th>
                    <th className="py-2.5 px-3 text-right">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3.5 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium bg-white dark:bg-slate-900">
                  <tr>
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {medicine?.name || 'Selected Inventory Item'}
                      </div>
                      {medicine?.genericName && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          {medicine.genericName}
                        </div>
                      )}
                      {medicine?.batchNumber && (
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                          Batch: {medicine.batchNumber} {medicine.expiryDate ? `• Exp: ${medicine.expiryDate.slice(0, 10)}` : ''}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                      {transaction.quantity} {medicine?.unit || 'PCS'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                      Rs {transaction.pricePerUnit.toFixed(2)}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                      Rs {transaction.totalAmount.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 text-xs font-bold">
                  <tr>
                    <td colSpan={3} className="py-2.5 px-3.5 text-right text-slate-600 dark:text-slate-400 uppercase text-[11px]">
                      Net Transaction Value:
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono text-sm text-emerald-600 dark:text-emerald-400 font-black">
                      Rs {transaction.totalAmount.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Notes / Remarks if any */}
          {transaction.notes && (
            <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-300">
              <span className="font-bold block text-[10px] uppercase tracking-wider mb-0.5">Notes / Memo:</span>
              <span>{transaction.notes}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-xs rounded-xl flex items-center gap-2 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-purple-500" />
            <span>Print Voucher</span>
          </button>

          <div className="flex items-center gap-2">
            {onShareWhatsApp && (
              <button
                type="button"
                onClick={() => onShareWhatsApp(transaction)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs transition cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share WhatsApp</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
