import React, { useState } from 'react';
import { 
  X, Settings, SlidersHorizontal, Layers, Hash, 
  Check, CheckCircle2, RotateCcw, ShieldCheck,
  Eye, Clock, Calculator
} from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';

export interface PurchaseColumnSettings {
  hsnSac: boolean;
  batchNo: boolean;
  expDate: boolean;
  mfgDate: boolean;
  mrp: boolean;
  freeQty: boolean;
  discount: boolean;
  unit: boolean;
  taxPercent: boolean;
  poNumber: boolean;
  poDate: boolean;
  paymentTerms: boolean;
  dueDate: boolean;
  supplierPhone: boolean;
  billingName: boolean;
  customFields: boolean;
}

export const DEFAULT_PURCHASE_COLUMNS: PurchaseColumnSettings = {
  hsnSac: true,
  batchNo: true,
  expDate: true,
  mfgDate: false,
  mrp: true,
  freeQty: true,
  discount: true,
  unit: true,
  taxPercent: true,
  poNumber: true,
  poDate: true,
  paymentTerms: true,
  dueDate: true,
  supplierPhone: true,
  billingName: true,
  customFields: true
};

interface PurchaseColumnSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  columnSettings?: PurchaseColumnSettings;
  onUpdateColumnSettings?: (settings: PurchaseColumnSettings) => void;
}

export const PurchaseColumnSettingsModal: React.FC<PurchaseColumnSettingsModalProps> = ({
  isOpen,
  onClose,
  columnSettings,
  onUpdateColumnSettings
}) => {
  const { settings, updatePrintSettings, updateTransactionSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<'COLUMNS' | 'HEADER_FIELDS'>('COLUMNS');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Local state initialized with props or localStorage or defaults
  const [localSettings, setLocalSettings] = useState<PurchaseColumnSettings>(() => {
    if (columnSettings) return columnSettings;
    try {
      const saved = localStorage.getItem('mbi_purchase_column_settings');
      if (saved) return { ...DEFAULT_PURCHASE_COLUMNS, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return DEFAULT_PURCHASE_COLUMNS;
  });

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleToggle = (key: keyof PurchaseColumnSettings) => {
    const updated = {
      ...localSettings,
      [key]: !localSettings[key]
    };
    setLocalSettings(updated);
    try {
      localStorage.setItem('mbi_purchase_column_settings', JSON.stringify(updated));
    } catch {
      // ignore
    }

    if (onUpdateColumnSettings) {
      onUpdateColumnSettings(updated);
    }

    // Also sync to global print/transaction settings
    if (key === 'hsnSac' || key === 'batchNo' || key === 'expDate' || key === 'mfgDate' || key === 'mrp' || key === 'discount' || key === 'unit' || key === 'taxPercent') {
      updatePrintSettings({
        tableColumns: {
          ...settings.print.tableColumns,
          [key]: updated[key]
        }
      });
    }

    showToast(`Updated ${key} visibility`);
  };

  const handleReset = () => {
    setLocalSettings(DEFAULT_PURCHASE_COLUMNS);
    try {
      localStorage.setItem('mbi_purchase_column_settings', JSON.stringify(DEFAULT_PURCHASE_COLUMNS));
    } catch {
      // ignore
    }
    if (onUpdateColumnSettings) {
      onUpdateColumnSettings(DEFAULT_PURCHASE_COLUMNS);
    }
    showToast('Reset to default purchase columns');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in">
      {/* Modal Card Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-800 dark:text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Purchase Grid & Inward Settings
                </h2>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full font-semibold">
                  Live Customization
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Toggle table columns, HSN/SAC, Free Qty, Discount %, and header fields
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast Alert */}
        {toastMsg && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between animate-in slide-in-from-top-1 shrink-0">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-100" />
              {toastMsg}
            </span>
          </div>
        )}

        {/* Tabs Navigation */}
        <div className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 pt-2 select-none shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('COLUMNS')}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                activeTab === 'COLUMNS'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-blue-600 shadow-xs'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Grid Columns (12-Col)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('HEADER_FIELDS')}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                activeTab === 'HEADER_FIELDS'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-blue-600 shadow-xs'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Header & Supplier Fields</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
            title="Reset to defaults"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {activeTab === 'COLUMNS' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium pb-1 border-b border-slate-100 dark:border-slate-800">
                Configure visible columns inside the Inward Purchase 12-Column Table.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { key: 'hsnSac', label: 'HSN / SAC Code', desc: 'Tax classification code' },
                  { key: 'batchNo', label: 'Batch Number', desc: 'Medicine batch identifier' },
                  { key: 'expDate', label: 'Expiry Date', desc: 'Expiration MM/YY or date' },
                  { key: 'mrp', label: 'MRP (Printed Max Retail)', desc: 'Max retail price on box' },
                  { key: 'freeQty', label: 'Free Qty (Bonus Units)', desc: '10 + 1 Free bonus scheme' },
                  { key: 'discount', label: 'Trade Discount (%)', desc: 'Supplier item discount rate' },
                  { key: 'taxPercent', label: 'Tax / GST (%)', desc: 'Purchase GST tax rate' },
                  { key: 'unit', label: 'Unit (Box, Pack, Strip)', desc: 'Measurement packaging unit' },
                  { key: 'mfgDate', label: 'Mfg Date', desc: 'Manufacturing date' }
                ].map((col) => {
                  const isChecked = localSettings[col.key as keyof PurchaseColumnSettings];
                  return (
                    <div
                      key={col.key}
                      onClick={() => handleToggle(col.key as keyof PurchaseColumnSettings)}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl hover:bg-blue-50/50 dark:hover:bg-slate-800 transition cursor-pointer select-none"
                    >
                      <div className="pr-2">
                        <div className="text-xs font-bold text-slate-900 dark:text-white">{col.label}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{col.desc}</div>
                      </div>
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                        isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-transparent'
                      }`}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'HEADER_FIELDS' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium pb-1 border-b border-slate-100 dark:border-slate-800">
                Configure input fields shown in the top supplier details panel.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { key: 'poNumber', label: 'P.O. Number', desc: 'Purchase order reference #' },
                  { key: 'poDate', label: 'P.O. Date', desc: 'Purchase order issuance date' },
                  { key: 'paymentTerms', label: 'Payment Terms', desc: 'Due on Receipt, Net 15, Net 30' },
                  { key: 'dueDate', label: 'Due Date', desc: 'Supplier credit maturity date' },
                  { key: 'supplierPhone', label: 'Supplier Phone Number', desc: 'Vendor contact phone' },
                  { key: 'billingName', label: 'Billing / Agency Name', desc: 'Distributor entity name' },
                  { key: 'customFields', label: 'Custom Fields (Bilty/Gate Pass)', desc: 'Bilty #, Gate Pass, Vehicle #' }
                ].map((field) => {
                  const isChecked = localSettings[field.key as keyof PurchaseColumnSettings];
                  return (
                    <div
                      key={field.key}
                      onClick={() => handleToggle(field.key as keyof PurchaseColumnSettings)}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl hover:bg-blue-50/50 dark:hover:bg-slate-800 transition cursor-pointer select-none"
                    >
                      <div className="pr-2">
                        <div className="text-xs font-bold text-slate-900 dark:text-white">{field.label}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{field.desc}</div>
                      </div>
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                        isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-transparent'
                      }`}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Settings apply immediately to active and future purchase tabs.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
