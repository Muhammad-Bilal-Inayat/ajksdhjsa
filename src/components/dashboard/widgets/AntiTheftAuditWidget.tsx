import React from 'react';
import { 
  ShieldAlert, Lock, AlertTriangle, Eye, UserCheck, 
  RotateCcw, History, ArrowRight, CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AuditActivity {
  id: string;
  type: 'void_bill' | 'line_item_delete' | 'drawer_variance' | 'price_override';
  description: string;
  cashier: string;
  time: string;
  amount?: number;
  severity: 'low' | 'medium' | 'high';
}

const SAMPLE_AUDIT_LOGS: AuditActivity[] = [
  {
    id: 'aud-1',
    type: 'void_bill',
    description: 'Invoice #1094 cancelled after thermal receipt print',
    cashier: 'Bilal (Counter 1)',
    time: '18 mins ago',
    amount: 1450,
    severity: 'high'
  },
  {
    id: 'aud-2',
    type: 'line_item_delete',
    description: 'Deleted 2x Ciproxin 500mg from active cart',
    cashier: 'Hamza (Counter 2)',
    time: '45 mins ago',
    amount: 980,
    severity: 'medium'
  },
  {
    id: 'aud-3',
    type: 'drawer_variance',
    description: 'Drawer Closing handover: Exact Rs 0 variance',
    cashier: 'Shift A Handover',
    time: '2 hours ago',
    severity: 'low'
  }
];

interface AntiTheftAuditWidgetProps {
  maskValue?: (val: number | string) => string;
}

export const AntiTheftAuditWidget: React.FC<AntiTheftAuditWidgetProps> = ({ maskValue = (v) => `Rs ${v}` }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Anti-Theft Void & Audit Radar</span>
                <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  Active
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Immutable audit trail of bill cancellations, price edits, and shift variances
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/sync-share')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Full Logs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Security Status Indicators */}
        <div className="grid grid-cols-3 gap-2 my-3">
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center">
            <span className="text-[10px] text-slate-500 block">Void Invoices</span>
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">1 Today</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center">
            <span className="text-[10px] text-slate-500 block">Cart Deletions</span>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">3 Items</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center">
            <span className="text-[10px] text-slate-500 block">Drawer Integrity</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">100% Match</span>
          </div>
        </div>

        {/* Activity Logs */}
        <div className="space-y-2">
          {SAMPLE_AUDIT_LOGS.map((log) => (
            <div 
              key={log.id}
              className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {log.description}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{log.cashier}</span>
                  <span>•</span>
                  <span>{log.time}</span>
                  {log.amount && (
                    <>
                      <span>•</span>
                      <span className="font-mono font-bold text-rose-600">{maskValue(log.amount)}</span>
                    </>
                  )}
                </div>
              </div>

              <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                log.severity === 'high'
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  : log.severity === 'medium'
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              }`}>
                {log.severity === 'high' ? 'Review' : log.severity === 'medium' ? 'Warning' : 'Verified'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
          <Lock className="w-3.5 h-3.5 text-blue-500" />
          173 RBAC Permission Switches Enabled
        </span>
        <button
          onClick={() => navigate('/reports?report=master_user_activity_audit_export')}
          className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
        >
          Audit History
        </button>
      </div>
    </div>
  );
};

export default AntiTheftAuditWidget;
