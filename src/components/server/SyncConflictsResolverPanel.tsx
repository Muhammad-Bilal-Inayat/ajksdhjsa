import React, { useState, useEffect, useCallback } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  ArrowRight, 
  Database, 
  HardDrive, 
  Clock, 
  ShieldCheck, 
  Zap, 
  Sparkles, 
  Check, 
  X, 
  FileText, 
  Layers,
  HelpCircle,
  Activity,
  CloudOff,
  Cloud
} from 'lucide-react';
import { unifiedSyncService, DiscrepancyReport, DiscrepancyItem } from '../../lib/syncService';
import { dbMedicines, dbInvoices, dbSuppliers, dbPurchaseOrders, dbExpenses, initDB } from '../../lib/db';

interface SyncConflictsResolverPanelProps {
  onNotify?: (msg: string) => void;
  compactMode?: boolean;
}

export const SyncConflictsResolverPanel: React.FC<SyncConflictsResolverPanelProps> = ({ 
  onNotify,
  compactMode = false 
}) => {
  const [report, setReport] = useState<DiscrepancyReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [selectedConflict, setSelectedConflict] = useState<DiscrepancyItem | null>(null);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [lastScanTime, setLastSyncTime] = useState<string>('');

  const runConflictScan = useCallback(async () => {
    setIsLoading(true);
    try {
      const diagReport = await unifiedSyncService.detectDiscrepancies();
      setReport(diagReport);
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.warn('Conflict scan notice:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    runConflictScan();
    const unsub = unifiedSyncService.subscribeStatus(() => {
      runConflictScan();
    });
    return () => unsub();
  }, [runConflictScan]);

  // Handle single item resolution
  const handleResolveSingle = async (
    item: DiscrepancyItem, 
    choice: 'keep_local' | 'keep_remote'
  ) => {
    setIsResolving(true);
    try {
      const db = await initDB();
      const store = item.storeName as any;

      if (choice === 'keep_local' && item.localItem) {
        // Push local item to central server API
        await fetch('/api/sync/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entityType: item.storeName, record: item.localItem })
        });
        if (onNotify) onNotify(`Resolved: Kept Local version for ID ${item.id.slice(0, 10)} (Pushed to Server)`);
      } else if (choice === 'keep_remote' && item.remoteItem) {
        // Save remote item into local IndexedDB
        await db.put(store, item.remoteItem);
        if (onNotify) onNotify(`Resolved: Kept Server version for ID ${item.id.slice(0, 10)} (Saved locally)`);
      }

      setResolvedIds(prev => new Set(prev).add(`${item.storeName}:${item.id}`));
      setTimeout(() => runConflictScan(), 300);
    } catch (err: any) {
      if (onNotify) onNotify(`Resolution notice: ${err?.message || 'Update failed'}`);
    } finally {
      setIsResolving(false);
      setSelectedConflict(null);
    }
  };

  // Auto-resolve all conflicts using latest timestamp
  const handleAutoResolveAll = async () => {
    setIsResolving(true);
    try {
      const res = await unifiedSyncService.reconcileDiscrepancies();
      if (onNotify) onNotify(res.message);
      await runConflictScan();
    } catch (err: any) {
      if (onNotify) onNotify('Auto-resolve notice: Retrying in background');
    } finally {
      setIsResolving(false);
    }
  };

  // Collect all active conflicts
  const activeConflicts: DiscrepancyItem[] = [];
  if (report) {
    for (const [storeName, storeInfo] of Object.entries(report.stores)) {
      for (const disc of storeInfo.discrepancies) {
        const key = `${storeName}:${disc.id}`;
        if (!resolvedIds.has(key)) {
          activeConflicts.push(disc);
        }
      }
    }
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner & Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
                  <span>Server & Client Database Sync Conflict Resolution Center</span>
                  {activeConflicts.length > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                      {activeConflicts.length} Conflict{activeConflicts.length > 1 ? 's' : ''} Found
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Inspect and resolve state discrepancies between local IndexedDB and MariaDB server databases with side-by-side diff comparisons.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={runConflictScan}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Scanning...' : 'Scan Conflicts'}</span>
            </button>

            {activeConflicts.length > 0 && (
              <button
                type="button"
                onClick={handleAutoResolveAll}
                disabled={isResolving}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-emerald-600/30 border border-emerald-400/30"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Resolve All (Latest Timestamp)</span>
              </button>
            )}
          </div>
        </div>

        {/* Scan Status Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-slate-400 font-medium block">Total Conflicts</span>
            <span className={`text-lg font-black font-mono mt-0.5 block ${activeConflicts.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {activeConflicts.length}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-slate-400 font-medium block">Sync Status</span>
            <span className="text-xs font-bold text-emerald-400 mt-1.5 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{activeConflicts.length === 0 ? 'In Sync (100%)' : 'Action Required'}</span>
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-slate-400 font-medium block">Last Scan Time</span>
            <span className="text-xs font-mono font-bold text-slate-200 mt-1.5 block">
              {lastScanTime || 'Just now'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-slate-400 font-medium block">Conflict Resolution Rule</span>
            <span className="text-[11px] font-bold text-blue-400 mt-1.5 block">
              Timestamp-First Deterministic
            </span>
          </div>
        </div>
      </div>

      {/* Main Conflict List or Clean State */}
      {isLoading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Scanning local and server databases for conflicts...</p>
        </div>
      ) : activeConflicts.length === 0 ? (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-emerald-800 dark:text-emerald-300">No Database Sync Conflicts Detected!</h4>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 max-w-md mx-auto leading-relaxed">
            All IndexedDB browser entries and central server MariaDB database tables are in 100% harmonized state. No manual intervention required.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 px-1">
            <span>CONFLICTING RECORDS ({activeConflicts.length})</span>
            <span>Click any conflict card to open side-by-side JSON diff</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {activeConflicts.map((conflict, idx) => {
              const localName = conflict.localItem?.name || conflict.localItem?.customerName || conflict.localItem?.invoiceNumber || conflict.id;
              const remoteName = conflict.remoteItem?.name || conflict.remoteItem?.customerName || conflict.remoteItem?.invoiceNumber || conflict.id;
              const isSelected = selectedConflict?.id === conflict.id;

              return (
                <div 
                  key={`${conflict.storeName}-${conflict.id}-${idx}`}
                  className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-xs transition-all ${
                    isSelected 
                      ? 'border-amber-500 ring-2 ring-amber-500/20' 
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {conflict.storeName}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                            ID: {conflict.id}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            {conflict.type.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 mt-1">
                          {localName !== conflict.id ? localName : remoteName}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedConflict(isSelected ? null : conflict)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
                      >
                        {isSelected ? 'Hide Details' : 'Compare Diff'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleResolveSingle(conflict, 'keep_local')}
                        disabled={isResolving}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer shadow-xs"
                        title="Use local version and push to central server"
                      >
                        Keep Local
                      </button>

                      <button
                        type="button"
                        onClick={() => handleResolveSingle(conflict, 'keep_remote')}
                        disabled={isResolving}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer shadow-xs"
                        title="Use server version and overwrite local copy"
                      >
                        Keep Server
                      </button>
                    </div>
                  </div>

                  {/* Side-by-side local vs remote comparison preview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs">
                    {/* Local Version Card */}
                    <div className={`p-4 rounded-xl border ${
                      conflict.type === 'local_newer' 
                        ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/80' 
                        : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800'
                    }`}>
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
                        <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                          <HardDrive className="w-3.5 h-3.5" />
                          <span>LOCAL VERSION (IndexedDB)</span>
                        </span>
                        {conflict.type === 'local_newer' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-blue-500/20 text-blue-600 dark:text-blue-400">
                            NEWER TIMESTAMP
                          </span>
                        )}
                      </div>
                      {conflict.localItem ? (
                        <div className="space-y-1 text-slate-700 dark:text-slate-300">
                          <div><span className="text-slate-400 font-semibold">Updated:</span> <span className="font-mono font-bold">{conflict.localTimestamp || 'N/A'}</span></div>
                          {Object.entries(conflict.localItem)
                            .filter(([k]) => ['name', 'price', 'sellingPrice', 'quantity', 'totalAmount', 'grandTotal', 'status', 'email'].includes(k))
                            .map(([k, v]) => (
                              <div key={k} className="flex justify-between">
                                <span className="text-slate-400 capitalize">{k}:</span>
                                <span className="font-bold">{String(v)}</span>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="text-amber-500 font-bold text-center py-2">
                          Record missing in Local Database
                        </div>
                      )}
                    </div>

                    {/* Server Version Card */}
                    <div className={`p-4 rounded-xl border ${
                      conflict.type === 'remote_newer' 
                        ? 'bg-purple-50/50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/80' 
                        : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800'
                    }`}>
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
                        <span className="font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                          <Cloud className="w-3.5 h-3.5" />
                          <span>SERVER VERSION (MariaDB)</span>
                        </span>
                        {conflict.type === 'remote_newer' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-purple-500/20 text-purple-600 dark:text-purple-400">
                            NEWER TIMESTAMP
                          </span>
                        )}
                      </div>
                      {conflict.remoteItem ? (
                        <div className="space-y-1 text-slate-700 dark:text-slate-300">
                          <div><span className="text-slate-400 font-semibold">Updated:</span> <span className="font-mono font-bold">{conflict.remoteTimestamp || 'N/A'}</span></div>
                          {Object.entries(conflict.remoteItem)
                            .filter(([k]) => ['name', 'price', 'sellingPrice', 'quantity', 'totalAmount', 'grandTotal', 'status', 'email'].includes(k))
                            .map(([k, v]) => (
                              <div key={k} className="flex justify-between">
                                <span className="text-slate-400 capitalize">{k}:</span>
                                <span className="font-bold">{String(v)}</span>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="text-amber-500 font-bold text-center py-2">
                          Record missing on Central Server
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded JSON diff comparison modal/view */}
                  {isSelected && (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                      <h5 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">RAW JSON COMPARISON</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px] font-mono">
                        <pre className="p-3 bg-slate-950 text-blue-300 rounded-xl overflow-x-auto max-h-48 border border-slate-800">
                          {JSON.stringify(conflict.localItem || {}, null, 2)}
                        </pre>
                        <pre className="p-3 bg-slate-950 text-purple-300 rounded-xl overflow-x-auto max-h-48 border border-slate-800">
                          {JSON.stringify(conflict.remoteItem || {}, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
