import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, Users, Package, FileText, ShoppingCart, Wallet, Landmark, 
  BarChart2, Plus, ChevronDown, ChevronUp, RefreshCw, X, ChevronRight,
  Building2, Settings, Database, Wrench, Award, MessageSquare, RotateCcw,
  CheckCircle2, Download, TrendingUp, Flame, PanelLeftClose, PanelLeftOpen,
  DollarSign, ShoppingBag, Store, Server, Lock, AlertTriangle, Zap, User,
  CreditCard, Globe, Sparkles, HardDrive, BookOpen, ShieldAlert, ArrowLeft,
  Shield, Sliders, Key, Smartphone, BarChart3, Activity, Phone, Laptop, UserCheck, Bot
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useTransactionDock } from '../../contexts/TransactionDockContext';
import { CompanyProfileModal } from '../company/CompanyProfileModal';
import { ROLE_DEFINITIONS } from '../../lib/permissions';
import { BackupModals } from '../backup/BackupModals';
import { exportFullBackup } from '../../lib/db';
import { backupService } from '../../services/backupService';
import { REPORT_LIST, ReportItemDef } from '../../pages/Reports';
import { SETTINGS_TABS, resolveTabKey } from '../../pages/Settings';
import { syncEngine, SyncStatus } from '../../lib/syncEngine';
import { getSidebarMenuConfig, isMasterAdminAuthenticated } from '../../lib/masterServerService';
import { PWAInstallButton } from '../pwa/PWAComponents';
import { checkGranularRouteAccess, evaluatePermission } from '../../lib/userAccessControl';
import { isReportAllowedInPlan, hasPlanFeature, isRouteAllowedInPlan, isSettingsTabAllowedInPlan } from '../../lib/planFeatureManager';
import { isPrimaryOwner, canAccessBackupRestore, isRouteAllowedForRole, hasCoreMenuAccess, BASELINE_PHARMACY_MODULES } from '../../services/rbacService';
import { planService } from '../../services/planService';
import { NavItem, NavSubItem } from '../../types/navigation';
import { 
  CATEGORIZED_REPORTS, 
  RAW_NAVIGATION_ITEMS, 
  getFilteredNavigation, 
  getFilteredCategorizedReports, 
  ReportCategoryGroup 
} from './navigationConfig';
import { 
  isModuleAllowed as isPlanModuleAllowed, 
  isReportAllowed as isPlanReportAllowed, 
  isRouteAllowed as isPlanRouteAllowed, 
  getActiveTenantPlan, 
  isPlanSufficient,
  PlanTier 
} from '../../utils/planPermissions';
import { getEffectiveAllowedMenus } from '../../utils/rolePermissions';

const REPORT_CATEGORIES = [
  {
    categoryLabel: 'Transaction report',
    items: REPORT_LIST.filter(r => r.category === 'TRANSACTION')
  },
  {
    categoryLabel: 'Party report',
    items: REPORT_LIST.filter(r => r.category === 'PARTY')
  },
  {
    categoryLabel: 'Item/ Stock report',
    items: REPORT_LIST.filter(r => r.category === 'ITEM_STOCK')
  },
  {
    categoryLabel: 'Business Status',
    items: REPORT_LIST.filter(r => r.category === 'BUSINESS_STATUS')
  },
  {
    categoryLabel: 'Taxes',
    items: REPORT_LIST.filter(r => r.category === 'TAXES')
  },
  {
    categoryLabel: 'Expense report',
    items: REPORT_LIST.filter(r => r.category === 'EXPENSE')
  },
  {
    categoryLabel: 'Sale/ Purchase Order report',
    items: REPORT_LIST.filter(r => r.category === 'ORDERS')
  },
  {
    categoryLabel: 'Loan Accounts',
    items: REPORT_LIST.filter(r => r.category === 'LOANS')
  },
];

const mainNavItems: NavItem[] = RAW_NAVIGATION_ITEMS;

interface ServerNavItemDef {
  tabKey: 'clients' | 'ai_support' | 'whatsapp_leads' | 'site_cms' | 'security_alerts' | 'security_audit' | 'sales_revenue' | 'storage' | 'sync_health' | 'sync_stream' | 'pricing_manager' | 'seo_strategy' | 'cloud_health' | 'docs' | 'master_control' | 'users' | 'database' | 'devices';
  label: string;
  badge: string;
  badgeColor?: string;
  icon: any;
}

const SERVER_FLEET_ITEMS: ServerNavItemDef[] = [
  { tabKey: 'master_control', label: 'Master Control (173 Switchboard)', badge: '173', badgeColor: 'bg-purple-600', icon: Sliders },
  { tabKey: 'clients', label: 'Client Fleet & User Suite', badge: 'Fleet', badgeColor: 'bg-blue-600', icon: Building2 },
  { tabKey: 'sync_stream', label: 'Real-Time Activity & Sync Engine', badge: 'Live', badgeColor: 'bg-indigo-600', icon: Activity },
  { tabKey: 'ai_support', label: 'AI Assistant & Support Hub', badge: 'AI', badgeColor: 'bg-purple-600', icon: Bot },
  { tabKey: 'devices', label: 'Device Auth & Fleet Lock', badge: '1-Dev', icon: Laptop },
  { tabKey: 'security_audit', label: 'Security Audit Log & IP Block', badge: 'Audit', icon: ShieldAlert },
  { tabKey: 'whatsapp_leads', label: 'Registration Leads & WhatsApp', badge: 'Leads', icon: Phone },
  { tabKey: 'database', label: 'Medicine DB Initialization', badge: 'Data', icon: Database },
  { tabKey: 'site_cms', label: 'Site CMS & Landing', badge: 'Website', icon: Store },
  { tabKey: 'sales_revenue', label: 'Global Sales & Revenue', badge: 'PKR', icon: DollarSign },
  { tabKey: 'storage', label: 'Tenant Storage Quota', badge: 'Disk', icon: HardDrive },
  { tabKey: 'sync_health', label: 'Sync Health (30-Day SLA)', badge: 'SLA', icon: BarChart3 },
  { tabKey: 'cloud_health', label: 'Cloud Diagnostics', badge: 'Cloud', icon: HardDrive },
  { tabKey: 'pricing_manager', label: 'Plans & Pricing (SaaS)', badge: 'Plans', icon: CreditCard },
  { tabKey: 'seo_strategy', label: 'SEO Strategy & Schema', badge: 'SEO', icon: Sparkles },
  { tabKey: 'security_alerts', label: 'Security Threat Radar', badge: 'Radar', icon: ShieldAlert },
  { tabKey: 'docs', label: 'Server Documentation', badge: 'Manual', icon: BookOpen },
];

const SERVER_USER_ITEMS: ServerNavItemDef[] = [
  { tabKey: 'users', label: 'Users & Passcodes Directory', badge: 'RBAC', icon: Users },
];

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (val: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  setIsOpen,
  isCollapsed = false,
  setIsCollapsed
}) => {
  const { business, activeRole, activeUser, currentUser, tenant, tenantId, canAccess } = useAuth();
  const { settings, userPreferences } = useSettings();
  const { openTransaction } = useTransactionDock();
  const location = useLocation();
  const navigate = useNavigate();
  const isServerRoute = location.pathname.startsWith('/server');
  const [activeServerTab, setActiveServerTab] = useState<string>('clients');
  const [permissionVersion, setPermissionVersion] = useState<number>(0);

  useEffect(() => {
    const handlePermissionsUpdated = (e?: StorageEvent | Event) => {
      if (e && 'key' in e && e.key) {
        const relevantKeys = [
          'mbi_user_access_profile',
          'mbi_effective_permissions',
          'mbi_master_active_users_v3',
          'mbi_master_tenants_v1',
          'mbi_saas_pricing_plans_v2',
          'user_preferences'
        ];
        if (!relevantKeys.includes(e.key)) return;
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

  useEffect(() => {
    const handleActiveTab = (e: any) => {
      if (e.detail) setActiveServerTab(e.detail);
    };
    window.addEventListener('mbi-active-server-tab-changed', handleActiveTab as any);
    return () => window.removeEventListener('mbi-active-server-tab-changed', handleActiveTab as any);
  }, []);

  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  
  // Modals state for Backup/Restore
  const [activeBackupModal, setActiveBackupModal] = useState<'auto' | 'computer' | 'drive' | 'restore' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Explicit state for dropdowns (Sale, Purchase, Cash & Bank, Backup/Restore, Utilities, Reports)
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    Sale: true,
    Purchase: true,
    'Cash & Bank': false,
    'Backup/Restore': false,
    Utilities: true,
    Reports: false,
    Settings: false,
  });

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [isSyncing, setIsSyncing] = useState(false);
  const [, setPatchVersion] = useState(0);

  // Secret 5-click trigger for developer patch terminal on touchscreens
  const secretClickCount = React.useRef(0);
  const secretClickTimer = React.useRef<any>(null);
  const handleSecretClick = () => {
    secretClickCount.current++;
    if (secretClickTimer.current) clearTimeout(secretClickTimer.current);
    secretClickTimer.current = setTimeout(() => {
      secretClickCount.current = 0;
    }, 2000);
    if (secretClickCount.current >= 5) {
      secretClickCount.current = 0;
      window.dispatchEvent(new CustomEvent('open-secret-patch-terminal'));
    }
  };

  useEffect(() => {
    const handlePatchChange = () => setPatchVersion(v => v + 1);
    window.addEventListener('mbi-patch-applied', handlePatchChange);
    window.addEventListener('saas-plans-updated', handlePatchChange);
    return () => {
      window.removeEventListener('mbi-patch-applied', handlePatchChange);
      window.removeEventListener('saas-plans-updated', handlePatchChange);
    };
  }, []);

  useEffect(() => {
    const unsub = syncEngine.subscribe((status) => {
      setSyncStatus(status);
    });
    return unsub;
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    showToast('Synchronizing with cloud and all connected browsers...');
    await syncEngine.pullServerSync(true);
    await syncEngine.pushServerSync();
    setTimeout(() => {
      setIsSyncing(false);
      showToast('All data successfully synchronized!');
    }, 600);
  };

  // Automatically keep section open if user is currently on that route
  useEffect(() => {
    if (location.pathname.startsWith('/sale')) {
      setExpandedMenus(prev => ({ ...prev, 'Sales ': true, Sale: true }));
    } else if (location.pathname.startsWith('/items') || location.pathname.startsWith('/inventory') || location.pathname.startsWith('/shortage')) {
      setExpandedMenus(prev => ({ ...prev, 'Items ': true, Items: true }));
    } else if (location.pathname.startsWith('/purchase')) {
      setExpandedMenus(prev => ({ ...prev, 'Purchases ': true, Purchase: true }));
    } else if (location.pathname.startsWith('/parties')) {
      setExpandedMenus(prev => ({ ...prev, 'Parties ': true, Parties: true }));
    } else if (location.pathname.startsWith('/bank') || location.pathname.startsWith('/cash-in-hand')) {
      setExpandedMenus(prev => ({ ...prev, 'Bank Accounts': true, 'Cash & Bank': true }));
    } else if (location.pathname.startsWith('/utilities')) {
      setExpandedMenus(prev => ({ ...prev, Utilities: true }));
    } else if (location.pathname.startsWith('/reports')) {
      setExpandedMenus(prev => ({ ...prev, Reports: true, 'Reports ': true }));
    } else if (location.pathname.startsWith('/settings')) {
      setExpandedMenus(prev => ({ ...prev, Settings: true }));
    }
  }, [location.pathname]);

  const toggleDropdown = (label: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedMenus(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  const handleQuickAdd = (addPath: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(addPath);
    setIsOpen(false);
  };

  const handleQuickAction = (itemId: string, defaultAddPath?: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (itemId === 'sale') {
      openTransaction('Sale');
    } else if (itemId === 'purchase') {
      openTransaction('Purchase');
    } else if (itemId === 'items') {
      navigate('/items?action=add');
    } else if (itemId === 'parties') {
      navigate('/parties?action=add');
    } else if (itemId === 'expenses') {
      navigate('/expenses?action=add');
    } else if (defaultAddPath) {
      navigate(defaultAddPath);
    }
    setIsOpen(false);
  };

  // Backup to Computer Handler (Encrypted AES-256-GCM .mbi.enc)
  const handleBackupToComputer = async () => {
    try {
      await backupService.exportEncryptedBackup(undefined, business?.name || 'MBI_Inventra');
      showToast('🔒 Encrypted database backup (.mbi.enc) exported to computer!');
    } catch (err) {
      console.error(err);
      alert('Failed to generate encrypted backup.');
    }
  };

  // Filter main items and their sub-items according to current role permissions, Module Visibility & General Settings
  const visibleNavItems = useMemo(() => {
    const userOrder = userPreferences?.menuOrder || [];
    const userVis = userPreferences?.menuVisibility || {};

    const menuConfigs = getSidebarMenuConfig();
    const orderMap = new Map<string, number>();
    menuConfigs.forEach(m => {
      orderMap.set(m.id.toLowerCase(), m.order);
      orderMap.set(m.moduleKey.toLowerCase(), m.order);
      orderMap.set(m.label.toLowerCase(), m.order);
    });

    const getRank = (item: NavItem): number => {
      const key = (item.id || item.label).toLowerCase();
      if (key.includes('dashboard')) return 1;
      if (key.includes('sale') && !key.includes('shift')) return 2;
      if (key.includes('item') || key.includes('product')) return 3;
      if (key.includes('purchase')) return 4;
      if (key.includes('part')) return 5;
      if (key.includes('shift')) return 6;
      if (key.includes('expense')) return 7;
      if (key.includes('bank') || key.includes('cash')) return 8;
      if (key.includes('report')) return 9;
      if (key.includes('ai') || key.includes('guide')) return 10;
      if (key.includes('online')) return 11;
      if (key.includes('booker')) return 12;
      if (key.includes('note')) return 13;
      return 99;
    };

    const mods = settings.modules || {
      sales: true,
      purchases: true,
      inventory: true,
      parties: true,
      expenses: true,
      banking: true,
      reports: true,
      pos: true,
      syncShare: true,
    };

    const effectiveUserId = activeUser?.id || currentUser?.uid || 'usr_active';
    const effectiveTenantId = tenant?.tenantId || tenant?.id || tenantId;
    const isOwner = isPrimaryOwner(activeUser || currentUser) || activeRole === 'Primary Admin' || (activeUser as any)?.is_primary_owner === true;
    const effectivePlan = (tenant as any)?.plan || (userProfile as any)?.plan || (business as any)?.plan;
    const rawTier = effectivePlan ? normalizePlan(effectivePlan) : getActiveTenantPlan(effectiveTenantId);
    const activePlanTier: PlanTier = (isOwner || rawTier === 'platinum') ? 'platinum' : rawTier;
    const assignedUserMenus = getEffectiveAllowedMenus(activeUser || currentUser);

    const menuIdMap: Record<string, string> = {
      dashboard: 'dashboard',
      parties: 'parties',
      items: 'items',
      inventory: 'items',
      onlineStore: 'onlineStore',
      bookers: 'bookers',
      sale: 'sale',
      shifts: 'shifts',
      purchase: 'purchase',
      purchases: 'purchase',
      expenses: 'expenses',
      bank: 'bank',
      notes: 'aiNotes',
      reports: 'reports',
      aiGuide: 'aiNotes',
      utilities: 'utilities',
      shortage: 'items',
      barcode: 'utilities',
      sync: 'utilities',
      backupRestore: 'utilities',
      pricing: 'settings'
    };

    const filtered = mainNavItems
      .filter(item => {
        // Strict Plan-Tier Feature Gating
        // Hide enterprise only modules on Silver/Trial unless Super Admin /server override or allowed by plan
        if (item.id === 'onlineStore' || item.id === 'bookers') {
          if (!isOwner && !isPlanModuleAllowed(item.id, effectiveTenantId, activePlanTier)) return false;
        }

        const isCoreModule = item.isCore || (item.id && planService.isCoreBaselineModule(item.id)) || (item.moduleKey && planService.isCoreBaselineModule(item.moduleKey as string));

        // 1. Check if item's menu is explicitly blocked in Master Control / 173-Feature Switchboard
        const targetMenuId = menuIdMap[item.id || ''] || item.id || (item.moduleKey as string);
        if (targetMenuId) {
          const isMenuAllowed = evaluatePermission({
            userId: effectiveUserId,
            role: activeRole,
            plan: effectivePlan,
            tenantId: effectiveTenantId,
            menuId: targetMenuId
          });
          if (!isMenuAllowed) return false;
        }

        // SAFE MENU PERMISSION FALLBACK:
        // For non-owner staff roles, check granular module and role permissions
        if (!isOwner) {
          if (!canAccess(item.moduleKey as any) && !isCoreModule) return false;
          if (item.id && userVis[item.id] === false && !isCoreModule) return false;
          if (item.label.includes('Sale') && mods.sales === false && !isCoreModule) return false;
          if (item.label.includes('Purchase') && mods.purchases === false && !isCoreModule) return false;
          if (item.label.includes('Item') && (mods.inventory === false || settings.item.enableItem === false) && !isCoreModule) return false;
          if (item.label.includes('Part') && mods.parties === false && !isCoreModule) return false;
          if (item.label.includes('Expense') && mods.expenses === false && !isCoreModule) return false;
          if ((item.label.includes('Bank') || item.label.includes('Cash')) && mods.banking === false && !isCoreModule) return false;
          if (item.label.includes('Report') && mods.reports === false && !isCoreModule) return false;

          // Check if item's primary route is blocked by role RBAC policy (Cashier, Pharmacist, etc.)
          if (item.path && !isRouteAllowedForRole(item.path, activeUser || currentUser)) {
            return false;
          }

          // Check if item is permitted in custom assigned sidebar menus switchboard
          const assignedMenuKey = menuIdMap[item.id || ''] || item.id || (item.moduleKey as string);
          if (assignedMenuKey && Array.isArray(assignedUserMenus) && !assignedUserMenus.includes(assignedMenuKey)) {
            return false;
          }
        }

        // Plan Tier Gating
        if (item.path && !isPlanRouteAllowed(item.path, effectiveTenantId, activePlanTier)) {
          if (!isCoreModule && !isOwner) return false;
        }

        return true;
      })
      .map(item => {
        if (!item.subItems) return item;
        const filteredSubs = item.subItems.filter(sub => {
          if (sub.label.includes('Estimate') && !settings.general.estimateQuotation && !isOwner) return false;
          if (sub.label.includes('Sale Order') && !settings.general.salePurchaseOrder && !isOwner) return false;
          if (sub.label.includes('Purchase Order') && !settings.general.salePurchaseOrder && !isOwner) return false;
          if (sub.label.includes('Delivery Challan') && !settings.general.deliveryChallan && !isOwner) return false;

          if (sub.requiredPlan && !isPlanSufficient(activePlanTier, sub.requiredPlan)) {
            return false;
          }

          // Check if subitem route is allowed in active plan
          if (sub.path && !isRouteAllowedInPlan(sub.path, effectivePlan, effectiveTenantId).isAllowed && !isOwner) {
            return false;
          }

          // Check granular switchboard route access for each sub-menu item
          if (sub.path) {
            const routeCheck = checkGranularRouteAccess(sub.path, {
              userId: effectiveUserId,
              role: activeRole,
              plan: effectivePlan,
              tenantId: effectiveTenantId
            });
            if (!routeCheck.isAllowed) return false;
          }

          return true;
        });

        return { ...item, subItems: filteredSubs.length > 0 ? filteredSubs : item.subItems };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return [...filtered].sort((a, b) => {
      if (userOrder.length > 0 && a.id && b.id) {
        const idxA = userOrder.indexOf(a.id);
        const idxB = userOrder.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
      }
      return getRank(a) - getRank(b);
    });
  }, [mainNavItems, canAccess, settings.general, settings.item.enableItem, settings.modules, userPreferences, activeUser, activeRole, currentUser, tenant, tenantId, permissionVersion]);

  const currentUid = activeUser?.id || currentUser?.uid || 'usr_active';
  const currentTid = tenant?.tenantId || tenant?.id || tenantId;
  const isOwnerGlobal = isPrimaryOwner(activeUser || currentUser) || activeRole === 'Primary Admin' || (activeUser as any)?.is_primary_owner === true;
  const currentRawPlan = (tenant as any)?.plan || (userProfile as any)?.plan || (business as any)?.plan;
  const activePlanTier: PlanTier = (isOwnerGlobal || (currentRawPlan && normalizePlan(currentRawPlan) === 'platinum')) ? 'platinum' : getActiveTenantPlan(currentTid);
  const currentPlan = currentRawPlan || (activePlanTier === 'platinum' ? 'Enterprise (Platinum)' : activePlanTier);

  // Visible settings tabs allowed by current plan & dynamic overrides
  const visibleSettingsTabs = useMemo(() => {
    return SETTINGS_TABS.filter(tab => isSettingsTabAllowedInPlan(tab.key, currentPlan, currentTid));
  }, [currentPlan, currentTid]);

  // Memoized categorized reports to prevent heavy recalculations on sidebar menu toggles
  const filteredCategorizedReports = useMemo(() => {
    return getFilteredCategorizedReports(activePlanTier, currentTid);
  }, [activePlanTier, currentTid]);

  // Sync & Share is guaranteed available across all plans
  const isSyncAllowed = settings.modules?.syncShare !== false;

  // Backup & Restore is strictly EXCLUSIVE to Primary Store Owner
  const isBackupAllowed = canAccessBackupRestore(activeUser || currentUser);

  const isSettingsAllowed = (isPrimaryOwner(activeUser || currentUser) || canAccess('settings')) && isRouteAllowedForRole('/settings', activeUser || currentUser) && evaluatePermission({
    userId: currentUid,
    role: activeRole,
    plan: currentPlan,
    tenantId: currentTid,
    menuId: 'settings'
  });

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-50 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container - Dynamic Light / Dark Mode Toggle Following */}
      <aside className={cn(
        'fixed top-0 left-0 bottom-0 z-[60] bg-[#f8fafc] dark:bg-slate-900 text-slate-700 dark:text-slate-300 flex flex-col transition-all duration-200 ease-in-out lg:static lg:z-auto border-r border-slate-200/90 dark:border-slate-800 select-none overflow-hidden shadow-lg shadow-slate-200/60 dark:shadow-none',
        isOpen ? 'translate-x-0 w-[280px] max-w-[85vw]' : '-translate-x-full lg:translate-x-0',
        isCollapsed ? 'lg:w-[70px]' : 'lg:w-[230px]'
      )}>
        
        {/* Header Card: Server Mode vs Standard Company Card */}
        {isServerRoute ? (
          <div 
            onClick={() => {
              setActiveServerTab('clients');
              window.dispatchEvent(new CustomEvent('mbi-set-server-tab', { detail: 'clients' }));
            }}
            className={cn(
              "h-[60px] px-3.5 flex items-center border-b border-slate-200 dark:border-slate-800 bg-indigo-50/70 dark:bg-slate-900 hover:bg-indigo-100/70 dark:hover:bg-slate-800/80 cursor-pointer transition-colors group flex-shrink-0",
              isCollapsed ? "justify-center" : "justify-between"
            )}
            title="MBI Master Server Control Panel"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 p-0.5 shadow-md flex items-center justify-center flex-shrink-0 ring-1 ring-indigo-400/30">
                <Server className="w-4.5 h-4.5 text-white" />
              </div>
              
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <h1 className="text-[13px] font-black text-indigo-950 dark:text-indigo-200 tracking-wide truncate group-hover:text-indigo-600 dark:group-hover:text-white transition-colors uppercase leading-tight flex items-center gap-1.5">
                    <span>CENTRAL SERVER</span>
                  </h1>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 truncate flex items-center gap-1 font-bold mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
                    <span>All Users & Multi-Store</span>
                  </p>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                  className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Close Menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div 
            onClick={() => setIsCompanyModalOpen(true)}
            className={cn(
              "h-[60px] px-3.5 flex items-center border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer transition-colors group flex-shrink-0",
              isCollapsed ? "justify-center" : "justify-between"
            )}
            title={isCollapsed ? (business?.name || "Company Profile") : "Click to view & edit Company Profile"}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8.5 h-8.5 rounded-xl shadow-md flex items-center justify-center flex-shrink-0 overflow-hidden group-hover:scale-105 transition-all">
                {business?.logo ? (
                  <img 
                    src={business.logo} 
                    alt="Store Logo" 
                    className="w-full h-full object-contain p-0.5 rounded-xl" 
                  />
                ) : (
                  <img 
                    src="/mbi-favicon.png?v=4.2.0" 
                    alt="MBI INVENTRA" 
                    className="w-full h-full object-contain rounded-xl dark:brightness-110 dark:drop-shadow-[0_0_12px_rgba(59,130,246,0.3)]" 
                  />
                )}
              </div>
              
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <h1 className="text-[13px] font-black text-slate-900 dark:text-white tracking-wide truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors uppercase leading-tight">
                    {business?.name || 'My Pharmacy Store'}
                  </h1>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 font-medium mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
                    <span>{business?.phone || business?.mobile || business?.city || 'Active Terminal'}</span>
                  </p>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                  className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Close Menu"
                >
                  <X className="w-4 h-4" />
                </button>
                <ChevronRight className="hidden lg:block w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-transform group-hover:translate-x-0.5 flex-shrink-0" />
              </div>
            )}
          </div>
        )}

        {/* Navigation Items: Server Hub vs Store Menu */}
        {isServerRoute ? (
          <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-3 no-scrollbar text-[13px]">
            {/* Master Control Switchboard Header Item */}
            <div className="group relative px-0.5">
              <button
                type="button"
                onClick={() => {
                  setActiveServerTab('master_control');
                  window.dispatchEvent(new CustomEvent('mbi-set-server-tab', { detail: 'master_control' }));
                  window.dispatchEvent(new CustomEvent('mbi-server-action', { detail: { action: 'open_master' } }));
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center transition-colors duration-150 font-bold cursor-pointer rounded-xl bg-gradient-to-r from-purple-100 via-indigo-100 to-purple-100 dark:from-purple-950/90 dark:via-indigo-950/90 dark:to-purple-950/90 hover:from-purple-200 hover:to-indigo-200 dark:hover:from-purple-900 dark:hover:to-indigo-900 text-purple-900 dark:text-purple-100 border border-purple-200 dark:border-purple-500/60 shadow-xs group',
                  isCollapsed ? 'justify-center p-2.5 mx-auto' : 'justify-between px-3 py-2 min-h-[38px]'
                )}
                title={isCollapsed ? "Master Control" : undefined}
              >
                <div className={cn("flex items-center flex-1 min-w-0", isCollapsed ? "justify-center" : "gap-2.5")}>
                  <div className="w-7 h-7 rounded-lg bg-purple-200/80 dark:bg-purple-950/80 flex items-center justify-center flex-shrink-0 text-purple-700 dark:text-purple-300 group-hover:scale-110 transition-transform">
                    <Sliders className="w-4 h-4" />
                  </div>
                  {!isCollapsed && (
                    <>
                      <span className="truncate text-[12px] font-black tracking-normal flex-1 text-purple-950 dark:text-purple-100 text-left">Master Control</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-purple-200 dark:bg-purple-950 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-400/50">
                        173
                      </span>
                    </>
                  )}
                </div>
              </button>
            </div>

            {/* SECTION 1: SERVER & FLEET MODULES */}
            <div className="space-y-1">
              {!isCollapsed && (
                <div className="px-2 pt-1 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                    <Server className="w-3 h-3" />
                    <span>Server Modules & Fleet</span>
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[9px] font-mono">14 MODS</span>
                </div>
              )}

              {SERVER_FLEET_ITEMS.map((item) => {
                const isTabActive = activeServerTab === item.tabKey;
                const Icon = item.icon;

                return (
                  <div key={item.tabKey} className="group relative">
                    <div
                      onClick={() => {
                        if (isCollapsed && setIsCollapsed) {
                          setIsCollapsed(false);
                        }
                        setActiveServerTab(item.tabKey);
                        window.dispatchEvent(new CustomEvent('mbi-set-server-tab', { detail: item.tabKey }));
                        setIsOpen(false);
                      }}
                      className={cn(
                        'flex items-center transition-colors duration-150 font-medium cursor-pointer rounded-xl',
                        isCollapsed ? 'justify-center p-2.5 mx-auto' : 'justify-between px-3 py-1.5 min-h-[36px]',
                        isTabActive 
                          ? 'bg-blue-600 text-white font-bold shadow-xs' 
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                      )}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <div className={cn("flex items-center flex-1 min-w-0", isCollapsed ? "justify-center" : "gap-2.5")}>
                        <div className={cn(
                          "w-6.5 h-6.5 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                          isTabActive 
                            ? "bg-white/20 text-white" 
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-300 group-hover:bg-slate-200 dark:group-hover:bg-slate-700"
                        )}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        {!isCollapsed && (
                          <>
                            <span className="truncate text-[12px] font-semibold tracking-normal flex-1 text-left">{item.label}</span>
                            {item.badge && (
                              <span className={cn(
                                "px-1.5 py-0.2 text-[9px] font-extrabold uppercase rounded border flex-shrink-0 font-mono",
                                isTabActive 
                                  ? "bg-white/20 text-white border-white/30" 
                                  : "bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                              )}>
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* SECTION 2: USER & STAFF CONTROLS */}
            <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
              {!isCollapsed && (
                <div className="px-2 pt-1 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <Users className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>User & Staff Directory</span>
                </div>
              )}

              {SERVER_USER_ITEMS.map((item) => {
                const isTabActive = activeServerTab === item.tabKey;
                const Icon = item.icon;

                return (
                  <div key={item.tabKey} className="group relative">
                    <div
                      onClick={() => {
                        if (isCollapsed && setIsCollapsed) {
                          setIsCollapsed(false);
                        }
                        setActiveServerTab(item.tabKey);
                        window.dispatchEvent(new CustomEvent('mbi-set-server-tab', { detail: item.tabKey }));
                        setIsOpen(false);
                      }}
                      className={cn(
                        'flex items-center transition-colors duration-150 font-medium cursor-pointer rounded-xl',
                        isCollapsed ? 'justify-center p-2.5 mx-auto' : 'justify-between px-3 py-1.5 min-h-[36px]',
                        isTabActive 
                          ? 'bg-emerald-600 text-white font-bold shadow-xs' 
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                      )}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <div className={cn("flex items-center flex-1 min-w-0", isCollapsed ? "justify-center" : "gap-2.5")}>
                        <div className={cn(
                          "w-6.5 h-6.5 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                          isTabActive 
                            ? "bg-white/20 text-white" 
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 group-hover:bg-slate-200 dark:group-hover:bg-slate-700"
                        )}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        {!isCollapsed && (
                          <>
                            <span className="truncate text-[12px] font-semibold tracking-normal flex-1 text-left">{item.label}</span>
                            {item.badge && (
                              <span className={cn(
                                "px-1.5 py-0.2 text-[9px] font-extrabold uppercase rounded border flex-shrink-0 font-mono",
                                isTabActive 
                                  ? "bg-white/20 text-white border-white/30" 
                                  : "bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                              )}>
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* SECTION 3: SERVER SECURITY & QUICK ACTIONS */}
            <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
              {!isCollapsed && (
                <div className="px-2 pt-1 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <Key className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span>Security & Quick Actions</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('mbi-server-action', { detail: { action: 'change-pass' } }));
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center transition-colors duration-150 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer text-left',
                  isCollapsed ? 'justify-center p-2.5 mx-auto' : 'px-3 py-1.5 gap-2.5'
                )}
                title={isCollapsed ? "Change Server Password" : undefined}
              >
                <div className="w-6.5 h-6.5 rounded-lg bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center flex-shrink-0 text-amber-600 dark:text-amber-400">
                  <Key className="w-3.5 h-3.5" />
                </div>
                {!isCollapsed && <span className="truncate text-[12px] font-medium">Change Password</span>}
              </button>

              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('mbi-server-action', { detail: { action: 'toggle-2fa' } }));
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center transition-colors duration-150 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer text-left',
                  isCollapsed ? 'justify-center p-2.5 mx-auto' : 'px-3 py-1.5 gap-2.5'
                )}
                title={isCollapsed ? "Google 2FA Protection" : undefined}
              >
                <div className="w-6.5 h-6.5 rounded-lg bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center flex-shrink-0 text-purple-600 dark:text-purple-400">
                  <Smartphone className="w-3.5 h-3.5" />
                </div>
                {!isCollapsed && <span className="truncate text-[12px] font-medium">Google 2FA Security</span>}
              </button>

              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('mbi-server-action', { detail: { action: 'sync-all' } }));
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center transition-colors duration-150 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer text-left',
                  isCollapsed ? 'justify-center p-2.5 mx-auto' : 'px-3 py-1.5 gap-2.5'
                )}
                title={isCollapsed ? "Force Synchronize All Terminals" : undefined}
              >
                <div className="w-6.5 h-6.5 rounded-lg bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400">
                  <RefreshCw className="w-3.5 h-3.5" />
                </div>
                {!isCollapsed && <span className="truncate text-[12px] font-medium">Force Sync All</span>}
              </button>

              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('mbi-server-action', { detail: { action: 'backup' } }));
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center transition-colors duration-150 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer text-left',
                  isCollapsed ? 'justify-center p-2.5 mx-auto' : 'px-3 py-1.5 gap-2.5'
                )}
                title={isCollapsed ? "Instant Snapshot Backup" : undefined}
              >
                <div className="w-6.5 h-6.5 rounded-lg bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400">
                  <Database className="w-3.5 h-3.5" />
                </div>
                {!isCollapsed && <span className="truncate text-[12px] font-medium">Instant Backup</span>}
              </button>

              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('mbi-server-action', { detail: { action: 'lock-server' } }));
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center transition-colors duration-150 text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/60 border border-red-200 dark:border-red-800/40 rounded-xl cursor-pointer text-left mt-1',
                  isCollapsed ? 'justify-center p-2.5 mx-auto' : 'px-3 py-1.5 gap-2.5'
                )}
                title={isCollapsed ? "Lock Server Session" : undefined}
              >
                <div className="w-6.5 h-6.5 rounded-lg bg-red-100 dark:bg-red-950 flex items-center justify-center flex-shrink-0 text-red-600 dark:text-red-400">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                {!isCollapsed && <span className="truncate text-[12px] font-bold">Lock Server</span>}
              </button>
            </div>

            {/* Switch to Store POS Button */}
            <div className="pt-3 mt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  navigate('/dashboard');
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center transition-colors duration-150 font-bold cursor-pointer rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-amber-300 hover:text-slate-900 dark:hover:text-amber-200 border border-slate-200 dark:border-slate-700 shadow-xs',
                  isCollapsed ? 'justify-center p-2.5 mx-auto' : 'gap-3 px-3 py-2.5'
                )}
                title={isCollapsed ? "Switch to Store POS" : undefined}
              >
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0 text-amber-600 dark:text-amber-400">
                  <ArrowLeft className="w-4 h-4" />
                </div>
                {!isCollapsed && (
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-[12px] font-extrabold leading-tight">Switch to Store POS</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">Return to single-store view</p>
                  </div>
                )}
              </button>
            </div>
          </nav>
        ) : (
        /* Navigation Items (Scrollable without visible scrollbars) */
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1 no-scrollbar text-[13px]">
          {visibleNavItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/' && location.pathname.startsWith(item.path));
            const isExpanded = expandedMenus[item.label];

            return (
              <div key={item.label} className="group relative">
                {/* Main Item Row */}
                <div
                  className={cn(
                    'flex items-center transition-colors duration-150 font-medium cursor-pointer rounded-xl',
                    isCollapsed ? 'justify-center p-2.5 mx-auto' : 'justify-between px-4 py-2.5 min-h-[42px]',
                    isActive 
                      ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/20' 
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  )}
                  title={isCollapsed ? item.label : undefined}
                  onClick={(e) => {
                    if (isCollapsed && setIsCollapsed) {
                      setIsCollapsed(false);
                    }
                    if (item.hasDropdown) {
                      toggleDropdown(item.label, e);
                    } else {
                      navigate(item.path);
                      setIsOpen(false);
                    }
                  }}
                >
                  <div className={cn("flex items-center flex-1 min-w-0", isCollapsed ? "justify-center" : "gap-3")}>
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                      isActive 
                        ? "bg-white/20 text-white shadow-xs" 
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 group-hover:bg-slate-200 dark:group-hover:bg-slate-700"
                    )}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    {!isCollapsed && (
                      <>
                        <span className={cn("truncate text-[13px] font-semibold tracking-normal flex-1", isActive ? "text-white" : "")}>{item.label}</span>
                        {item.label === 'Top Products' && (
                          <span className="px-1.5 py-0.2 text-[9px] font-extrabold uppercase rounded bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40 flex-shrink-0 shadow-2xs">
                            HOT
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {!isCollapsed && (
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-1.5" onClick={(e) => e.stopPropagation()}>
                      {/* Clean Quick Add Plus Icon */}
                      {item.hasAdd && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickAction(item.id, item.addPath, e);
                          }}
                          className="p-1 rounded-md bg-blue-500/10 hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400 transition-all active:scale-90 cursor-pointer"
                          title={`Quick Add ${item.label}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Dropdown Chevron Toggle */}
                      {item.hasDropdown && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDropdown(item.label, e);
                          }}
                          title={isExpanded ? `Collapse ${item.label}` : `Expand ${item.label}`}
                          className="w-7 h-7 sm:w-6 sm:h-6 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Sub Menu Items (Natural flow when expanded, NEVER inside collapsed sidebar) */}
                {item.subItems && isExpanded && !isCollapsed && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 py-1 border-l-[3px] border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-1 duration-75 rounded-r-xl">
                    {item.label === 'Reports' || item.label.includes('Report') || item.id === 'reports' ? (
                      filteredCategorizedReports.map((cat, catIdx) => {
                        const CatIcon = cat.categoryIcon || BarChart3;
                        return (
                          <div key={cat.id || catIdx} className="mb-2">
                            <div className="px-3.5 py-1.5 pl-6 pr-3 text-[11px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800/90 border-y border-slate-200 dark:border-slate-700 flex items-center gap-1.5 sticky top-0 z-10">
                              <CatIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span className="truncate">{cat.categoryLabel}</span>
                            </div>
                            <div className="py-0.5 space-y-0.5">
                              {cat.reports.map((subItem, sIdx) => {
                                const subPath = subItem.path || `/reports?report=${subItem.id}`;
                                const isSubActive = location.pathname === '/reports' && (location.search === `?report=${subItem.id}` || (!location.search && subItem.id === 'sale'));
                                return (
                                  <div
                                    key={sIdx}
                                    onClick={() => {
                                      navigate(subPath);
                                      setIsOpen(false);
                                    }}
                                    className={cn(
                                      'flex items-center justify-between px-3.5 py-1.5 min-h-[32px] transition-colors text-[12px] font-medium pl-8 pr-3 group/sub cursor-pointer select-none',
                                      isSubActive
                                        ? 'bg-blue-100/70 dark:bg-slate-700/70 text-blue-700 dark:text-blue-300 font-semibold border-l-2 border-blue-600'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white border-l-2 border-transparent'
                                    )}
                                  >
                                    <span className="flex-1 truncate">{subItem.label}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      item.subItems.map((subItem, index) => {
                        const isSubActive = 
                          location.pathname === subItem.path || 
                          (subItem.path === '/sale/invoices' && (location.pathname === '/sale' || location.pathname === '/sale/invoices'));

                        return (
                          <div
                            key={index}
                            onClick={() => {
                              navigate(subItem.path);
                              setIsOpen(false);
                            }}
                            className={cn(
                              'flex items-center justify-between px-3 py-2 min-h-[38px] sm:min-h-[34px] transition-colors text-[12.5px] font-medium pl-8 pr-2.5 group/sub cursor-pointer select-none',
                              isSubActive
                                ? 'bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-semibold border-l-2 border-blue-500'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white border-l-2 border-transparent'
                            )}
                          >
                            <div className="flex items-center min-w-0 flex-1 pr-1.5">
                              <span className={cn(
                                "w-1.5 h-1.5 rounded-full mr-2 shrink-0 transition-colors",
                                isSubActive ? "bg-blue-500 shadow-xs shadow-blue-400/50" : "bg-slate-300 dark:bg-slate-600 group-hover/sub:bg-slate-500 dark:group-hover/sub:bg-slate-400"
                              )} />
                              <span className="truncate">{subItem.label}</span>
                            </div>

                            {subItem.hasAdd && subItem.addPath && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickAdd(subItem.addPath!, e);
                                }}
                                title={`Add ${subItem.label}`}
                                className="w-6.5 h-6.5 sm:w-6 sm:h-6 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 active:bg-blue-700 text-slate-600 dark:text-slate-300 hover:text-white border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-md transition-all active:scale-90 ml-1 cursor-pointer shrink-0 shadow-2xs"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Collapsed Hover Flyout Menu */}
                {isCollapsed && item.subItems && item.subItems.length > 0 && (
                  <div className="absolute left-[54px] top-0 hidden group-hover:block z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-xl py-2 min-w-[220px] animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                        <item.icon className="w-3.5 h-3.5 text-blue-500" />
                        {item.label}
                      </span>
                      {item.hasAdd && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickAction(item.id, item.addPath, e);
                          }}
                          className="p-1 rounded-md bg-blue-500/10 hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400 transition-all active:scale-90 cursor-pointer"
                          title={`Quick Add ${item.label}`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="py-1 max-h-[300px] overflow-y-auto">
                      {item.subItems.map((sub, sIdx) => (
                        <div
                          key={sIdx}
                          onClick={() => {
                            navigate(sub.path);
                            setIsOpen(false);
                          }}
                          className="px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-between text-xs cursor-pointer transition-colors"
                        >
                          <span className="truncate">{sub.label}</span>
                          {sub.hasAdd && sub.addPath && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickAdd(sub.addPath!, e);
                              }}
                              className="h-4 px-1.5 flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 text-slate-600 dark:text-slate-300 hover:text-white rounded text-[9px] font-medium"
                            >
                              <Plus className="w-2 h-2" />
                              Add
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Bottom Utility & Admin Sections */}
          <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 space-y-0.5">

            {/* Sync & Share Navigation Link */}
            {isSyncAllowed && (
              <NavLink
                to="/sync-share"
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => cn(
                  'flex items-center justify-between px-3.5 py-2 min-h-[38px] text-[13px] font-medium transition-colors border-l-[3px]',
                  isActive 
                    ? 'bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-blue-500 font-semibold' 
                    : 'border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                    <RefreshCw className={cn(
                      'w-[18px] h-[18px]',
                      location.pathname === '/sync-share' ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400'
                    )} />
                  </div>
                  <span className="truncate text-[13px] font-semibold">Sync & Share</span>
                </div>
                {/* Active Sync Green Dot */}
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50 mr-1" />
              </NavLink>
            )}

            {/* BACKUP / RESTORE DROPDOWN */}
            {isBackupAllowed && (
              <div className="group relative">
                {/* Main Header Item */}
                <div 
                  onClick={(e) => {
                    if (isCollapsed) {
                      setActiveBackupModal('auto');
                    } else {
                      toggleDropdown('Backup/Restore', e);
                    }
                  }}
                  title={isCollapsed ? "Backup / Restore" : undefined}
                  className={cn(
                    'flex items-center transition-colors cursor-pointer border-l-[3px] border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white',
                    isCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3.5 py-2 min-h-[38px] text-[13px] font-medium',
                    expandedMenus['Backup/Restore'] ? 'text-slate-900 dark:text-white font-semibold' : ''
                  )}
                >
                  <div className={cn("flex items-center min-w-0", isCollapsed ? "justify-center" : "gap-3")}>
                    <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                      <RotateCcw className="w-[18px] h-[18px] text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-colors" />
                    </div>
                    {!isCollapsed && <span className="truncate text-[13px] font-semibold">Backup/Restore</span>}
                  </div>
                  {!isCollapsed && (
                    <div className="w-6 h-6 flex items-center justify-center text-slate-400">
                      {expandedMenus['Backup/Restore'] ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </div>
                  )}
                </div>

                {/* Collapsed Hover Flyout Menu */}
                {isCollapsed && (
                  <div className="absolute left-[54px] top-0 hidden group-hover:block z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-xl py-2 min-w-[200px] animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                        <RotateCcw className="w-3.5 h-3.5 text-blue-500" />
                        Backup / Restore
                      </span>
                    </div>
                    <div className="py-1">
                      <div 
                        onClick={() => {
                          setActiveBackupModal('auto');
                          setIsOpen(false);
                        }}
                        className="px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs cursor-pointer transition-colors"
                      >
                        Auto Backup
                      </div>
                      <div 
                        onClick={() => {
                          handleBackupToComputer();
                          setIsOpen(false);
                        }}
                        className="px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs cursor-pointer transition-colors flex items-center justify-between"
                      >
                        <span>Backup To Computer</span>
                        <Download className="w-3 h-3 text-slate-400" />
                      </div>
                      <div 
                        onClick={() => {
                          setActiveBackupModal('restore');
                          setIsOpen(false);
                        }}
                        className="px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs cursor-pointer transition-colors"
                      >
                        Restore Backup
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub Menu Items */}
                {expandedMenus['Backup/Restore'] && !isCollapsed && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 py-1 border-l-[3px] border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-1 duration-150 text-[12.5px] font-medium rounded-r-xl">
                    
                    {/* Auto Backup */}
                    <div 
                      onClick={() => {
                        setActiveBackupModal('auto');
                        setIsOpen(false);
                      }}
                      className="px-3.5 py-1.5 pl-10 pr-3 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors"
                    >
                      Auto Backup
                    </div>

                    {/* Backup To Computer */}
                    <div 
                      onClick={() => {
                        handleBackupToComputer();
                        setIsOpen(false);
                      }}
                      className="px-3.5 py-1.5 pl-10 pr-3 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors flex items-center justify-between group/comp"
                    >
                      <span>Backup To Computer</span>
                      <Download className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover/comp:opacity-100 transition-opacity" />
                    </div>

                    {/* Restore Backup */}
                    <div 
                      onClick={() => {
                        setActiveBackupModal('restore');
                        setIsOpen(false);
                      }}
                      className="px-3.5 py-1.5 pl-10 pr-3 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors"
                    >
                      Restore Backup
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Settings Dropdown */}
            {isSettingsAllowed && (
              <div className="group relative">
                <div 
                  onClick={(e) => {
                    if (isCollapsed) {
                      navigate('/settings');
                      setIsOpen(false);
                    } else {
                      toggleDropdown('Settings', e);
                    }
                  }}
                  title={isCollapsed ? "Settings" : undefined}
                  className={cn(
                    'flex items-center transition-colors duration-150 font-medium cursor-pointer rounded-xl',
                    isCollapsed ? 'justify-center p-2.5 mx-auto' : 'justify-between px-3 py-2 min-h-[40px]',
                    (expandedMenus['Settings'] || location.pathname === '/settings')
                      ? 'bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold ring-1 ring-blue-500/30 dark:ring-blue-500/40 shadow-xs' 
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  <div className={cn("flex items-center min-w-0", isCollapsed ? "justify-center" : "gap-3")}>
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                      (expandedMenus['Settings'] || location.pathname === '/settings')
                        ? "bg-blue-600 text-white shadow-xs" 
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 group-hover:bg-slate-200 dark:group-hover:bg-slate-700"
                    )}>
                      <Settings className="w-4 h-4" />
                    </div>
                    {!isCollapsed && <span className="truncate text-[13px] font-semibold">Settings</span>}
                  </div>
                  {!isCollapsed && (
                    <div className="w-6 h-6 flex items-center justify-center text-slate-400">
                      {expandedMenus['Settings'] ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </div>
                  )}
                </div>

                {/* Collapsed Hover Flyout Menu */}
                {isCollapsed && (
                  <div className="absolute left-[54px] top-0 hidden group-hover:block z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-xl py-2 min-w-[240px] animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                        <Settings className="w-3.5 h-3.5 text-blue-500" />
                        Settings
                      </span>
                    </div>
                    <div className="py-1 max-h-[360px] overflow-y-auto">
                      {visibleSettingsTabs.map((tab) => {
                        const subPath = `/settings?tab=${encodeURIComponent(tab.key)}`;
                        const currentTabParam = new URLSearchParams(location.search).get('tab');
                        const activeResolvedKey = resolveTabKey(currentTabParam);
                        const isSubActive = location.pathname === '/settings' && activeResolvedKey === tab.key;
                        return (
                          <div
                            key={tab.key}
                            onClick={() => {
                              navigate(subPath);
                              setIsOpen(false);
                            }}
                            className={cn(
                              "px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-xs cursor-pointer transition-colors",
                              isSubActive ? "bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold" : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                            )}
                          >
                            <span className="truncate">{tab.label}</span>
                            {tab.badge && (
                              <span className="px-1.5 py-0.2 rounded bg-blue-600 text-white text-[9px] font-bold">
                                {tab.badge}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {expandedMenus['Settings'] && !isCollapsed && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 py-1.5 my-1 rounded-xl border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-1 duration-150 space-y-0.5">
                    {visibleSettingsTabs.map((tab) => {
                      const subPath = `/settings?tab=${encodeURIComponent(tab.key)}`;
                      const currentTabParam = new URLSearchParams(location.search).get('tab');
                      const activeResolvedKey = resolveTabKey(currentTabParam);
                      const isSubActive = location.pathname === '/settings' && activeResolvedKey === tab.key;
                      return (
                        <div
                          key={tab.key}
                          onClick={() => {
                            navigate(subPath);
                            setIsOpen(false);
                          }}
                          className={cn(
                            'flex items-center justify-between px-3 py-1.5 mx-1.5 rounded-lg transition-colors text-[12.5px] font-medium cursor-pointer select-none',
                            isSubActive
                              ? 'bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                          )}
                        >
                          <NavLink
                            to={subPath}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              navigate(subPath);
                              setIsOpen(false);
                            }}
                            className="flex-1 truncate flex items-center justify-between"
                          >
                            <span>{tab.label}</span>
                            {tab.badge && (
                              <span className="px-1.5 py-0.2 rounded bg-blue-600 text-white text-[9px] font-bold">
                                {tab.badge}
                              </span>
                            )}
                          </NavLink>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Plans & Pricing */}
            {userPreferences?.menuVisibility?.pricing !== false && (
              <NavLink 
                to="/pricing"
                onClick={() => setIsOpen(false)}
                title={isCollapsed ? "Plans & Pricing" : undefined}
                className={({ isActive }) => cn(
                  'flex items-center transition-colors duration-150 font-medium cursor-pointer rounded-xl',
                  isCollapsed ? 'justify-center p-2.5 mx-auto' : 'gap-3 px-3 py-2 min-h-[40px]',
                  isActive 
                    ? 'bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold ring-1 ring-blue-500/30 dark:ring-blue-500/40 shadow-xs' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white">
                  <Award className="w-4 h-4 text-amber-500" />
                </div>
                {!isCollapsed && <span className="truncate text-[13px] font-semibold">Plans & Pricing</span>}
              </NavLink>
            )}

            {/* Share Feedback */}
            {userPreferences?.menuVisibility?.feedback !== false && (
              <NavLink 
                to="/feedback"
                onClick={() => setIsOpen(false)}
                title={isCollapsed ? "Share Feedback" : undefined}
                className={({ isActive }) => cn(
                  'flex items-center transition-colors duration-150 font-medium cursor-pointer rounded-xl',
                  isCollapsed ? 'justify-center p-2.5 mx-auto' : 'gap-3 px-3 py-2 min-h-[40px]',
                  isActive 
                    ? 'bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold ring-1 ring-blue-500/30 dark:ring-blue-500/40 shadow-xs' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white">
                  <MessageSquare className="w-4 h-4 text-emerald-500" />
                </div>
                {!isCollapsed && <span className="truncate text-[13px] font-semibold">Share Feedback</span>}
              </NavLink>
            )}

          </div>
        </nav>
        )}

        {/* Multi-Browser & Cloud Sync Status Badge */}
        <div className={cn(
          "border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 transition-colors",
          isCollapsed ? "p-2 flex flex-col items-center justify-center" : "px-3.5 py-2.5 flex items-center justify-between"
        )}>
          {!isCollapsed ? (
            <div 
              onClick={handleSecretClick}
              className="flex items-center gap-2.5 min-w-0 cursor-pointer select-none"
              title="MBI INVENTRA - Cloud Sync Active (Master Secret Trigger)"
            >
              <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                <span className={cn(
                  "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                  syncStatus === 'synced' ? "bg-emerald-400" : syncStatus === 'syncing' ? "bg-amber-400" : "bg-rose-400"
                )}></span>
                <span className={cn(
                  "relative inline-flex rounded-full h-2.5 w-2.5",
                  syncStatus === 'synced' ? "bg-emerald-500" : syncStatus === 'syncing' ? "bg-amber-500" : "bg-rose-500"
                )}></span>
              </span>
              <div className="min-w-0">
                <p className="text-[11.5px] font-bold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1 tracking-wide">
                  {syncStatus === 'syncing' ? 'Syncing...' : 'MBI INVENTRA'}
                </p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium truncate">Cloud & Realtime Sync Active</p>
              </div>
            </div>
          ) : (
            <div title="MBI INVENTRA - Cloud Sync Active" className="flex items-center justify-center p-1">
              <span className="relative flex h-2.5 w-2.5">
                <span className={cn(
                  "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                  syncStatus === 'synced' ? "bg-emerald-400" : "bg-amber-400"
                )}></span>
                <span className={cn(
                  "relative inline-flex rounded-full h-2.5 w-2.5",
                  syncStatus === 'synced' ? "bg-emerald-500" : "bg-amber-500"
                )}></span>
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              title="Force Sync Across All Tabs & Connected Browsers"
              className={cn(
                "px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs font-semibold",
                isCollapsed ? "mt-1.5" : ""
              )}
            >
              <RefreshCw className={cn("w-3 h-3 text-blue-500 dark:text-blue-400", isSyncing && "animate-spin")} />
              {!isCollapsed && <span className="text-[10.5px]">Sync</span>}
            </button>
          </div>
        </div>

        {/* Desktop Collapse / Expand Toggle Bar */}
        <div className="hidden lg:flex items-center justify-between p-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 transition-colors">
          {!isCollapsed && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 pl-2">
              Collapse Sidebar
            </span>
          )}
          <button
            onClick={() => setIsCollapsed?.(!isCollapsed)}
            className="p-1.5 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors mx-auto flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            title={isCollapsed ? "Expand Sidebar (Full labels)" : "Collapse Sidebar (Compact icons)"}
          >
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4 text-blue-500" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Backup & Restore Interactive Modals */}
      <BackupModals 
        activeModal={activeBackupModal} 
        onClose={() => setActiveBackupModal(null)} 
      />

      {/* Company Profile Modal */}
      <CompanyProfileModal 
        isOpen={isCompanyModalOpen} 
        onClose={() => setIsCompanyModalOpen(false)} 
      />
    </>
  );
};
