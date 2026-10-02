import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menu, Building2, ChevronDown, Check, Plus, LogIn, LogOut,
  ShieldCheck, ShieldAlert, Key, User, Sparkles, RefreshCw,
  Settings, Layers, Store, ArrowRightLeft, Lock, FileText,
  CheckCircle2, PlusCircle, Clock, AlertTriangle, Package,
  Headphones, Bell, Sun, Moon, DollarSign, TrendingUp,
  Warehouse, Printer, Users, HelpCircle, Phone, MessageSquare
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useTransactionDock } from '../../contexts/TransactionDockContext';
import { TransactionSearch } from './TransactionSearch';
import { NotificationCenter } from './NotificationCenter';
import { PWAInstallButton } from '../pwa/PWAComponents';
import { CompanySettingsModal } from '../modals/CompanySettingsModal';
import { CashierShift } from '../../types';
import { getBrandContact } from '../../lib/siteCmsService';
import { isPrimaryOwner } from '../../services/rbacService';

interface HeaderProps {
  isServerRoute?: boolean;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  activeCashierShift: CashierShift | null;
  onOpenCashierShift: () => void;
  onOpenAuditLogs: () => void;
  onOpenShortcuts: () => void;
  onOpenHelp: () => void;
  onOpenImportWizard: () => void;
  onOpenExceptionCenter: () => void;
  unreadCount?: number;
  onUnreadCountChange?: (count: number) => void;
}

export const Header: React.FC<HeaderProps> = ({
  isServerRoute = false,
  isSidebarCollapsed,
  onToggleSidebar,
  activeCashierShift,
  onOpenCashierShift,
  onOpenAuditLogs,
  onOpenShortcuts,
  onOpenHelp,
  onOpenImportWizard,
  onOpenExceptionCenter,
  unreadCount = 0,
  onUnreadCountChange
}) => {
  const navigate = useNavigate();
  const {
    business,
    currentUser,
    activeRole,
    activeUser,
    logout,
    canAccess,
    tenant,
    appUsers,
    updateBusiness
  } = useAuth();
  const { settings, isDarkMode, toggleTheme, userPreferences } = useSettings();
  const { openTransaction } = useTransactionDock();

  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [isCompanySettingsModalOpen, setIsCompanySettingsModalOpen] = useState(false);
  const [companyModalTab, setCompanyModalTab] = useState<'general' | 'contact' | 'tax' | 'invoice' | 'currency'>('general');
  const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState('main_store');
  const [contact] = useState(getBrandContact);

  const companyDropdownRef = useRef<HTMLDivElement>(null);

  // Show Shift Timer Button in Top Bar Setting State
  const [showShiftBtn, setShowShiftBtn] = useState<boolean>(() => {
    return localStorage.getItem('mbi_show_shift_timer') === 'true' ||
      localStorage.getItem('mbi_show_shift_button_header') === 'true' ||
      localStorage.getItem('mbi_show_shift_btn') === 'true';
  });

  useEffect(() => {
    const syncSettings = () => {
      setShowShiftBtn(
        localStorage.getItem('mbi_show_shift_timer') === 'true' ||
        localStorage.getItem('mbi_show_shift_button_header') === 'true' ||
        localStorage.getItem('mbi_show_shift_btn') === 'true'
      );
    };
    window.addEventListener('mbi_settings_updated', syncSettings);
    window.addEventListener('mbi-settings-updated', syncSettings);
    window.addEventListener('storage', syncSettings);
    return () => {
      window.removeEventListener('mbi_settings_updated', syncSettings);
      window.removeEventListener('mbi-settings-updated', syncSettings);
      window.removeEventListener('storage', syncSettings);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(e.target as Node)) {
        setIsCompanyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isOwnerOrAdmin = activeRole === 'Primary Admin' || activeRole === 'Secondary Admin' || isPrimaryOwner(activeUser || currentUser);
  const canSale = isOwnerOrAdmin || (canAccess('sale') && settings.modules?.sales !== false);
  const canPurchase = isOwnerOrAdmin || (canAccess('purchase') && settings.modules?.purchases !== false);

  const openCompanySettings = (tab: 'general' | 'contact' | 'tax' | 'invoice' | 'currency' = 'general') => {
    setCompanyModalTab(tab);
    setIsCompanySettingsModalOpen(true);
    setIsCompanyDropdownOpen(false);
  };

  const branches = [
    { id: 'main_store', name: 'Main Pharmacy & Retail Counter', type: 'store', city: business?.city || 'Lahore' },
    { id: 'wholesale_branch', name: 'Wholesale & B2B Distribution', type: 'wholesale', city: business?.city || 'Lahore' },
    { id: 'central_godown', name: 'Central Warehouse (Godown #1)', type: 'godown', city: business?.city || 'Lahore' },
  ];

  return (
    <>
      {/* Topmost Micro Bar (Company Switcher, Hotline, Shortcuts) */}
      <div className="hidden md:flex h-8 bg-[#f8fafc] dark:bg-slate-900 border-b border-slate-200/90 dark:border-slate-800 items-center justify-between px-3 sm:px-4 text-[11px] text-slate-600 dark:text-slate-300 select-none z-50 overflow-visible relative shadow-2xs transition-colors duration-150">

        {/* Top-Left Company Menu & Quick Links */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">

          {/* ADVANCED COMPANY MENU DROPDOWN */}
          <div className="relative" ref={companyDropdownRef}>
            <button
              type="button"
              onClick={() => setIsCompanyDropdownOpen(prev => !prev)}
              className="text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 font-extrabold flex items-center gap-1.5 transition-colors px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            >
              <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 animate-pulse"></span>
              <span className="truncate max-w-[140px] sm:max-w-[180px]">{business?.name || 'Company'}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isCompanyDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Comprehensive Company Dropdown Flyout */}
            {isCompanyDropdownOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-[9995] p-2 text-slate-800 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150">

                {/* Store Header Banner in Dropdown */}
                <div className="p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800/80 dark:to-slate-800/40 border border-blue-100 dark:border-slate-700 mb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-xs text-slate-900 dark:text-white truncate">
                          {business?.name || 'Pharmacy Store'}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {business?.phone || business?.mobile || 'Primary Business Account'}
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      Active
                    </span>
                  </div>
                </div>

                {/* 6 Advanced Menu Features */}
                <div className="space-y-1 text-xs">
                  {/* 1. Edit Business Profile & Tax Settings */}
                  <button
                    type="button"
                    onClick={() => openCompanySettings('general')}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">Edit Business Profile & Tax Settings</span>
                      <span className="text-[10.5px] text-slate-500 dark:text-slate-400 block">Logo, NTN, Drug Sale License & address</span>
                    </div>
                  </button>

                  {/* 2. Switch Active Branch / Godown */}
                  <div className="pt-1 pb-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Active Location / Godown</span>
                      <button
                        onClick={() => openCompanySettings('general')}
                        className="text-blue-600 dark:text-blue-400 hover:underline font-bold"
                      >
                        Manage
                      </button>
                    </div>
                    <div className="space-y-1 mt-1">
                      {branches.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            setSelectedBranch(b.id);
                            setIsCompanyDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer ${selectedBranch === b.id
                              ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {b.type === 'godown' ? <Warehouse className="w-3.5 h-3.5 text-amber-500" /> : <Store className="w-3.5 h-3.5 text-blue-500" />}
                            <span className="truncate">{b.name}</span>
                          </div>
                          {selectedBranch === b.id && <Check className="w-3.5 h-3.5 text-blue-600" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Company Quick Sales & Margin Snapshot */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSnapshotOpen(prev => !prev);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 flex items-center justify-between transition-colors cursor-pointer border-t border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-2.5">
                      <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">Quick Financial Snapshot</span>
                        <span className="text-[10.5px] text-slate-500 dark:text-slate-400 block">Today's sales, margins & cash in till</span>
                      </div>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isSnapshotOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Collapsible Snapshot Card */}
                  {isSnapshotOpen && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Gross Sales Today:</span>
                        <span className="font-bold text-slate-900 dark:text-white">Rs {activeCashierShift?.totalSales?.toLocaleString() || '0'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Cash in Till:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">Rs {activeCashierShift?.expectedCash?.toLocaleString() || '0'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Gross Profit Margin:</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">~18.4% (Live)</span>
                      </div>
                    </div>
                  )}

                  {/* 4. Staff Passcodes & Role Permissions */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsCompanyDropdownOpen(false);
                      navigate('/sync-share');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Users className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">Staff Passcodes & Role Permissions</span>
                      <span className="text-[10.5px] text-slate-500 dark:text-slate-400 block">Manage cashier accounts & PIN security</span>
                    </div>
                  </button>

                  {/* 5. Invoice Print Headers & Disclaimers */}
                  <button
                    type="button"
                    onClick={() => openCompanySettings('invoice')}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">Invoice Print Headers & Terms</span>
                      <span className="text-[10.5px] text-slate-500 dark:text-slate-400 block">Thermal 80mm & A4 return policy</span>
                    </div>
                  </button>

                  {/* 6. Lock Session / Sign Out */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCompanyDropdownOpen(false);
                        window.dispatchEvent(new CustomEvent('mbi-lock-workstation'));
                      }}
                      className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-500" />
                      <span>Lock POS</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsCompanyDropdownOpen(false);
                        logout();
                      }}
                      className="px-3 py-1.5 rounded-lg text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onOpenHelp}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold flex items-center gap-1.5 cursor-pointer transition-colors px-2 py-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Headphones className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            <span>Help Desk</span>
          </button>

          <button
            onClick={onOpenShortcuts}
            className="flex hover:text-slate-900 dark:hover:text-white font-semibold items-center gap-1.5 cursor-pointer transition-colors px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200"
            title="Open Keyboard Shortcuts Hub (Ctrl + Enter or F1)"
          >
            <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            <span>Shortcuts</span>
            <kbd className="hidden lg:inline-block px-1.5 py-0.2 bg-slate-200 dark:bg-slate-950 text-blue-700 dark:text-blue-300 font-mono text-[9px] font-bold rounded border border-slate-300 dark:border-slate-700">Ctrl+Enter</kbd>
          </button>

          <button onClick={() => window.location.reload()} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer" title="Refresh Application">
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>

        {/* Top-Right Active User Role & Hotline */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div
            onClick={() => navigate('/sync-share')}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/70 hover:bg-blue-100 dark:hover:bg-blue-900/80 border border-blue-200 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 cursor-pointer transition-colors"
            title="Click to manage Users & Roles in Sync & Share"
          >
            <ShieldCheck className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="font-bold text-[10px] truncate max-w-[120px]">
              {activeUser ? `${activeUser.name} (${activeRole})` : `Role: ${activeRole}`}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 pl-1 text-[10.5px] shrink-0">
            <span className="font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">Hotline:</span>
            <a href={contact.callUrl(contact.phone1)} className="text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200 font-semibold flex items-center gap-1 transition-colors">
              <Phone className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" /> {contact.displayPhone1}
            </a>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <a href={contact.whatsappUrl('Hello MBI Inventra Support!')} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-300 dark:hover:text-emerald-200 font-semibold flex items-center gap-1 transition-colors">
              <MessageSquare className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" /> {contact.displayPhone2}
            </a>
          </div>
        </div>
      </div>

      {/* Main App Header (Clean Search Bar starting from sidebar edge without duplicate icons) */}
      <header className="flex items-center justify-between h-[54px] sm:h-[58px] px-2 sm:px-3 lg:px-4 border-b border-slate-200/90 dark:border-slate-800 bg-[#f8fafc] dark:bg-slate-900 shadow-md shadow-slate-200/60 dark:shadow-none z-30 gap-2 sm:gap-3 overflow-visible relative w-full transition-all duration-150">

        {/* Search Bar Container starting cleanly next to sidebar with mobile/tablet hamburger */}
        <div className="flex items-center flex-1 min-w-0 max-w-3xl mr-2 sm:mr-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="block lg:hidden p-1.5 sm:p-2 -ml-0.5 mr-1.5 sm:mr-2 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
            title="Open Navigation Menu"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <TransactionSearch />
          </div>
        </div>

        {/* Action Controls & Quick Buttons */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">

          {/* Primary Quick Actions (Sale & Purchase - Prominent & Always Visible) */}
          <div className="flex items-center gap-2 shrink-0">
            {canSale && (
              <button
                onClick={() => openTransaction('Sale')}
                className="flex items-center gap-1.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 active:from-rose-800 active:to-red-800 text-white px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-black shadow-md hover:shadow-lg transition-all duration-150 whitespace-nowrap cursor-pointer transform active:scale-95 ring-2 ring-rose-400/30"
                title="Add Sale Invoice (Alt+S)"
              >
                <PlusCircle className="w-4 h-4 fill-white text-rose-600 shrink-0" />
                <span>+ Sale</span>
              </button>
            )}
            {canPurchase && (
              <button
                onClick={() => openTransaction('Purchase')}
                className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:from-blue-800 active:to-indigo-800 text-white px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-black shadow-md hover:shadow-lg transition-all duration-150 whitespace-nowrap cursor-pointer transform active:scale-95 ring-2 ring-blue-400/30"
                title="Add Purchase Bill (Alt+P)"
              >
                <PlusCircle className="w-4 h-4 fill-white text-blue-600 shrink-0" />
                <span>+ Purchase</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 text-slate-500 dark:text-slate-400 shrink-0">
            {/* Cashier Shift Live Reconcile (Controlled live by Settings -> Application -> Show Shift Timer Button) */}
            {showShiftBtn && settings.featureFlags?.cashierShiftClosing !== false && (
              <button
                type="button"
                onClick={onOpenCashierShift}
                className={`flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold border border-slate-300/80 dark:border-slate-700 transition-all cursor-pointer whitespace-nowrap shadow-2xs`}
                title={activeCashierShift ? `Active Shift: ${activeCashierShift.shiftNumber} (Expected: Rs ${activeCashierShift.expectedCash.toLocaleString()})` : 'Start or Reconcile Cashier Shift'}
              >
                <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Shift •</span>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeCashierShift ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              </button>
            )}

            {/* Exception Center Radar */}
            {settings.featureFlags?.exceptionCenter !== false && (
              <button
                title="Exception Center (Operational Radar)"
                onClick={onOpenExceptionCenter}
                className="p-1.5 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-md transition-colors relative cursor-pointer hidden 2xl:flex"
              >
                <AlertTriangle className="w-[18px] h-[18px] text-amber-500" />
              </button>
            )}

            {/* Universal Data Import Wizard */}
            {settings.featureFlags?.dataImportWizard !== false && (
              <button
                title="Universal Data Import Wizard (Excel / CSV)"
                onClick={onOpenImportWizard}
                className="p-1.5 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer hidden 2xl:flex"
              >
                <Package className="w-[18px] h-[18px] text-slate-600" />
              </button>
            )}

            {/* Interactive Notification Popover */}
            <div className="relative">
              <button
                type="button"
                title="Notifications & Alerts"
                data-notification-trigger="true"
                onClick={() => setIsNotificationsOpen(prev => !prev)}
                className={`p-1.5 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors relative cursor-pointer ${isNotificationsOpen ? 'bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400' : ''
                  }`}
                aria-label="Open Notifications"
              >
                <Bell className="w-[18px] h-[18px]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900 animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              <NotificationCenter
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
                onUnreadCountChange={onUnreadCountChange}
              />
            </div>

            {/* PWA Install Button (Hidden by default unless explicitly enabled in Settings) */}
            {(settings.general?.showPwaInstallButton === true || localStorage.getItem('mbi_show_install_app_btn') === 'true' || localStorage.getItem('mbi_show_pwa_install_header') === 'true') && (
              <div className="hidden lg:block">
                <PWAInstallButton
                  label="Install App"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                />
              </div>
            )}

            {/* Global Theme Toggle (Day / Night Shift) */}
            <button
              type="button"
              title={isDarkMode ? "Switch to Light Day Mode" : "Switch to Dark Night Shift"}
              onClick={toggleTheme}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
              aria-label="Toggle Day / Night Mode"
            >
              {isDarkMode ? (
                <Sun className="w-4.5 h-4.5 text-amber-400 animate-in fade-in" />
              ) : (
                <Moon className="w-4.5 h-4.5 text-indigo-500 dark:text-indigo-400 animate-in fade-in" />
              )}
            </button>

            {canAccess('settings') && (
              <button
                title="Settings"
                onClick={() => navigate('/settings')}
                className="hidden xl:flex p-1.5 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
              >
                <Settings className="w-[18px] h-[18px]" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Shared Company Settings Modal */}
      <CompanySettingsModal
        isOpen={isCompanySettingsModalOpen}
        onClose={() => setIsCompanySettingsModalOpen(false)}
        defaultTab={companyModalTab}
      />
    </>
  );
};
