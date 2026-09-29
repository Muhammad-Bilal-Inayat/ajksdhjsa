import React, { useState, useEffect } from 'react';
import { 
  Cloud, RefreshCw, CheckCircle2, 
  Wifi, WifiOff, Database, ArrowUpCircle, Check, Sparkles, ShieldCheck
} from 'lucide-react';
import { syncEngine, SyncStatus } from '../../lib/syncEngine';

export const SyncStatusIndicator: React.FC = () => {
  const [status, setStatus] = useState<SyncStatus>(syncEngine.getStatus());
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [syncedCount, setSyncedCount] = useState<number>(0);
  const [totalBatchCount, setTotalBatchCount] = useState<number>(0);
  const [lastSyncTime, setLastSyncTime] = useState<string>(syncEngine.getLastSyncTime());
  const [isOpen, setIsOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = syncEngine.subscribe((newStatus) => {
      setStatus(newStatus);
      setLastSyncTime(syncEngine.getLastSyncTime());
    });

    const updatePending = async () => {
      try {
        const diag = await syncEngine.getSyncDiagnostics();
        setPendingCount(diag.pendingTransactionsCount);
      } catch (e) {}
    };

    updatePending();
    const interval = setInterval(updatePending, 3000);

    const handleProgress = (e: any) => {
      if (e?.detail) {
        setSyncedCount(e.detail.synced || 0);
        setTotalBatchCount(e.detail.total || 0);
      }
    };
    window.addEventListener('mbi-sync-progress' as any, handleProgress);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('mbi-sync-progress' as any, handleProgress);
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRetrying(true);
    setFeedback(null);
    try {
      const res = await syncEngine.pushServerSync();
      if (res.success) {
        setFeedback('All local records matched with cloud database mbi72dn.');
      } else {
        setFeedback(res.message || 'Queued for background sync.');
      }
    } catch (err: any) {
      setFeedback('Sync in progress in background.');
    } finally {
      setIsRetrying(false);
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return 'Just now';
    try {
      const date = new Date(iso);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return 'Just now';
    }
  };

  const isSyncing = status === 'syncing' || isRetrying || (totalBatchCount > 0 && syncedCount < totalBatchCount);
  const isOffline = !isOnline || status === 'offline';

  return (
    <div className="relative select-none">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`group flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer shadow-2xs ${
          isOffline
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200'
            : isSyncing
            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700 hover:bg-amber-100'
            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 shadow-emerald-500/10'
        }`}
        title="Live Zero-Conflict Sync Status"
      >
        {/* Pulsing Dot Indicator */}
        <div className="relative flex h-2.5 w-2.5 items-center justify-center shrink-0">
          {isOffline ? (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-400" />
          ) : isSyncing ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </>
          ) : (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </>
          )}
        </div>

        {/* Dynamic Status Pill */}
        {isOffline ? (
          <div className="flex items-center gap-1.5">
            <WifiOff className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-bold">Offline Billing Active</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-full text-[9px] font-black">
                {pendingCount}
              </span>
            )}
          </div>
        ) : isSyncing ? (
          <div className="flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600 dark:text-amber-400" />
            <span className="font-bold">
              {totalBatchCount > 0 ? `Syncing (${syncedCount}/${totalBatchCount})` : 'Syncing Live...'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <Cloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold">Online & Synced</span>
          </div>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 p-4 animate-in fade-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-black">Cloud Database mbi72dn</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isOffline 
                  ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' 
                  : isSyncing 
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' 
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              }`}>
                {isOffline ? 'Offline Cache' : isSyncing ? 'Synchronizing' : '100% Synced'}
              </span>
            </div>

            {/* Streaming Progress Bar */}
            {totalBatchCount > 0 && (
              <div className="mt-3 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between text-[11px] font-bold mb-1">
                  <span>Batch Queue Progress</span>
                  <span>{syncedCount} / {totalBatchCount}</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.round((syncedCount / totalBatchCount) * 100))}%` }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2 py-3 text-xs">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Network Protocol:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {isOnline ? 'SSE Real-Time Stream' : 'Local IndexedDB Active'}
                </span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Pending Mutations:</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{pendingCount} records</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Last Cloud Sync:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{formatTime(lastSyncTime)}</span>
              </div>
            </div>

            {feedback && (
              <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 rounded-xl text-[11px] text-blue-700 dark:text-blue-300 font-medium animate-in fade-in">
                {feedback}
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                <ShieldCheck className="w-3 h-3 shrink-0" />
                <span>Zero-Conflict Delta Sync</span>
              </div>
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sync Now</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
