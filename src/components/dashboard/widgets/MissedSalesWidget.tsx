import React, { useState } from 'react';
import { 
  AlertCircle, Plus, Search, ShoppingCart, TrendingDown, 
  CheckCircle2, ArrowRight, Sparkles, Clock, Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MissedSaleItem {
  id: string;
  medicineName: string;
  genericName: string;
  inquiriesCount: number;
  estimatedPrice: number;
  lastRequested: string;
  urgency: 'high' | 'medium' | 'normal';
}

const SAMPLE_MISSED_SALES: MissedSaleItem[] = [
  {
    id: 'ms-1',
    medicineName: 'Augmentin 625mg Tab',
    genericName: 'Co-Amoxiclav',
    inquiriesCount: 14,
    estimatedPrice: 420,
    lastRequested: '15 mins ago',
    urgency: 'high'
  },
  {
    id: 'ms-2',
    medicineName: 'Panadol CF Syrup',
    genericName: 'Paracetamol / Pseudoephedrine',
    inquiriesCount: 9,
    estimatedPrice: 160,
    lastRequested: '1 hour ago',
    urgency: 'high'
  },
  {
    id: 'ms-3',
    medicineName: 'Nexum 40mg Cap',
    genericName: 'Esomeprazole',
    inquiriesCount: 7,
    estimatedPrice: 380,
    lastRequested: '3 hours ago',
    urgency: 'medium'
  },
  {
    id: 'ms-4',
    medicineName: 'Glucophage 500mg',
    genericName: 'Metformin HCl',
    inquiriesCount: 6,
    estimatedPrice: 195,
    lastRequested: 'Today 11:30 AM',
    urgency: 'normal'
  }
];

interface MissedSalesWidgetProps {
  maskValue?: (val: number | string) => string;
}

export const MissedSalesWidget: React.FC<MissedSalesWidgetProps> = ({ maskValue = (v) => `Rs ${v}` }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<MissedSaleItem[]>(SAMPLE_MISSED_SALES);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const totalLostRevenue = items.reduce((sum, item) => sum + (item.estimatedPrice * item.inquiriesCount), 0);
  const totalInquiries = items.reduce((sum, item) => sum + item.inquiriesCount, 0);

  const handleAddToPO = (id: string, name: string) => {
    setAddedIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      // Navigate to purchase orders or show success feedback
    }, 400);
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
                <span>Missed Sales & Patient Demand</span>
                <span className="bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {items.length} Out of Stock
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
            <span>PO Shortage Book</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Summary Strip */}
        <div className="grid grid-cols-2 gap-2 my-3">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block">Estimated Lost Revenue</span>
            <span className="text-sm font-black text-rose-600 dark:text-rose-400 font-mono">
              {maskValue(totalLostRevenue.toLocaleString())}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block">Total Inquiries Today</span>
            <span className="text-sm font-black text-slate-800 dark:text-slate-200 font-mono">
              {totalInquiries} Patients
            </span>
          </div>
        </div>

        {/* List of Inquiries */}
        <div className="space-y-2">
          {items.map((item) => {
            const isAdded = addedIds.has(item.id);
            return (
              <div 
                key={item.id}
                className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-between gap-2 transition-all"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {item.medicineName}
                    </span>
                    {item.urgency === 'high' && (
                      <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded">
                        High Demand
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>{item.genericName}</span>
                    <span>•</span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">{item.inquiriesCount} requests</span>
                    <span>•</span>
                    <span className="text-[10px]">{item.lastRequested}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleAddToPO(item.id, item.medicineName)}
                  disabled={isAdded}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shrink-0 cursor-pointer ${
                    isAdded
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                  }`}
                >
                  {isAdded ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Added to PO</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add to PO</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          Auto-synced with POS Shortage search bar
        </span>
        <button
          onClick={() => navigate('/purchase/order')}
          className="font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 hover:underline cursor-pointer"
        >
          Create Vendor Order
        </button>
      </div>
    </div>
  );
};

export default MissedSalesWidget;
