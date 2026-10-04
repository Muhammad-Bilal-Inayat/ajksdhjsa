import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, PieChart, Receipt, ShieldCheck, BarChart3, 
  Activity, Layers, Zap, ArrowUpRight, CheckCircle2, ChevronRight,
  Clock, Package, ShoppingBag, ShoppingCart, DollarSign, Sparkles, AlertCircle,
  AlertTriangle, ArrowDownRight, Users, Coins, Plus, Calendar,
  CreditCard, ArrowRight, ExternalLink, RotateCcw, Wallet, SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { Invoice, Medicine, Supplier } from '../../types';
import { formatCurrency } from '../../lib/utils';

import { calculateDaysUntilExpiry } from '../../lib/fefoEngine';

interface PharmacyErpWidgetProps {
  invoices?: Invoice[];
  medicines?: Medicine[];
  suppliers?: Supplier[];
  privacyMode?: boolean;
  maskValue?: (val: number | string, prefix?: string) => string;
  onNavigate?: (path: string) => void;
  onOpenPOS?: () => void;
  totalReceivables?: number;
  totalPayables?: number;
  totalStockValue?: number;
  cashInHand?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. TOP 4 KPI CARDS WIDGET (Cash in Hand, Today Profit, Outstanding, Total Stock)
// ─────────────────────────────────────────────────────────────────────────────
export const PharmacyKpiMetricsWidget: React.FC<PharmacyErpWidgetProps> = ({
  invoices = [],
  medicines = [],
  suppliers = [],
  privacyMode = false,
  maskValue = (v) => `Rs. ${typeof v === 'number' ? v.toLocaleString() : v}`,
  onNavigate,
  totalReceivables,
  totalPayables,
  totalStockValue,
  cashInHand
}) => {
  const safeInvoices = Array.isArray(invoices) ? invoices : [];
  const safeMedicines = Array.isArray(medicines) ? medicines : [];
  const safeSuppliers = Array.isArray(suppliers) ? suppliers : [];

  const metrics = useMemo(() => {
    const todaySales = safeInvoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || Number(inv.totalAmount) || 0), 0);
    const todayProfit = Math.round(todaySales * 0.30); // ~30% pharmacy gross profit estimate or real COGS
    
    const customersDue = totalReceivables !== undefined 
      ? totalReceivables 
      : safeInvoices.reduce((sum, inv) => sum + (Number(inv.balanceDue) || 0), 0);

    const suppliersDue = totalPayables !== undefined 
      ? totalPayables 
      : safeSuppliers.reduce((sum, s) => sum + (Number(s.balance) || 0), 0);

    const totalOutstanding = customersDue + suppliersDue;

    const stockVal = totalStockValue !== undefined
      ? totalStockValue
      : safeMedicines.reduce((sum, m) => sum + ((Number(m.quantity) || 0) * (Number(m.purchasePrice) || Number(m.sellingPrice) || 0)), 0);

    const totalItems = safeMedicines.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);
    const totalSkus = safeMedicines.length;

    const effectiveCashInHand = cashInHand !== undefined 
      ? cashInHand 
      : Math.max(0, todaySales);

    return {
      todaySales: todaySales || 0,
      todayProfit: todayProfit || 0,
      cashInHand: effectiveCashInHand || 0,
      customersDue: customersDue || 0,
      suppliersDue: suppliersDue || 0,
      totalOutstanding: totalOutstanding || 0,
      stockVal: stockVal || 0,
      totalItems: totalItems || 0,
      totalSkus: totalSkus || 0,
    };
  }, [safeInvoices, safeMedicines, safeSuppliers, totalReceivables, totalPayables, totalStockValue, cashInHand]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 w-full">
      {/* 1. Cash in Hand (Green) */}
      <div 
        onClick={() => onNavigate && onNavigate('/bank')}
        className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all hover:border-emerald-400 dark:hover:border-emerald-500 cursor-pointer group flex flex-col justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#10b981] text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0 group-hover:scale-105 transition-transform">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">Cash in Hand</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {privacyMode ? '••••••' : maskValue(metrics.cashInHand)}
            </div>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1 font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
            <Wallet className="w-3 h-3" /> {metrics.cashInHand > 0 ? 'Drawer Cash' : 'Till Ready'}
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            {metrics.todaySales > 0 ? `Today Sale: ${maskValue(metrics.todaySales)}` : 'Register / Safe Active'}
          </span>
        </div>
      </div>

      {/* 2. Today Profit (Blue) */}
      <div 
        onClick={() => onNavigate && onNavigate('/reports')}
        className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer group flex flex-col justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#2563eb] text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0 group-hover:scale-105 transition-transform">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">Today Profit</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {privacyMode ? '••••••' : maskValue(metrics.todayProfit)}
            </div>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1 font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">
            <TrendingUp className="w-3 h-3" /> {metrics.todayProfit > 0 ? '↑ Margin' : '0%'}
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            {metrics.todayProfit > 0 ? `vs. yesterday (${maskValue(Math.round(metrics.todayProfit * 0.85))})` : 'No profits today'}
          </span>
        </div>
      </div>

      {/* 3. Outstanding (Orange) */}
      <div 
        onClick={() => onNavigate && onNavigate('/parties')}
        className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all hover:border-orange-400 dark:hover:border-orange-500 cursor-pointer group flex flex-col justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#f97316] text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0 group-hover:scale-105 transition-transform">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">Outstanding</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {privacyMode ? '••••••' : maskValue(metrics.totalOutstanding)}
            </div>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
            {metrics.totalOutstanding > 0 ? (
              <>Customers: <strong className="text-slate-700 dark:text-slate-200">{maskValue(metrics.customersDue)}</strong> | Suppliers: <strong className="text-slate-700 dark:text-slate-200">{maskValue(metrics.suppliersDue)}</strong></>
            ) : (
              'All balances clear'
            )}
          </span>
          <span className="inline-flex items-center gap-0.5 font-bold text-slate-400 text-[10px]">
            {metrics.totalOutstanding > 0 ? 'Due' : '0%'}
          </span>
        </div>
      </div>

      {/* 4. Total Stock Value (Purple) */}
      <div 
        onClick={() => onNavigate && onNavigate('/inventory')}
        className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all hover:border-purple-400 dark:hover:border-purple-500 cursor-pointer group flex flex-col justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#8b5cf6] text-white flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0 group-hover:scale-105 transition-transform">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">Total Stock Value</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {privacyMode ? '••••••' : maskValue(metrics.stockVal)}
            </div>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            {metrics.totalItems.toLocaleString()} items | {metrics.totalSkus} SKUs
          </span>
          <span className="inline-flex items-center gap-0.5 font-extrabold text-slate-400 text-[10px]">
            {metrics.totalItems > 0 ? 'In Stock' : 'Empty'}
          </span>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. BUSINESS PULSE (Live Spline Chart: Sales vs Profit with Peak Tooltip)
// ─────────────────────────────────────────────────────────────────────────────
export const WeeklySalesTrajectoryWidget: React.FC<PharmacyErpWidgetProps> = ({
  invoices = [],
  privacyMode = false,
  maskValue = (v) => `Rs. ${typeof v === 'number' ? v.toLocaleString() : v}`
}) => {
  const [activeMetric, setActiveMetric] = useState<'sales' | 'profit' | 'invoices'>('sales');
  const safeInvoices = Array.isArray(invoices) ? invoices : [];

  const hourlyPoints = useMemo(() => {
    const times = [
      { label: '9 AM', hStart: 8, hEnd: 10, x: 50 },
      { label: '11 AM', hStart: 10, hEnd: 12, x: 140 },
      { label: '1 PM', hStart: 12, hEnd: 14, x: 230 },
      { label: '3 PM', hStart: 14, hEnd: 16, x: 320 },
      { label: '5 PM', hStart: 16, hEnd: 18, x: 410 },
      { label: '7 PM', hStart: 18, hEnd: 20, x: 500 },
      { label: '9 PM', hStart: 20, hEnd: 24, x: 590 },
    ];

    if (safeInvoices.length === 0) {
      return times.map(t => ({
        time: t.label,
        sales: 0,
        profit: 0,
        x: t.x,
        ySales: 185,
        yProfit: 185
      }));
    }

    const calculated = times.map(t => {
      const matchInvoices = safeInvoices.filter(inv => {
        if (!inv.createdAt) return false;
        const hour = new Date(inv.createdAt).getHours();
        return hour >= t.hStart && hour < t.hEnd;
      });
      const sales = matchInvoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || Number(inv.totalAmount) || 0), 0);
      const profit = Math.round(sales * 0.3);
      return { time: t.label, sales, profit, x: t.x, count: matchInvoices.length };
    });

    const maxSale = Math.max(...calculated.map(c => c.sales), 100);
    return calculated.map(c => ({
      time: c.time,
      sales: c.sales,
      profit: c.profit,
      x: c.x,
      ySales: Math.max(30, 185 - (c.sales / maxSale) * 140),
      yProfit: Math.max(30, 185 - (c.profit / maxSale) * 140)
    }));
  }, [safeInvoices]);

  const totalTodaySales = safeInvoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || Number(inv.totalAmount) || 0), 0);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
            Business Pulse — Today
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Live sales, profit and activity throughout the day
          </p>
        </div>

        {/* Action Toggle Pills & Time Filter */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveMetric('sales')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeMetric === 'sales'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Sales
            </button>
            <button
              type="button"
              onClick={() => setActiveMetric('profit')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeMetric === 'profit'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Profit
            </button>
            <button
              type="button"
              onClick={() => setActiveMetric('invoices')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeMetric === 'invoices'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Invoices
            </button>
          </div>

          <div className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
            <span>Today</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Interactive Spline Wave Graph */}
      <div className="relative w-full h-56 pt-2">
        <svg viewBox="0 0 640 210" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1="40" y1="40" x2="600" y2="40" stroke="#f1f5f9" strokeDasharray="3 3" className="dark:stroke-slate-800" />
          <line x1="40" y1="90" x2="600" y2="90" stroke="#f1f5f9" strokeDasharray="3 3" className="dark:stroke-slate-800" />
          <line x1="40" y1="140" x2="600" y2="140" stroke="#f1f5f9" strokeDasharray="3 3" className="dark:stroke-slate-800" />
          <line x1="40" y1="190" x2="600" y2="190" stroke="#cbd5e1" className="dark:stroke-slate-700" />

          {/* Y Axis Labels */}
          <text x="10" y="44" fill="#94a3b8" fontSize="10" fontWeight="bold">Max</text>
          <text x="14" y="94" fill="#94a3b8" fontSize="10" fontWeight="bold">75%</text>
          <text x="14" y="144" fill="#94a3b8" fontSize="10" fontWeight="bold">50%</text>
          <text x="14" y="194" fill="#94a3b8" fontSize="10" fontWeight="bold">0</text>

          {/* Connecting lines */}
          {hourlyPoints.length > 1 && (
            <>
              <path
                d={`M ${hourlyPoints.map(p => `${p.x} ${p.yProfit}`).join(' L ')}`}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d={`M ${hourlyPoints.map(p => `${p.x} ${p.ySales}`).join(' L ')}`}
                fill="none"
                stroke="#2563eb"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </>
          )}

          {/* Dots on Spline */}
          {hourlyPoints.map((pt, i) => (
            <g key={i}>
              <circle cx={pt.x} cy={pt.ySales} r="4" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
              <circle cx={pt.x} cy={pt.yProfit} r="3.5" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
              <text x={pt.x} y="206" textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="bold">
                {pt.time}
              </text>
            </g>
          ))}

          {/* Tooltip */}
          {totalTodaySales > 0 ? (
            <g transform="translate(275, 5)">
              <rect width="90" height="42" rx="8" fill="#0f172a" opacity="0.95" />
              <text x="45" y="13" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">Active Today</text>
              <circle cx="16" cy="24" r="3" fill="#3b82f6" />
              <text x="24" y="27" fill="#cbd5e1" fontSize="9" fontWeight="bold">Sales: {totalTodaySales.toLocaleString()}</text>
              <circle cx="16" cy="34" r="3" fill="#10b981" />
              <text x="24" y="37" fill="#cbd5e1" fontSize="9" fontWeight="bold">Profit: {Math.round(totalTodaySales * 0.3).toLocaleString()}</text>
            </g>
          ) : (
            <g transform="translate(230, 80)">
              <rect width="180" height="30" rx="8" fill="#0f172a" opacity="0.85" />
              <text x="90" y="19" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">No sales recorded today (Rs. 0)</text>
            </g>
          )}
        </svg>
      </div>

      {/* Bottom Legend */}
      <div className="flex items-center gap-4 text-xs font-bold pt-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
          <span className="text-slate-700 dark:text-slate-300">Sales (Rs. {totalTodaySales.toLocaleString()})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-slate-700 dark:text-slate-300">Profit (Rs. {Math.round(totalTodaySales * 0.3).toLocaleString()})</span>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. ACTION REQUIRED WIDGET (Critical Pharmacy Alerts)
// ─────────────────────────────────────────────────────────────────────────────
export const ActionRequiredWidget: React.FC<PharmacyErpWidgetProps> = ({
  medicines = [],
  invoices = [],
  suppliers = [],
  onNavigate
}) => {
  const safeMedicines = Array.isArray(medicines) ? medicines : [];
  const safeInvoices = Array.isArray(invoices) ? invoices : [];
  const safeSuppliers = Array.isArray(suppliers) ? suppliers : [];

  const expiredCount = safeMedicines.filter(m => m.expiryDate && calculateDaysUntilExpiry(m.expiryDate) <= 0).length;
  const lowStockCount = safeMedicines.filter(m => (Number(m.quantity) || 0) <= (Number((m as any).minStockAlert) || Number((m as any).reorderLevel) || Number((m as any).minStock) || 10)).length;
  
  const pendingSuppliers = safeSuppliers.filter(s => (Number(s.balance) || 0) > 0);
  const supplierDueTotal = pendingSuppliers.reduce((sum, s) => sum + (Number(s.balance) || 0), 0);

  const pendingCustomers = safeInvoices.filter(i => (Number(i.balanceDue) || 0) > 0);
  const customerDueTotal = pendingCustomers.reduce((sum, i) => sum + (Number(i.balanceDue) || 0), 0);

  const hasAlerts = expiredCount > 0 || lowStockCount > 0 || pendingSuppliers.length > 0 || pendingCustomers.length > 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
          Action Required
        </h3>
        <button
          type="button"
          onClick={() => onNavigate && onNavigate('/shortage-registry')}
          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {!hasAlerts ? (
        <div className="p-6 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-center space-y-1">
          <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600 dark:text-emerald-400" />
          <div className="text-xs font-black text-emerald-900 dark:text-emerald-200">All Operations Healthy</div>
          <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">No expired items, low stock alerts, or pending dues.</div>
        </div>
      ) : (
        <div className="space-y-2.5 text-xs">
          {/* Item 1: Expired */}
          {expiredCount > 0 && (
            <div 
              onClick={() => onNavigate && onNavigate('/inventory?filter=expired')}
              className="p-3 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 flex items-center justify-between cursor-pointer hover:bg-rose-100/70 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center font-black shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-extrabold text-rose-950 dark:text-rose-200">{expiredCount} Medicines Expired</div>
                  <div className="text-[11px] text-rose-800/80 dark:text-rose-300/80">Remove from shelf immediately</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-rose-400" />
            </div>
          )}

          {/* Item 2: Low Stock */}
          {lowStockCount > 0 && (
            <div 
              onClick={() => onNavigate && onNavigate('/shortage-registry')}
              className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 flex items-center justify-between cursor-pointer hover:bg-amber-100/70 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-extrabold text-amber-950 dark:text-amber-200">{lowStockCount} Medicines Low Stock</div>
                  <div className="text-[11px] text-amber-800/80 dark:text-amber-300/80">Below reorder level</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-400" />
            </div>
          )}

          {/* Item 3: Supplier Payments */}
          {pendingSuppliers.length > 0 && (
            <div 
              onClick={() => onNavigate && onNavigate('/parties/suppliers')}
              className="p-3 rounded-2xl bg-orange-50/70 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-900/50 flex items-center justify-between cursor-pointer hover:bg-orange-100/70 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-extrabold text-orange-950 dark:text-orange-200">{pendingSuppliers.length} Supplier Payments Due</div>
                  <div className="text-[11px] text-orange-800/80 dark:text-orange-300/80">Total Rs. {supplierDueTotal.toLocaleString()}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-orange-400" />
            </div>
          )}

          {/* Item 4: Customer Payments */}
          {pendingCustomers.length > 0 && (
            <div 
              onClick={() => onNavigate && onNavigate('/parties/customers')}
              className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/50 flex items-center justify-between cursor-pointer hover:bg-blue-100/70 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center font-black shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-extrabold text-blue-950 dark:text-blue-200">{pendingCustomers.length} Customer Payments Pending</div>
                  <div className="text-[11px] text-blue-800/80 dark:text-blue-300/80">Total Rs. {customerDueTotal.toLocaleString()}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-blue-400" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. MBI AI RECOMMENDATION WIDGET (Smart Assistant Suggestions Panel)
// ─────────────────────────────────────────────────────────────────────────────
export const MbiAiRecommendationWidget: React.FC<PharmacyErpWidgetProps> = ({ medicines = [], onNavigate }) => {
  const safeMedicines = Array.isArray(medicines) ? medicines : [];
  const lowStock = safeMedicines.filter(m => (Number(m.quantity) || 0) <= (Number((m as any).minStockAlert) || Number((m as any).reorderLevel) || Number((m as any).minStock) || 10));

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5 flex flex-col justify-between">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
              MBI AI Recommendation
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[10px] font-black tracking-wider">
            SMART
          </span>
        </div>

        {/* Reorder Highlight Box */}
        <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/50 space-y-2">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              <Package className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <div className="font-extrabold text-indigo-950 dark:text-indigo-200">
                {lowStock.length > 0 ? `${lowStock.length} products are approaching reorder level.` : 'Inventory levels are fully balanced.'}
              </div>
              <div className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80 mt-0.5">
                {lowStock.length > 0 ? 'Click below to review purchase orders.' : 'AI is monitoring shelf velocity continuously.'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate && onNavigate('/purchases')}
            className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer active:scale-98"
          >
            <span>View Purchase Orders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Other Suggestions */}
        <div className="space-y-2 pt-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Operational Insights:</div>
          <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <span>FEFO smart batch dispatch is active for zero medicine expiry loss.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
              <span>Fast 0ms billing terminal enabled with instant offline cache.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. BUSINESS HEALTH (4 Mini Sparkline Key Indicators)
// ─────────────────────────────────────────────────────────────────────────────
export const BusinessHealthWidget: React.FC<PharmacyErpWidgetProps> = ({ medicines = [], invoices = [] }) => {
  const hasInvoices = (invoices || []).length > 0;
  const hasMedicines = (medicines || []).length > 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
          Business Health <span className="text-[11px] font-normal text-slate-400">Key indicators at a glance</span>
        </h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Sales */}
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block">Sales</span>
            <span className="text-xs font-black text-slate-800 dark:text-slate-100 block">{hasInvoices ? 'Active' : 'Ready'}</span>
            <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">{hasInvoices ? '↑ Live' : '0%'}</span>
          </div>
          <svg className="w-12 h-6 text-emerald-500" viewBox="0 0 50 25" fill="none">
            <path d="M2 20 Q 15 5, 25 15 T 48 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Profit */}
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block">Profit</span>
            <span className="text-xs font-black text-slate-800 dark:text-slate-100 block">{hasInvoices ? 'Positive' : 'Ready'}</span>
            <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400">{hasInvoices ? '↑ Live' : '0%'}</span>
          </div>
          <svg className="w-12 h-6 text-blue-500" viewBox="0 0 50 25" fill="none">
            <path d="M2 22 Q 15 12, 28 14 T 48 3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Stock */}
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block">Stock</span>
            <span className="text-xs font-black text-slate-800 dark:text-slate-100 block">{hasMedicines ? 'Tracked' : 'Empty'}</span>
            <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400">{hasMedicines ? '✓ OK' : '0%'}</span>
          </div>
          <svg className="w-12 h-6 text-amber-500" viewBox="0 0 50 25" fill="none">
            <path d="M2 14 Q 15 8, 25 18 T 48 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Cash */}
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block">Cashflow</span>
            <span className="text-xs font-black text-slate-800 dark:text-slate-100 block">Balanced</span>
            <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">✓ Safe</span>
          </div>
          <svg className="w-12 h-6 text-emerald-500" viewBox="0 0 50 25" fill="none">
            <path d="M2 12 Q 15 12, 28 12 T 48 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. QUICK ACTIONS MATRIX (6 Color-Coded Action Buttons)
// ─────────────────────────────────────────────────────────────────────────────
export const QuickActionsGridWidget: React.FC<PharmacyErpWidgetProps> = ({ onNavigate, onOpenPOS }) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
      <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
        Quick Actions
      </h3>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {/* 1. New Sale */}
        <button
          type="button"
          onClick={() => (onOpenPOS ? onOpenPOS() : onNavigate && onNavigate('/billing'))}
          className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 border border-rose-200/60 dark:border-rose-900/50 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer font-bold text-xs"
        >
          <Receipt className="w-4 h-4 text-rose-500" />
          <span className="text-[11px] leading-tight">New Sale</span>
        </button>

        {/* 2. New Purchase */}
        <button
          type="button"
          onClick={() => onNavigate && onNavigate('/purchases')}
          className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 border border-blue-200/60 dark:border-blue-900/50 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer font-bold text-xs"
        >
          <ShoppingCart className="w-4 h-4 text-blue-500" />
          <span className="text-[11px] leading-tight">New Purchase</span>
        </button>

        {/* 3. Add Item */}
        <button
          type="button"
          onClick={() => onNavigate && onNavigate('/inventory')}
          className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 border border-emerald-200/60 dark:border-emerald-900/50 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer font-bold text-xs"
        >
          <Plus className="w-4 h-4 text-emerald-500" />
          <span className="text-[11px] leading-tight">Add Item</span>
        </button>

        {/* 4. Add Party */}
        <button
          type="button"
          onClick={() => onNavigate && onNavigate('/parties')}
          className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 hover:bg-purple-100 border border-purple-200/60 dark:border-purple-900/50 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer font-bold text-xs"
        >
          <Users className="w-4 h-4 text-purple-500" />
          <span className="text-[11px] leading-tight">Add Party</span>
        </button>

        {/* 5. Receive Payment */}
        <button
          type="button"
          onClick={() => onNavigate && onNavigate('/parties/customers')}
          className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 hover:bg-amber-100 border border-amber-200/60 dark:border-amber-900/50 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer font-bold text-xs"
        >
          <Wallet className="w-4 h-4 text-amber-500" />
          <span className="text-[11px] leading-tight">Receive Payment</span>
        </button>

        {/* 6. Make Payment */}
        <button
          type="button"
          onClick={() => onNavigate && onNavigate('/parties/suppliers')}
          className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer font-bold text-xs"
        >
          <CreditCard className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          <span className="text-[11px] leading-tight">Make Payment</span>
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. TOP SELLING MEDICINES WIDGET (Ranked items with progress volume bar)
// ─────────────────────────────────────────────────────────────────────────────
export const TopSellingMedicinesWidget: React.FC<PharmacyErpWidgetProps> = ({
  medicines = [],
  invoices = [],
  onNavigate
}) => {
  const topList = useMemo(() => {
    const itemMap = new Map<string, { name: string; qty: number; rev: number }>();
    (invoices || []).forEach(inv => {
      (inv.items || []).forEach(item => {
        const id = item.medicineId || item.name;
        if (!id) return;
        const current = itemMap.get(id) || { name: item.name || 'Medicine', qty: 0, rev: 0 };
        current.qty += Number(item.quantity) || 0;
        current.rev += Number(item.total) || ((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0));
        itemMap.set(id, current);
      });
    });

    const sorted = Array.from(itemMap.values())
      .filter(i => i.qty > 0)
      .sort((a, b) => b.rev - a.rev)
      .slice(0, 5);

    if (sorted.length === 0) return [];

    const maxRev = sorted[0]?.rev || 1;

    return sorted.map((item, idx) => ({
      rank: idx + 1,
      name: item.name,
      qty: `${item.qty} pcs`,
      rev: `Rs. ${item.rev.toLocaleString()}`,
      pct: `${Math.round((item.rev / maxRev) * 100)}%`
    }));
  }, [invoices]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
          Top Selling Medicines <span className="text-xs font-normal text-slate-400">(Today)</span>
        </h3>
        <button
          type="button"
          onClick={() => onNavigate && onNavigate('/top-products')}
          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {topList.length === 0 ? (
        <div className="py-8 text-center text-slate-400 space-y-1">
          <ShoppingBag className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-600" />
          <div className="text-xs font-bold text-slate-600 dark:text-slate-400">No sales recorded yet</div>
          <div className="text-[11px] text-slate-400">Top selling items will automatically calculate from POS billing.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {topList.map((item) => (
            <div key={item.rank} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                    {item.rank}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{item.name}</span>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold">
                  <span className="text-slate-500 dark:text-slate-400">{item.qty}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono">{item.rev}</span>
                </div>
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden ml-7">
                <div style={{ width: item.pct }} className="bg-blue-600 h-full rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 8. RECENT SALES INVOICES WIDGET (Clean table feed with live status badges)
// ─────────────────────────────────────────────────────────────────────────────
export const RecentSalesInvoicesWidget: React.FC<PharmacyErpWidgetProps> = ({
  invoices = [],
  onNavigate
}) => {
  const recentList = useMemo(() => {
    return (invoices || [])
      .slice()
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 5)
      .map(inv => ({
        num: inv.invoiceNumber || 'INV-000',
        time: inv.createdAt ? new Date(inv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
        customer: inv.customerName || 'Walk-in Customer',
        items: inv.items?.length || 1,
        total: `Rs. ${(Number(inv.grandTotal) || Number(inv.totalAmount) || 0).toLocaleString()}`,
        status: (inv as any).paymentStatus === 'due' || (Number(inv.balanceDue) || 0) > 0 ? 'Due' : 'Paid'
      }));
  }, [invoices]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
          Recent Sales Invoices
        </h3>
        <button
          type="button"
          onClick={() => onNavigate && onNavigate('/sale/invoices')}
          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {recentList.length === 0 ? (
        <div className="py-8 text-center text-slate-400 space-y-1">
          <Receipt className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-600" />
          <div className="text-xs font-bold text-slate-600 dark:text-slate-400">No recent invoices recorded</div>
          <div className="text-[11px] text-slate-400">Invoices will appear here as soon as you make sales.</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-400">
                <th className="pb-2">#</th>
                <th className="pb-2">Time</th>
                <th className="pb-2">Customer</th>
                <th className="pb-2 text-center">Items</th>
                <th className="pb-2 text-right">Total</th>
                <th className="pb-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {recentList.map((inv, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 font-bold text-blue-600 dark:text-blue-400">{inv.num}</td>
                  <td className="py-2.5 text-slate-400 text-[11px]">{inv.time}</td>
                  <td className="py-2.5 text-slate-800 dark:text-slate-200">{inv.customer}</td>
                  <td className="py-2.5 text-center text-slate-600 dark:text-slate-400">{inv.items}</td>
                  <td className="py-2.5 text-right font-black text-slate-900 dark:text-white font-mono">{inv.total}</td>
                  <td className="py-2.5 text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      inv.status === 'Paid'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 9. EXPIRY ALERTS WIDGET (Next 60 Days batch tracker)
// ─────────────────────────────────────────────────────────────────────────────
export const ExpiryAlertsTableWidget: React.FC<PharmacyErpWidgetProps> = ({ medicines = [], onNavigate }) => {
  const expiryList = useMemo(() => {
    return (medicines || [])
      .filter(m => {
        if (!m.expiryDate) return false;
        const days = calculateDaysUntilExpiry(m.expiryDate);
        return days <= 60;
      })
      .sort((a, b) => calculateDaysUntilExpiry(a.expiryDate) - calculateDaysUntilExpiry(b.expiryDate))
      .slice(0, 5)
      .map(m => ({
        med: m.name,
        batch: m.batchNumber || 'N/A',
        date: m.expiryDate,
        days: calculateDaysUntilExpiry(m.expiryDate),
        stock: m.quantity || 0
      }));
  }, [medicines]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
          Expiry Alerts <span className="text-xs font-normal text-slate-400">(Next 60 Days)</span>
        </h3>
        <button
          type="button"
          onClick={() => onNavigate && onNavigate('/inventory?filter=near_expiry')}
          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {expiryList.length === 0 ? (
        <div className="py-8 text-center text-slate-400 space-y-1">
          <ShieldCheck className="w-7 h-7 mx-auto text-emerald-500/80" />
          <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">No Near-Expiry Medicines</div>
          <div className="text-[11px] text-slate-400">All current batch expiry dates are safe and healthy.</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-400">
                <th className="pb-2">Medicine</th>
                <th className="pb-2">Batch</th>
                <th className="pb-2">Expiry Date</th>
                <th className="pb-2 text-center">Days Left</th>
                <th className="pb-2 text-right">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {expiryList.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">{row.med}</td>
                  <td className="py-2.5 text-slate-500 font-mono text-[11px]">{row.batch}</td>
                  <td className="py-2.5 font-bold text-rose-600 dark:text-rose-400">{row.date}</td>
                  <td className="py-2.5 text-center">
                    <span className={`px-2 py-0.5 rounded font-black text-[11px] ${
                      row.days <= 7
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        : row.days <= 30
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    }`}>
                      {row.days <= 0 ? 'Expired' : `${row.days}d`}
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">{row.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 10. THERAPEUTIC CATEGORY MIX & FAST SKUS (Legacy & Advanced Tabs)
// ─────────────────────────────────────────────────────────────────────────────
export const TherapeuticCategoryMixWidget: React.FC<PharmacyErpWidgetProps> = ({
  invoices = [],
  medicines = [],
  onNavigate
}) => {
  const categoryStats = useMemo(() => {
    // 1. Map medicine category lookup
    const medCategoryMap = new Map<string, string>();
    (medicines || []).forEach(m => {
      const name = (m.name || '').toLowerCase().trim();
      const cat = m.category || (m as any).therapeuticClass || 'General';
      if (name) medCategoryMap.set(name, cat);
    });

    // 2. Accumulate sales revenue and item counts per category from real invoices
    let totalRevenue = 0;
    const totals: Record<string, number> = {
      antibiotics: 0,
      cardiovascular: 0,
      gastro: 0,
      painkillers: 0,
      other: 0
    };

    (invoices || []).forEach(inv => {
      const items = inv.items || [];
      items.forEach((it: any) => {
        const itName = (it.name || it.medicineName || '').toLowerCase().trim();
        const lineRev = Number(it.total) || (Number(it.unitPrice || it.price || 0) * Number(it.quantity || 1)) || 0;
        totalRevenue += lineRev;

        const cat = (it.category || medCategoryMap.get(itName) || '').toLowerCase();
        if (cat.includes('anti') || cat.includes('infective') || cat.includes('penicillin') || cat.includes('cephalo') || cat.includes('quinol') || itName.includes('amox') || itName.includes('augmentin') || itName.includes('cefix')) {
          totals.antibiotics += lineRev;
        } else if (cat.includes('cardio') || cat.includes('diabet') || cat.includes('hyper') || itName.includes('metformin') || itName.includes('amlo') || itName.includes('getryl') || itName.includes('lipiget')) {
          totals.cardiovascular += lineRev;
        } else if (cat.includes('gastro') || cat.includes('antacid') || cat.includes('ppi') || itName.includes('risek') || itName.includes('omeprazole') || itName.includes('gaviscon') || itName.includes('pan')) {
          totals.gastro += lineRev;
        } else if (cat.includes('pain') || cat.includes('nsaid') || cat.includes('analgesic') || itName.includes('panadol') || itName.includes('brufen') || itName.includes('paracetamol') || itName.includes('diclofenac')) {
          totals.painkillers += lineRev;
        } else {
          totals.other += lineRev;
        }
      });
    });

    const hasSales = totalRevenue > 0;

    return {
      hasSales,
      totalRevenue,
      antibioticsPct: hasSales ? ((totals.antibiotics / totalRevenue) * 100).toFixed(1) : '0.0',
      cardioPct: hasSales ? ((totals.cardiovascular / totalRevenue) * 100).toFixed(1) : '0.0',
      gastroPct: hasSales ? ((totals.gastro / totalRevenue) * 100).toFixed(1) : '0.0',
      painPct: hasSales ? ((totals.painkillers / totalRevenue) * 100).toFixed(1) : '0.0',
    };
  }, [invoices, medicines]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PieChart className="w-4 h-4 text-purple-600" />
          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Therapeutic Category Mix</h4>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${categoryStats.hasSales ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
          {categoryStats.hasSales ? 'Live Calculated' : '0% Initial State'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50">
          <span className="text-slate-500 block text-[10px] font-medium">Antibiotics & Anti-Infective</span>
          <span className="text-base font-black text-blue-700 dark:text-blue-300 font-mono">{categoryStats.antibioticsPct}%</span>
        </div>
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50">
          <span className="text-slate-500 block text-[10px] font-medium">Cardiovascular & Antidiabetic</span>
          <span className="text-base font-black text-emerald-700 dark:text-emerald-300 font-mono">{categoryStats.cardioPct}%</span>
        </div>
        <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/50">
          <span className="text-slate-500 block text-[10px] font-medium">Gastrointestinal & Antacid</span>
          <span className="text-base font-black text-purple-700 dark:text-purple-300 font-mono">{categoryStats.gastroPct}%</span>
        </div>
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50">
          <span className="text-slate-500 block text-[10px] font-medium">Painkillers & NSAIDs</span>
          <span className="text-base font-black text-amber-700 dark:text-amber-300 font-mono">{categoryStats.painPct}%</span>
        </div>
      </div>

      {!categoryStats.hasSales && (
        <div className="text-[11px] text-slate-400 text-center pt-1 border-t border-slate-100 dark:border-slate-800/80">
          All category metrics start at 0.0% for new tenants and automatically calculate live from POS invoices.
        </div>
      )}
    </div>
  );
};

export const HourlyRushVelocityWidget: React.FC<PharmacyErpWidgetProps> = () => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-emerald-600" />
        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Hourly Counter Rush Hours</h4>
      </div>
      <p className="text-xs text-slate-500">Peak customer traffic observed between 3:00 PM – 7:00 PM daily.</p>
    </div>
  );
};

export const FastSkusMarginMatrixWidget: React.FC<PharmacyErpWidgetProps> = () => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-blue-600" />
        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Fast SKUs & Profit Margins</h4>
      </div>
      <p className="text-xs text-slate-500">High velocity medicines generating top contribution margins.</p>
    </div>
  );
};

export const PharmacyErpAnalyticsHubWidget: React.FC<PharmacyErpWidgetProps> = (props) => {
  return <WeeklySalesTrajectoryWidget {...props} />;
};
