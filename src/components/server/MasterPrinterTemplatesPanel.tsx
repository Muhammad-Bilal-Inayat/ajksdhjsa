import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, Lock, ShieldCheck, CheckCircle2, Sparkles, RefreshCw, 
  FileText, Sliders, Smartphone, Check, Eye, AlertCircle, Copy, 
  Settings2, Download, Save, Layers, HelpCircle, Receipt, Maximize2, Minimize2,
  Building2, CreditCard, ShieldAlert, Award
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
  
  // A4 Laser & Wholesale Printer Settings
  a4DefaultTheme: 'A4_PHARMA_WHOLESALE' | 'A4_CLASSIC_TAX' | 'A4_CORPORATE_BOXED' | 'A4_COMPACT_PROFESSIONAL' | 'A4_MODERN_MINIMAL';
  a4HeaderTitle: string;
  a4CompanyName: string;
  a4CompanyAddress: string;
  a4CompanyPhones: string;
  a4DrugLicenseNo: string;
  a4NtnNumber: string;
  a4DrugWarrantyText: string;
  a4ShowDrugWarranty: boolean;
  a4ShowBankDetails: boolean;
  a4BankDetailsText: string;
  a4ShowQrCode: boolean;
  
  // Master Enforced A4 Permanent 1-Line Footer (Locked from user side)
  a4MasterFooterText: string;
  
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
  thermalFooterContact: '0328-1302636',
  thermalFooterWebsite: 'mbiinventra.com',
  thermalCompactFooter: true,
  thermalDefaultTheme: 'THERMAL_MBI_STANDARD',
  thermalPaperWidth: '80mm',
  
  a4DefaultTheme: 'A4_PHARMA_WHOLESALE',
  a4HeaderTitle: 'TAX & DRUG WARRANTY INVOICE',
  a4CompanyName: 'MBI INVENTRA PHARMA CORP',
  a4CompanyAddress: 'Main Commercial Plaza, Lahore, Pakistan',
  a4CompanyPhones: '0328-1302636 • 0336-4585863',
  a4DrugLicenseNo: 'DL-09-2024-MBI',
  a4NtnNumber: '992120-1',
  a4DrugWarrantyText: 'FORM 2-A: (Under Section 23 of Drug Act 1976). We hereby warrant that medicines sold do not contravene any section of Drug Act 1976.',
  a4ShowDrugWarranty: true,
  a4ShowBankDetails: true,
  a4BankDetailsText: 'Bank: Meezan Bank Ltd\nAccount: 0102-0105829102\nTitle: MBI INVENTRA PHARMA\nIBAN: PK64MEZN0001020105829102',
  a4ShowQrCode: true,
  
  // Permanent Short 1-Line Master Footer (Site Name • Number • Site Link)
  a4MasterFooterText: 'Powered by MBI INVENTRA • 0328-1302636 • mbiinventra.com',
  
  isClientEditingLocked: true,
  lockReason: 'Protected by Master Server. Official branding & receipt layout is centrally managed.',
  lastUpdated: new Date().toISOString()
};

const MASTER_PRINT_STORAGE_KEY = 'mbi_master_print_config_v2';

export const getMasterPrintConfig = (): MasterPrintConfig => {
  try {
    const saved = localStorage.getItem(MASTER_PRINT_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Auto-migrate older long footer strings to clean short server-synced format
      if (parsed.a4MasterFooterText && (parsed.a4MasterFooterText.includes('Master System Verified') || parsed.a4MasterFooterText.includes('Thank You for Your Business! • Powered by MBI INVENTRA Cloud POS & ERP'))) {
        parsed.a4MasterFooterText = DEFAULT_MASTER_PRINT_CONFIG.a4MasterFooterText;
      }
      return { ...DEFAULT_MASTER_PRINT_CONFIG, ...parsed };
    }
  } catch (err) {
    console.error('Failed to load master print config:', err);
  }
  return { ...DEFAULT_MASTER_PRINT_CONFIG };
};

export const saveMasterPrintConfig = async (config: MasterPrintConfig): Promise<void> => {
  try {
    localStorage.setItem(MASTER_PRINT_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('mbi-master-print-updated', { detail: config }));
    
    // Broadcast & persist to master server API
    await fetch('/api/master/print-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    }).catch(err => console.warn('Master server print sync warning:', err));
  } catch (err) {
    console.error('Failed to save master print config:', err);
  }
};

export const MasterPrinterTemplatesPanel: React.FC<{ onNotify?: (msg: string) => void }> = ({ onNotify }) => {
  const [config, setConfig] = useState<MasterPrintConfig>(() => getMasterPrintConfig());
  const [activePrinterTab, setActivePrinterTab] = useState<'THERMAL' | 'A4'>('A4');
  const [isFullA4View, setIsFullA4View] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const thermalPreviewRef = useRef<HTMLDivElement>(null);
  const a4PreviewRef = useRef<HTMLDivElement>(null);

  // Initial fetch from Master Server API
  useEffect(() => {
    let isMounted = true;
    const fetchServerConfig = async () => {
      try {
        const res = await fetch('/api/master/print-config');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.config && isMounted) {
            const merged = { ...DEFAULT_MASTER_PRINT_CONFIG, ...data.config };
            setConfig(merged);
            localStorage.setItem(MASTER_PRINT_STORAGE_KEY, JSON.stringify(merged));
          }
        }
      } catch (e) {
        // Fallback to local cache
      }
    };
    fetchServerConfig();
    return () => { isMounted = false; };
  }, []);

  const handleSave = async () => {
    setIsSyncing(true);
    const updated = {
      ...config,
      lastUpdated: new Date().toISOString()
    };
    setConfig(updated);
    await saveMasterPrintConfig(updated);
    setIsSyncing(false);
    setSavedSuccess(true);
    if (onNotify) {
      onNotify('Master Printer Templates & Locked A4 Footer updated and live-synced to all client terminals!');
    }
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  const handleTestPrintThermal = () => {
    if (thermalPreviewRef.current) {
      printHtmlElement(thermalPreviewRef.current, 'MBI_Thermal_Receipt_Test');
    }
  };

  const handleTestPrintA4 = () => {
    if (a4PreviewRef.current) {
      printHtmlElement(a4PreviewRef.current, 'MBI_A4_Pharma_Invoice_Master');
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
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Permanent A4 Master Footer Enforced
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl">
                Centrally govern, edit, and lock invoice templates for both Thermal POS printers (80mm/58mm) and Laser A4 printers. The 1-line master footer is permanently attached to every A4 bill and protected against user modification.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSave}
              disabled={isSyncing}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              <Save className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing to Clients...' : 'Save & Enforce to All Clients'}</span>
            </button>
          </div>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Master printer templates and 1-line permanent footer successfully saved and live-synced across all active stores!</span>
        </div>
      )}

      {/* Printer Type Switcher */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActivePrinterTab('A4')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              activePrinterTab === 'A4'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>1. A4 & Laser Wholesale Printer (Pharma & Tax Invoices)</span>
          </button>

          <button
            onClick={() => setActivePrinterTab('THERMAL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              activePrinterTab === 'THERMAL'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>2. Thermal POS Printer (80mm / 58mm Standard Receipt)</span>
          </button>
        </div>

        {activePrinterTab === 'A4' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFullA4View(!isFullA4View)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              {isFullA4View ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-blue-500" />
                  <span>Split Editor View</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-blue-500" />
                  <span>Full A4 Paper View</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleTestPrintA4}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Test A4 Print</span>
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
          1. A4 PRINTER CONFIGURATION & FULL A4 PAPER VIEW
          ========================================================================= */}
      {activePrinterTab === 'A4' && (
        <div className={`grid grid-cols-1 ${isFullA4View ? 'lg:grid-cols-1' : 'lg:grid-cols-12'} gap-6`}>
          
          {/* Left Column: Form Controls (Hidden in full view) */}
          {!isFullA4View && (
            <div className="lg:col-span-6 space-y-5">
              
              {/* Master Document Identity */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    A4 Header Branding & Document Title
                  </span>
                  <span className="text-[11px] font-mono text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                    Drug Act 1976 Form 2-A
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Pharma Company / Distributor Name
                      </label>
                      <input
                        type="text"
                        value={config.a4CompanyName}
                        onChange={(e) => setConfig({ ...config, a4CompanyName: e.target.value })}
                        placeholder="MBI INVENTRA PHARMA CORP"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Commercial Address
                      </label>
                      <input
                        type="text"
                        value={config.a4CompanyAddress}
                        onChange={(e) => setConfig({ ...config, a4CompanyAddress: e.target.value })}
                        placeholder="Main Commercial Plaza, Lahore, Pakistan"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Drug License Number (Govt Verified)
                      </label>
                      <input
                        type="text"
                        value={config.a4DrugLicenseNo}
                        onChange={(e) => setConfig({ ...config, a4DrugLicenseNo: e.target.value })}
                        placeholder="DL-09-2024-MBI"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Tax / NTN Registration #
                      </label>
                      <input
                        type="text"
                        value={config.a4NtnNumber}
                        onChange={(e) => setConfig({ ...config, a4NtnNumber: e.target.value })}
                        placeholder="992120-1"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Statutory Warranty & Bank Remittance */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Statutory Drug Warranty & Bank Info
                  </span>
                </h3>

                <div className="space-y-3">
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

              {/* PERMANENT MASTER FOOTER CONTROLLER (1-Line Locked) */}
              <div className="bg-gradient-to-br from-indigo-950/30 to-purple-950/20 border-2 border-indigo-500/40 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-sm font-black text-indigo-900 dark:text-indigo-200">
                      Permanent A4 Master Footer (1-Line Full End-of-Page)
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    Enforced Server-Wide
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Yeh footer line tamam A4 bills ke bilkul aakhri kinare (bottom end) par 1 single line me permanently print hogi. <strong>Client / Store users ke paas isko edit karne ya chupane ka koi option nahi hoga.</strong>
                </p>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Master 1-Line Footer Text (Full Width End Line)
                    </label>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={isSyncing}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm transition active:scale-95 disabled:opacity-50"
                      title="Save & Enforce Universal Footer Server-Wide"
                    >
                      {savedSuccess ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Footer Saved!</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>{isSyncing ? 'Saving...' : 'Save Universal Footer'}</span>
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={config.a4MasterFooterText}
                    onChange={(e) => setConfig({ ...config, a4MasterFooterText: e.target.value })}
                    placeholder="Powered by MBI INVENTRA • 0328-1302636 • mbiinventra.com"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-indigo-300 dark:border-indigo-700 text-xs font-mono font-semibold text-slate-900 dark:text-white shadow-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Master Governance Lock Switch */}
                <div className="pt-2 border-t border-indigo-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Lock A4 Layout & Footer on Client Side
                    </span>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.isClientEditingLocked}
                      onChange={(e) => setConfig({ ...config, isClientEditingLocked: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>

            </div>
          )}

          {/* Right Column: High-Fidelity Authentic A4 Paper Simulator */}
          <div className={`${isFullA4View ? 'lg:col-span-12' : 'lg:col-span-6'} space-y-3`}>
            
            <div className="bg-slate-200 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-md">
              
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-300 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Live Full A4 Document Simulation (210mm × 297mm Ratio)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded">
                    Master Live Enforced
                  </span>
                </div>
              </div>

              {/* Exact A4 Proportional Document Sheet */}
              <div className="flex justify-center overflow-x-auto p-2 sm:p-4 bg-slate-300/60 dark:bg-slate-900/80 rounded-xl">
                <div 
                  ref={a4PreviewRef}
                  className="bg-white text-slate-900 p-6 sm:p-8 rounded-sm shadow-2xl font-sans text-xs w-full max-w-[780px] min-h-[960px] flex flex-col justify-between border border-slate-300 select-text leading-tight transition-all duration-300"
                  style={{
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  {/* TOP HEADER SECTION */}
                  <div className="space-y-4">
                    {/* Header Banner */}
                    <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
                      <div className="space-y-1 max-w-[65%]">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-blue-600 text-white">
                            WHOLESALE PHARMACEUTICAL DISTRIBUTOR
                          </span>
                          <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                            DRUG ACT 1976 COMPLIANT
                          </span>
                        </div>
                        <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 leading-none pt-1">
                          {config.a4CompanyName || 'MBI INVENTRA PHARMA CORP'}
                        </h1>
                        <p className="text-[10px] text-slate-600">
                          {config.a4CompanyAddress || 'Main Commercial Plaza, Lahore, Pakistan'} • Phone: {config.a4CompanyPhones || '0328-1302636'}
                        </p>
                        <p className="text-[10px] font-bold font-mono text-emerald-800">
                          Drug Lic #: {config.a4DrugLicenseNo || 'DL-09-2024-MBI'} | NTN: {config.a4NtnNumber || '992120-1'}
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0 space-y-1">
                        <span className="px-3 py-1 rounded bg-slate-900 text-white font-black text-[10px] uppercase tracking-wider block text-center shadow-xs">
                          {config.a4HeaderTitle || 'TAX & DRUG WARRANTY INVOICE'}
                        </span>
                        <p className="text-[11px] font-mono font-bold text-slate-900">INV #: PH-2026-0042</p>
                        <p className="text-[10px] text-slate-500">Date: 29-Sep-2026</p>
                        <p className="text-[9.5px] text-emerald-700 font-bold">Payment: Verified Credit (30 Days)</p>
                      </div>
                    </div>

                    {/* Chemist / Buyer Details Box */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-2 text-xs">
                      <div>
                        <span className="font-bold text-[9.5px] text-blue-800 uppercase tracking-wider block mb-0.5">
                          Billed To / Licensed Chemist (خریدار تفصیل):
                        </span>
                        <div className="font-bold text-slate-900 text-xs">AL-RAZI MEDICAL COMPLEX & PHARMACY</div>
                        <p className="text-slate-600 text-[10px]">Shop # 12, Hospital Road, Sargodha</p>
                        <p className="text-slate-600 text-[9.5px] font-mono">Chemist Drug Lic: DL-39281-SGA | NTN: 3277876-1</p>
                      </div>
                      <div className="text-right flex flex-col justify-between text-[10px]">
                        <div>
                          <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[9.5px]">
                            ✓ Purchaser Drug License Verified
                          </span>
                        </div>
                        <p className="text-slate-500 text-[9.5px]">Dispatch Mode: Direct Temperature-Controlled Van</p>
                      </div>
                    </div>

                    {/* Statutory Drug Act Form 2-A Warranty Box */}
                    {config.a4ShowDrugWarranty && (
                      <div className="p-2 bg-emerald-50/90 border border-emerald-300 rounded-lg text-[9.5px] text-emerald-950 leading-tight">
                        <span className="font-bold block text-emerald-900 mb-0.5">
                          Form 2-A Statutory Drug Warranty (Section 23 of Drug Act 1976):
                        </span>
                        {config.a4DrugWarrantyText || 'FORM 2-A: (Under Section 23 of Drug Act 1976). We hereby warrant that medicines sold do not contravene any section of Drug Act 1976.'}
                      </div>
                    )}

                    {/* HIGH-DENSITY MEDICINE ITEMS TABLE */}
                    <div className="border border-slate-300 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-[10px] border-collapse">
                        <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
                          <tr>
                            <th className="p-1.5 text-center w-6">#</th>
                            <th className="p-1.5">Medicine & Product Description</th>
                            <th className="p-1.5 text-center">Batch</th>
                            <th className="p-1.5 text-center">Expiry</th>
                            <th className="p-1.5 text-right">Pack</th>
                            <th className="p-1.5 text-right">Qty</th>
                            <th className="p-1.5 text-right">T.P / Rate</th>
                            <th className="p-1.5 text-right">Disc%</th>
                            <th className="p-1.5 text-right">Tax%</th>
                            <th className="p-1.5 text-right">Amount (Rs.)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          <tr className="hover:bg-slate-50">
                            <td className="p-1.5 text-center font-mono text-slate-500">1</td>
                            <td className="p-1.5 font-bold text-slate-900">
                              Augmentin 625mg Tab (GlaxoSmithKline)
                              <span className="block text-[8.5px] font-normal text-slate-500">Amoxicillin + Clavulanic Acid (Box of 10s)</span>
                            </td>
                            <td className="p-1.5 text-center font-mono font-semibold text-slate-700">AG-330</td>
                            <td className="p-1.5 text-center font-mono text-slate-700">09/28</td>
                            <td className="p-1.5 text-right text-slate-600">Box</td>
                            <td className="p-1.5 text-right font-bold text-slate-900">10</td>
                            <td className="p-1.5 text-right font-mono">350.00</td>
                            <td className="p-1.5 text-right font-mono text-emerald-700 font-semibold">5%</td>
                            <td className="p-1.5 text-right font-mono text-slate-500">0%</td>
                            <td className="p-1.5 text-right font-bold font-mono text-slate-900">3,325.00</td>
                          </tr>

                          <tr className="bg-slate-50/40 hover:bg-slate-50">
                            <td className="p-1.5 text-center font-mono text-slate-500">2</td>
                            <td className="p-1.5 font-bold text-slate-900">
                              Panadol Extra 500mg/65mg (Haleon)
                              <span className="block text-[8.5px] font-normal text-slate-500">Paracetamol + Caffeine (Box of 200s)</span>
                            </td>
                            <td className="p-1.5 text-center font-mono font-semibold text-slate-700">PE-882</td>
                            <td className="p-1.5 text-center font-mono text-slate-700">12/28</td>
                            <td className="p-1.5 text-right text-slate-600">Box</td>
                            <td className="p-1.5 text-right font-bold text-slate-900">20</td>
                            <td className="p-1.5 text-right font-mono">450.00</td>
                            <td className="p-1.5 text-right font-mono text-emerald-700 font-semibold">4%</td>
                            <td className="p-1.5 text-right font-mono text-slate-500">0%</td>
                            <td className="p-1.5 text-right font-bold font-mono text-slate-900">8,640.00</td>
                          </tr>

                          <tr className="hover:bg-slate-50">
                            <td className="p-1.5 text-center font-mono text-slate-500">3</td>
                            <td className="p-1.5 font-bold text-slate-900">
                              Cravit 500mg IV Infusion (Getz Pharma)
                              <span className="block text-[8.5px] font-normal text-slate-500">Levofloxacin 100ml Infusion Bottle</span>
                            </td>
                            <td className="p-1.5 text-center font-mono font-semibold text-slate-700">CR-904</td>
                            <td className="p-1.5 text-center font-mono text-slate-700">04/27</td>
                            <td className="p-1.5 text-right text-slate-600">Vial</td>
                            <td className="p-1.5 text-right font-bold text-slate-900">5</td>
                            <td className="p-1.5 text-right font-mono">420.00</td>
                            <td className="p-1.5 text-right font-mono text-slate-400">0%</td>
                            <td className="p-1.5 text-right font-mono text-slate-500">0%</td>
                            <td className="p-1.5 text-right font-bold font-mono text-slate-900">2,100.00</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* FINANCIAL SUMMARY & BANK DETAILS */}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      {/* Left: Bank Remittance Details */}
                      <div className="space-y-2">
                        {config.a4ShowBankDetails && (
                          <div className="p-2.5 bg-blue-50/60 border border-blue-200 rounded-lg text-[9.5px]">
                            <span className="font-bold text-blue-900 block mb-0.5">
                              Bank Account Details For Remittance:
                            </span>
                            <p className="font-mono text-slate-700 whitespace-pre-line leading-tight">
                              {config.a4BankDetailsText}
                            </p>
                          </div>
                        )}
                        <p className="text-[9px] text-slate-500 leading-tight">
                          * Warranty Valid as per Drug Act 1976. Breakage or leakage claims must be lodged within 48 hours of dispatch.
                        </p>
                      </div>

                      {/* Right: Totals Calculation */}
                      <div className="space-y-1 text-right text-[10.5px]">
                        <div className="flex justify-between text-slate-600">
                          <span>Gross Subtotal:</span>
                          <span className="font-mono font-semibold">Rs. 14,400.00</span>
                        </div>
                        <div className="flex justify-between text-emerald-700">
                          <span>Trade Discount:</span>
                          <span className="font-mono font-semibold">- Rs. 335.00</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Sales Tax / Advance WHT:</span>
                          <span className="font-mono font-semibold">Rs. 0.00</span>
                        </div>

                        <div className="flex justify-between text-xs font-black text-white p-2 rounded-lg bg-slate-900 shadow-xs mt-1">
                          <span className="uppercase">Net Payable (صافی رقم):</span>
                          <span className="font-mono text-sm">Rs. 14,065.00</span>
                        </div>

                        <div className="flex justify-between text-[9.5px] text-slate-500 pt-0.5">
                          <span>Previous Balance:</span>
                          <span className="font-mono font-bold">Rs. 4,500.00</span>
                        </div>
                        <div className="flex justify-between text-[9.5px] text-slate-900 font-bold border-t border-slate-200 pt-0.5">
                          <span>Total Outstanding Ledger:</span>
                          <span className="font-mono text-rose-700">Rs. 18,565.00</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BOTTOM END SECTION: SIGNATURES & PERMANENT MASTER 1-LINE FOOTER */}
                  <div className="pt-6 space-y-4">
                    
                    {/* Authorized Signatures */}
                    <div className="grid grid-cols-2 gap-8 text-center text-[9.5px] text-slate-600 pt-2 border-t border-slate-200">
                      <div>
                        <div className="h-7 border-b border-dashed border-slate-400 mx-auto w-36"></div>
                        <span className="mt-1 block font-semibold text-slate-700">Customer / Chemist Signature & Stamp</span>
                      </div>
                      <div>
                        <div className="h-7 border-b border-dashed border-slate-400 mx-auto w-36"></div>
                        <span className="mt-1 block font-semibold text-slate-900">
                          For {config.a4CompanyName || 'MBI INVENTRA PHARMA CORP'} (Authorized Signature)
                        </span>
                      </div>
                    </div>

                    {/* =========================================================================
                        PERMANENT MASTER 1-LINE FOOTER (Full End of Page)
                        ========================================================================= */}
                    <div className="border-t border-slate-300 pt-2 text-center select-text">
                      <p className="text-[9.5px] sm:text-[10px] font-semibold text-slate-700 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
                        {config.a4MasterFooterText || 'Powered by MBI INVENTRA • 0328-1302636 • mbiinventra.com'}
                      </p>
                    </div>

                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          2. THERMAL POS PRINTER CONFIGURATION
          ========================================================================= */}
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
                      <span>29-Sep-2026 06:13 PM</span>
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
                  </div>

                  {/* Dashed Line */}
                  <div className="border-t border-dashed border-slate-900 my-1"></div>

                  {/* Subtotals & Taxes */}
                  <div className="text-[11px] space-y-0.5">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-bold">260.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Discount</span>
                      <span>0.00</span>
                    </div>
                    <div className="flex justify-between font-black text-xs pt-1 border-t border-slate-300">
                      <span className="uppercase">TOTAL</span>
                      <span className="font-bold">260.00</span>
                    </div>
                  </div>

                  {/* Dashed Line */}
                  <div className="border-t border-dashed border-slate-900 my-1.5"></div>

                  {/* Compact Footer */}
                  <div className="text-center text-[10px] space-y-0.5 pt-1">
                    <div className="font-extrabold text-[9.5px] text-slate-900">
                      Powered by MBI INVENTRA
                    </div>
                    <div className="text-[9px] text-slate-700">
                      {config.thermalFooterContact || '0328-1302636'} &bull; {config.thermalFooterWebsite || 'mbiinventra.com'}
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
