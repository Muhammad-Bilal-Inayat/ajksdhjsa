import React from 'react';
import { X, ShieldCheck, FileText, Lock, Cloud, Pill, CheckCircle2, Award } from 'lucide-react';

export interface TermsConditionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsConditionsModal: React.FC<TermsConditionsModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden max-h-[90vh] text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Terms of Service &amp; Pharmacy SLA
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                MBI INVENTRA • Commercial License Agreement
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CLAUSES BODY */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          
          {/* Clause 1 */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
              <Award className="w-4 h-4 text-blue-600" />
              <span>1. Software License &amp; Usage</span>
            </div>
            <p>
              MBI INVENTRA grants the registering pharmacy a non-exclusive, non-transferable commercial license for authorized retail and wholesale pharmaceutical management operations. The license is cryptographically bound to the designated pharmacy enterprise.
            </p>
          </div>

          {/* Clause 2 */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>2. Data Privacy &amp; 100% Ownership</span>
            </div>
            <p>
              All customer profiles, purchase orders, sales vouchers, patient records, and doctor prescription logs belong <strong>solely and exclusively</strong> to the Pharmacy Owner. We implement strict multi-tenant database isolation. Your confidential trade data is never shared, aggregated, or sold to third parties.
            </p>
          </div>

          {/* Clause 3 */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
              <Cloud className="w-4 h-4 text-indigo-600" />
              <span>3. Cloud Sync &amp; Offline Continuity</span>
            </div>
            <p>
              The system features a dual storage engine: local IndexedDB/MariaDB ensures 100% uninterrupted 0.2s billing even without internet, while automatic cloud synchronization creates encrypted disaster recovery snapshots every 24 hours.
            </p>
          </div>

          {/* Clause 4 */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
              <Pill className="w-4 h-4 text-rose-600" />
              <span>4. Drug &amp; Prescription Compliance</span>
            </div>
            <p>
              The operating pharmacy is responsible for adhering to local regulatory standards (including Drug Regulatory Authority of Pakistan DRAP/FDA guidelines, Schedule D narcotics registers, expiry FEFO management, and registered pharmacist supervision).
            </p>
          </div>

          {/* Clause 5 */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>5. Root Primary Owner Immunity</span>
            </div>
            <p>
              The primary account owner retains permanent administrative ownership. Sub-user cashiers, pharmacists, and managers are strictly governed by customizable role permissions (RBAC) and cannot modify root ownership credentials.
            </p>
          </div>

        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Standard Pharmacy SLA Agreement</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/25 cursor-pointer transition-all active:scale-98"
          >
            I Understand &amp; Agree
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsConditionsModal;
