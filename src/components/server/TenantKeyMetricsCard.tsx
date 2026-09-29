import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, 
  Receipt, 
  Users, 
  Package, 
  TrendingUp, 
  ShieldCheck, 
  Activity, 
  HardDrive, 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight, 
  Sparkles, 
  BarChart3,
  Percent,
  Layers,
  ShoppingBag
} from 'lucide-react';
import { 
  Tenant, 
  getAllTenants, 
  getTenantKeyMetrics, 
  TenantKeyMetrics,
  wipeAllMasterUsers 
} from '../../lib/masterServerService';
import { Trash2, RefreshCw } from 'lucide-react';

interface TenantKeyMetricsCardProps {
  onNotify?: (msg: string) => void;
  onSelectTab?: (tab: string) => void;
}

export const TenantKeyMetricsCard: React.FC<TenantKeyMetricsCardProps> = ({ onNotify, onSelectTab }) => {
  const [tenants] = useState<Tenant[]>(() => getAllTenants());
  const [selectedTenantId, setSelectedTenantId] = useState<string>('ALL');
  const [refreshKey, setRefreshKey] = useState<number>(0);

  useEffect(() => {
    const handleUpdate = () => setRefreshKey(prev => prev + 1);
    window.addEventListener('mbi-master-users-wiped', handleUpdate);
    window.addEventListener('mbi-users-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('mbi-master-users-wiped', handleUpdate);
      window.removeEventListener('mbi-users-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const metrics: TenantKeyMetrics = useMemo(() => {
    return getTenantKeyMetrics(selectedTenantId);
  }, [selectedTenantId, refreshKey]);

  const handleWipeUsers = () => {
    wipeAllMasterUsers();
    setRefreshKey(prev => prev + 1);
    onNotify?.('✨ All ghost & accumulated mock users wiped. Master user count reset to active authenticated admin.');
  };

  return (
    <div className="bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-sm dark:shadow-xl relative overflow-hidden">
      {/* Background Decorative Mesh Glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Row: Title & Scope Selector */}
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-cyan-500/15 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-500/30 shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {metrics.tenantName}
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold font-mono ${
                metrics.status === 'Active' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' :
                metrics.status === 'Trial' ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800' :
                'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
              }`}>
                {metrics.status.toUpperCase()}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 font-semibold">
                {metrics.plan}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
              <span>{metrics.city}</span>
              <span>•</span>
              <span>Owner: {metrics.ownerName}</span>
              <span>•</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-mono font-semibold">Last Sync: {metrics.lastSyncFormatted}</span>
            </p>
          </div>
        </div>

        {/* Fleet System Health Status Badge (Replaces confusing tenant dropdown) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/60 text-cyan-800 dark:text-cyan-300 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping inline-block" />
            <span>Universal Fleet Sync Active</span>
          </div>
        </div>
      </div>

      {/* 3 Core Metric Pillar Cards (Transactions, Users, Inventory Value) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
        {/* Metric 1: Total Transactions Processed */}
        <div className="bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4.5 relative group hover:border-cyan-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>Total Transactions Processed</span>
            </span>
            <div className="w-7 h-7 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white font-mono">
              {metrics.totalTransactionsCount.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Invoices</span>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-700/50 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">Total Volume: </span>
              <span className="font-mono font-bold text-cyan-700 dark:text-cyan-300">
                PKR {metrics.totalRevenuePkr.toLocaleString()}
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              Avg: PKR {metrics.averageBasketSizePkr}
            </span>
          </div>
        </div>

        {/* Metric 2: Active vs Inactive Users */}
        <div className="bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4.5 relative group hover:border-blue-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Active vs Inactive Users</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleWipeUsers}
                title="Wipe ghost users and force sync"
                className="px-2 py-0.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10px] font-bold flex items-center gap-1 transition-all"
              >
                <Trash2 className="w-2.5 h-2.5" />
                <span>Wipe Stale</span>
              </button>
              <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Activity className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-3">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl lg:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {metrics.activeUsersCount}
              </span>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300/80">Active</span>
            </div>
            <span className="text-slate-400 dark:text-slate-500">/</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-slate-500 dark:text-slate-400 font-mono">
                {metrics.inactiveUsersCount}
              </span>
              <span className="text-xs text-slate-500">Inactive</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-700/50 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{metrics.onlineTerminalsCount} Terminals Live Online</span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Staff &amp; Cashiers
            </span>
          </div>
        </div>

        {/* Metric 3: Total Inventory Value */}
        <div className="bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4.5 relative group hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Total Inventory Valuation</span>
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl lg:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              PKR {(metrics.totalInventoryRetailPkr / 1000000).toFixed(2)}M
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Retail Value</span>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-700/50 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">Cost Basis: </span>
              <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">
                PKR {(metrics.totalInventoryCostPkr / 1000000).toFixed(2)}M
              </span>
            </div>
            <div className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[10.5px] font-mono font-bold">
              +{metrics.grossMarginPercent}% Margin
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Quick Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
          <div>
            <div className="text-slate-500 dark:text-slate-400 text-[11px]">Storage Allocation</div>
            <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {metrics.storageUsedMb} MB ({metrics.storagePercentage}%)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <div className="text-slate-500 dark:text-slate-400 text-[11px]">Sync Health Index</div>
            <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {metrics.syncHealthScore}% SLA Uptime
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
          <div>
            <div className="text-slate-500 dark:text-slate-400 text-[11px]">Active SKU Catalog</div>
            <div className="font-mono font-bold text-purple-700 dark:text-purple-300">
              {metrics.totalProductsCount.toLocaleString()} Medicines
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <div>
            <div className="text-slate-500 dark:text-slate-400 text-[11px]">Master Replication</div>
            <div className="font-mono font-bold text-blue-700 dark:text-blue-300">
              Encrypted &amp; Synced
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
