import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Settings as SettingsIcon, X, CheckCircle2, ChevronRight,
  Sun, Moon, Sliders, ShieldCheck, QrCode, BookOpen, Sparkles,
  Layers, Printer, Percent, Users, UserCheck, Package
} from 'lucide-react';
import { GeneralTab } from '../components/settings/GeneralTab';
import { TransactionTab } from '../components/settings/TransactionTab';
import { PrintTab } from '../components/settings/PrintTab';
import { TaxesTab } from '../components/settings/TaxesTab';
import { UserManagementTab } from '../components/settings/UserManagementTab';
import { PartyTab } from '../components/settings/PartyTab';
import { ItemTab } from '../components/settings/ItemTab';
import { PricingMarginTab } from '../components/settings/PricingMarginTab';
import { RbacManagementTab } from '../components/settings/RbacManagementTab';
import { ModuleVisibilityTab } from '../components/settings/ModuleVisibilityTab';
import { MenuCustomizerSettings } from '../components/settings/MenuCustomizerSettings';
import { FeatureFlagsTab } from '../components/settings/FeatureFlagsTab';
import { SafetyRulesTab } from '../components/settings/SafetyRulesTab';
import { ControlledAndGenericTab } from '../components/settings/ControlledAndGenericTab';
import { AdminSettingsTab } from '../components/settings/AdminSettingsTab';
import { DocumentationTab } from '../components/settings/DocumentationTab';
import { BackupRestoreTab } from '../components/settings/BackupRestoreTab';
import { BarcodeGeneratorTab } from '../components/settings/BarcodeGeneratorTab';
import { WhatsAppAutomationSettingsTab } from '../components/settings/WhatsAppAutomationSettingsTab';
import { MessageSquare } from 'lucide-react';
import { APP_VERSION } from '../config/appVersion';
import { ManualPatchTab } from '../components/settings/ManualPatchTab';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { isSettingsTabAllowedInPlan } from '../lib/planFeatureManager';

export type TabKey = 
  | 'MANUAL PATCH'
  | 'BACKUP & RESTORE'
  | 'QR CODE GENERATOR'
  | 'WHATSAPP AUTOMATION'
  | 'GENERAL' 
  | 'DOCUMENTATION'
  | 'UPDATES'
  | 'ADMIN SETTINGS'
  | 'NAVIGATION & MENU PREFERENCES'
  | 'CONTROLLED & GENERIC' 
  | 'FEATURE FLAGS' 
  | 'SAFETY & LOCK' 
  | 'MODULE VISIBILITY' 
  | 'ROLES & RBAC' 
  | 'TRANSACTION' 
  | 'PRINT' 
  | 'TAXES' 
  | 'USER MANAGEMENT' 
  | 'PARTY' 
  | 'ITEM' 
  | 'PRICING & MARGIN';

export interface TabItem {
  key: TabKey;
  label: string;
  icon: any;
  badge?: string;
  trialOnly?: boolean;
}

export const SETTINGS_TABS: TabItem[] = [
  { key: 'GENERAL', label: 'GENERAL', icon: Sliders },
  { key: 'NAVIGATION & MENU PREFERENCES', label: 'MENU & NAVIGATION', icon: Sliders, badge: 'PRIMARY' },
  { key: 'DOCUMENTATION', label: 'USER MANUAL & GUIDES', icon: BookOpen },
  { key: 'ADMIN SETTINGS', label: 'ADMIN SETTINGS & FLAGS', icon: ShieldCheck, badge: 'ADMIN' },
  { key: 'SAFETY & LOCK', label: 'SAFETY & PERIOD LOCK', icon: ShieldCheck },
  { key: 'TRANSACTION', label: 'INVOICE BILLING', icon: Layers },
  { key: 'PRINT', label: 'PRINT', icon: Printer },
  { key: 'TAXES', label: 'TAXES', icon: Percent },
  { key: 'USER MANAGEMENT', label: 'USER MANAGEMENT', icon: Users },
  { key: 'PARTY', label: 'PARTY', icon: UserCheck },
  { key: 'ITEM', label: 'ITEM', icon: Package },
  { key: 'PRICING & MARGIN', label: 'PRICING & MARGIN', icon: Percent },
  { key: 'CONTROLLED & GENERIC', label: 'CONTROLLED & GENERIC SUITE', icon: ShieldCheck },
  { key: 'FEATURE FLAGS', label: 'FEATURE FLAGS (19)', icon: Sparkles },
  { key: 'MODULE VISIBILITY', label: 'MODULE VISIBILITY', icon: Layers },
  { key: 'ROLES & RBAC', label: 'ROLES & RBAC', icon: ShieldCheck },
];

export const resolveTabKey = (param?: string | null): TabKey => {
  if (!param) return 'GENERAL';
  const clean = decodeURIComponent(param).trim();
  const upper = clean.toUpperCase();

  // 1. Direct match with key
  const directMatch = SETTINGS_TABS.find(t => t.key === upper || t.key === clean);
  if (directMatch) return directMatch.key;

  // 2. Direct match with label
  const labelMatch = SETTINGS_TABS.find(t => t.label.toUpperCase() === upper);
  if (labelMatch) return labelMatch.key;

  // 3. Match normalized key or slug (remove special chars & spaces)
  const normalized = upper.replace(/[^A-Z0-9]/g, '');

  if (normalized.includes('NAVIGATION') || normalized.includes('MENU') || normalized.includes('CUSTOMIZ')) return 'NAVIGATION & MENU PREFERENCES';
  if (normalized.includes('PATCH')) return 'MANUAL PATCH';
  if (normalized.includes('QR') || normalized.includes('BARCODE') || normalized.includes('STICKER') || normalized.includes('LABEL')) return 'QR CODE GENERATOR';
  if (normalized.includes('BACKUP') || normalized.includes('RESTORE') || normalized.includes('SNAPSHOT')) return 'BACKUP & RESTORE';
  if (normalized.includes('DOC') || normalized.includes('MANUAL') || normalized.includes('SHORTCUT') || normalized.includes('GUIDE') || normalized.includes('UPDATE') || normalized.includes('VERSION') || normalized.includes('RELEASE')) return 'DOCUMENTATION';
  if (normalized.includes('ADMINSETTING') || normalized.includes('ADMINFLAG')) return 'ADMIN SETTINGS';
  if (normalized.includes('CONTROLLED') || normalized.includes('GENERIC')) return 'CONTROLLED & GENERIC';
  if (normalized.includes('FEATURE') || normalized.includes('FLAG')) return 'FEATURE FLAGS';
  if (normalized.includes('SAFETY') || normalized.includes('LOCK')) return 'SAFETY & LOCK';
  if (normalized.includes('MODULE') || normalized.includes('VISIBIL')) return 'MODULE VISIBILITY';
  if (normalized.includes('ROLE') || normalized.includes('RBAC')) return 'ROLES & RBAC';
  if (normalized.includes('TRANSACTION') || normalized.includes('BILLING') || normalized.includes('INVOICE')) return 'TRANSACTION';
  if (normalized.includes('PRINT')) return 'PRINT';
  if (normalized.includes('TAX')) return 'TAXES';
  if (normalized.includes('PRICING') || normalized.includes('MARGIN')) return 'PRICING & MARGIN';
  if (normalized.includes('USER') || normalized.includes('STAFF')) return 'USER MANAGEMENT';
  if (normalized.includes('PARTY') || normalized.includes('CUSTOMER') || normalized.includes('SUPPLIER')) return 'PARTY';
  if (normalized.includes('ITEM') || normalized.includes('PRODUCT') || normalized.includes('STOCK')) return 'ITEM';
  if (normalized.includes('GENERAL')) return 'GENERAL';

  return 'GENERAL';
};

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useSettings();
  const { tenant, tenantId } = useAuth();
  const currentPlan = (tenant as any)?.plan || 'Standard POS';
  const effectiveTenantId = tenant?.tenantId || tenant?.id || tenantId;
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const resolved = resolveTabKey(tabParam);
    return isSettingsTabAllowedInPlan(resolved, currentPlan, effectiveTenantId) ? resolved : 'GENERAL';
  });

  useEffect(() => {
    const resolved = resolveTabKey(tabParam);
    if (isSettingsTabAllowedInPlan(resolved, currentPlan, effectiveTenantId)) {
      setActiveTab(resolved);
    } else {
      setActiveTab('GENERAL');
    }

    const handleCustomTabChange = (e: any) => {
      const targetTab = e?.detail;
      if (targetTab) {
        const resolvedTab = resolveTabKey(targetTab);
        if (isSettingsTabAllowedInPlan(resolvedTab, currentPlan, effectiveTenantId)) {
          setActiveTab(resolvedTab);
        }
      }
    };

    window.addEventListener('settings_tab_change', handleCustomTabChange);
    return () => window.removeEventListener('settings_tab_change', handleCustomTabChange);
  }, [tabParam, currentPlan, effectiveTenantId]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const activeTabMeta = SETTINGS_TABS.find(t => t.key === activeTab) || {
    key: activeTab,
    label: activeTab,
    icon: SettingsIcon
  };
  const ActiveIcon = activeTabMeta.icon;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in select-none">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between flex-shrink-0 z-10 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-xl">
            <ActiveIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Settings</h1>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-blue-100 dark:border-slate-700">
                {activeTabMeta.label}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Accessible directly from the Left Sidebar Navigation menu
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Theme Toggle Button */}
          <button
            type="button"
            onClick={() => {
              toggleTheme();
              showToast(isDarkMode ? '☀️ Switched to Light Day Mode' : '🌙 Switched to Dark Night Shift Mode');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer border ${
              isDarkMode
                ? 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`}
            title={isDarkMode ? 'Switch to Light Day Mode' : 'Switch to Dark Night Shift Mode'}
          >
            {isDarkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Night Shift</span>
              </>
            )}
          </button>

          {/* Close Window (X) button */}
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
            title="Close Settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area (Direct Component Rendering without Cluttered Top Sub-tab Bar) */}
      <main className="flex-1 min-w-0 overflow-y-auto bg-[#f8fafc] dark:bg-slate-950 p-4 sm:p-6 transition-colors">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'MANUAL PATCH' && <ManualPatchTab />}
          {activeTab === 'BACKUP & RESTORE' && <BackupRestoreTab />}
          {activeTab === 'QR CODE GENERATOR' && <BarcodeGeneratorTab />}
          {(activeTab === 'DOCUMENTATION' || activeTab === 'UPDATES') && <DocumentationTab />}
          {activeTab === 'GENERAL' && <GeneralTab />}
          {activeTab === 'WHATSAPP AUTOMATION' && <WhatsAppAutomationSettingsTab />}
          {activeTab === 'NAVIGATION & MENU PREFERENCES' && <MenuCustomizerSettings />}
          {activeTab === 'ADMIN SETTINGS' && <AdminSettingsTab />}
          {activeTab === 'CONTROLLED & GENERIC' && <ControlledAndGenericTab />}
          {activeTab === 'FEATURE FLAGS' && <FeatureFlagsTab />}
          {activeTab === 'SAFETY & LOCK' && <SafetyRulesTab />}
          {activeTab === 'MODULE VISIBILITY' && <ModuleVisibilityTab />}
          {activeTab === 'ROLES & RBAC' && <RbacManagementTab />}
          {activeTab === 'TRANSACTION' && <TransactionTab />}
          {activeTab === 'PRINT' && <PrintTab />}
          {activeTab === 'TAXES' && <TaxesTab />}
          {activeTab === 'USER MANAGEMENT' && <UserManagementTab />}
          {activeTab === 'PARTY' && <PartyTab />}
          {activeTab === 'ITEM' && <ItemTab />}
          {activeTab === 'PRICING & MARGIN' && <PricingMarginTab />}
        </div>
      </main>

    </div>
  );
};
