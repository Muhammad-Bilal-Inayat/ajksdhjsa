import React, { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { ToastProvider } from './contexts/ToastContext';
import { TransactionDockProvider } from './contexts/TransactionDockContext';
import { hasRouteAccess } from './lib/permissions';
import { checkGranularRouteAccess } from './lib/userAccessControl';
import { isMasterAdminAuthenticated } from './lib/masterServerService';
import { startAutomatedBackupService } from './lib/backupManager';
import { startClockIntegrityDaemon } from './lib/clockIntegrityService';
import { initializePwaService } from './lib/pwaService';
import { TimeTamperGuardModal } from './components/common/TimeTamperGuardModal';
import { SecretManualPatchModal } from './components/admin/SecretManualPatchModal';
import { UpdateNotificationBanner } from './components/common/UpdateNotificationBanner';
import { MbiAiWidget } from './components/common/MbiAiWidget';
import { TenantPlanProvider } from './context/TenantPlanContext';
import { AiGuidePage } from './pages/AiGuidePage';
import { licenseService } from './services/licenseService';
import { deviceSecurityService } from './services/deviceSecurityService';
import { syncEngine } from './lib/syncEngine';
import { LicenseActivationModal } from './components/modals/LicenseActivationModal';
import { DeviceUnauthorizedModal } from './components/common/DeviceUnauthorizedModal';
import { LicenseMilestoneAlert } from './components/common/LicenseMilestoneAlert';
import { GlobalBroadcastPopupModal } from './components/common/GlobalBroadcastPopupModal';
import { ShieldAlert, ArrowLeft, RefreshCw, RotateCcw, Lock } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

import { PendingApproval } from './components/PendingApproval';
import { AuthPage } from './pages/AuthPage';
import Login from './pages/Login';
import Register from './pages/Register';
import SetupBusiness from './pages/SetupBusiness';
import { LandingPage } from './pages/LandingPage';

// Resilient code-splitting wrapper with automatic cache-clearing retry and offline fallback
function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default?: T; [key: string]: any }>
) {
  return lazy(async () => {
    try {
      const module: any = await componentImport();
      if (module && module.default) {
        return { default: module.default };
      }
      if (module && typeof module === 'object') {
        const keys = Object.keys(module);
        for (const k of keys) {
          if (typeof module[k] === 'function' || (typeof module[k] === 'object' && module[k] !== null)) {
            return { default: module[k] };
          }
        }
      }
      return { default: (() => null) as unknown as T };
    } catch (error: any) {
      console.warn('[MBI Dynamic Import Chunk Notice]', error?.message);
      const isChunkError =
        error?.name === 'ChunkLoadError' ||
        /Failed to fetch dynamically imported module/i.test(error?.message || '') ||
        /error loading dynamically imported module/i.test(error?.message || '') ||
        /Importing a module script failed/i.test(error?.message || '');

      if (isChunkError && typeof window !== 'undefined') {
        const isOnline = navigator.onLine;
        const retryKey = 'mbi_chunk_retry_' + window.location.pathname;
        const alreadyRetried = sessionStorage.getItem(retryKey);

        // If online and haven't retried yet, clear chunk caches and reload once
        if (isOnline && !alreadyRetried) {
          sessionStorage.setItem(retryKey, 'true');
          if ('caches' in window) {
            try {
              const keys = await caches.keys();
              await Promise.all(keys.map(k => caches.delete(k)));
            } catch (e) {}
          }
          window.location.reload();
          return new Promise<{ default: T }>(() => {});
        }
      }

      // Safe offline fallback: never throw unhandled chunk error or crash the app
      return {
        default: (() => (
          <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center space-y-3 select-none">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-200 dark:border-blue-800">
              <RefreshCw className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Module Ready for Offline Use</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                This screen is available once loaded. Core billing, POS, inventory, and ledgers work 100% offline with zero internet required.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.location.href = '/user'}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Go to Dashboard
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer"
              >
                Reload
              </button>
            </div>
          </div>
        )) as any
      };
    }
  });
}

// Core POS/ERP pages imported directly for instant zero-latency navigation between side menus
import { Dashboard } from './pages/Dashboard';
import { UserPortalPage } from './pages/user/UserPortalPage';
import { Inventory } from './pages/Inventory';
import { Billing } from './pages/Billing';
import { Suppliers } from './pages/Suppliers';
import { Purchases } from './pages/Purchases';
import { Expenses } from './pages/Expenses';
import { Bank } from './pages/Bank';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { ShortageRegistry } from './pages/ShortageRegistry';
import { TopProducts } from './pages/TopProducts';
import { CashInHand } from './pages/CashInHand';
import { ShiftManagement } from './pages/ShiftManagement';
import { DailyNotes } from './pages/DailyNotes';
import { OnlineStoreManagement } from './pages/OnlineStoreManagement';
import { Utilities } from './pages/Utilities';
import { SyncAndShare } from './pages/SyncAndShare';
import { BookersManagement } from './pages/BookersManagement';
import { CustomerKhataPage } from './pages/CustomerKhataPage';
import { SupplierKhataPage } from './pages/SupplierKhataPage';
import { LedgersStatementsPage } from './pages/LedgersStatementsPage';
import { PurchaseInvoicePage } from './pages/PurchaseInvoicePage';
import { SaleInvoicePage } from './pages/SaleInvoicePage';
import { PartiesManagementPage } from './pages/PartiesManagementPage';

// Code-splitting / Lazy-loaded routes for secondary/marketing/external screens
const Pricing = lazyWithRetry(() => import('./pages/Pricing').then(m => ({ default: m.Pricing })));
const Feedback = lazyWithRetry(() => import('./pages/Feedback').then(m => ({ default: m.Feedback })));
const StoreLayout = lazyWithRetry(() => import('./pages/store/StoreLayout').then(m => ({ default: m.StoreLayout })));
const StoreHome = lazyWithRetry(() => import('./pages/store/StoreHome').then(m => ({ default: m.StoreHome })));
const StoreCatalog = lazyWithRetry(() => import('./pages/store/StoreCatalog').then(m => ({ default: m.StoreCatalog })));
const StoreProductDetail = lazyWithRetry(() => import('./pages/store/StoreProductDetail').then(m => ({ default: m.StoreProductDetail })));
const StoreCart = lazyWithRetry(() => import('./pages/store/StoreCart').then(m => ({ default: m.StoreCart })));
const StoreCheckout = lazyWithRetry(() => import('./pages/store/StoreCheckout').then(m => ({ default: m.StoreCheckout })));
const StoreOrderConfirmation = lazyWithRetry(() => import('./pages/store/StoreOrderConfirmation').then(m => ({ default: m.StoreOrderConfirmation })));
const StoreOrderTracking = lazyWithRetry(() => import('./pages/store/StoreOrderTracking').then(m => ({ default: m.StoreOrderTracking })));
const MasterPanelPage = lazyWithRetry(() => import('./pages/master/MasterPanelPage').then(m => ({ default: m.MasterPanelPage })));
const ServerOverviewPage = lazyWithRetry(() => import('./pages/server/ServerOverviewPage').then(m => ({ default: m.ServerOverviewPage })));
const MasterCommandCenter = lazyWithRetry(() => import('./pages/MasterCommandCenter').then(m => ({ default: m.MasterCommandCenter })));
const SEOStrategyPage = lazyWithRetry(() => import('./pages/SEOStrategyPage').then(m => ({ default: m.SEOStrategyPage })));
const SyncHealthPage = lazyWithRetry(() => import('./pages/SyncHealthPage'));
const BlogListingPage = lazyWithRetry(() => import('./pages/BlogListingPage').then(m => ({ default: m.BlogListingPage })));
const BlogDetailPage = lazyWithRetry(() => import('./pages/BlogDetailPage').then(m => ({ default: m.BlogDetailPage })));
const CheckoutPage = lazyWithRetry(() => import('./pages/CheckoutPage').then(m => ({ default: m.CheckoutPage })));
const MasterServerHub = lazyWithRetry(() => import('./pages/MasterServerHub').then(m => ({ default: m.MasterServerHub })));
const HelpDeskPage = lazyWithRetry(() => import('./pages/HelpDeskPage').then(m => ({ default: m.HelpDeskPage })));
const SoftwareUpdatesPage = lazyWithRetry(() => import('./pages/SoftwareUpdatesPage').then(m => ({ default: m.SoftwareUpdatesPage })));
const AiAssistantPage = lazyWithRetry(() => import('./pages/AiAssistantPage').then(m => ({ default: m.AiAssistantPage })));

// Lightweight, instant suspense loader
function RouteLoader() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 space-y-3">
      <div className="w-8 h-8 border-3 border-blue-500/20 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading module...</p>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, business, tenant, loading } = useAuth();
  const location = useLocation();
  const [loadTimedOut, setLoadTimedOut] = useState(false);

  // Safety timer: Never allow ProtectedRoute to hang in loading state indefinitely
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      setLoadTimedOut(true);
    }, 600);
    return () => clearTimeout(timer);
  }, [loading]);

  // Dedicated check for /server to verify active tenant context
  useEffect(() => {
    if (location.pathname.startsWith('/server')) {
      const activeTenantId = tenant?.id || business?.id || localStorage.getItem('mbi_active_business_id');
      if (!activeTenantId) {
        console.warn('[MBI Tenant Guard] Warning: /server route accessed without an active tenant context.');
      }
    }
  }, [location.pathname, tenant, business]);

  // Standalone Server direct access bypass (Self-contained authentication inside ServerOverviewPage)
  if (location.pathname.startsWith('/server') || location.pathname.startsWith('/master')) {
    return <>{children}</>;
  }

  if (loading && !loadTimedOut) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-10 h-10 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
        <div className="text-center space-y-1">
          <h2 className="text-base font-bold text-white tracking-tight">Starting MBI Inventra...</h2>
          <p className="text-xs text-slate-400">Verifying session & database state</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return <Navigate to="/login" replace />;
  if (!business && window.location.pathname !== '/setup') return <Navigate to="/setup" replace />;
  
  return <>{children}</>;
}

function RoleAccessGuard({ children }: { children: React.ReactNode }) {
  const { activeRole, activeUser, setActiveRole, setActiveUser, business, tenant, currentUser, userProfile, tenantId } = useAuth();
  const location = useLocation();
  const [permissionVersion, setPermissionVersion] = useState<number>(0);

  useEffect(() => {
    const handlePermissionsUpdated = (e?: any) => {
      // Ignore background ping and unrelated storage writes to prevent re-render cascading
      if (e instanceof StorageEvent && e.key && !e.key.startsWith('mbi_user') && !e.key.startsWith('mbi_permissions')) {
        return;
      }
      setPermissionVersion(v => v + 1);
    };
    window.addEventListener('mbi-user-access-profile-updated', handlePermissionsUpdated);
    window.addEventListener('mbi-effective-permissions-updated', handlePermissionsUpdated);
    window.addEventListener('storage', handlePermissionsUpdated);
    return () => {
      window.removeEventListener('mbi-user-access-profile-updated', handlePermissionsUpdated);
      window.removeEventListener('mbi-effective-permissions-updated', handlePermissionsUpdated);
      window.removeEventListener('storage', handlePermissionsUpdated);
    };
  }, []);

  // Save active route so reloading/refreshing re-opens the same page
  useEffect(() => {
    if (currentUser && location.pathname !== '/' && location.pathname !== '/login' && location.pathname !== '/register' && location.pathname !== '/pending-approval') {
      localStorage.setItem('mbi_last_active_route', location.pathname);
    }
  }, [location.pathname, currentUser]);

  // Master & Server Route Protection: Render ServerOverviewPage directly so it can present its dedicated secure login gate
  if (location.pathname.startsWith('/server') || location.pathname.startsWith('/master')) {
    return <>{children}</>;
  }

  // Check if user account is explicitly waiting for admin approval in Firestore
  const isMasterUser = 
    currentUser?.email === 'm.bilalinayat786@gmail.com' || 
    currentUser?.email === 'vip123@admin.com' || 
    currentUser?.uid === 'u1' || 
    currentUser?.uid === 'admin-master';

  if (userProfile && userProfile.isApproved === false && !isMasterUser) {
    return <PendingApproval />;
  }

  // Hard-lock paywall: If 10-day trial has expired and no paid license is active, lock POS billing, inventory, and ledgers
  if (licenseService.isHardLocked() && !isMasterUser) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4 sm:p-6 select-none">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl border-2 border-red-500/50 p-7 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto border border-red-300 dark:border-red-800 shadow-md">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
              TRIAL EXPIRED
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              🔒 10-Day Free Trial Expired
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              POS billing, inventory management, and ledgers are locked. To continue using MBI INVENTRA and access your pharmacy data please enter your License Key provided by MBI Support.
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 text-left space-y-1">
            <p className="font-bold text-[11px] text-slate-500 dark:text-slate-400">WhatsApp Support Hotline:</p>
            <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              0328-1302636 • 0336-4585863
            </p>
          </div>
          <LicenseActivationModal
            isOpen={true}
            isHardLock={true}
            onSuccess={() => setPermissionVersion(v => v + 1)}
          />
        </div>
      </div>
    );
  }

  const isRoleAllowed = hasRouteAccess(activeRole, location.pathname);
  
  const granularCheck = checkGranularRouteAccess(location.pathname, {
    role: activeRole,
    userId: activeUser?.id || currentUser?.uid,
    plan: (tenant as any)?.plan || (business as any)?.plan || 'Standard POS',
    tenantId: tenant?.tenantId || tenant?.id || tenantId
  });

  // Primary Admin has full administrative access to all core operational routes
  const isPrimaryAdminAllowed = (activeRole === 'Primary Admin' || isMasterUser) && !location.pathname.startsWith('/master-only');
  const isAllowed = isPrimaryAdminAllowed || (isRoleAllowed && granularCheck.isAllowed);

  if (!isAllowed) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Access Restricted</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {granularCheck.reason || (
                <>Your current active role (<span className="font-bold text-slate-800 dark:text-slate-200">{activeRole}</span>) does not have permission to view this module.</>
              )}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 text-left space-y-1">
            <p className="font-semibold text-slate-700 dark:text-slate-200">Access Policy:</p>
            <p>
              {granularCheck.blockingFactor?.includes('Subscription Plan') 
                ? 'This module requires a higher subscription plan (Business Gold or Enterprise Platinum).' 
                : <>Access to <span className="font-mono text-slate-800 dark:text-slate-100 font-bold">{location.pathname}</span> is protected by organization role and security settings.</>}
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
            <Link
              to="/user"
              className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </Link>

            <Link
              to="/pricing"
              className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Upgrade Plan</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <Layout />
    </ProtectedRoute>
  );
}

// Root Route Handler: When logged in, open /user (or last active route); otherwise show LandingPage
function RootRouteHandler() {
  const { currentUser, business, loading } = useAuth();

  useEffect(() => {
    console.log('%c[MBI Root Navigation Check]', 'color: #10b981; font-weight: bold;', {
      currentUser: currentUser?.email || currentUser?.uid || null,
      business: business?.name || null,
      loading,
      action: currentUser ? 'REDIRECT_TO_USER_DASHBOARD' : 'RENDER_LANDING_PAGE'
    });
  }, [currentUser, business, loading]);

  if (currentUser) {
    const savedRoute = localStorage.getItem('mbi_last_active_route');
    const targetRoute = savedRoute && savedRoute !== '/' && savedRoute !== '/home' && savedRoute !== '/login' ? savedRoute : '/user';
    return <Navigate to={targetRoute} replace />;
  }

  return <LandingPage />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        {/* Root Route: Redirects to /user when authenticated, LandingPage when guest */}
        <Route path="/" element={<RootRouteHandler />} />
        <Route path="/home" element={<RootRouteHandler />} />
        <Route path="/site" element={<LandingPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/plans" element={<LandingPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/blog" element={<BlogListingPage />} />
        <Route path="/blogs" element={<BlogListingPage />} />
        <Route path="/blog/:slug" element={<BlogDetailPage />} />
        <Route path="/blogs/:slug" element={<BlogDetailPage />} />

        {/* Authentication & Onboarding */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/workspace" element={<AuthPage />} />
        <Route path="/pending-approval" element={<PendingApproval />} />
        <Route path="/server" element={<MasterServerHub />} />
        <Route path="/server/lan" element={<MasterServerHub initialTab="lan_hub" />} />
        <Route path="/lan" element={<MasterServerHub initialTab="lan_hub" />} />
        <Route path="/server/command-center" element={<MasterCommandCenter />} />
        <Route path="/setup" element={<ProtectedRoute><SetupBusiness /></ProtectedRoute>} />

        {/* Public Online Storefront Routes */}
        <Route path="/store" element={<StoreLayout />}>
          <Route index element={<StoreHome />} />
          <Route path="products" element={<StoreCatalog />} />
          <Route path="product/:id" element={<StoreProductDetail />} />
          <Route path="cart" element={<StoreCart />} />
          <Route path="checkout" element={<StoreCheckout />} />
          <Route path="order-success/:id" element={<StoreOrderConfirmation />} />
          <Route path="track" element={<StoreOrderTracking />} />
        </Route>
        
        {/* Authenticated Workspace & POS Routes */}
        <Route element={<ProtectedLayout />}>
          <Route path="/user" element={<RoleAccessGuard><UserPortalPage /></RoleAccessGuard>} />
          <Route path="/user/ai-guide" element={<RoleAccessGuard><AiAssistantPage /></RoleAccessGuard>} />
          <Route path="/user/ai-assistant" element={<RoleAccessGuard><AiAssistantPage /></RoleAccessGuard>} />
          <Route path="/ai-guide" element={<RoleAccessGuard><AiAssistantPage /></RoleAccessGuard>} />
          <Route path="/ai-assistant" element={<RoleAccessGuard><AiAssistantPage /></RoleAccessGuard>} />
          <Route path="/user/helpdesk" element={<RoleAccessGuard><HelpDeskPage /></RoleAccessGuard>} />
          <Route path="/helpdesk" element={<RoleAccessGuard><HelpDeskPage /></RoleAccessGuard>} />
          <Route path="/help" element={<RoleAccessGuard><HelpDeskPage /></RoleAccessGuard>} />
          <Route path="/user/updates" element={<RoleAccessGuard><SoftwareUpdatesPage /></RoleAccessGuard>} />
          <Route path="/updates" element={<RoleAccessGuard><SoftwareUpdatesPage /></RoleAccessGuard>} />
          <Route path="/software-updates" element={<RoleAccessGuard><SoftwareUpdatesPage /></RoleAccessGuard>} />
          <Route path="/dashboard" element={<RoleAccessGuard><Dashboard /></RoleAccessGuard>} />
          <Route path="/server" element={<RoleAccessGuard><ServerOverviewPage /></RoleAccessGuard>} />
          <Route path="/online-store" element={<RoleAccessGuard><OnlineStoreManagement /></RoleAccessGuard>} />
          <Route path="/billing" element={<RoleAccessGuard><Billing /></RoleAccessGuard>} />
          <Route path="/sale" element={<RoleAccessGuard><Billing /></RoleAccessGuard>} />
          <Route path="/sale/invoices" element={<RoleAccessGuard><Billing /></RoleAccessGuard>} />
          <Route path="/sale/invoice" element={<RoleAccessGuard><SaleInvoicePage /></RoleAccessGuard>} />
          <Route path="/sale/inward" element={<RoleAccessGuard><SaleInvoicePage /></RoleAccessGuard>} />
          <Route path="/sale/quotation" element={<RoleAccessGuard><Billing /></RoleAccessGuard>} />
          <Route path="/sale/estimate" element={<RoleAccessGuard><Billing /></RoleAccessGuard>} />
          <Route path="/sale/payment-in" element={<RoleAccessGuard><Billing /></RoleAccessGuard>} />
          <Route path="/sale/order" element={<RoleAccessGuard><Billing /></RoleAccessGuard>} />
          <Route path="/sale/challan" element={<RoleAccessGuard><Billing /></RoleAccessGuard>} />
          <Route path="/sale/return" element={<RoleAccessGuard><Billing /></RoleAccessGuard>} />
          <Route path="/items" element={<RoleAccessGuard><Inventory /></RoleAccessGuard>} />
          <Route path="/inventory" element={<RoleAccessGuard><Inventory /></RoleAccessGuard>} />
          <Route path="/shortage-registry" element={<RoleAccessGuard><ShortageRegistry /></RoleAccessGuard>} />
          <Route path="/shortages" element={<RoleAccessGuard><ShortageRegistry /></RoleAccessGuard>} />
          <Route path="/shortage" element={<RoleAccessGuard><ShortageRegistry /></RoleAccessGuard>} />
          <Route path="/short-register" element={<RoleAccessGuard><ShortageRegistry /></RoleAccessGuard>} />
          <Route path="/shortage-book" element={<RoleAccessGuard><ShortageRegistry /></RoleAccessGuard>} />
          <Route path="/top-products" element={<RoleAccessGuard><TopProducts /></RoleAccessGuard>} />
          <Route path="/parties" element={<RoleAccessGuard><Suppliers /></RoleAccessGuard>} />
          <Route path="/parties/management" element={<RoleAccessGuard><PartiesManagementPage /></RoleAccessGuard>} />
          <Route path="/parties/customers" element={<RoleAccessGuard><CustomerKhataPage /></RoleAccessGuard>} />
          <Route path="/parties/suppliers" element={<RoleAccessGuard><SupplierKhataPage /></RoleAccessGuard>} />
          <Route path="/accounts/ledgers" element={<RoleAccessGuard><LedgersStatementsPage /></RoleAccessGuard>} />
          <Route path="/parties/ledgers" element={<RoleAccessGuard><LedgersStatementsPage /></RoleAccessGuard>} />
          <Route path="/bookers" element={<RoleAccessGuard><BookersManagement /></RoleAccessGuard>} />
          <Route path="/bookers-management" element={<RoleAccessGuard><BookersManagement /></RoleAccessGuard>} />
          <Route path="/order-bookers" element={<RoleAccessGuard><BookersManagement /></RoleAccessGuard>} />
          <Route path="/purchase" element={<RoleAccessGuard><Purchases /></RoleAccessGuard>} />
          <Route path="/purchases" element={<RoleAccessGuard><Purchases /></RoleAccessGuard>} />
          <Route path="/purchase/bills" element={<RoleAccessGuard><Purchases /></RoleAccessGuard>} />
          <Route path="/purchase/invoice" element={<RoleAccessGuard><PurchaseInvoicePage /></RoleAccessGuard>} />
          <Route path="/purchase/inward" element={<RoleAccessGuard><PurchaseInvoicePage /></RoleAccessGuard>} />
          <Route path="/purchase/payment-out" element={<RoleAccessGuard><Purchases /></RoleAccessGuard>} />
          <Route path="/purchase/order" element={<RoleAccessGuard><Purchases /></RoleAccessGuard>} />
          <Route path="/purchase/return" element={<RoleAccessGuard><Purchases /></RoleAccessGuard>} />
          <Route path="/expenses" element={<RoleAccessGuard><Expenses /></RoleAccessGuard>} />
          <Route path="/reports" element={<RoleAccessGuard><Reports /></RoleAccessGuard>} />
          <Route path="/bank" element={<RoleAccessGuard><Bank /></RoleAccessGuard>} />
          <Route path="/bank/accounts" element={<RoleAccessGuard><Bank /></RoleAccessGuard>} />
          <Route path="/bank/cash-in-hand" element={<RoleAccessGuard><CashInHand /></RoleAccessGuard>} />
          <Route path="/cash-in-hand" element={<RoleAccessGuard><CashInHand /></RoleAccessGuard>} />
          <Route path="/shift-management" element={<RoleAccessGuard><ShiftManagement /></RoleAccessGuard>} />
          <Route path="/sale/shifts" element={<RoleAccessGuard><ShiftManagement /></RoleAccessGuard>} />
          <Route path="/bank/shifts" element={<RoleAccessGuard><ShiftManagement /></RoleAccessGuard>} />
          <Route path="/bank/cheques" element={<RoleAccessGuard><Bank /></RoleAccessGuard>} />
          <Route path="/bank/loan-accounts" element={<RoleAccessGuard><Bank /></RoleAccessGuard>} />
          <Route path="/notes" element={<RoleAccessGuard><DailyNotes /></RoleAccessGuard>} />
          <Route path="/daily-notes" element={<RoleAccessGuard><DailyNotes /></RoleAccessGuard>} />
          <Route path="/quick-notes" element={<RoleAccessGuard><DailyNotes /></RoleAccessGuard>} />
          <Route path="/sync-share" element={<RoleAccessGuard><SyncAndShare /></RoleAccessGuard>} />
          <Route path="/sync-health" element={<RoleAccessGuard><SyncHealthPage /></RoleAccessGuard>} />
          <Route path="/sync/health" element={<RoleAccessGuard><SyncHealthPage /></RoleAccessGuard>} />
          <Route path="/utilities" element={<RoleAccessGuard><Utilities /></RoleAccessGuard>} />
          <Route path="/seo" element={<RoleAccessGuard><SEOStrategyPage /></RoleAccessGuard>} />
          <Route path="/settings" element={<RoleAccessGuard><Settings /></RoleAccessGuard>} />
          <Route path="/pricing" element={<RoleAccessGuard><Pricing /></RoleAccessGuard>} />
          <Route path="/feedback" element={<RoleAccessGuard><Feedback /></RoleAccessGuard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

function GlobalUrlSanitizer() {
  const location = useLocation();

  useEffect(() => {
    // If there is a hash in the address bar (e.g. /server#pricing or /#pricing)
    if (window.location.hash) {
      const hash = window.location.hash;
      // If we are on landing page and user accessed an anchor, let element scroll into view smoothly first
      if (location.pathname === '/' || location.pathname === '/home') {
        const targetId = hash.replace('#', '');
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth' });
        }
      }
      
      // Clean the URL address bar immediately so it shows /server or / instead of /server#pricing
      try {
        window.history.replaceState(null, '', location.pathname + location.search);
      } catch (e) {
        // Fallback in case of sandboxed restrictions
      }
    }
  }, [location.pathname, location.search, location.hash]);

  return null;
}

function TrialExpiryHardLockOverlay() {
  const [trialStatus, setTrialStatus] = useState(() => licenseService.getTrialStatus());
  const location = useLocation();

  useEffect(() => {
    const handleUpdate = () => {
      setTrialStatus(licenseService.getTrialStatus());
    };
    window.addEventListener('mbi-license-activated', handleUpdate);
    window.addEventListener('mbi-license-updated', handleUpdate);
    window.addEventListener('mbi-trial-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    const interval = setInterval(handleUpdate, 30000);
    return () => {
      window.removeEventListener('mbi-license-activated', handleUpdate);
      window.removeEventListener('mbi-license-updated', handleUpdate);
      window.removeEventListener('mbi-trial-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  // Bypass on backend server hub or authentication pages
  const isBypass = 
    location.pathname.startsWith('/server') || 
    location.pathname.startsWith('/master') ||
    location.pathname === '/login' ||
    location.pathname === '/register';

  if (isBypass) return null;

  if (trialStatus.isHardLocked) {
    return (
      <LicenseActivationModal
        isOpen={true}
        isHardLock={true}
        onSuccess={() => setTrialStatus(licenseService.getTrialStatus())}
      />
    );
  }

  return null;
}

function DeviceAuthorizationOverlay() {
  const { currentUser, tenant, business } = useAuth();
  const location = useLocation();

  const isBypass = 
    location.pathname.startsWith('/server') || 
    location.pathname.startsWith('/master') ||
    location.pathname === '/login' ||
    location.pathname === '/register';

  if (isBypass || !currentUser) return null;

  const tenantId = tenant?.id || business?.id || localStorage.getItem('mbi_active_business_id') || 'tenant_main';
  const userId = currentUser.uid || currentUser.id || 'user_active';

  return <DeviceUnauthorizedModal tenantId={tenantId} userId={userId} />;
}

export default function App() {
  useEffect(() => {
    console.log('%c[MBI App]%c App tree mounted successfully.', 'color: #3b82f6; font-weight: bold;', 'color: #94a3b8;');
    
    // Start automated background backup daemon
    try {
      const intervalStr = localStorage.getItem('mbi_auto_backup_interval');
      const interval = intervalStr ? parseInt(intervalStr, 10) : 15;
      startAutomatedBackupService(interval);
    } catch (e) {
      console.warn('Failed to start auto backup daemon:', e);
    }

    // Start system clock integrity & anti-time-tampering guard
    try {
      startClockIntegrityDaemon(6);
    } catch (e) {
      console.warn('Failed to start clock integrity monitor:', e);
    }

    // Initialize PWA Hot-Update Service
    try {
      initializePwaService();
    } catch (e) {
      console.warn('Failed to initialize PWA Hot-Update daemon:', e);
    }

    // Zero-Data-Loss Initial Device Sync & Cloud Pull on New Device / Fresh OS
    try {
      const activeTenant = localStorage.getItem('mbi_active_business_id') || localStorage.getItem('mbi_active_tenant') || '';
      if (activeTenant && activeTenant !== 'master') {
        const restoredKey = `mbi_cloud_restored_${activeTenant}`;
        if (!localStorage.getItem(restoredKey)) {
          syncEngine.restoreTenantCloudData(activeTenant, false).catch(() => {});
        }
      }
    } catch {}
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <GlobalUrlSanitizer />
        <AuthProvider>
          <TenantPlanProvider>
            <SettingsProvider>
              <ToastProvider>
                <TransactionDockProvider>
                  <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
                  <TimeTamperGuardModal />
                  <SecretManualPatchModal />
                  <UpdateNotificationBanner />
                  <MbiAiWidget />
                  <LicenseMilestoneAlert />
                  <GlobalBroadcastPopupModal />
                  <TrialExpiryHardLockOverlay />
                  <DeviceAuthorizationOverlay />
                  <AppRoutes />
                </TransactionDockProvider>
              </ToastProvider>
            </SettingsProvider>
          </TenantPlanProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
