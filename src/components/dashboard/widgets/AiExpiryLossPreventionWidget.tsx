import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck, AlertTriangle, FileSpreadsheet, ArrowRight,
  Sparkles, CheckCircle2, RotateCcw, Clock, Building2, Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { dbMedicines } from '../../../lib/db';
import { Medicine } from '../../../types';
import { calculateDaysUntilExpiry } from '../../../lib/fefoEngine';

interface LossPreventionItem {
  id: string;
  medicineName: string;
  batchNumber: string;
  supplier: string;
  daysRemaining: number;
  stockQty: number;
  claimableValue: number;
  status: 'claimable' | 'urgent_push' | 'returned';
}

interface AiExpiryLossPreventionWidgetProps {
  maskValue?: (val: number | string) => string;
}

export const AiExpiryLossPreventionWidget: React.FC<AiExpiryLossPreventionWidgetProps> = ({ maskValue = (v) => `Rs ${v}` }) => {
  const navigate = useNavigate();
  const { tenantId } = useAuth();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [createdDebitIds, setCreatedDebitIds] = useState<Set<string>>(new Set());

  const loadData = async () => {
    try {
      const allMeds = await dbMedicines.getAll();
      setMedicines(allMeds || []);
    } catch (e) {
      console.warn('Failed to load medicines for expiry loss widget:', e);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('mbi-local-db-change', handleUpdate);
    window.addEventListener('mbi-stock-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('mbi-local-db-change', handleUpdate);
      window.removeEventListener('mbi-stock-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [tenantId]);

  // Compute live items near expiry (under 90 days)
  const items: LossPreventionItem[] = useMemo(() => {
    const nearExpiryList: LossPreventionItem[] = [];

    medicines.forEach(m => {
      const qty = Number(m.quantity || 0);
      if (qty <= 0) return;

      const expiryStr = m.expiryDate || (m.batches && m.batches[0]?.expiryDate);
      if (!expiryStr) return;

      const days = calculateDaysUntilExpiry(expiryStr);
      if (days <= 90) {
        const rate = Number(m.purchasePrice || (m as any).costPrice || m.sellingPrice || 0);
        nearExpiryList.push({
          id: m.id,
          medicineName: m.name,
          batchNumber: m.batchNumber || (m.batches && m.batches[0]?.batchNumber) || 'B-BATCH',
          supplier: (m as any).supplier || (m as any).company || 'Registered Distributor',
          daysRemaining: days,
          stockQty: qty,
          claimableValue: qty * rate,
          status: days <= 30 ? 'claimable' : 'urgent_push'
        });
      }
    });

    nearExpiryList.sort((a, b) => a.daysRemaining - b.daysRemaining);
    return nearExpiryList.slice(0, 5);
  }, [medicines]);

  const totalProtectedValue = items.reduce((sum, item) => sum + item.claimableValue, 0);

  const handleCreateDebitNote = (id: string) => {
    setCreatedDebitIds(prev => new Set(prev).add(id));
    navigate('/purchase/return');
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>AI Expiry Loss Prevention</span>
                <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {items.length > 0 ? `${items.length} Near Expiry` : '100% Safe'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Auto-tracks distributor debit returns before medicines cross window
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/purchase/return')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Debit Returns</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Protection Metric Banner */}
        <div className="my-3 p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              Protected Stock Capital
            </div>
            <div className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
              {maskValue(totalProtectedValue.toLocaleString())}
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/80 px-2.5 py-1 rounded-lg">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>FEFO Active</span>
          </div>
        </div>

        {/* Items List or Zero State */}
        <div className="space-y-2 mt-2">
          {items.length === 0 ? (
            <div className="p-5 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-1.5 bg-slate-50/50 dark:bg-slate-800/30">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Zero Expiry Risk Detected
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                No items near expiration return deadline. All medicine inventory is safe and fresh.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-2 hover:border-emerald-200 transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {item.medicineName}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{maskValue(item.claimableValue.toLocaleString())}</span>
                    <span>•</span>
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">{item.daysRemaining} days left</span>
                    <span>•</span>
                    <span className="text-slate-400">Qty: {item.stockQty}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCreateDebitNote(item.id)}
                  disabled={createdDebitIds.has(item.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-2xs ${createdDebitIds.has(item.id)
                      ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed'
                      : 'bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                    }`}
                >
                  {createdDebitIds.has(item.id) ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Returned</span>
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Debit Note</span>
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
        <span className="font-medium">Near-Expiry Return Window:</span>
        <span className="font-bold text-slate-700 dark:text-slate-300">
          {items.length > 0 ? `${items.length} Products Monitored` : 'Zero Risk'}
        </span>
      </div>
    </div>
  );
};

export default AiExpiryLossPreventionWidget;
