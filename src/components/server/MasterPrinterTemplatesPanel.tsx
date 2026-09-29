import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, Lock, ShieldCheck, CheckCircle2, Sparkles, RefreshCw, 
  FileText, Sliders, Smartphone, Check, Eye, AlertCircle, Copy, 
  Settings2, Download, Save, Layers, HelpCircle, Receipt
} from 'lucide-react';
import { printHtmlElement } from '../../lib/invoiceExport';

export interface MasterPrintConfig {
  thermalBrandName: string;
  thermalSubtitle: string;
  thermalPhones: string;
  thermalCountry: string;
  thermalCashierDefault: string;
  thermalFooterTitle: string;
  thermalFooterContact: string;
  thermalFooterWebsite: string;
  thermalCompactFooter: boolean;
  thermalDefaultTheme: 'THERMAL_MBI_STANDARD' | 'THERMAL_CLASSIC' | 'THERMAL_PHARMA' | 'THERMAL_MINIMAL';
  thermalPaperWidth: '80mm' | '58mm';
  
  // A4 Printer Settings
  a4DefaultTheme: 'A4_PHARMA_WHOLESALE' | 'A4_CLASSIC_TAX' | 'A4_CORPORATE_BOXED' | 'A4_COMPACT_PROFESSIONAL' | 'A4_MODERN_MINIMAL';
  a4HeaderTitle: string;
  a4DrugWarrantyText: string;
  a4ShowDrugWarranty: boolean;
  a4ShowBankDetails: boolean;
  a4BankDetailsText: string;
  a4ShowQrCode: boolean;
  
  // Master Governance Lock
  isClientEditingLocked: boolean;
  lockReason: string;
  lastUpdated: string;
}

export const DEFAULT_MASTER_PRINT_CONFIG: MasterPrintConfig = {
  thermalBrandName: 'MBI INVENTRA',
  thermalSubtitle: 'PHARMACY POS & ERP',
  thermalPhones: '03364585863 • 03281302636',
  thermalCountry: 'Pakistan',
  thermalCashierDefault: 'Bilal Inayat',
  thermalFooterTitle: 'THANK YOU FOR SHOPPING!',
  thermalFooterContact: 'Contact us : 03281302636',
  thermalFooterWebsite: 'Pharmacy POS & ERP    www.mbiinventra.com',
  thermalCompactFooter: true,
  thermalDefaultTheme: 'THERMAL_MBI_STANDARD',
  thermalPaperWidth: '80mm',
  
  a4DefaultTheme: 'A4_PHARMA_WHOLESALE',
  a4HeaderTitle: 'TAX & DRUG WARRANTY INVOICE',
  a4DrugWarrantyText: 'FORM 2-A: (Under Section 23 of Drug Act 1976). We hereby warrant that medicines sold do not contravene any section of Drug Act 1976.',
  a4ShowDrugWarranty: true,
  a4ShowBankDetails: true,
  a4BankDetailsText: 'Bank: Meezan Bank Ltd\nAccount: 0102-0105829102\nTitle: MBI INVENTRA PHARMA\nIBAN: PK64MEZN0001020105829102',
  a4ShowQrCode: true,
  
  isClientEditingLocked: true,
  lockReason: 'Protected by Master Server. Official branding & receipt layout is centrally managed.',
  lastUpdated: new Date().toISOString()
};

const MASTER_PRINT_STORAGE_KEY = 'mbi_master_print_config_v2';

export const getMasterPrintConfig = (): MasterPrintConfig => {
  try {
    const saved = localStorage.getItem(MASTER_PRINT_STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_MASTER_PRINT_CONFIG, ...JSON.parse(saved) };
    }
  } catch (err) {
    console.error('Failed to load master print config:', err);
  }
  return { ...DEFAULT_MASTER_PRINT_CONFIG };
};

export const saveMasterPrintConfig = (config: MasterPrintConfig): void => {
  try {
    localStorage.setItem(MASTER_PRINT_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('mbi-master-print-updated', { detail: config }));
  } catch (err) {
    console.error('Failed to save master print config:', err);
  }
};

export const MasterPrinterTemplatesPanel: React.FC<{ onNotify?: (msg: string) => void }> = ({ onNotify }) => {
  const [config, setConfig] = useState<MasterPrintConfig>(() => getMasterPrintConfig());
  const [activePrinterTab, setActivePrinterTab] = useState<'THERMAL' | 'A4'>('THERMAL');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [copiedStatus, setCopiedStatus] = useState<boolean>(false);
  const thermalPreviewRef = useRef<HTMLDivElement>(null);
  const a4PreviewRef = useRef<HTMLDivElement>(null);

  const handleSave = () => {
    const updated = {
      ...config,
      lastUpdated: new Date().toISOString()
    };
    setConfig(updated);
    saveMasterPrintConfig(updated);
    setSavedSuccess(true);
    if (onNotify) {
      onNotify('Master Printer Templates & Branding lock updated and propagated to all user terminals!');
    }
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleTestPrintThermal = () => {
    if (thermalPreviewRef.current) {
      printHtmlElement(thermalPreviewRef.current, 'MBI_Thermal_Receipt_Test');
    }
  };

  const handleTestPrintA4 = () => {
    if (a4PreviewRef.current) {
      printHtmlElement(a4PreviewRef.current, 'MBI_A4_Invoice_Test');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center shrink-0">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-white tracking-tight">Master Print & Invoice Template Hub</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Master Server Lock Active
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Dual Printer Support: Thermal & A4
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl">
                Centrally govern, edit, and lock invoice templates for both Thermal POS printers (80mm/58mm) and Laser A4 printers. Settings configured here are enforced across all store users and client terminals to prevent unauthorized tampering with company branding.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSave}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-2 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save & Enforce to All Clients</span>
            </button>
          </div>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Master printer templates successfully saved! Client sessions have been synchronized.</span>
        </div>
      )}

      {/* Printer Type Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActivePrinterTab('THERMAL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activePrinterTab === 'THERMAL'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>1. Thermal POS Printer (80mm / 58mm Standard Receipt)</span>
        </button>

        <button
          onClick={() => setActivePrinterTab('A4')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activePrinterTab === 'A4'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>2. A4 & Laser Wholesale Printer (Pharma & Tax Invoices)</span>
        </button>
      </div>

      {/* THERMAL PRINTER CONFIGURATION */}
      {activePrinterTab === 'THERMAL' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Controls (7 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  Thermal POS Receipt Layout & Master Branding
                </span>
                <span className="text-[11px] font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  Active Theme: MBI INVENTRA STANDARD
                </span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Store / Brand Header (Centered)
                  </label>
                  <input
                    type="text"
                    value={config.thermalBrandName}
                    onChange={(e) => setConfig({ ...config, thermalBrandName: e.target.value })}
                    placeholder="MBI INVENTRA"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Receipt Subtitle / Category
                  </label>
                  <input
                    type="text"
                    value={config.thermalSubtitle}
                    onChange={(e) => setConfig({ ...config, thermalSubtitle: e.target.value })}
                    placeholder="PHARMACY POS & ERP"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Phone Numbers
                  </label>
                  <input
                    type="text"
                    value={config.thermalPhones}
                    onChange={(e) => setConfig({ ...config, thermalPhones: e.target.value })}
                    placeholder="03364585863 • 03281302636"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    City / Country Header Line
                  </label>
                  <input
                    type="text"
                    value={config.thermalCountry}
                    onChange={(e) => setConfig({ ...config, thermalCountry: e.target.value })}
                    placeholder="Pakistan"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Thermal Footer Customizer */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center justify-between">
                  <span>Compact Thermal Footer Settings (Locked from User Side)</span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-blue-600">
                    <input
                      type="checkbox"
                      checked={config.thermalCompactFooter}
                      onChange={(e) => setConfig({ ...config, thermalCompactFooter: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Compact Condensed Footer</span>
                  </label>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Footer Headline (Centered)
                    </label>
                    <input
                      type="text"
                      value={config.thermalFooterTitle}
                      onChange={(e) => setConfig({ ...config, thermalFooterTitle: e.target.value })}
                      placeholder="THANK YOU FOR SHOPPING!"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Contact Line
                    </label>
                    <input
                      type="text"
                      value={config.thermalFooterContact}
                      onChange={(e) => setConfig({ ...config, thermalFooterContact: e.target.value })}
                      placeholder="Contact us : 03281302636"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Bottom Official Slogan & Website URL
                    </label>
                    <input
                      type="text"
                      value={config.thermalFooterWebsite}
                      onChange={(e) => setConfig({ ...config, thermalFooterWebsite: e.target.value })}
                      placeholder="Pharmacy POS & ERP    www.mbiinventra.com"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Master Governance Lock Switch */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Lock Printer Layout & Branding for All Store Users
                    </div>
                    <div className="text-[11px] text-slate-500">
                      When enabled, regular users cannot alter thermal receipt header, contact numbers, or footer credits.
                    </div>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.isClientEditingLocked}
                    onChange={(e) => setConfig({ ...config, isClientEditingLocked: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Live Thermal Receipt Simulator (5 Cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Live Thermal Receipt Simulator</span>
                </div>
                <button
                  type="button"
                  onClick={handleTestPrintThermal}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Printer className="w-3 h-3" />
                  <span>Test Thermal Print</span>
                </button>
              </div>

              {/* Exact Replicated Thermal Paper Representation */}
              <div className="flex justify-center p-2 bg-slate-200 dark:bg-slate-900 rounded-xl overflow-x-auto">
                <div 
                  ref={thermalPreviewRef}
                  className="bg-white text-slate-900 p-4 rounded-sm shadow-md font-mono text-xs w-[310px] leading-tight select-text border border-slate-300"
                  style={{ width: config.thermalPaperWidth === '58mm' ? '240px' : '310px' }}
                >
                  {/* Header */}
                  <div className="text-center space-y-0.5 pb-1">
                    <div className="font-black text-sm tracking-wider uppercase">{config.thermalBrandName || 'MBI INVENTRA'}</div>
                    <div className="text-[10px] font-bold tracking-wider text-slate-800 uppercase">{config.thermalSubtitle || 'PHARMACY POS & ERP'}</div>
                    <div className="text-[10px] text-slate-700 tracking-tight">{config.thermalPhones || '03364585863 • 03281302636'}</div>
                    <div className="text-[10px] text-slate-700">{config.thermalCountry || 'Pakistan'}</div>
                  </div>

                  {/* Dashed Line */}
                  <div className="border-t border-dashed border-slate-900 my-1"></div>

                  {/* Metadata 2-Column Key/Value */}
                  <div className="text-[11px] space-y-0.5">
                    <div className="flex justify-between">
                      <span className="text-slate-700">Invoice #</span>
                      <span className="font-bold">INV-463</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-700">Date/Time</span>
                      <span>22-Sep-2026 06:13 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-700">Cashier</span>
                      <span>{config.thermalCashierDefault || 'Bilal Inayat'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-700">Payment</span>
                      <span>Cash</span>
                    </div>
                  </div>

                  {/* Dashed Line */}
                  <div className="border-t border-dashed border-slate-900 my-1"></div>

                  {/* Items Header */}
                  <div className="grid grid-cols-12 text-[10px] font-bold uppercase pb-1 border-b border-dashed border-slate-400">
                    <span className="col-span-6 text-left">Item</span>
                    <span className="col-span-2 text-right">Qty</span>
                    <span className="col-span-2 text-right">Rate</span>
                    <span className="col-span-2 text-right">Amt</span>
                  </div>

                  {/* Items Rows */}
                  <div className="py-1 space-y-1 text-[10px]">
                    <div className="grid grid-cols-12 items-baseline leading-tight">
                      <div className="col-span-6 pr-1 font-bold text-slate-900 uppercase">PANADOL 500MG</div>
                      <span className="col-span-2 text-right">2</span>
                      <span className="col-span-2 text-right">15</span>
                      <span className="col-span-2 text-right font-bold">30.00</span>
                    </div>
                    <div className="grid grid-cols-12 items-baseline leading-tight">
                      <div className="col-span-6 pr-1 font-bold text-slate-900 uppercase">AUGMENTIN 625MG</div>
                      <span className="col-span-2 text-right">1</span>
                      <span className="col-span-2 text-right">185</span>
                      <span className="col-span-2 text-right font-bold">185.00</span>
                    </div>
                    <div className="grid grid-cols-12 items-baseline leading-tight">
                      <div className="col-span-6 pr-1 font-bold text-slate-900 uppercase">OMEZ 20MG</div>
                      <span className="col-span-2 text-right">1</span>
                      <span className="col-span-2 text-right">45</span>
                      <span className="col-span-2 text-right font-bold">45.00</span>
                    </div>
                    <div className="grid grid-cols-12 items-baseline leading-tight">
                      <div className="col-span-6 pr-1 font-bold text-slate-900 uppercase">BRUFEN 400MG</div>
                      <span className="col-span-2 text-right">1</span>
                      <span className="col-span-2 text-right">28</span>
                      <span className="col-span-2 text-right font-bold">28.00</span>
                    </div>
                    <div className="grid grid-cols-12 items-baseline leading-tight">
                      <div className="col-span-6 pr-1 font-bold text-slate-900 uppercase leading-none">
                        PARACETAMOL 500MG
                        <span className="block text-[9px] font-normal text-slate-700">TABLETS</span>
                      </div>
                      <span className="col-span-2 text-right">2</span>
                      <span className="col-span-2 text-right">15</span>
                      <span className="col-span-2 text-right font-bold">30.00</span>
                    </div>
                    <div className="grid grid-cols-12 items-baseline leading-tight">
                      <div className="col-span-6 pr-1 font-bold text-slate-900 uppercase">CETIRIZINE 10MG</div>
                      <span className="col-span-2 text-right">1</span>
                      <span className="col-span-2 text-right">20</span>
                      <span className="col-span-2 text-right font-bold">20.00</span>
                    </div>
                  </div>

                  {/* Dashed Line */}
                  <div className="border-t border-dashed border-slate-900 my-1"></div>

                  {/* Subtotals & Taxes */}
                  <div className="text-[11px] space-y-0.5">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-bold">428.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Discount</span>
                      <span>0.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>0.00</span>
                    </div>

                    <div className="my-1 border-t border-slate-300"></div>

                    <div className="flex justify-between font-black text-xs">
                      <span className="uppercase">TOTAL</span>
                      <span className="font-bold">428.00</span>
                    </div>
                    <div className="flex justify-between text-slate-800">
                      <span>Received</span>
                      <span>500.00</span>
                    </div>
                    <div className="flex justify-between text-slate-800">
                      <span>Change</span>
                      <span>72.00</span>
                    </div>
                  </div>

                  {/* Dashed Line */}
                  <div className="border-t border-dashed border-slate-900 my-1.5"></div>

                  {/* Compact Footer */}
                  <div className="text-center text-[10px] space-y-1 pt-1">
                    <div className="font-black tracking-wider uppercase text-slate-900">
                      {config.thermalFooterTitle || 'THANK YOU FOR SHOPPING!'}
                    </div>
                    <div className="text-[9.5px] text-slate-700">
                      {config.thermalFooterContact || 'Contact us : 03281302636'}
                    </div>
                    <div className="flex justify-between items-center text-[9px] text-slate-600 px-1 pt-0.5 border-t border-dashed border-slate-300">
                      <span>Pharmacy POS & ERP</span>
                      <span className="font-mono font-bold">www.mbiinventra.com</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* A4 PRINTER CONFIGURATION */}
      {activePrinterTab === 'A4' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  A4 & Wholesale Laser Printer Master Template
                </span>
                <span className="text-[11px] font-mono text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                  Pharma Wholesale Drug Act 1976 Form 2-A
                </span>
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Master Document Title (A4 Banner)
                  </label>
                  <input
                    type="text"
                    value={config.a4HeaderTitle}
                    onChange={(e) => setConfig({ ...config, a4HeaderTitle: e.target.value })}
                    placeholder="TAX & DRUG WARRANTY INVOICE"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Drug Act 1976 Form 2-A Warranty Clause
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-emerald-600">
                      <input
                        type="checkbox"
                        checked={config.a4ShowDrugWarranty}
                        onChange={(e) => setConfig({ ...config, a4ShowDrugWarranty: e.target.checked })}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Print Drug Warranty</span>
                    </label>
                  </div>
                  <textarea
                    rows={2}
                    value={config.a4DrugWarrantyText}
                    onChange={(e) => setConfig({ ...config, a4DrugWarrantyText: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Bank Settlement & IBAN Details
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-blue-600">
                      <input
                        type="checkbox"
                        checked={config.a4ShowBankDetails}
                        onChange={(e) => setConfig({ ...config, a4ShowBankDetails: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Print Bank Info</span>
                    </label>
                  </div>
                  <textarea
                    rows={3}
                    value={config.a4BankDetailsText}
                    onChange={(e) => setConfig({ ...config, a4BankDetailsText: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-3">
            <div className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Live A4 Document Preview</span>
                </div>
                <button
                  type="button"
                  onClick={handleTestPrintA4}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Printer className="w-3 h-3" />
                  <span>Test A4 Print</span>
                </button>
              </div>

              <div className="p-3 bg-white border border-slate-300 rounded-lg text-slate-900 text-[10px] space-y-2 shadow-sm font-sans" ref={a4PreviewRef}>
                <div className="flex justify-between items-start border-b border-slate-800 pb-2">
                  <div>
                    <h2 className="text-sm font-black uppercase text-slate-900">MBI INVENTRA PHARMA CORP</h2>
                    <p className="text-[9px] text-slate-600">Main Commercial Plaza, Lahore, Pakistan • 0328-1302636</p>
                    <p className="text-[9px] font-bold text-emerald-800">Drug License: DL-09-2024-MBI • NTN: 992120-1</p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded bg-emerald-800 text-white font-bold text-[9px] uppercase">
                      {config.a4HeaderTitle}
                    </span>
                    <p className="text-[9px] font-mono mt-1 font-bold">INV-2026-0042</p>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 p-1.5 rounded text-[8.5px] text-emerald-900 leading-tight">
                  <strong>Drug Act Warranty:</strong> {config.a4DrugWarrantyText}
                </div>

                <div className="border border-slate-200 rounded overflow-hidden">
                  <table className="w-full text-left text-[9px]">
                    <thead className="bg-slate-100 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-1">#</th>
                        <th className="p-1">Medicine Name</th>
                        <th className="p-1">Batch</th>
                        <th className="p-1">Exp</th>
                        <th className="p-1 text-right">Qty</th>
                        <th className="p-1 text-right">Price</th>
                        <th className="p-1 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="p-1">1</td>
                        <td className="p-1 font-bold">Panadol Extra 500mg</td>
                        <td className="p-1 font-mono">PE-882</td>
                        <td className="p-1 font-mono">12/28</td>
                        <td className="p-1 text-right">10</td>
                        <td className="p-1 text-right">45.00</td>
                        <td className="p-1 text-right font-bold">450.00</td>
                      </tr>
                      <tr>
                        <td className="p-1">2</td>
                        <td className="p-1 font-bold">Augmentin 625mg Tab</td>
                        <td className="p-1 font-mono">AG-330</td>
                        <td className="p-1 font-mono">09/27</td>
                        <td className="p-1 text-right">2</td>
                        <td className="p-1 text-right">350.00</td>
                        <td className="p-1 text-right font-bold">700.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-start pt-1">
                  <div className="text-[8.5px] text-slate-600 whitespace-pre-line max-w-[180px]">
                    {config.a4BankDetailsText}
                  </div>
                  <div className="text-right space-y-0.5 text-[9.5px]">
                    <div>Subtotal: <strong>Rs. 1,150.00</strong></div>
                    <div className="font-bold text-xs text-slate-900 border-t border-slate-800 pt-0.5">
                      TOTAL: Rs. 1,150.00
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
