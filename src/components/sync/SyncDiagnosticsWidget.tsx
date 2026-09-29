import React, { useState, useEffect, useCallback } from 'react';
import { 
  RefreshCw, Trash2, Cloud, CloudOff, Database, CheckCircle2, 
  AlertTriangle, HardDrive, Activity, Zap, Cpu, ArrowUpRight, ArrowDownRight,
  ShieldCheck, Loader2
} from 'lucide-react';
import { syncEngine, SyncStatus } from '../../lib/syncEngine';
import { emitToast } from '../../contexts/ToastContext';

interface SyncDiagnosticsWidgetProps {
  onSyncTriggered?: () => void;
  className?: string;
  compact?: boolean;
}

export function SyncDiagnosticsWidget({ onSyncTriggered, className = '', compact = false }: SyncDiagnosticsWidgetProps) {
  const [status, setStatus] = useState<SyncStatus>('synced');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [storeCounts, setStoreCounts] = useState<Record<string, number>>({});
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const loadDiagnostics = useCallback(async () => {
    try {
      const diag = await syncEngine.getSyncDiagnostics();
      setStatus(diag.status);
      setLastSyncTime(diag.lastSyncTimestamp);
      setTotalRecords(diag.totalLocalRecords);
      setStoreCounts(diag.storeCounts);
    } catch (e) {
      console.warn('Failed to load local sync diagnostics:', e);
    }
  }, []);

  useEffect(() => {
    loadDiagnostics();
    const unsub = syncEngine.subscribe((newStatus) => {
      setStatus(newStatus);
      loadDiagnostics();
    });

    const handleDataSynced = () => {
      loadDiagnostics();
    };

    window.addEventListener('mbi-data-synced', handleDataSynced);
    window.addEventListener('mbi-local-db-change', handleDataSynced);

    return () => {
      unsub();
      window.removeEventListener('mbi-data-synced', handleDataSynced);
      window.removeEventListener('mbi-local-db-change', handleDataSynced);
    };
  }, [loadDiagnostics]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    emitToast('Initiating manual bi-directional cloud sync...', 'info');
    try {
      const pullRes = await syncEngine.pullServerSync(true);
      const pushRes = await syncEngine.pushServerSync();
      await loadDiagnostics();
      emitToast(pushRes.message || pullRes.message || 'Synchronization complete!', 'success');
      if (onSyncTriggered) onSyncTriggered();
    } catch (err: any) {
      emitToast(err?.message || 'Sync encounter notice: Retrying in background.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      const res = await syncEngine.clearLocalCache();
      await loadDiagnostics();
      if (res.success) {
        emitToast('Local sync cache cleared. Fresh data will sync from server.', 'success');
      } else {
        emitToast(res.message, 'error');
      }
    } catch (e: any) {
      emitToast(e?.message || 'Failed to clear cache', 'error');
    } finally {
      setIsClearing(false);
      setShowConfirmClear(false);
    }
  };

  const topStores = Object.entries(storeCounts)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-all ${className}`}>
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border flex items-center justify-center ${
            status === 'synced' ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400' :
            status === 'syncing' ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400' :
            'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400'
          }`}>
            {status === 'synced' && <CheckCircle2 className="w-5 h-5" />}
            {status === 'syncing' && <Loader2 className="w-5 h-5 animate-spin" />}
            {status === 'offline' && <CloudOff className="w-5 h-5" />}
            {status === 'error' && <AlertTriangle className="w-5 h-5" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Local Sync Queue Diagnostics
              </h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                status === 'synced' ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300' :
                status === 'syncing' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 animate-pulse' :
                'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300'
              }`}>
                {status.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-5-00 dark:text-slate-400 mt-0.5">
              IndexedDB Storage Queue &amp; Real-Time Client Dispatch Engine
            </p>
          </div>
        </div>

        {/* Diagnostic Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Trigger Sync'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowConfirmClear(true)}
            disabled={isClearing || isSyncing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60 transition-all disabled:opacity-50 cursor-pointer"
            title="Clear Local Sync Cache"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear Local Cache</span>
          </button>
        </div>
      </div>

      {/* Stats Quick Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium">Local Records</span>
            <Database className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <p className="text-lg font-black text-slate-900 dark:text-slate-100">
            {totalRecords.toLocaleString()}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium">Active Collections</span>
            <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <p className="text-lg font-black text-slate-900 dark:text-slate-100">
            {Object.keys(storeCounts).filter(k => storeCounts[k] > 0).length} / 25
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium">Channel Dispatch</span>
            <Zap className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
            BroadcastChannel Active
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium">Last Sync</span>
            <Activity className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 truncate" title={lastSyncTime}>
            {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : 'Just now'}
          </p>
        </div>
      </div>

      {/* Top Local Collection Queue breakdown */}
      {!compact && topStores.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Local Store Breakdown
            </h4>
            <span className="text-[11px] text-slate-400">Top Cached Stores</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {topStores.map(([storeKey, count]) => (
              <div 
                key={storeKey}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50/80 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/60 text-xs"
              >
                <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[100px]" title={storeKey}>
                  {storeKey}
                </span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded text-[11px]">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Modal for Clearing Cache */}
      {showConfirmClear && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-3">
              <div className="p-2 rounded-xl bg-red-100 dark:bg-red-950/60">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Clear Local Sync Cache?
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-5">
              This action will reset local IndexedDB stores and sync queues for this browser session. 
              Your remote cloud server data is safe and will automatically re-download upon the next sync.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmClear(false)}
                disabled={isClearing}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearCache}
                disabled={isClearing}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-all disabled:opacity-50"
              >
                {isClearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Yes, Clear Local Cache</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
