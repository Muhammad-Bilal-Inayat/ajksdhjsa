import React, { useState, useEffect } from 'react';
import { 
  X, Settings, Check, RotateCcw, Sliders, Eye, EyeOff, 
  Sparkles, Layers, ShieldCheck, CheckCircle2 
} from 'lucide-react';
import { InvoiceColumnConfig, DEFAULT_INVOICE_COLUMN_CONFIG } from '../../types/invoice';

interface InvoiceColumnSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  storageKey?: string;
  config: InvoiceColumnConfig;
  onChange: (updated: InvoiceColumnConfig) => void;
  title?: string;
}

export const InvoiceColumnSettingsModal: React.FC<InvoiceColumnSettingsModalProps> = ({
  isOpen,
  onClose,
  storageKey = 'mbi_invoice_columns_config',
  config,
  onChange,
  title = 'Table Column Customization Switchboard'
}) => {
  const [localConfig, setLocalConfig] = useState<InvoiceColumnConfig>(config);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleToggle = (key: keyof InvoiceColumnConfig) => {
    const updated: InvoiceColumnConfig = {
      ...localConfig,
      [key]: !localConfig[key]
    };
    setLocalConfig(updated);
    onChange(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {}
    showToast(`Updated column setting`);
  };

  const handleResetDefaults = () => {
    setLocalConfig(DEFAULT_INVOICE_COLUMN_CONFIG);
    onChange(DEFAULT_INVOICE_COLUMN_CONFIG);
    try {
      localStorage.setItem(storageKey, JSON.stringify(DEFAULT_INVOICE_COLUMN_CONFIG));
    } catch {}
    showToast('Reset columns to default layout');
  };

  const columnDefinitions: {
    key: keyof InvoiceColumnConfig;
    label: string;
    description: string;
    urdu: string;
    isEssential?: boolean;
  }[] = [
    {
      key: 'showHsn',
      label: 'HSN / SAC Code',
      description: 'Tax classification code for drugs and items',
      urdu: 'ایچ ایس این ٹیکس کوڈ'
    },
    {
      key: 'showBatch',
      label: 'Batch Number',
      description: 'Batch and lot tracking identifier',
      urdu: 'بیچ نمبر',
      isEssential: true
    },
    {
      key: 'showExpiry',
      label: 'Expiry Date (MM/YYYY)',
      description: 'Expiry date with auto-FEFO quarantine radar',
      urdu: 'تاریخ تنسیخ / ایکسپائری',
      isEssential: true
    },
    {
      key: 'showMrp',
      label: 'MRP (Max Retail Price)',
      description: 'Maximum printed retail price on pack',
      urdu: 'ایم آر پی پرنٹ ریٹ'
    },
    {
      key: 'showFreeQuantity',
      label: 'Free Qty (Bonus / Scheme)',
      description: 'Distributor bonus and scheme free units',
      urdu: 'فری بونس مقدار'
    },
    {
      key: 'showDiscount',
      label: 'Discount % (Trade Discount)',
      description: 'Item-wise trade discount percentage & value',
      urdu: 'ڈسکاؤنٹ فیصد'
    },
    {
      key: 'showUnit',
      label: 'Unit / Packaging (Box, Strip, Vial)',
      description: 'Packaging unit type selector',
      urdu: 'یونٹ پیکنگ'
    },
    {
      key: 'showUnitPrice',
      label: 'Price / Unit (Trade Rate)',
      description: 'Unit cost or selling rate per packaging unit',
      urdu: 'قیمت فی یونٹ',
      isEssential: true
    },
    {
      key: 'showTaxGst',
      label: 'Tax / GST % (Sales / Withholding)',
      description: 'Advance income tax, sales tax or withholding %',
      urdu: 'سیلز ٹیکس / ودہولڈنگ فیصد'
    },
    {
      key: 'showPoNumber',
      label: 'P.O. Number & Date',
      description: 'Purchase order reference and PO date in header',
      urdu: 'پی او نمبر اور تاریخ'
    },
    {
      key: 'showPaymentTerms',
      label: 'Payment Terms & Due Date',
      description: 'Credit payment terms (Due on Receipt, Net 15, Net 30)',
      urdu: 'شرائط ادائیگی اور آخری تاریخ'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-800 dark:text-slate-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  {title}
                </h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Dynamic Grid
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Toggle columns ON/OFF. Grid adjusts automatically with persistent layout.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast Notification */}
        {toastMsg && (
          <div className="px-5 py-2 bg-emerald-500 text-white text-xs font-bold flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>{toastMsg}</span>
            </div>
          </div>
        )}

        {/* Column Toggles List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Available Grid Columns & Controls
            </span>
            <button
              onClick={handleResetDefaults}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All to Defaults
            </button>
          </div>

          {columnDefinitions.map((col) => {
            const isEnabled = localConfig[col.key] !== false;

            return (
              <div
                key={col.key}
                onClick={() => handleToggle(col.key)}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                  isEnabled
                    ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60 shadow-2xs'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-75'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 pr-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    isEnabled 
                      ? 'bg-blue-600 text-white shadow-2xs' 
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                  }`}>
                    {isEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {col.label}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400">
                        {col.urdu}
                      </span>
                      {col.isEssential && (
                        <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {col.description}
                    </p>
                  </div>
                </div>

                {/* Switch Toggle */}
                <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 ${
                  isEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}>
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    isEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Changes take effect in real-time</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
          >
            Done & Apply
          </button>
        </div>
      </div>
    </div>
  );
};
