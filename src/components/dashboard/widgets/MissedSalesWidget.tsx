import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertCircle, Plus, Search, ShoppingCart, TrendingDown,
  CheckCircle2, ArrowRight, Sparkles, Clock, Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { dbShortageItems } from '../../../lib/db';
import { ShortageItemRecord } from '../../../types';

interface MissedSaleItem {
  id: string;
  medicineName: string;
  genericName: string;
  inquiriesCount: number;
  estimatedPrice: number;
  lastRequested: string;
  urgency: 'high' | 'medium' | 'normal';
}

interface MissedSalesWidgetProps {
  maskValue?: (val: number | string) => string;
}

export const MissedSalesWidget: React.FC<MissedSalesWidgetProps> = ({ maskValue = (v) => `Rs ${v}` }) => {
  const navigate = useNavigate();
  const { tenantId } = useAuth();
  const [shortages, setShortages] = useState<ShortageItemRecord[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const loadData = async () => {
    try {
      const allShortages = await dbShortageItems.getAll();
      setShortages(allShortages || []);
    } catch (e) {
      console.warn('Failed to load shortages:', e);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('mbi-local-db-change', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('mbi-local-db-change', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [tenantId]);

  // Compute live missed sales items
  const items: MissedSaleItem[] = useMemo(() => {
    const list: MissedSaleItem[] = [];

    shortages.forEach(s => {
      const count = Number((s as any).inquiryCount || (s as any).count || (s as any).inquiriesCount || 1);
      const estPrice = Number(s.estimatedPrice || (s as any).price || 250);
      list.push({
        id: s.id,
        medicineName: s.medicineName || (s as any).name || 'Medicine',
        genericName: s.genericName || '',
        inquiriesCount: count,
        estimatedPrice: estPrice,
        lastRequested: (s as any).lastInquiryDate ? new Date((s as any).lastInquiryDate).toLocaleDateString() : (s as any).lastRequestedDate ? new Date((s as any).lastRequestedDate).toLocaleDateString() : 'Recent',
        urgency: count >= 10 ? 'high' : count >= 5 ? 'medium' : 'normal'
      });
    });

    list.sort((a, b) => b.inquiriesCount - a.inquiriesCount);
    return list.slice(0, 5);
  }, [shortages]);

  const totalLostRevenue = items.reduce((sum, item) => sum + (item.estimatedPrice * item.inquiriesCount), 0);
  const totalInquiries = items.reduce((sum, item) => sum + item.inquiriesCount, 0);

  const handleAddToPO = (id: string) => {
    setAddedIds(prev => new Set(prev).add(id));
    navigate('/purchases');
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Missed Sales &amp; Patient Demand</span>
                <span className="bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {items.length > 0 ? `${items.length} Out of Stock` : '0 Shortages'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Customer inquiries for unavailable items to prevent future lost sales
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/shortage-registry')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Shortage Hub</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Protection Metric Banner */}
        <div className="my-3 p-3 rounded-xl bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-orange-500/10 border border-rose-200/60 dark:border-rose-800/60 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              Estimated Lost Revenue
            </div>
            <div className="text-base font-black text-rose-600 dark:text-rose-400 font-mono mt-0.5">
              {maskValue(totalLostRevenue.toLocaleString())}
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              Total Inquiries
            </div>
            <div className="text-base font-black text-slate-900 dark:text-white font-mono mt-0.5">
              {totalInquiries}
            </div>
          </div>
        </div>

        {/* Items List or Zero State */}
        <div className="space-y-2 mt-2">
          {items.length === 0 ? (
            <div className="p-5 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-1.5 bg-slate-50/50 dark:bg-slate-800/30">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Zero Missed Sales Recorded
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                No stock shortage inquiries logged. All customer requests are in stock.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-2 hover:border-rose-200 transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {item.medicineName}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                    <span className="font-semibold text-rose-600 dark:text-rose-400">{item.inquiriesCount} customer asks</span>
                    <span>•</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">~{maskValue(item.estimatedPrice.toLocaleString())}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleAddToPO(item.id)}
                  disabled={addedIds.has(item.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-2xs ${addedIds.has(item.id)
                      ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    }`}
                >
                  {addedIds.has(item.id) ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>PO Queued</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Order</span>
                    </>
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span className="font-medium">Demand Shortage Radar:</span>
        <span className="font-bold text-slate-700 dark:text-slate-300">
          {items.length > 0 ? `${items.length} Items Demanded` : '100% In-Stock'}
        </span>
      </div>
    </div>
  );
};

export default MissedSalesWidget;
