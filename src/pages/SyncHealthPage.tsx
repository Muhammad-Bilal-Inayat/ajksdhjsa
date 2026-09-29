import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, Server, Database, Clock, HardDrive, RefreshCw, 
  CheckCircle2, AlertTriangle, Zap, Layers, Cpu, ShieldCheck, 
  ArrowUpRight, BarChart3, Wifi, WifiOff, FileText, Trash2, ArrowLeft,
  Sparkles, Terminal, Check, ArrowUpCircle, ShoppingCart, ShoppingBag, CreditCard
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SyncDiagnosticsWidget } from '../components/sync/SyncDiagnosticsWidget';
import { SearchableLogViewer, LogEntry } from '../components/sync/SearchableLogViewer';
import { LocalQueueLatencyPanel } from '../components/sync/LocalQueueLatencyPanel';
import { SyncConflictsResolverPanel } from '../components/server/SyncConflictsResolverPanel';
import { syncEngine } from '../lib/syncEngine';
import { emitToast } from '../contexts/ToastContext';

interface SyncHealthResponse {
  success: boolean;
  status: string;
  syncLatencyMs: number;
  pendingWrites: number;
  serverLogCount: number;
  recentLogsCount?: number;
  recentCategorizedLogs?: LogEntry[];
  mariaDbConnected: boolean;
  activeCollectionsCount: number;
  totalRecordsCount: number;
  timestamp: string;
  storage: {
    fileSize: number;
    lastModified: string | null;
    storeCounts: Record<string, number>;
    memoryCached: boolean;
    pendingWrites: number;
    lastFlushTime: string;
  };
}

export default function SyncHealthPage() {
  const [healthData, setHealthData] = useState<SyncHealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);
  const [isSyncingNow, setIsSyncingNow] = useState<boolean>(false);
  const [pendingTxInfo, setPendingTxInfo] = useState<{
    totalPending: number;
    pendingInvoices: number;
    pendingPurchases: number;
    pendingPayments: number;
    pendingExpenses: number;
    pendingBankTx: number;
    pendingOnlineOrders: number;
    pendingBookerTx: number;
    lastSyncTime: string;
  }>({
    totalPending: 0,
    pendingInvoices: 0,
    pendingPurchases: 0,
    pendingPayments: 0,
    pendingExpenses: 0,
    pendingBankTx: 0,
    pendingOnlineOrders: 0,
    pendingBookerTx: 0,
    lastSyncTime: new Date().toISOString()
  });

  // Theme support
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('mbi_landing_theme');
    if (saved) return saved === 'dark';
    return document.documentElement.classList.contains('dark');
  });

  const fetchHealthStatus = useCallback(async () => {
    const startTime = performance.now();
    try {
      // 1. Fetch server-side health status
      const res = await fetch('/api/sync/health', { cache: 'no-store' });
      const endTime = performance.now();
      const calculatedLatency = Math.round(endTime - startTime);

      if (res.ok) {
        const data: SyncHealthResponse = await res.json();
        // Fallback to calculated latency if server didn't provide one
        if (data.syncLatencyMs === undefined) {
          data.syncLatencyMs = calculatedLatency;
        }
        setHealthData(data);
        setError(null);
        setLastRefreshedAt(new Date());

        setLatencyHistory(prev => {
          const updated = [...prev, data.syncLatencyMs || calculatedLatency];
          return updated.slice(-15); // keep last 15 ticks
        });
      } else {
        setError(`HTTP ${res.status}: Failed to reach /api/sync/health`);
      }

      // 2. Fetch local pending transactions count
      const localPending = await syncEngine.getPendingTransactionsCount();
      setPendingTxInfo(localPending);
    } catch (err: any) {
      setError(err?.message || 'Network error fetching sync health metrics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealthStatus();

    const handleDataEvent = () => {
      fetchHealthStatus();
    };

    window.addEventListener('mbi-data-synced', handleDataEvent);
    window.addEventListener('mbi-local-db-change', handleDataEvent);
    window.addEventListener('storage', handleDataEvent);

    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchHealthStatus();
      }, 3000); // 3-second live refresh
    }

    return () => {
      window.removeEventListener('mbi-data-synced', handleDataEvent);
      window.removeEventListener('mbi-local-db-change', handleDataEvent);
      window.removeEventListener('storage', handleDataEvent);
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, fetchHealthStatus]);

  const handleManualSyncNow = async () => {
    setIsSyncingNow(true);
    emitToast('⚡ Initiating manual sync of pending transactions to backend server...', 'info');
    try {
      const res = await syncEngine.triggerManualSyncNow();
      await fetchHealthStatus();
      if (res.success) {
        emitToast('✨ Sync Complete! All transactions are 100% updated on backend server.', 'success');
      } else {
        emitToast(res.message, 'error');
      }
    } catch (e: any) {
      emitToast(e?.message || 'Sync failed. Will retry automatically in background.', 'error');
    } finally {
      setIsSyncingNow(false);
    }
  };

  const handleManualFlush = async () => {
    try {
      const res = await fetch('/api/sync/flush', { method: 'POST' });
      if (res.ok) {
        emitToast('Server memory cache manually flushed to disk!', 'success');
        fetchHealthStatus();
      } else {
        emitToast('Failed to flush server cache', 'error');
      }
    } catch (e: any) {
      emitToast(e?.message || 'Flush error', 'error');
    }
  };

  const effectivePendingCount = Math.max(
    pendingTxInfo.totalPending,
    healthData?.pendingWrites || 0
  );

  const avgLatency = latencyHistory.length > 0 
    ? Math.round(latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length) 
    : (healthData?.syncLatencyMs || 0);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* Top Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <Link 
              to="/user" 
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Return to Workspace"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <Activity className="w-4 h-4" />
                </span>
                <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
                  Sync Health &amp; Performance Telemetry
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
                  LIVE TELEMETRY
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time API latency, write buffers, server activity logs, and MariaDB status monitor
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Pending Transactions Counter Badge */}
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-xs ${
              effectivePendingCount > 0
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
            }`}>
              <div className="relative flex h-2.5 w-2.5 items-center justify-center">
                {effectivePendingCount > 0 && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${effectivePendingCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              </div>
              <span>
                {effectivePendingCount > 0 ? `${effectivePendingCount} Pending Sync` : '0 Pending (Synced)'}
              </span>
            </div>

            {/* Sync Now Manual Trigger Button */}
            <button
              type="button"
              onClick={handleManualSyncNow}
              disabled={isSyncingNow}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
              title="Push all pending transactions to backend server now"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNow ? 'animate-spin' : ''}`} />
              <span>{isSyncingNow ? 'Synchronizing...' : '⚡ Sync Now'}</span>
            </button>

            {/* Auto Refresh Toggle */}
            <button
              type="button"
              onClick={() => setAutoRefresh(prev => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                autoRefresh 
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
              <span className="hidden sm:inline">{autoRefresh ? 'Auto 3s Refresh' : 'Auto Paused'}</span>
            </button>

            {/* Server Flush Button */}
            <button
              type="button"
              onClick={handleManualFlush}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 transition-all cursor-pointer shadow-xs"
              title="Flush Server Disk Cache"
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Flush Disk</span>
            </button>
          </div>

        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">

        {/* Error Notification Banner */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/80 text-red-700 dark:text-red-300 flex items-start gap-3 animate-in fade-in">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold">Sync Health Monitoring Notice</h3>
              <p className="text-xs mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* PENDING TRANSACTIONS & LIVE SERVER SYNC HERO BANNER */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950/80 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
                effectivePendingCount > 0 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/20' 
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-lg shadow-emerald-500/20'
              }`}>
                {effectivePendingCount > 0 ? (
                  <ArrowUpCircle className="w-7 h-7 animate-bounce" />
                ) : (
                  <CheckCircle2 className="w-7 h-7" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl font-black text-white tracking-tight">
                    Backend Transaction Sync Queue
                  </h2>
                  
                  {/* Counter Badge */}
                  <span className={`px-3 py-1 rounded-full text-xs font-black font-mono border flex items-center gap-1.5 ${
                    effectivePendingCount > 0
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${effectivePendingCount > 0 ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
                    <span>{effectivePendingCount} Pending Server Sync</span>
                  </span>
                </div>

                <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                  {effectivePendingCount > 0
                    ? `There are ${effectivePendingCount} local transaction(s) queued. Click 'Sync Now' to immediately dispatch invoices, ledgers, and payments to the cloud database.`
                    : 'All sales invoices, purchase bills, supplier payments, and expense vouchers are 100% synchronized with the central backend server.'}
                </p>

                {/* Queue Breakdown Pills */}
                <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 flex items-center gap-1.5 font-medium">
                    <ShoppingCart className="w-3.5 h-3.5 text-blue-400" />
                    <span>Invoices: <strong className="text-white font-mono">{pendingTxInfo.pendingInvoices}</strong></span>
                  </span>

                  <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 flex items-center gap-1.5 font-medium">
                    <ShoppingBag className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Purchases: <strong className="text-white font-mono">{pendingTxInfo.pendingPurchases}</strong></span>
                  </span>

                  <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 flex items-center gap-1.5 font-medium">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Payments/Expenses: <strong className="text-white font-mono">{pendingTxInfo.pendingPayments + pendingTxInfo.pendingExpenses}</strong></span>
                  </span>

                  <span className="text-[11px] text-slate-400 ml-1">
                    Last Push: <span className="font-mono text-cyan-300">{new Date(pendingTxInfo.lastSyncTime).toLocaleTimeString()}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Sync Now Trigger Action */}
            <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleManualSyncNow}
                disabled={isSyncingNow}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2.5 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncingNow ? 'animate-spin' : ''}`} />
                <span>{isSyncingNow ? 'Synchronizing with Backend...' : '⚡ Sync Now'}</span>
              </button>

              <span className="text-[10.5px] text-slate-400 text-center md:text-right font-medium">
                Bi-directional auto-sync every 4s
              </span>
            </div>

          </div>
        </div>

        {/* 3 Key Metrics Cards: Latency, Pending Writes, Server Logs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Card 1: Sync Latency */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-500" />
                Sync Latency
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                (healthData?.syncLatencyMs || 0) < 50 
                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                  : (healthData?.syncLatencyMs || 0) < 200
                  ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300'
                  : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
              }`}>
                {(healthData?.syncLatencyMs || 0) < 50 ? 'ULTRA FAST' : (healthData?.syncLatencyMs || 0) < 200 ? 'OPTIMAL' : 'HIGH LATENCY'}
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-4xl font-black text-slate-900 dark:text-slate-100 font-mono">
                {isLoading ? '--' : (healthData?.syncLatencyMs ?? 0)}
              </span>
              <span className="text-sm font-bold text-slate-500">ms</span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Average Ping: <strong className="text-slate-700 dark:text-slate-300 font-mono">{avgLatency} ms</strong> across last {latencyHistory.length} ticks
            </p>

            {/* Latency Visual Bar Graph */}
            <div className="flex items-end gap-1 h-10 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              {latencyHistory.map((lat, idx) => {
                const heightPct = Math.min(100, Math.max(15, Math.round((lat / 300) * 100)));
                return (
                  <div key={idx} className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-t overflow-hidden relative group/bar" title={`${lat} ms`}>
                    <div 
                      className={`w-full absolute bottom-0 transition-all ${
                        lat < 50 ? 'bg-emerald-500' : lat < 150 ? 'bg-blue-500' : 'bg-amber-500'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 2: Pending Writes Queue */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-emerald-500" />
                Pending Server Writes
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                (healthData?.pendingWrites || 0) === 0
                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 animate-pulse'
              }`}>
                {(healthData?.pendingWrites || 0) === 0 ? 'FLUSHED TO DISK' : 'WRITES QUEUED'}
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-4xl font-black text-slate-900 dark:text-slate-100 font-mono">
                {isLoading ? '--' : (healthData?.pendingWrites ?? 0)}
              </span>
              <span className="text-sm font-bold text-slate-500">records in buffer</span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Debounced flush timer active (500ms debounce / 2000ms max wait)
            </p>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
              <span>Disk Sync File:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {formatBytes(healthData?.storage?.fileSize || 0)}
              </span>
            </div>
          </div>

          {/* Card 3: Server-Side Log Count */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-500" />
                Server-Side Log Count
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                AUDITED
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-4xl font-black text-slate-900 dark:text-slate-100 font-mono">
                {isLoading ? '--' : (healthData?.serverLogCount ?? 0).toLocaleString()}
              </span>
              <span className="text-sm font-bold text-slate-500">recorded events</span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Activity &amp; audit trail records stored in server memory &amp; DB
            </p>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
              <span>MariaDB Engine:</span>
              <span className={`inline-flex items-center gap-1 font-bold ${
                healthData?.mariaDbConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
              }`}>
                {healthData?.mariaDbConnected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                {healthData?.mariaDbConnected ? 'CONNECTED' : 'STANDBY'}
              </span>
            </div>
          </div>

        </div>

        {/* Panel 1: Local Queue Latency Breakdown & Failure Pattern Radar */}
        <div>
          <LocalQueueLatencyPanel />
        </div>

        {/* Panel 2: Diagnostic Component for Local Sync Queue & Manual Control */}
        <div>
          <SyncDiagnosticsWidget onSyncTriggered={fetchHealthStatus} />
        </div>

        {/* Panel 2B: Interactive Database Sync Conflicts Resolution Center */}
        <div>
          <SyncConflictsResolverPanel onNotify={(msg) => emitToast(msg, 'info')} />
        </div>

        {/* Panel 3: Searchable Log Viewer categorized by Error Type */}
        <div>
          <SearchableLogViewer initialLogs={healthData?.recentCategorizedLogs || []} />
        </div>

        {/* Server Collections Distribution Grid */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-500" />
                Server Collection Partition Distribution
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Total Records on Server: <strong className="text-slate-800 dark:text-slate-200 font-mono">{healthData?.totalRecordsCount?.toLocaleString() || 0}</strong> across {healthData?.activeCollectionsCount || 0} collections
              </p>
            </div>

            <div className="text-xs text-slate-400 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              <span>Last Refreshed: {lastRefreshedAt.toLocaleTimeString()}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {healthData?.storage?.storeCounts && Object.entries(healthData.storage.storeCounts).map(([colKey, count]) => (
              <div 
                key={colKey}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 transition-all hover:border-blue-300 dark:hover:border-blue-700 group"
              >
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400" title={colKey}>
                  {colKey}
                </div>
                <div className="text-lg font-black font-mono text-slate-900 dark:text-slate-100 mt-1">
                  {count.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

    </div>
  );
}
