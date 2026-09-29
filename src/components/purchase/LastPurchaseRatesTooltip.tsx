import React from 'react';
import { History, TrendingUp, Calendar, Building2, Tag } from 'lucide-react';
import { Medicine } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';

export interface PurchaseRateHistoryItem {
  id?: string;
  date: string;
  supplierName: string;
  purchasePrice: number;
  mrp?: number;
  discountPercent?: number;
  batchNumber?: string;
}

interface LastPurchaseRatesTooltipProps {
  isOpen: boolean;
  medicine: Medicine | null;
  history?: PurchaseRateHistoryItem[];
  currentPrice?: number;
}

export const LastPurchaseRatesTooltip: React.FC<LastPurchaseRatesTooltipProps> = ({
  isOpen,
  medicine,
  history = [],
  currentPrice
}) => {
  if (!isOpen || !medicine) return null;

  // Build rate history from medicine's batches or passed history
  const rateList: PurchaseRateHistoryItem[] = React.useMemo(() => {
    if (history && history.length > 0) {
      return history.slice(0, 5);
    }

    const list: PurchaseRateHistoryItem[] = [];

    // Check medicine batches
    if (Array.isArray(medicine.batches) && medicine.batches.length > 0) {
      medicine.batches.forEach((b: any) => {
        if (b.purchasePrice) {
          list.push({
            date: b.createdAt || b.expiryDate || new Date().toISOString().slice(0, 10),
            supplierName: b.supplierName || medicine.supplierName || 'Primary Supplier',
            purchasePrice: Number(b.purchasePrice || 0),
            mrp: Number(b.mrp || b.sellingPrice || medicine.mrp || medicine.sellingPrice || medicine.salePrice || 0),
            discountPercent: Number(b.discountPercent || 0),
            batchNumber: b.batchNumber
          });
        }
      });
    }

    // If no batches, show current medicine purchase price
    if (list.length === 0 && (medicine.purchasePrice || medicine.latestPurchasePrice)) {
      list.push({
        date: medicine.latestPurchaseDate || new Date().toISOString().slice(0, 10),
        supplierName: medicine.supplierName || 'Current Master',
        purchasePrice: Number(medicine.purchasePrice || medicine.latestPurchasePrice || 0),
        mrp: Number(medicine.mrp || medicine.sellingPrice || medicine.salePrice || 0),
        discountPercent: 0,
        batchNumber: medicine.batchNumber || 'MAIN'
      });
    }

    return list.slice(0, 5);
  }, [medicine, history]);

  return (
    <div 
      className="absolute bottom-full left-0 mb-2 z-[9999] w-72 sm:w-80 bg-slate-900/95 text-white rounded-2xl p-3.5 shadow-2xl border border-slate-700/80 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 pointer-events-none select-none"
      style={{ filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.35))' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-blue-400">
          <History className="w-3.5 h-3.5" />
          <span>Last 5 Purchase Rates</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
          {medicine.name}
        </span>
      </div>

      {/* Rates Table / List */}
      <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
        {rateList.length === 0 ? (
          <div className="text-center py-2 text-[11px] text-slate-400">
            No previous purchase rate history found.
          </div>
        ) : (
          rateList.map((item, idx) => {
            const isLatest = idx === 0;
            return (
              <div 
                key={idx}
                className={`p-2 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                  isLatest 
                    ? 'bg-blue-950/40 border-blue-800/80 text-blue-200' 
                    : 'bg-slate-800/50 border-slate-800 text-slate-300'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-200 truncate">
                    <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{item.supplierName}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>{formatDate(item.date)}</span>
                    {item.batchNumber && <span>• B: {item.batchNumber}</span>}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-mono font-bold text-white text-xs">
                    {formatCurrency(item.purchasePrice)}
                  </div>
                  {item.mrp && item.mrp > 0 ? (
                    <div className="text-[10px] text-emerald-400 font-medium">
                      MRP: {formatCurrency(item.mrp)}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <Tag className="w-3 h-3 text-blue-400" />
          <span>Active MRP: {formatCurrency(medicine.salePrice || 0)}</span>
        </span>
        <span className="text-slate-500 font-mono">Press Tab to Disc</span>
      </div>

      {/* Downward pointing triangle arrow */}
      <div className="absolute top-full left-6 -mt-px w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900" />
    </div>
  );
};
