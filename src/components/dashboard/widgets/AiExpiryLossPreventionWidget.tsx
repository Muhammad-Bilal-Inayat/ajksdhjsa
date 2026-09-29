import React, { useState } from 'react';
import { 
  ShieldCheck, AlertTriangle, FileSpreadsheet, ArrowRight, 
  Sparkles, CheckCircle2, RotateCcw, Clock, Building2, Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

const SAMPLE_EXPIRY_LOSS_PREVENTION: LossPreventionItem[] = [
  {
    id: 'elp-1',
    medicineName: 'Cravit 500mg IV Infusion',
    batchNumber: 'B-7729',
    supplier: 'Sami Pharma Distribution',
    daysRemaining: 18,
    stockQty: 24,
    claimableValue: 18400,
    status: 'claimable'
  },
  {
    id: 'elp-2',
    medicineName: 'Risek 40mg Injection',
    batchNumber: 'RS-9011',
    supplier: 'Getz Pharma Distributor',
    daysRemaining: 26,
    stockQty: 40,
    claimableValue: 16800,
    status: 'claimable'
  },
  {
    id: 'elp-3',
    medicineName: 'Loprin 75mg Tablet Strip',
    batchNumber: 'LP-3321',
    supplier: 'Highnoon Laboratories',
    daysRemaining: 44,
    stockQty: 110,
    claimableValue: 7700,
    status: 'urgent_push'
  }
];

interface AiExpiryLossPreventionWidgetProps {
  maskValue?: (val: number | string) => string;
}

export const AiExpiryLossPreventionWidget: React.FC<AiExpiryLossPreventionWidgetProps> = ({ maskValue = (v) => `Rs ${v}` }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<LossPreventionItem[]>(SAMPLE_EXPIRY_LOSS_PREVENTION);
  const [createdDebitIds, setCreatedDebitIds] = useState<Set<string>>(new Set());

  const totalProtectedValue = items.reduce((sum, item) => sum + item.claimableValue, 0);

  const handleCreateDebitNote = (id: string) => {
    setCreatedDebitIds(prev => new Set(prev).add(id));
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
                  99.8% Zero Loss
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Auto-generates distributor debit notes before medicine crosses return window
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/credit-notes')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Debit Returns</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Protection Metric Banner */}
        <div className="my-3 p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Claimable Expiry Credit Recoverable
            </span>
            <span className="text-base font-black font-mono text-emerald-700 dark:text-emerald-300">
              {maskValue(totalProtectedValue.toLocaleString())}
            </span>
          </div>
          <span className="bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-700 text-xs font-bold text-emerald-700 dark:text-emerald-300 shadow-2xs">
            100% Refundable
          </span>
        </div>

        {/* Action List */}
        <div className="space-y-2">
          {items.map((item) => {
            const isDebitCreated = createdDebitIds.has(item.id);
            return (
              <div 
                key={item.id}
                className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {item.medicineName}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                      {item.batchNumber}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>{item.supplier}</span>
                    <span>•</span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">{item.daysRemaining} days left</span>
                    <span>•</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{maskValue(item.claimableValue.toLocaleString())}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCreateDebitNote(item.id)}
                  disabled={isDebitCreated}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shrink-0 cursor-pointer shadow-2xs ${
                    isDebitCreated
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {isDebitCreated ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Note Created</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Return Claim</span>
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
        <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
          <Clock className="w-3.5 h-3.5" />
          Distributor 30-day debit window active
        </span>
        <button
          onClick={() => navigate('/credit-notes')}
          className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
        >
          View Supplier Ledger Returns
        </button>
      </div>
    </div>
  );
};

export default AiExpiryLossPreventionWidget;
