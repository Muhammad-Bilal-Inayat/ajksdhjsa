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
import { getActiveImpersonation } from './lib/impersonationService';
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
import { HomePagePopupModal } from './components/landing/HomePagePopupModal';
import { AppLockModal } from './components/common/AppLockModal';
import { ShieldAlert, ArrowLeft, RefreshCw, RotateCcw, Lock } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

import { PendingApproval } from './components/PendingApproval';

// Resilient code-splitting wrapper with automatic cache-clearing retry and offline fallback
function lazyWithRetry<T extends React.ComponentType<any> = React.ComponentType<any>>(
  componentImport: () => Promise<{ default?: T; [key: string]: any }>
): React.LazyExoticComponent<T> {
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
      return { default: module as unknown as T };
    } catch (firstError: any) {
      console.warn('[MBI Dynamic Import Retry]', firstError?.message);
      try {
        await new Promise(res => setTimeout(res, 250));
        const retryModule: any = await componentImport();
        if (retryModule && retryModule.default) return { default: retryModule.default };
        return { default: retryModule as unknown as T };
      } catch (retryError: any) {
        console.warn('[MBI Dynamic Import Notice]', retryError?.message);
        return {
          default: (() => (
            <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-200 max-w-sm shadow-xl space-y-3">
                <p className="text-xs text-slate-300 font-medium">Session refreshed. Click to reload screen.</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  Reload Screen
                </button>
              </div>
            </div>
          )) as unknown as T
        };
      }
    }
  }) as React.LazyExoticComponent<T>;
}

const LandingPage = lazyWithRetry(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const AuthPage = lazyWithRetry(() => import('./pages/AuthPage').then(m => ({ default: m.AuthPage })));
const Login = lazyWithRetry(() => import('./pages/Login').then(m => ({ default: m.default || m.Login || m.LoginPage })));
const Register = lazyWithRetry(() => import('./pages/Register').then(m => ({ default: m.default || m.Register || m.RegisterPage })));
const SetupBusiness = lazyWithRetry(() => import('./pages/SetupBusiness'));
const MasterServerHub = lazyWithRetry<React.FC<{ initialTab?: string }>>(() => import('./pages/MasterServerHub').then(m => ({ default: m.default || m.MasterServerHub })));

// Core POS/ERP pages code-split for lightning-fast initial page load and 0ms navigation
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const UserPortalPage = lazyWithRetry(() => import('./pages/user/UserPortalPage').then(m => ({ default: m.UserPortalPage })));
const Inventory = lazyWithRetry(() => import('./pages/Inventory').then(m => ({ default: m.Inventory })));
const Billing = lazyWithRetry(() => import('./pages/Billing').then(m => ({ default: m.Billing })));
const Suppliers = lazyWithRetry(() => import('./pages/Suppliers').then(m => ({ default: m.Suppliers })));
const Purchases = lazyWithRetry(() => import('./pages/Purchases').then(m => ({ default: m.Purchases })));
const Expenses = lazyWithRetry(() => import('./pages/Expenses').then(m => ({ default: m.Expenses })));
const Bank = lazyWithRetry(() => import('./pages/Bank').then(m => ({ default: m.Bank })));
const Reports = lazyWithRetry(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const Settings = lazyWithRetry(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const ShortageRegistry = lazyWithRetry(() => import('./pages/ShortageRegistry').then(m => ({ default: m.ShortageRegistry })));
const TopProducts = lazyWithRetry(() => import('./pages/TopProducts').then(m => ({ default: m.TopProducts })));
const CashInHand = lazyWithRetry(() => import('./pages/CashInHand').then(m => ({ default: m.CashInHand })));
const ShiftManagement = lazyWithRetry(() => import('./pages/ShiftManagement').then(m => ({ default: m.ShiftManagement })));
const DailyNotes = lazyWithRetry(() => import('./pages/DailyNotes').then(m => ({ default: m.DailyNotes })));
const Utilities = lazyWithRetry(() => import('./pages/Utilities').then(m => ({ default: m.Utilities })));
const SyncAndShare = lazyWithRetry(() => import('./pages/SyncAndShare').then(m => ({ default: m.SyncAndShare })));
const CustomerKhataPage = lazyWithRetry(() => import('./pages/CustomerKhataPage').then(m => ({ default: m.CustomerKhataPage })));
const SupplierKhataPage = lazyWithRetry(() => import('./pages/SupplierKhataPage').then(m => ({ default: m.SupplierKhataPage })));
const LedgersStatementsPage = lazyWithRetry(() => import('./pages/LedgersStatementsPage').then(m => ({ default: m.LedgersStatementsPage })));
const PurchaseInvoicePage = lazyWithRetry(() => import('./pages/PurchaseInvoicePage').then(m => ({ default: m.PurchaseInvoicePage })));
const SaleInvoicePage = lazyWithRetry(() => import('./pages/SaleInvoicePage').then(m => ({ default: m.SaleInvoicePage })));
const PartiesManagementPage = lazyWithRetry(() => import('./pages/PartiesManagementPage').then(m => ({ default: m.PartiesManagementPage })));
const OnlineStoreManagement = lazyWithRetry(() => import('./pages/OnlineStoreManagement').then(m => ({ default: m.OnlineStoreManagement })));
const BookersManagement = lazyWithRetry(() => import('./pages/BookersManagement').then(m => ({ default: m.BookersManagement })));

// Marketing, Public Storefront & Master Admin Portals
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
const HelpDeskPage = lazyWithRetry(() => import('./pages/HelpDeskPage').then(m => ({ default: m.HelpDeskPage })));
const SoftwareUpdatesPage = lazyWithRetry(() => import('./pages/SoftwareUpdatesPage').then(m => ({ default: m.SoftwareUpdatesPage })));
const AiAssistantPage = lazyWithRetry(() => import('./pages/AiAssistantPage').then(m => ({ default: m.AiAssistantPage })));

import { RouteSkeletonLoader } from './components/common/RouteSkeletonLoader';

// Lightweight, instant suspense skeleton loader
function RouteLoader() {
  return <RouteSkeletonLoader type="general" />;
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

  const isShadowModeActive = Boolean(
    localStorage.getItem('mbi_shadow_token') || 
    new URLSearchParams(window.location.search).get('shadow_token')
  );

  if (!currentUser && !isShadowModeActive) return <Navigate to="/login" replace />;
  if (!business && !isShadowModeActive && window.location.pathname !== '/setup') return <Navigate to="/setup" replace />;
  
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

  // Check if user account is explicitly waiting for admin approval in Firestore or is Master Admin / Shadow / Tenant Inspection
  const isMasterUser = 
    currentUser?.email === 'm.bilalinayat786@gmail.com' || 
    currentUser?.uid === 'admin-master' ||
    Boolean(getActiveImpersonation()) ||
    isMasterAdminAuthenticated() ||
    (typeof window !== 'undefined' && (
      localStorage.getItem('mbi_is_shadow_mode') === 'true' ||
      localStorage.getItem('mbi_shadow_token') === 'master_stealth_switch' ||
      localStorage.getItem('mbi_master_token') !== null ||
      localStorage.getItem('mbi_is_master_admin') === 'true'
    ));

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

  const isPrimaryOwnerRole = activeRole === 'Primary Admin' || activeRole === 'Secondary Admin' || activeRole === 'Admin' || activeRole === 'Owner' || activeRole === 'Store Owner' || activeRole === 'Company Tenant';

  // Primary Admin & Tenant Owner have full access to company modules and reports
  const isAllowed = isMasterUser || (granularCheck.isAllowed && (isPrimaryOwnerRole || isRoleAllowed)) || (isPrimaryOwnerRole && !location.pathname.startsWith('/master'));

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
        <Route path="/server" element={<ErrorBoundary><MasterServerHub /></ErrorBoundary>} />
        <Route path="/server/lan" element={<ErrorBoundary><MasterServerHub initialTab="lan_hub" /></ErrorBoundary>} />
        <Route path="/lan" element={<ErrorBoundary><MasterServerHub initialTab="lan_hub" /></ErrorBoundary>} />
        <Route path="/server/command-center" element={<ErrorBoundary><MasterCommandCenter /></ErrorBoundary>} />
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

  // Bypass on backend server hub, lan hub, or authentication pages
  const isBypass = 
    location.pathname.startsWith('/server') || 
    location.pathname.startsWith('/lan') || 
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
    location.pathname.startsWith('/lan') || 
    location.pathname.startsWith('/master') ||
    location.pathname === '/' ||
    location.pathname === '/home' ||
    location.pathname === '/login' ||
    location.pathname === '/register';

  if (isBypass || !currentUser) return null;

  const tenantId = tenant?.id || business?.id || localStorage.getItem('mbi_active_business_id') || 'tenant_main';
  const userId = currentUser.uid || currentUser.id || 'user_active';

  return <DeviceUnauthorizedModal tenantId={tenantId} userId={userId} />;
}

export default function App() {
  useEffect(() => {
    // Non-blocking background daemons: Defer by 1000ms so initial UI renders immediately at 0ms!
    const timer = setTimeout(() => {
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
    }, 1000);

    return () => clearTimeout(timer);
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
                  <AppLockModal />
                  <TimeTamperGuardModal />
                  <SecretManualPatchModal />
                  <UpdateNotificationBanner />
                  <MbiAiWidget />
                  <LicenseMilestoneAlert />
                  <GlobalBroadcastPopupModal />
                  <HomePagePopupModal />
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
