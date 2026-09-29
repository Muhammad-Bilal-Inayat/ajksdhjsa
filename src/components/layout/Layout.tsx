import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { PWAInstallButton } from '../pwa/PWAComponents';
import { 
  Menu, Search, Plus, PlusCircle, Settings, 
  Bell, RefreshCw, Phone, MessageSquare, ShieldCheck, 
  Command, Headphones, Server, Key, Home, Users, Package, 
  ArrowDownLeft, ArrowUpRight, Receipt, ShoppingCart, X, AlertTriangle, Clock,
  LayoutGrid, Sparkles, Zap, Sun, Moon, Lock, Camera, Cloud, Building2,
  FileText, RotateCcw, ShoppingBag, FileCheck, FileSpreadsheet, Truck, RotateCw, Wallet, ArrowLeftRight
} from 'lucide-react';
import { GlobalProductScannerModal } from '../common/GlobalProductScannerModal';
import { CompanyProfileModal } from '../company/CompanyProfileModal';
import { ShortcutsModal } from './ShortcutsModal';
import { HelpSupportModal } from '../help/HelpSupportModal';
import { TransactionSearch } from './TransactionSearch';
import { useAuth } from '../../contexts/AuthContext';
import { MasterAdminModal } from '../admin/MasterAdminModal';
import { LicenseActivationModal } from '../modals/LicenseActivationModal';
import { PricingModal } from '../pricing/PricingModal';
import { FeedbackModal } from '../feedback/FeedbackModal';
import { FirebaseAuthModal } from '../admin/FirebaseAuthModal';
import { ExceptionCenterModal } from '../common/ExceptionCenterModal';
import { DataImportWizardModal } from '../common/DataImportWizardModal';
import { Product360Modal } from '../common/Product360Modal';
import { Customer360Modal } from '../common/Customer360Modal';
import { CashierShiftModal } from '../pos/CashierShiftModal';
import { MobileSubMenuModal } from './MobileSubMenuModal';
import { MobileBottomNav } from './MobileBottomNav';
import { StealthReturnBar } from '../common/StealthReturnBar';
import { EmergencyLockScreen } from '../common/EmergencyLockScreen';
import { BusinessContextSwitcher } from './BusinessContextSwitcher';
import { AuditLogViewerModal } from '../admin/AuditLogViewerModal';
import { SecurityVerificationCenterModal } from '../admin/SecurityVerificationCenterModal';
import { QuickPrivateTransactionModal } from '../modals/QuickPrivateTransactionModal';
import { privateTransactionService } from '../../services/privateTransactionService';
import { NotificationCenter } from './NotificationCenter';
import { SystemAlertNotificationBar } from './SystemAlertNotificationBar';
import { TrialStatusBanner } from '../common/TrialStatusBanner';
import { TrialCountdownBanner } from '../common/TrialCountdownBanner';
import { TrialExpiredModal } from '../common/TrialExpiredModal';
import { getLicenseInfo, getLastLocalBackupTime, verifyLicenseWithHardware, incrementActiveMinutes } from '../../lib/licenseManager';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { getBrandContact } from '../../lib/siteCmsService';
import { useSettings } from '../../contexts/SettingsContext';
import { Medicine, Supplier, CashierShift } from '../../types';
import { dbCashierShifts } from '../../lib/db';
import { calculateLiveShiftMetrics } from '../../lib/cashierShiftManager';
import { checkServerMasterAuth } from '../../lib/masterServerService';
import { 
  getStoredShortcuts, 
  matchesKeyboardEvent, 
  executeShortcutAction 
} from '../../lib/shortcutsManager';
import { useTransactionDock } from '../../contexts/TransactionDockContext';
import { TransactionHostModalLayer } from './TransactionHostModalLayer';
import { BroadcastAnnouncementModal } from '../common/BroadcastAnnouncementModal';

export const Layout: React.FC = () => {
  const { currentUser, activeRole, activeUser, business, tenant, tenantId, switchTenant, canPerform, canAccess, showTrialExpiredModal, setShowTrialExpiredModal } = useAuth();
  const { settings, isDarkMode, toggleTheme, userPreferences, updateUserPreferences } = useSettings();
  const { openTransaction } = useTransactionDock();
  const navigate = useNavigate();
  const location = useLocation();
  const isServerRoute = location.pathname.startsWith('/server');

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isSidebarCollapsed = userPreferences?.sidebarCollapsed ?? (localStorage.getItem('mbi_sidebar_collapsed') === 'true');

  const setIsSidebarCollapsed = (val: boolean) => {
    updateUserPreferences({ sidebarCollapsed: val });
  };

  const toggleSidebarCollapsed = () => {
    const next = !isSidebarCollapsed;
    updateUserPreferences({ sidebarCollapsed: next });
  };

  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isMasterAdminOpen, setIsMasterAdminOpen] = useState(false);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [isFirebaseAuthOpen, setIsFirebaseAuthOpen] = useState(false);
  const [isExceptionCenterOpen, setIsExceptionCenterOpen] = useState(false);
  const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);
  const [isCashierShiftOpen, setIsCashierShiftOpen] = useState(false);
  const [isAuditLogModalOpen, setIsAuditLogModalOpen] = useState(false);
  const [isQuickTransactionOpen, setIsQuickTransactionOpen] = useState(false);
  const [isGlobalScannerOpen, setIsGlobalScannerOpen] = useState(false);
  const [activeCashierShift, setActiveCashierShift] = useState<CashierShift | null>(null);
  const [selected360Product, setSelected360Product] = useState<Medicine | null>(null);
  const [selected360Party, setSelected360Party] = useState<Supplier | null>(null);
  const [contact, setContact] = useState(getBrandContact);

  useEffect(() => {
    const handleCmsUpdate = () => {
      setContact(getBrandContact());
    };
    window.addEventListener('mbi-site-cms-updated', handleCmsUpdate);
    return () => {
      window.removeEventListener('mbi-site-cms-updated', handleCmsUpdate);
    };
  }, []);
  const [isMobileQuickMenuOpen, setIsMobileQuickMenuOpen] = useState(false);
  const [isMobileSubMenuOpen, setIsMobileSubMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [licenseInfo, setLicenseInfo] = useState(() => getLicenseInfo());
  const [lastBackup, setLastBackup] = useState(() => getLastLocalBackupTime());

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [isSecurityVerificationOpen, setIsSecurityVerificationOpen] = useState(false);

  // Load active cashier shift
  const loadActiveShift = async () => {
    try {
      const active = await dbCashierShifts.getActiveShift();
      if (active) {
        const live = await calculateLiveShiftMetrics(active);
        setActiveCashierShift(live);
      } else {
        setActiveCashierShift(null);
      }
    } catch (e) {
      console.error('Failed to load active cashier shift:', e);
    }
  };

  useEffect(() => {
    loadActiveShift();
    const interval = setInterval(loadActiveShift, 30000);
    return () => clearInterval(interval);
  }, []);

  const canSale = canAccess('sale') && settings.modules?.sales !== false;
  const canPurchase = canAccess('purchase') && settings.modules?.purchases !== false;

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Hardware binding verification & live session time tracking
  useEffect(() => {
    // Run hardware binding check on startup
    verifyLicenseWithHardware().then(res => {
      if (res && !res.isValid && res.status === 'Hardware_Locked') {
        localStorage.setItem('mbi_emergency_lock_active', JSON.stringify({
          isLocked: true,
          reason: res.message || 'Hardware binding mismatch. Device not authorized.',
          timestamp: new Date().toISOString(),
          installationId: 'HW-MISMATCH'
        }));
        window.dispatchEvent(new CustomEvent('mbi-emergency-lock-triggered', {
          detail: { installationId: 'HW-MISMATCH', reason: res.message, mode: 'emergency_lock' }
        }));
      }
    }).catch(err => {
      console.warn('Hardware verification notice:', err);
    });

    // Track 1-minute live active pulse and session duration
    const interval = setInterval(() => {
      incrementActiveMinutes(1);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Listen for custom open modal events across the entire application
  useEffect(() => {
    const handleOpenPricing = () => setIsPricingModalOpen(true);
    const handleOpenFeedback = () => setIsFeedbackModalOpen(true);
    const handleOpenCashierShift = () => setIsCashierShiftOpen(true);
    const handleOpenExceptionCenter = () => setIsExceptionCenterOpen(true);
    const handleOpenImportWizard = () => setIsImportWizardOpen(true);
    const handleOpenCompanyProfile = () => setIsCompanyModalOpen(true);
    const handleOpenShortcuts = () => setIsShortcutsModalOpen(true);
    const handleOpenHelp = () => setIsHelpModalOpen(true);
    const handleOpenFirebaseAuth = () => setIsFirebaseAuthOpen(true);
    const handleOpenLicense = () => setIsLicenseModalOpen(true);
    const handleOpenMasterAdmin = () => {
      checkServerMasterAuth().then((isAuth) => {
        if (isAuth) {
          setIsMasterAdminOpen(true);
        }
      }).catch(() => {});
    };
    const handleOpenQuickTransaction = () => setIsQuickTransactionOpen(prev => !prev);
    const handleOpenGlobalScanner = () => setIsGlobalScannerOpen(true);
    const handleToggleSidebar = () => toggleSidebarCollapsed();
    const handleTriggerSync = () => {
      window.location.reload();
    };

    window.addEventListener('open-pricing-modal', handleOpenPricing);
    window.addEventListener('open-feedback-modal', handleOpenFeedback);
    window.addEventListener('open-cashier-shift', handleOpenCashierShift);
    window.addEventListener('open-exception-center', handleOpenExceptionCenter);
    window.addEventListener('open-import-wizard', handleOpenImportWizard);
    window.addEventListener('open-company-profile', handleOpenCompanyProfile);
    window.addEventListener('open-shortcuts-modal', handleOpenShortcuts);
    window.addEventListener('open-help-modal', handleOpenHelp);
    window.addEventListener('open-firebase-auth', handleOpenFirebaseAuth);
    window.addEventListener('open-license-modal', handleOpenLicense);
    window.addEventListener('open-master-admin', handleOpenMasterAdmin);
    window.addEventListener('open-quick-transaction-panel', handleOpenQuickTransaction);
    window.addEventListener('open-global-scanner', handleOpenGlobalScanner);
    window.addEventListener('toggle-sidebar-collapse', handleToggleSidebar);
    window.addEventListener('trigger-cloud-sync', handleTriggerSync);

    const handleOpenSale = (e: Event) => {
      const customEvent = e as CustomEvent;
      openTransaction('Sale', customEvent.detail?.initialData);
    };
    const handleOpenPurchase = (e: Event) => {
      const customEvent = e as CustomEvent;
      openTransaction('Purchase', customEvent.detail?.initialData);
    };
    const handleOpenGenericTx = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.type) {
        openTransaction(customEvent.detail.type, customEvent.detail.initialData);
      }
    };

    window.addEventListener('open-sale-modal', handleOpenSale);
    window.addEventListener('open-purchase-modal', handleOpenPurchase);
    window.addEventListener('open-transaction-modal', handleOpenGenericTx);

    return () => {
      window.removeEventListener('open-pricing-modal', handleOpenPricing);
      window.removeEventListener('open-feedback-modal', handleOpenFeedback);
      window.removeEventListener('open-cashier-shift', handleOpenCashierShift);
      window.removeEventListener('open-exception-center', handleOpenExceptionCenter);
      window.removeEventListener('open-import-wizard', handleOpenImportWizard);
      window.removeEventListener('open-company-profile', handleOpenCompanyProfile);
      window.removeEventListener('open-shortcuts-modal', handleOpenShortcuts);
      window.removeEventListener('open-help-modal', handleOpenHelp);
      window.removeEventListener('open-firebase-auth', handleOpenFirebaseAuth);
      window.removeEventListener('open-license-modal', handleOpenLicense);
      window.removeEventListener('open-master-admin', handleOpenMasterAdmin);
      window.removeEventListener('open-quick-transaction-panel', handleOpenQuickTransaction);
      window.removeEventListener('open-global-scanner', handleOpenGlobalScanner);
      window.removeEventListener('toggle-sidebar-collapse', handleToggleSidebar);
      window.removeEventListener('trigger-cloud-sync', handleTriggerSync);
      window.removeEventListener('open-sale-modal', handleOpenSale);
      window.removeEventListener('open-purchase-modal', handleOpenPurchase);
      window.removeEventListener('open-transaction-modal', handleOpenGenericTx);
    };
  }, []);

  // Global Dynamic Keyboard Shortcuts Engine (Editable & Live)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e || !e.key) return;

      // Close open modals on Escape
      if (e.key === 'Escape') {
        setIsNotificationsOpen(false);
        setIsShortcutsModalOpen(false);
        setIsCompanyModalOpen(false);
        setIsHelpModalOpen(false);
        return;
      }

      // If user is actively typing inside an input or textarea, only allow global control keys
      const target = e.target as HTMLElement | null;
      const isInputFocused = target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable
      );

      // F1 or Ctrl+Enter to toggle Shortcuts Hub anytime
      if (e.key === 'F1' || ((e.ctrlKey || e.metaKey) && e.key === 'Enter')) {
        e.preventDefault();
        setIsShortcutsModalOpen(prev => !prev);
        return;
      }

      // Alt+L or Ctrl+Shift+L to toggle Audit Log Vault for Primary Admin
      if ((e.altKey && (e.key === 'l' || e.key === 'L')) || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'L' || e.key === 'l'))) {
        e.preventDefault();
        setIsAuditLogModalOpen(prev => !prev);
        return;
      }

      // Check Private Transaction Engine Dynamic Hotkey (Default Alt+P / Custom)
      const pvtConfig = privateTransactionService.getConfig(tenantId || 'default');
      if (pvtConfig.enabled && !isServerRoute) {
        if (matchesKeyboardEvent(e, pvtConfig.shortcutKey || 'Alt+P') || (e.altKey && (e.key === 'p' || e.key === 'P'))) {
          e.preventDefault();
          setIsQuickTransactionOpen(prev => !prev);
          return;
        }
      }

      // If on server route, suppress retail store quick action shortcuts (like Alt+S for sale, Alt+P for purchase)
      if (isServerRoute && e.altKey && (e.key === 's' || e.key === 'S' || e.key === 'p' || e.key === 'P')) {
        return;
      }

      // Check against user's active/customized shortcuts (including Quick Private Transaction)
      const currentShortcuts = getStoredShortcuts();
      const matched = currentShortcuts.find(item => matchesKeyboardEvent(e, item.currentKey));

      if (matched) {
        e.preventDefault();
        executeShortcutAction(matched, navigate);
        return;
      }

      // If in input field, don't trigger single letter shortcuts unless combined with Alt/Ctrl
      if (isInputFocused && !e.altKey && !e.ctrlKey && !e.metaKey && !(typeof e.key === 'string' && e.key.startsWith('F'))) {
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const handleOpenAuditModal = () => setIsAuditLogModalOpen(true);
    window.addEventListener('open-audit-log-modal', handleOpenAuditModal);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-audit-log-modal', handleOpenAuditModal);
    };
  }, [navigate]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#f1f5f9] dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans relative transition-colors duration-150">
      {/* Master Server Emergency Remote Lock Screen */}
      <EmergencyLockScreen />
      
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar 
          isOpen={isSidebarOpen} 
          setIsOpen={setIsSidebarOpen} 
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />
        
        <div className="flex flex-col flex-1 min-w-0 bg-[#f1f5f9] dark:bg-slate-950">
          <Header
            isServerRoute={isServerRoute}
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={() => {
              if (window.innerWidth < 1024) {
                setIsSidebarOpen(prev => !prev);
              } else {
                toggleSidebarCollapsed();
              }
            }}
            activeCashierShift={activeCashierShift}
            onOpenCashierShift={() => setIsCashierShiftOpen(true)}
            onOpenAuditLogs={() => setIsAuditLogModalOpen(true)}
            onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
            onOpenHelp={() => setIsHelpModalOpen(true)}
            onOpenImportWizard={() => setIsImportWizardOpen(true)}
            onOpenExceptionCenter={() => setIsExceptionCenterOpen(true)}
            unreadCount={unreadNotificationsCount}
            onUnreadCountChange={setUnreadNotificationsCount}
          />

          {/* System Near-Expiry & Reorder-Threshold Notification Bar */}
          {!isServerRoute && <SystemAlertNotificationBar />}

          {/* Top 10-Day Free Trial Countdown Banner */}
          {!isServerRoute && (
            <TrialCountdownBanner 
              onOpenLicenseModal={() => setIsLicenseModalOpen(true)}
            />
          )}

          <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 bg-[#f1f5f9] dark:bg-slate-950 pb-20 md:pb-6 transition-colors duration-150">
            <div className="mx-auto max-w-full">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar */}
      {!isServerRoute && (
        <MobileBottomNav 
          onOpenMobileMenu={() => setIsMobileSubMenuOpen(true)}
        />
      )}

      <CompanyProfileModal 
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
      />

      <ShortcutsModal 
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      <HelpSupportModal 
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />

      <MasterAdminModal
        isOpen={isMasterAdminOpen}
        onClose={() => setIsMasterAdminOpen(false)}
      />

      <LicenseActivationModal
        isOpen={isLicenseModalOpen}
        onClose={() => setIsLicenseModalOpen(false)}
        onSuccess={() => setLicenseInfo(getLicenseInfo())}
      />

      <PricingModal 
        isOpen={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
      />

      <FeedbackModal 
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
      />

      <FirebaseAuthModal 
        isOpen={isFirebaseAuthOpen}
        onClose={() => setIsFirebaseAuthOpen(false)}
      />

      <ExceptionCenterModal
        isOpen={isExceptionCenterOpen}
        onClose={() => setIsExceptionCenterOpen(false)}
        onOpenProduct360={(prod) => setSelected360Product(prod)}
        onOpenCustomer360={(party) => setSelected360Party(party)}
      />

      <DataImportWizardModal
        isOpen={isImportWizardOpen}
        onClose={() => setIsImportWizardOpen(false)}
      />

      <Product360Modal
        product={selected360Product}
        isOpen={!!selected360Product}
        onClose={() => setSelected360Product(null)}
      />

      <Customer360Modal
        party={selected360Party}
        isOpen={!!selected360Party}
        onClose={() => setSelected360Party(null)}
      />

      <CashierShiftModal
        isOpen={isCashierShiftOpen}
        onClose={() => setIsCashierShiftOpen(false)}
        onShiftStatusChange={(s) => setActiveCashierShift(s)}
      />

      {/* Primary Admin Protected Audit Log Vault */}
      <AuditLogViewerModal
        isOpen={isAuditLogModalOpen}
        onClose={() => setIsAuditLogModalOpen(false)}
      />

      {/* Quick Private Transaction Panel (Alt + P & Discreet PIN Gate) */}
      <QuickPrivateTransactionModal
        isOpen={isQuickTransactionOpen}
        onClose={() => setIsQuickTransactionOpen(false)}
      />

      {/* Mobile Sub-Menu & Quick Tools Sheet */}
      <MobileSubMenuModal 
        isOpen={isMobileSubMenuOpen}
        onClose={() => setIsMobileSubMenuOpen(false)}
        currentUser={currentUser}
        activeUser={activeUser}
        activeRole={activeRole}
        activeCashierShift={activeCashierShift}
        onOpenCompanyModal={() => setIsCompanyModalOpen(true)}
        onOpenHelpModal={() => setIsHelpModalOpen(true)}
        onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
        onOpenFirebaseAuth={() => setIsFirebaseAuthOpen(true)}
        onOpenCashierShift={() => setIsCashierShiftOpen(true)}
        onOpenExceptionCenter={() => setIsExceptionCenterOpen(true)}
        onOpenImportWizard={() => setIsImportWizardOpen(true)}
        onOpenPricingModal={() => setIsPricingModalOpen(true)}
        onOpenFeedbackModal={() => setIsFeedbackModalOpen(true)}
        onOpenMasterAdmin={() => setIsMasterAdminOpen(true)}
        onOpenLicenseModal={() => setIsLicenseModalOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        unreadNotificationsCount={unreadNotificationsCount}
      />

      {/* Trial Expired Full Modal */}
      <TrialExpiredModal
        isOpen={showTrialExpiredModal}
        onClose={() => setShowTrialExpiredModal(false)}
        onOpenLicenseModal={() => setIsLicenseModalOpen(true)}
      />

      {/* Global Product Camera Scanner Modal */}
      <GlobalProductScannerModal
        isOpen={isGlobalScannerOpen}
        onClose={() => setIsGlobalScannerOpen(false)}
        onOpenProduct360={(med) => setSelected360Product(med)}
      />

      {/* Security, Isolation & Sync Verification Center */}
      <SecurityVerificationCenterModal
        isOpen={isSecurityVerificationOpen}
        onClose={() => setIsSecurityVerificationOpen(false)}
      />

      {/* Global Multi-Transaction Window Layer & Minimized Dock Bar */}
      <TransactionHostModalLayer />

      {/* Fleet Live Broadcast 1-Time Screen Popup Modal */}
      <BroadcastAnnouncementModal />
    </div>
  );
};
