import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Menu, Search, Bell, QrCode, Receipt, Zap, ShoppingCart, Package, 
  Store, Building2, TrendingUp, Wallet, DollarSign, Coins, 
  AlertTriangle, AlertCircle, Clock, Calendar, RotateCcw, 
  BarChart3, Users, Settings, Sparkles, ChevronRight, ArrowRight, 
  Home, Boxes, Layers, Plus, X, Eye, EyeOff, Printer, Share2,
  FileText, Shield, Moon, Sun, LogOut, CheckCircle2, Phone
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Medicine, 
  Invoice, 
  Supplier, 
  Expense, 
  CashierShift, 
  SanitizedSaleSummary, 
  LowStockAlertSummary, 
  TopProductSummary 
} from '../../types';

export interface MobileDashboardViewProps {
  todayMetrics?: {
    todaySale?: number;
    todayInvoicesCount?: number;
    todayCogs?: number;
    todayExpenses?: number;
    grossProfit?: number;
    netProfit?: number;
    profitMargin?: number;
  };
  invoices?: Invoice[];
  recentSales?: SanitizedSaleSummary[];
  medicines?: Medicine[];
  lowStockAlerts?: LowStockAlertSummary[];
  topProducts?: TopProductSummary[] | any[];
  suppliers?: Supplier[];
  expenses?: Expense[];
  activeCashierShift?: CashierShift | null;
  privacyMode?: boolean;
  onTogglePrivacy?: () => void;
  onPrintInvoice?: (invoice: any) => void;
  activeUserName?: string;
  totalReceivables?: number;
  totalPayables?: number;
  totalStockValue?: number;
  onOpenPOS?: () => void;
}

export const MobileDashboardView: React.FC<MobileDashboardViewProps> = ({
  todayMetrics,
  invoices = [],
  recentSales = [],
  medicines = [],
  lowStockAlerts = [],
  topProducts = [],
  suppliers = [],
  expenses: _expenses = [],
  activeCashierShift = null,
  privacyMode = false,
  onTogglePrivacy,
  onPrintInvoice,
  activeUserName = 'Pharmacist',
  totalReceivables,
  totalPayables,
  totalStockValue,
  onOpenPOS
}) => {
  const navigate = useNavigate();
  const { currentUser, userProfile, activeRole, business, tenant, logout } = useAuth();

  const [quickSearch, setQuickSearch] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [activeBottomNav, setActiveBottomNav] = useState<'home' | 'inventory' | 'parties' | 'more'>('home');

  const maskValue = (val: number | undefined | null) => {
    if (privacyMode) return '••••••';
    return formatCurrency(Number(val) || 0);
  };

  const safeMedicines = Array.isArray(medicines) ? medicines : [];
  const safeInvoices = Array.isArray(invoices) ? invoices : [];
  const safeSuppliers = Array.isArray(suppliers) ? suppliers : [];

  // Safe today metrics
  const safeToday = {
    todaySale: Number(todayMetrics?.todaySale) || 0,
    todayInvoicesCount: Number(todayMetrics?.todayInvoicesCount) || 0,
    todayCogs: Number(todayMetrics?.todayCogs) || 0,
    todayExpenses: Number(todayMetrics?.todayExpenses) || 0,
    grossProfit: Number(todayMetrics?.grossProfit) || 0,
    netProfit: Number(todayMetrics?.netProfit) || 0,
    profitMargin: Number(todayMetrics?.profitMargin) || 0,
  };

  // Safe calculated financial aggregates
  const effectiveReceivables = totalReceivables !== undefined 
    ? totalReceivables 
    : safeInvoices.reduce((sum, inv) => sum + (Number(inv?.balanceDue) || 0), 0);

  const effectivePayables = totalPayables !== undefined 
    ? totalPayables 
    : safeSuppliers.reduce((sum, s) => sum + (Number(s?.balance) || 0), 0);

  const effectiveCash = activeCashierShift && (activeCashierShift as any).expectedCash !== undefined
    ? Number((activeCashierShift as any).expectedCash)
    : Math.max(0, safeToday.todaySale - safeToday.todayExpenses);

  // Dynamic stock & expiry health counts
  const outOfStockCount = useMemo(() => {
    return safeMedicines.filter(m => Number(m.quantity || 0) <= 0).length;
  }, [safeMedicines]);

  const lowStockCount = useMemo(() => {
    if (Array.isArray(lowStockAlerts) && lowStockAlerts.length > 0) return lowStockAlerts.length;
    return safeMedicines.filter(m => {
      const q = Number(m.quantity || 0);
      const min = Number(m.lowStockThreshold || 10);
      return q > 0 && q <= min;
    }).length;
  }, [lowStockAlerts, safeMedicines]);

  const expiredCount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return safeMedicines.filter(m => m.expiryDate && m.expiryDate < todayStr).length;
  }, [safeMedicines]);

  const nearExpiryCount = useMemo(() => {
    const now = Date.now();
    const ninetyDays = 90 * 24 * 60 * 60 * 1000;
    const todayStr = new Date().toISOString().split('T')[0];
    return safeMedicines.filter(m => {
      if (!m.expiryDate || m.expiryDate < todayStr) return false;
      const expTime = new Date(m.expiryDate).getTime();
      return expTime - now <= ninetyDays;
    }).length;
  }, [safeMedicines]);

  // Quick medicine search filter
  const filteredQuickMedicines = useMemo(() => {
    if (!quickSearch.trim()) return [];
    const q = quickSearch.toLowerCase();
    return safeMedicines.filter(m => 
      m && (
        m.name?.toLowerCase().includes(q) || 
        m.genericName?.toLowerCase().includes(q) ||
        m.barcode?.toLowerCase().includes(q)
      )
    ).slice(0, 6);
  }, [quickSearch, safeMedicines]);

  const displayUserPhone = currentUser?.phone || (currentUser as any)?.mobile || business?.phone || business?.mobile || '03434161001';
  const displayRole = activeRole || userProfile?.role || 'Primary Admin';

  const handleTriggerPOS = () => {
    if (onOpenPOS) {
      onOpenPOS();
    } else {
      navigate('/billing');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 pb-28 select-none transition-colors duration-200">

      {/* ─────────────────────────────────────────────────────────────
          1. TOP APP BAR (Dark Emerald Gradient Header)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#0a3832] via-[#0b433c] to-[#082e29] text-white px-4 pt-3.5 pb-4 rounded-b-3xl shadow-lg border-b border-emerald-900/40 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          
          {/* Left: Drawer Hamburger Menu */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-all cursor-pointer active:scale-95"
              aria-label="Open Navigation Drawer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <h1 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                <span>MBI Inventra</span>
              </h1>
              <p className="text-[11px] font-medium text-emerald-200/80 -mt-0.5">Pharmacy POS & ERP</p>
            </div>
          </div>

          {/* Right: Search & Notification Icons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('mobile-quick-search-input');
                el?.focus();
              }}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-all cursor-pointer active:scale-95"
              title="Search"
            >
              <Search className="w-4 h-4 text-emerald-100" />
            </button>

            <button
              type="button"
              onClick={() => setIsAlertsModalOpen(true)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-all cursor-pointer relative active:scale-95"
              title="Notifications & Alerts"
            >
              <Bell className="w-4 h-4 text-emerald-100" />
              {(expiredCount + lowStockCount + outOfStockCount) > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white font-black text-[9px] rounded-full flex items-center justify-center border-2 border-[#0a3832] shadow-sm animate-pulse">
                  {Math.min(99, expiredCount + lowStockCount + outOfStockCount)}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="px-3.5 pt-3.5 space-y-3.5 max-w-lg mx-auto">

        {/* ─────────────────────────────────────────────────────────────
            2. UNIVERSAL SEARCH & BARCODE SCANNER PILL
        ───────────────────────────────────────────────────────────── */}
        <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 p-1.5 flex items-center transition-all focus-within:ring-2 focus-within:ring-blue-500/50">
          <Search className="w-4 h-4 text-slate-400 ml-2.5 shrink-0" />
          <input
            id="mobile-quick-search-input"
            type="text"
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            placeholder="Search Medicine / Barcode ..."
            className="w-full pl-2.5 pr-2 py-1.5 bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none font-medium"
          />
          {quickSearch ? (
            <button
              type="button"
              onClick={() => setQuickSearch('')}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/billing')}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors cursor-pointer"
              title="Scan Barcode"
            >
              <QrCode className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown Preview */}
        {quickSearch && filteredQuickMedicines.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-2 shadow-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in">
            {filteredQuickMedicines.map(med => (
              <div 
                key={med.id} 
                onClick={() => navigate(`/items?search=${encodeURIComponent(med.name)}`)}
                className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl cursor-pointer transition-colors"
              >
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{med.name}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Stock: <span className="font-bold text-blue-600 dark:text-blue-400">{med.quantity || 0}</span> | Rack: {med.rackLocation || 'A1'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(med.sellingPrice || 0)}</div>
                  <div className="text-[9px] text-slate-400">Retail Price</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            3. 4 FAST ACTION CHIPS (+ Sale, POS Fast, + Purchase, + Item)
        ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-2">
          {/* 1. Red + Sale */}
          <button
            type="button"
            onClick={() => navigate('/sale/invoice')}
            className="flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl bg-[#ef4444] hover:bg-[#dc2626] active:bg-[#b91c1c] text-white font-bold transition-all shadow-md shadow-red-500/20 active:scale-95 cursor-pointer"
          >
            <Receipt className="w-5 h-5 mb-1" />
            <span className="text-[11px] font-black leading-tight tracking-tight">+ Sale</span>
          </button>

          {/* 2. Orange ⚡ POS Fast */}
          <button
            type="button"
            onClick={handleTriggerPOS}
            className="flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl bg-[#f97316] hover:bg-[#ea580c] active:bg-[#c2410c] text-white font-bold transition-all shadow-md shadow-orange-500/20 active:scale-95 cursor-pointer"
          >
            <Zap className="w-5 h-5 mb-1 fill-white" />
            <span className="text-[11px] font-black leading-tight tracking-tight">POS Fast</span>
          </button>

          {/* 3. Blue + Purchase */}
          <button
            type="button"
            onClick={() => navigate('/purchase/invoice')}
            className="flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl bg-[#3b82f6] hover:bg-[#2563eb] active:bg-[#1d4ed8] text-white font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer"
          >
            <ShoppingCart className="w-5 h-5 mb-1" />
            <span className="text-[11px] font-black leading-tight tracking-tight">+ Purchase</span>
          </button>

          {/* 4. Green + Item */}
          <button
            type="button"
            onClick={() => navigate('/items')}
            className="flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl bg-[#10b981] hover:bg-[#059669] active:bg-[#047857] text-white font-bold transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
          >
            <Package className="w-5 h-5 mb-1" />
            <span className="text-[11px] font-black leading-tight tracking-tight">+ Item</span>
          </button>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            4. WELCOME & PHARMACY STORE CARD (Rich Blue Gradient)
        ───────────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0d3b82] via-[#1552b5] to-[#1e40af] text-white p-4 shadow-xl border border-blue-400/20">
          <div className="relative z-10 flex items-center justify-between">
            <div className="space-y-1 max-w-[62%]">
              <h2 className="text-sm sm:text-base font-black tracking-tight text-white leading-tight">
                Welcome, <span className="underline decoration-blue-300 underline-offset-2">{displayUserPhone}</span>
              </h2>
              <p className="text-xs font-semibold text-blue-200">
                {displayRole}
              </p>
              
              <div className="pt-1.5 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-bold text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span>Online</span>
                </span>

                {onTogglePrivacy && (
                  <button
                    type="button"
                    onClick={onTogglePrivacy}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-[10px] font-bold text-blue-200 transition-colors"
                  >
                    {privacyMode ? <EyeOff className="w-3 h-3 text-amber-300" /> : <Eye className="w-3 h-3" />}
                    <span>{privacyMode ? 'Private' : 'Hide'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* 3D Pharmacy Storefront Vector Illustration */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 relative flex items-center justify-center">
              <div className="absolute inset-0 bg-blue-400/20 rounded-full blur-xl animate-pulse" />
              <svg viewBox="0 0 160 140" className="w-full h-full drop-shadow-xl select-none" fill="none">
                {/* Store Roof / Canopy */}
                <path d="M20 45 L80 18 L140 45 L130 52 L30 52 Z" fill="#38bdf8" />
                <path d="M30 52 L130 52 L125 58 L35 58 Z" fill="#0284c7" />
                
                {/* Store Signboard */}
                <rect x="38" y="26" width="84" height="20" rx="4" fill="#0f172a" />
                <rect x="42" y="30" width="76" height="12" rx="2" fill="#0284c7" opacity="0.4" />
                <text x="80" y="39" textAnchor="middle" fill="#38bdf8" fontSize="8" fontWeight="bold" fontFamily="sans-serif">PHARMACY</text>
                
                {/* Store Body & Pillars */}
                <rect x="28" y="58" width="104" height="66" rx="4" fill="#f8fafc" />
                <rect x="32" y="62" width="44" height="58" rx="3" fill="#bae6fd" opacity="0.6" />
                <rect x="84" y="62" width="44" height="58" rx="3" fill="#bae6fd" opacity="0.6" />
                
                {/* Medical Cross Sign */}
                <circle cx="54" cy="85" r="12" fill="#10b981" />
                <path d="M54 77 V93 M46 85 H62" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
                
                {/* Glass Window Shelves & Medicines */}
                <line x1="88" y1="78" x2="124" y2="78" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
                <line x1="88" y1="94" x2="124" y2="94" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
                <rect x="92" y="70" width="6" height="8" rx="1" fill="#f43f5e" />
                <rect x="102" y="70" width="8" height="8" rx="1" fill="#3b82f6" />
                <rect x="114" y="70" width="6" height="8" rx="1" fill="#10b981" />
                
                {/* Entrance Door */}
                <rect x="68" y="80" width="24" height="44" rx="2" fill="#0284c7" opacity="0.8" />
                <circle cx="72" cy="102" r="1.5" fill="#ffffff" />
                
                {/* Ground Base */}
                <rect x="16" y="124" width="128" height="8" rx="4" fill="#64748b" />
              </svg>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            5. "TODAY AT A GLANCE" (4 Pastel Financial Metric Cards)
        ───────────────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tracking-tight">
              Today at a Glance
            </h3>
            <button
              type="button"
              onClick={() => navigate('/reports')}
              className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>View Reports</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {/* 1. Sales (Soft Light Blue Pastel) */}
            <div 
              onClick={() => navigate('/sale/invoices')}
              className="p-2.5 rounded-2xl bg-[#e0f2fe] dark:bg-[#0c2844] border border-blue-200/60 dark:border-blue-800/50 flex flex-col justify-between cursor-pointer hover:opacity-90 transition-all active:scale-95"
            >
              <span className="text-[11px] font-black text-blue-700 dark:text-blue-300 leading-tight">
                {maskValue(safeToday.todaySale)}
              </span>
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mt-1">
                Sales
              </span>
            </div>

            {/* 2. Profit (Soft Mint Green Pastel) */}
            <div 
              onClick={() => navigate('/reports')}
              className="p-2.5 rounded-2xl bg-[#dcfce7] dark:bg-[#093322] border border-emerald-200/60 dark:border-emerald-800/50 flex flex-col justify-between cursor-pointer hover:opacity-90 transition-all active:scale-95"
            >
              <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-300 leading-tight">
                {maskValue(safeToday.netProfit)}
              </span>
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mt-1">
                Profit
              </span>
            </div>

            {/* 3. Expenses (Soft Peach/Orange Pastel) */}
            <div 
              onClick={() => navigate('/expenses')}
              className="p-2.5 rounded-2xl bg-[#ffedd5] dark:bg-[#381f0d] border border-orange-200/60 dark:border-orange-800/50 flex flex-col justify-between cursor-pointer hover:opacity-90 transition-all active:scale-95"
            >
              <span className="text-[11px] font-black text-orange-700 dark:text-orange-300 leading-tight">
                {maskValue(safeToday.todayExpenses)}
              </span>
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mt-1">
                Expenses
              </span>
            </div>

            {/* 4. Cash (Soft Lavender/Purple Pastel) */}
            <div 
              onClick={() => navigate('/cash-in-hand')}
              className="p-2.5 rounded-2xl bg-[#f3e8ff] dark:bg-[#28133f] border border-purple-200/60 dark:border-purple-800/50 flex flex-col justify-between cursor-pointer hover:opacity-90 transition-all active:scale-95"
            >
              <span className="text-[11px] font-black text-purple-700 dark:text-purple-300 leading-tight">
                {maskValue(effectiveCash)}
              </span>
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mt-1">
                Cash
              </span>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            6. "PHARMACY ALERTS" (4 Health Indicators: Out of Stock, Low Stock, Expired, Near Expiry)
        ───────────────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tracking-tight">
              Pharmacy Alerts
            </h3>
            <button
              type="button"
              onClick={() => navigate('/shortage-registry')}
              className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {/* 1. Out of Stock (Red) */}
            <div 
              onClick={() => navigate('/shortage-registry')}
              className="p-2 rounded-2xl bg-[#fee2e2] dark:bg-[#381116] border border-rose-200 dark:border-rose-900/60 flex flex-col items-center justify-center text-center cursor-pointer hover:opacity-90 transition-all active:scale-95"
            >
              <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-1">
                <Package className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs sm:text-sm font-black text-rose-600 dark:text-rose-400 leading-tight">
                {outOfStockCount || 0}
              </span>
              <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 mt-0.5 leading-tight">
                Out of Stock
              </span>
            </div>

            {/* 2. Low Stock (Amber) */}
            <div 
              onClick={() => navigate('/shortage-registry')}
              className="p-2 rounded-2xl bg-[#fef3c7] dark:bg-[#342409] border border-amber-200 dark:border-amber-900/60 flex flex-col items-center justify-center text-center cursor-pointer hover:opacity-90 transition-all active:scale-95"
            >
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-1">
                <Boxes className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400 leading-tight">
                {lowStockCount || 0}
              </span>
              <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 mt-0.5 leading-tight">
                Low Stock
              </span>
            </div>

            {/* 3. Expired (Pink/Rose) */}
            <div 
              onClick={() => navigate('/inventory?filter=expired')}
              className="p-2 rounded-2xl bg-[#ffe4e6] dark:bg-[#3a0d18] border border-pink-200 dark:border-pink-900/60 flex flex-col items-center justify-center text-center cursor-pointer hover:opacity-90 transition-all active:scale-95"
            >
              <div className="w-6 h-6 rounded-lg bg-pink-500/20 text-pink-600 dark:text-pink-400 flex items-center justify-center mb-1">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs sm:text-sm font-black text-pink-600 dark:text-pink-400 leading-tight">
                {expiredCount || 0}
              </span>
              <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 mt-0.5 leading-tight">
                Expired
              </span>
            </div>

            {/* 4. Near Expiry (Teal/Green) */}
            <div 
              onClick={() => navigate('/inventory?filter=near_expiry')}
              className="p-2 rounded-2xl bg-[#ccfbf1] dark:bg-[#072c27] border border-teal-200 dark:border-teal-900/60 flex flex-col items-center justify-center text-center cursor-pointer hover:opacity-90 transition-all active:scale-95"
            >
              <div className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-1">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs sm:text-sm font-black text-teal-700 dark:text-teal-300 leading-tight">
                {nearExpiryCount || 0}
              </span>
              <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 mt-0.5 leading-tight">
                Near Expiry
              </span>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            7. "QUICK NAVIGATION" (2x4 Grid of 8 Modular App Shortcuts)
        ───────────────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tracking-tight">
              Quick Navigation
            </h3>
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>( Edit → )</span>
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            {/* 1. Sales */}
            <button
              type="button"
              onClick={() => navigate('/sale/invoices')}
              className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mb-1.5 shadow-2xs">
                <Receipt className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-black text-slate-800 dark:text-slate-200">Sales</span>
            </button>

            {/* 2. Purchase */}
            <button
              type="button"
              onClick={() => navigate('/purchases')}
              className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1.5 shadow-2xs">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-black text-slate-800 dark:text-slate-200">Purchase</span>
            </button>

            {/* 3. Inventory */}
            <button
              type="button"
              onClick={() => navigate('/inventory')}
              className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1.5 shadow-2xs">
                <Package className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-black text-slate-800 dark:text-slate-200">Inventory</span>
            </button>

            {/* 4. Parties */}
            <button
              type="button"
              onClick={() => navigate('/parties')}
              className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-1.5 shadow-2xs">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-black text-slate-800 dark:text-slate-200">Parties</span>
            </button>

            {/* 5. Expenses */}
            <button
              type="button"
              onClick={() => navigate('/expenses')}
              className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-1.5 shadow-2xs">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-black text-slate-800 dark:text-slate-200">Expenses</span>
            </button>

            {/* 6. Reports */}
            <button
              type="button"
              onClick={() => navigate('/reports')}
              className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-1.5 shadow-2xs">
                <BarChart3 className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-black text-slate-800 dark:text-slate-200">Reports</span>
            </button>

            {/* 7. Returns */}
            <button
              type="button"
              onClick={() => navigate('/sale/return')}
              className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-1.5 shadow-2xs">
                <RotateCcw className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-black text-slate-800 dark:text-slate-200">Returns</span>
            </button>

            {/* 8. Settings */}
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-1.5 shadow-2xs">
                <Settings className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-black text-slate-800 dark:text-slate-200">Settings</span>
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            8. "AI INSIGHTS" CAPSULE WIDGET
        ───────────────────────────────────────────────────────────── */}
        <div 
          onClick={() => navigate('/ai-assistant')}
          className="rounded-3xl bg-gradient-to-r from-[#eef2ff] via-[#ede9fe] to-[#f5f3ff] dark:from-[#1b1938] dark:via-[#1e1b4b] dark:to-[#171534] p-3.5 border border-indigo-200/80 dark:border-indigo-800/60 shadow-sm flex items-center justify-between cursor-pointer hover:opacity-95 transition-all active:scale-98"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                <span>AI Insights</span>
              </h4>
              <p className="text-[11px] text-indigo-900/80 dark:text-indigo-300/80 font-medium line-clamp-1">
                Get smart suggestions for stock, reorders and sales.
              </p>
            </div>
          </div>
          <div className="w-7 h-7 rounded-full bg-indigo-200/60 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

      </div>

      {/* ─────────────────────────────────────────────────────────────
          9. FIXED BOTTOM NAVIGATION DOCK (With Elevated Center + Action)
      ───────────────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#0b101d]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 px-4 py-2 shadow-2xl">
        <div className="max-w-md mx-auto flex items-center justify-between relative">
          
          {/* Tab 1: Home (Active) */}
          <button
            type="button"
            onClick={() => {
              setActiveBottomNav('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all cursor-pointer ${
              activeBottomNav === 'home'
                ? 'text-indigo-600 dark:text-indigo-400 font-black'
                : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 font-semibold'
            }`}
          >
            <div className={`p-1 rounded-xl ${activeBottomNav === 'home' ? 'bg-indigo-50 dark:bg-indigo-950/60' : ''}`}>
              <Home className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight">Home</span>
            {activeBottomNav === 'home' && (
              <span className="w-3 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full mt-0.5" />
            )}
          </button>

          {/* Tab 2: Inventory */}
          <button
            type="button"
            onClick={() => {
              setActiveBottomNav('inventory');
              navigate('/inventory');
            }}
            className="flex flex-col items-center justify-center py-1 px-3 text-slate-400 hover:text-slate-600 dark:text-slate-500 font-semibold transition-all cursor-pointer"
          >
            <div className="p-1">
              <Boxes className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight">Inventory</span>
          </button>

          {/* Center Elevated Floating Plus Action Button */}
          <div className="relative -top-5">
            <button
              type="button"
              onClick={handleTriggerPOS}
              className="w-13 h-13 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/40 border-4 border-slate-100 dark:border-[#070b14] active:scale-90 transition-transform cursor-pointer"
              title="Open Rapid POS Billing"
            >
              <Plus className="w-7 h-7 stroke-[2.5]" />
            </button>
          </div>

          {/* Tab 3: Parties */}
          <button
            type="button"
            onClick={() => {
              setActiveBottomNav('parties');
              navigate('/parties');
            }}
            className="flex flex-col items-center justify-center py-1 px-3 text-slate-400 hover:text-slate-600 dark:text-slate-500 font-semibold transition-all cursor-pointer"
          >
            <div className="p-1">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight">Parties</span>
          </button>

          {/* Tab 4: More */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-3 text-slate-400 hover:text-slate-600 dark:text-slate-500 font-semibold transition-all cursor-pointer"
          >
            <div className="p-1">
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight">More</span>
          </button>

        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          10. SLIDE-OVER MOBILE DRAWER (For Menu / More)
      ───────────────────────────────────────────────────────────── */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm animate-in fade-in flex">
          <div 
            className="bg-white dark:bg-slate-900 w-[82%] max-w-xs h-full shadow-2xl p-5 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-200 border-r border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      {business?.name || tenant?.name || 'MBI Pharmacy'}
                    </h3>
                    <p className="text-[10px] text-slate-500">{displayRole}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Navigation Menu List */}
              <div className="space-y-1 text-xs font-bold text-slate-700 dark:text-slate-200">
                <button
                  type="button"
                  onClick={() => { setIsDrawerOpen(false); navigate('/shift-management'); }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Clock className="w-4 h-4 text-emerald-500" />
                  <span>Shift Management</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setIsDrawerOpen(false); navigate('/parties/customers'); }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Users className="w-4 h-4 text-blue-500" />
                  <span>Customer Khata</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setIsDrawerOpen(false); navigate('/parties/suppliers'); }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Building2 className="w-4 h-4 text-purple-500" />
                  <span>Supplier Khata</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setIsDrawerOpen(false); navigate('/daily-notes'); }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <FileText className="w-4 h-4 text-amber-500" />
                  <span>Daily Notes & Tasks</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setIsDrawerOpen(false); navigate('/sync-health'); }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Shield className="w-4 h-4 text-cyan-500" />
                  <span>Cloud Sync & Diagnostics</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setIsDrawerOpen(false); navigate('/settings'); }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-500" />
                  <span>App & Printer Settings</span>
                </button>
              </div>
            </div>

            {/* Drawer Bottom Actions: Dark Mode & Logout */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <button
                type="button"
                onClick={() => {
                  document.documentElement.classList.toggle('dark');
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-indigo-500" />
                  <span>Dark Theme Toggle</span>
                </div>
                <span className="text-[10px] font-semibold text-slate-400">Switch</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (window.confirm('Are you sure you want to log out from this device?')) {
                    setIsDrawerOpen(false);
                    await logout();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 border border-rose-200 dark:border-rose-900/60 text-xs font-bold transition-all cursor-pointer active:scale-98"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout Session</span>
              </button>
            </div>
          </div>

          <div className="flex-1" onClick={() => setIsDrawerOpen(false)} />
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          11. PHARMACY ALERTS MODAL POPUP
      ───────────────────────────────────────────────────────────── */}
      {isAlertsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div 
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-500" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Pharmacy Stock Alerts</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAlertsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div 
                onClick={() => { setIsAlertsModalOpen(false); navigate('/shortage-registry'); }}
                className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Package className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span className="font-bold text-rose-900 dark:text-rose-200">Out of Stock Items</span>
                </div>
                <span className="font-black text-rose-600 dark:text-rose-400 text-sm">{outOfStockCount}</span>
              </div>

              <div 
                onClick={() => { setIsAlertsModalOpen(false); navigate('/shortage-registry'); }}
                className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Boxes className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="font-bold text-amber-900 dark:text-amber-200">Low Stock Reorder</span>
                </div>
                <span className="font-black text-amber-600 dark:text-amber-400 text-sm">{lowStockCount}</span>
              </div>

              <div 
                onClick={() => { setIsAlertsModalOpen(false); navigate('/inventory?filter=expired'); }}
                className="p-3 rounded-2xl bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-900/60 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                  <span className="font-bold text-pink-900 dark:text-pink-200">Expired Medicines</span>
                </div>
                <span className="font-black text-pink-600 dark:text-pink-400 text-sm">{expiredCount}</span>
              </div>

              <div 
                onClick={() => { setIsAlertsModalOpen(false); navigate('/inventory?filter=near_expiry'); }}
                className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/60 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span className="font-bold text-teal-900 dark:text-teal-200">Near Expiry (90 Days)</span>
                </div>
                <span className="font-black text-teal-600 dark:text-teal-400 text-sm">{nearExpiryCount}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => { setIsAlertsModalOpen(false); navigate('/shortage-registry'); }}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-md shadow-blue-600/20"
            >
              Open Full Shortage Registry
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
